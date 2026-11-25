import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import LiveStudentCard from '../../components/teacher/LiveStudentCard';
import CodeInspectModal from '../../components/teacher/CodeInspectModal';
import './LiveMonitor.css';

function getState(student) {
  if (student.status === 'struggling' || Number(student.struggleScore ?? 0) >= 3) return 'struggling';
  if (['passed', 'pass', 'completed', 'complete'].includes(student.status)) return 'passed';
  return 'working';
}

function updatedMillis(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

export default function LiveMonitor({ auth, db, user }) {
  const teacherId = user?.uid ?? auth?.currentUser?.uid;
  const profileCache = useRef(new Map());
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState('');
  const closeInspectModal = useCallback(() => setSelectedStudent(null), []);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === classId) ?? null,
    [classes, classId],
  );

  useEffect(() => {
    if (!db || !teacherId) {
      setClasses([]);
      setClassId('');
      setLoadingClasses(false);
      return undefined;
    }

    setLoadingClasses(true);
    const ownedClasses = query(
      collection(db, 'classes'),
      where('teacherId', '==', teacherId),
    );
    return onSnapshot(
      ownedClasses,
      (snapshot) => {
        setError('');
        const nextClasses = snapshot.docs
          .map((classDoc) => ({ id: classDoc.id, ...classDoc.data() }))
          .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));
        setClasses(nextClasses);
        setClassId((currentId) => (
          nextClasses.some((item) => item.id === currentId)
            ? currentId
            : nextClasses[0]?.id ?? ''
        ));
        setLoadingClasses(false);
      },
      (snapshotError) => {
        setError(`Could not load your classes: ${snapshotError.message}`);
        setLoadingClasses(false);
      },
    );
  }, [db, teacherId]);

  useEffect(() => {
    if (!db || !classId) {
      setStudents([]);
      setLoadingSessions(false);
      return undefined;
    }

    let active = true;
    setStudents([]);
    setLoadingSessions(true);
    const classSessions = query(
      collection(db, 'active_sessions'),
      where('classId', '==', classId),
    );

    return onSnapshot(
      classSessions,
      async (snapshot) => {
        try {
          const nextStudents = await Promise.all(snapshot.docs.map(async (sessionDoc) => {
            const session = sessionDoc.data();
            const studentId = session.studentId || sessionDoc.id;
            let profilePromise = profileCache.current.get(studentId);
            if (!profilePromise) {
              profilePromise = getDoc(doc(db, 'users', studentId))
                .then((profileSnapshot) => profileSnapshot.exists() ? profileSnapshot.data() : {})
                .catch(() => ({}));
              profileCache.current.set(studentId, profilePromise);
            }
            const profile = await profilePromise;
            return {
              id: studentId,
              ...session,
              displayName: session.displayName || profile.displayName || 'Student',
              college: profile.college || '',
            };
          }));

          if (active) {
            setError('');
            nextStudents.sort((left, right) => {
              const stateOrder = { struggling: 0, working: 1, passed: 2 };
              return stateOrder[getState(left)] - stateOrder[getState(right)]
                || updatedMillis(right.updatedAt) - updatedMillis(left.updatedAt)
                || left.displayName.localeCompare(right.displayName);
            });
            setStudents(nextStudents);
            setLoadingSessions(false);
          }
        } catch (snapshotError) {
          if (active) {
            setError(`Could not read student profiles: ${snapshotError.message}`);
            setLoadingSessions(false);
          }
        }
      },
      (snapshotError) => {
        if (active) {
          setError(`Could not subscribe to live sessions: ${snapshotError.message}`);
          setStudents([]);
          setLoadingSessions(false);
        }
      },
    );
  }, [db, classId]);

  const counts = useMemo(() => students.reduce((result, student) => {
    result[getState(student)] += 1;
    return result;
  }, { passed: 0, working: 0, struggling: 0 }), [students]);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return students.filter((student) => {
      if (filter === 'struggling' && getState(student) !== 'struggling') return false;
      if (!term) return true;
      return [student.displayName, student.college, student.id]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(term));
    });
  }, [filter, search, students]);

  const integrationMissing = !auth || !db;
  const needsTeacherSignIn = !integrationMissing && !teacherId;
  const liveSelectedStudent = selectedStudent
    ? students.find((student) => student.id === selectedStudent.id) ?? selectedStudent
    : null;

  return (
    <main className="live-monitor">
      <header className="live-monitor__header">
        <div>
          <p className="live-monitor__eyebrow">TEACHER PORTAL / LIVE CLASS</p>
          <h1>Live lab monitor</h1>
          <p>See student progress and errors as they happen.</p>
        </div>
        <label className="live-monitor__class-picker">
          Active class
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            disabled={loadingClasses || classes.length === 0 || integrationMissing || needsTeacherSignIn}
          >
            {loadingClasses && <option value="">Loading classes…</option>}
            {!loadingClasses && classes.length === 0 && <option value="">No classes yet</option>}
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name || 'Untitled class'}</option>
            ))}
          </select>
        </label>
      </header>

      {integrationMissing && (
        <p className="live-monitor__message live-monitor__message--info" role="status">
          Connect this page to the app’s Firebase Auth and Firestore instances to view live sessions.
        </p>
      )}
      {needsTeacherSignIn && (
        <p className="live-monitor__message live-monitor__message--info" role="status">
          Sign in with a teacher account to view this monitor.
        </p>
      )}
      {error && <p className="live-monitor__message live-monitor__message--error" role="alert">{error}</p>}

      <section className="live-monitor__summary" aria-label="Class session summary">
        <div className="live-monitor__summary-title">
          <div>
            <span className="live-monitor__eyebrow">CURRENT SESSION</span>
            <h2>{selectedClass?.name || 'Class overview'}</h2>
          </div>
          <span className="live-monitor__live-indicator"><i aria-hidden="true" /> Live</span>
        </div>
        <div className="live-monitor__stats">
          <div className="live-monitor__stat">
            <span className="live-monitor__stat-label">Students</span>
            <strong>{students.length}</strong>
          </div>
          <div className="live-monitor__stat live-monitor__stat--struggling">
            <span className="live-monitor__stat-label">Struggling</span>
            <strong>{counts.struggling}</strong>
          </div>
          <div className="live-monitor__stat live-monitor__stat--working">
            <span className="live-monitor__stat-label">Working</span>
            <strong>{counts.working}</strong>
          </div>
          <div className="live-monitor__stat live-monitor__stat--passed">
            <span className="live-monitor__stat-label">Passed</span>
            <strong>{counts.passed}</strong>
          </div>
        </div>
      </section>

      <section className="live-monitor__students" aria-labelledby="student-grid-heading">
        <div className="live-monitor__toolbar">
          <div>
            <p className="live-monitor__eyebrow">STUDENT ACTIVITY</p>
            <h2 id="student-grid-heading">Live student cards</h2>
          </div>
          <label className="live-monitor__search">
            <span className="sr-only">Search students</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" />
          </label>
        </div>

        <div className="live-monitor__filters" role="group" aria-label="Filter student cards">
          <button className={filter === 'all' ? 'is-selected' : ''} type="button" onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>
            Show all <span>{students.length}</span>
          </button>
          <button className={filter === 'struggling' ? 'is-selected live-monitor__filter-struggling' : 'live-monitor__filter-struggling'} type="button" onClick={() => setFilter('struggling')} aria-pressed={filter === 'struggling'}>
            <i aria-hidden="true" /> Struggling only <span>{counts.struggling}</span>
          </button>
        </div>

        {loadingSessions ? (
          <div className="live-monitor__empty" role="status">Connecting to the live session stream…</div>
        ) : visibleStudents.length === 0 ? (
          <div className="live-monitor__empty">
            <span className="live-monitor__empty-icon" aria-hidden="true">⌁</span>
            <p>{students.length === 0 ? 'No active student sessions for this class yet.' : 'No students match this filter.'}</p>
          </div>
        ) : (
          <div className="live-monitor__grid" aria-live="polite">
            {visibleStudents.map((student) => (
              <LiveStudentCard key={student.id} student={student} onInspect={setSelectedStudent} />
            ))}
          </div>
        )}
      </section>

      <CodeInspectModal student={liveSelectedStudent} onClose={closeInspectModal} />
    </main>
  );
}
