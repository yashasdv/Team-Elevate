import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import './ClassManagement.css';

/**
 * Teacher class creation and join request management.
 *
 * The app shell supplies the Firebase Auth instance, Firestore instance, and
 * backend origin so this page can be mounted without owning global app config.
 */
export default function ClassManagement({ auth, db, user, apiBaseUrl = '' }) {
  const teacherId = user?.uid ?? auth?.currentUser?.uid;
  const [className, setClassName] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [pendingStudents, setPendingStudents] = useState([]);
  const [classCode, setClassCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [creatingClass, setCreatingClass] = useState(false);
  const [busyStudentId, setBusyStudentId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  useEffect(() => {
    if (!teacherId || !db) {
      setClasses([]);
      setSelectedClassId('');
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
        const nextClasses = snapshot.docs
          .map((classDoc) => ({ id: classDoc.id, ...classDoc.data() }))
          .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''));

        setClasses(nextClasses);
        setSelectedClassId((currentId) => {
          if (nextClasses.some((item) => item.id === currentId)) return currentId;
          return nextClasses[0]?.id ?? '';
        });
        setLoadingClasses(false);
      },
      (snapshotError) => {
        setError(`Could not load your classes: ${snapshotError.message}`);
        setLoadingClasses(false);
      },
    );
  }, [db, teacherId]);

  useEffect(() => {
    if (!db || !selectedClassId) {
      setPendingStudents([]);
      return undefined;
    }

    let active = true;
    return onSnapshot(
      doc(db, 'classes', selectedClassId),
      async (classSnapshot) => {
        if (!classSnapshot.exists()) {
          if (active) setPendingStudents([]);
          return;
        }

        const pendingIds = Array.isArray(classSnapshot.data().pendingStudentIds)
          ? classSnapshot.data().pendingStudentIds
          : [];
        const roster = await Promise.all(pendingIds.map(async (studentId) => {
          try {
            const studentSnapshot = await getDoc(doc(db, 'users', studentId));
            const profile = studentSnapshot.exists() ? studentSnapshot.data() : {};
            return {
              id: studentId,
              displayName: profile.displayName || 'Student',
              college: profile.college || '—',
              year: profile.year || '—',
            };
          } catch {
            return { id: studentId, displayName: 'Student', college: '—', year: '—' };
          }
        }));

        if (active) setPendingStudents(roster);
      },
      (snapshotError) => {
        if (active) {
          setError(`Could not load join requests: ${snapshotError.message}`);
          setPendingStudents([]);
        }
      },
    );
  }, [db, selectedClassId]);

  async function getAccessToken() {
    const signedInUser = user ?? auth?.currentUser;
    if (!signedInUser) throw new Error('Sign in with a teacher account to continue.');
    return signedInUser.getIdToken();
  }

  async function createClass(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setClassCode('');
    setCopied(false);
    setCreatingClass(true);

    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/class/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: className.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || 'Class creation failed. Please try again.');
      }
      if (!result.classId || !result.classCode) {
        throw new Error('The server response did not include a class ID and code.');
      }

      setClassCode(result.classCode);
      setClassName('');
      setSelectedClassId(result.classId);
      setNotice('Class created. Share this code with your students.');
    } catch (requestError) {
      setError(requestError.message || 'Class creation failed. Please try again.');
    } finally {
      setCreatingClass(false);
    }
  }

  async function copyClassCode() {
    try {
      await navigator.clipboard.writeText(classCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the class code.');
    }
  }

  async function respondToRequest(studentId, action) {
    setError('');
    setNotice('');
    setBusyStudentId(studentId);

    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/class/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId: selectedClassId, studentId, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || `Could not ${action} this request.`);
      }
      setNotice(action === 'approve' ? 'Student approved.' : 'Join request rejected.');
    } catch (requestError) {
      setError(requestError.message || `Could not ${action} this request.`);
    } finally {
      setBusyStudentId('');
    }
  }

  const integrationMissing = !auth || !db;
  const needsTeacherSignIn = !integrationMissing && !teacherId;

  return (
    <main className="class-management">
      <header className="class-management__header">
        <div>
          <p className="class-management__eyebrow">TEACHER PORTAL</p>
          <h1>Class management</h1>
          <p className="class-management__intro">
            Create a class, share its code, and review student join requests.
          </p>
        </div>
      </header>

      {integrationMissing && (
        <p className="class-management__message class-management__message--info" role="status">
          Connect this page to the app’s Firebase Auth and Firestore instances to load classes.
        </p>
      )}
      {needsTeacherSignIn && (
        <p className="class-management__message class-management__message--info" role="status">
          Sign in with a teacher account to manage classes.
        </p>
      )}
      {error && <p className="class-management__message class-management__message--error" role="alert">{error}</p>}
      {notice && <p className="class-management__message class-management__message--success" role="status">{notice}</p>}

      <section className="class-management__panel" aria-labelledby="create-class-heading">
        <div className="class-management__panel-heading">
          <div>
            <p className="class-management__eyebrow">GET STARTED</p>
            <h2 id="create-class-heading">Create a class</h2>
          </div>
          <span className="class-management__step">01</span>
        </div>

        <form className="class-management__form" onSubmit={createClass}>
          <label htmlFor="class-name">Class name</label>
          <div className="class-management__form-row">
            <input
              id="class-name"
              name="className"
              type="text"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="e.g. CS101 — Intro to Programming"
              minLength={2}
              maxLength={100}
              required
              disabled={creatingClass || integrationMissing || needsTeacherSignIn}
            />
            <button type="submit" disabled={creatingClass || integrationMissing || needsTeacherSignIn || className.trim().length < 2}>
              {creatingClass ? 'Creating…' : 'Create class'}
            </button>
          </div>
        </form>

        {classCode && (
          <div className="class-management__code-card" aria-live="polite">
            <div>
              <span className="class-management__code-label">CLASS JOIN CODE</span>
              <strong className="class-management__code">{classCode}</strong>
            </div>
            <button className="class-management__secondary-button" type="button" onClick={copyClassCode}>
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        )}
      </section>

      <section className="class-management__panel" aria-labelledby="requests-heading">
        <div className="class-management__panel-heading">
          <div>
            <p className="class-management__eyebrow">CLASS ROSTER</p>
            <h2 id="requests-heading">Pending join requests</h2>
          </div>
          <span className="class-management__step">02</span>
        </div>

        <label className="class-management__select-label" htmlFor="managed-class">Choose a class</label>
        <select
          id="managed-class"
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          disabled={loadingClasses || classes.length === 0 || integrationMissing}
        >
          {loadingClasses && <option value="">Loading your classes…</option>}
          {!loadingClasses && classes.length === 0 && <option value="">No classes yet</option>}
          {classes.map((item) => <option key={item.id} value={item.id}>{item.name || 'Untitled class'}</option>)}
        </select>

        {!loadingClasses && classes.length > 0 && pendingStudents.length === 0 && (
          <div className="class-management__empty">
            <span aria-hidden="true">✓</span>
            <p>{selectedClass ? `No pending requests for ${selectedClass.name}.` : 'No pending requests.'}</p>
          </div>
        )}

        {pendingStudents.length > 0 && (
          <div className="class-management__table-wrap">
            <table className="class-management__table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">College</th>
                  <th scope="col">Year</th>
                  <th scope="col"><span className="sr-only">Request actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <span className="class-management__student-name">{student.displayName}</span>
                      <span className="class-management__student-id">{student.id}</span>
                    </td>
                    <td>{student.college}</td>
                    <td>{student.year}</td>
                    <td className="class-management__actions">
                      <button
                        className="class-management__approve"
                        type="button"
                        disabled={busyStudentId === student.id}
                        onClick={() => respondToRequest(student.id, 'approve')}
                      >
                        {busyStudentId === student.id ? 'Saving…' : 'Approve'}
                      </button>
                      <button
                        className="class-management__reject"
                        type="button"
                        disabled={busyStudentId === student.id}
                        onClick={() => respondToRequest(student.id, 'reject')}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
