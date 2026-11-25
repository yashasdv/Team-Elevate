import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import StudentPageHeader from '../../components/student/StudentPageHeader.jsx'
import { getStudentLeaderboard } from '../../services/studentDashboard.js'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S'
}

export default function Leaderboard() {
  const { user, isDemoUser, signOut } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getStudentLeaderboard(user, { demo: isDemoUser })
      .then((result) => {
        if (cancelled) return
        setClasses(result)
        setSelectedClassId((current) => current || result[0]?.id || '')
      })
      .catch((loadError) => { if (!cancelled) setError(loadError.code === 'permission-denied'
        ? 'Your class roster is available, but Firestore rules do not allow reading classmates’ leaderboard details yet.'
        : loadError.message || 'We could not load the leaderboard.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, isDemoUser])

  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId), [classes, selectedClassId])
  const myRank = selectedClass?.students.find((student) => student.uid === user?.uid)?.rank

  return (
    <main className="student-page">
      <StudentPageHeader user={user} signOut={signOut} active="leaderboard" />
      <div className="student-page-content">
        <section className="student-page-intro">
          <p className="eyebrow"><span className="eyebrow-line" /> LEARN TOGETHER</p>
          <div className="student-page-title-row"><div><h1>Class leaderboard</h1><p>Celebrate your progress and keep moving at your own pace.</p></div>
            {classes.length > 1 && <label className="leaderboard-class-select"><span>Class</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>{classes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
          </div>
        </section>

        {loading && <div className="student-page-state">Loading your class leaderboard…</div>}
        {!loading && error && <div className="student-page-error" role="alert"><p>{error}</p></div>}
        {!loading && !error && !classes.length && <div className="student-page-empty"><h2>Join a class to see its leaderboard</h2><p>Your class ranking will appear here after you join a class.</p><Link to="/student/dashboard" className="button button-primary">Go to dashboard</Link></div>}
        {!loading && !error && selectedClass && <>
          <section className="leaderboard-summary" aria-label="Your class ranking">
            <div><span className="summary-label">YOUR CURRENT RANK</span><strong>{myRank ? `#${myRank}` : '—'}</strong><span className="summary-caption">in {selectedClass.name}</span></div>
            <div className="leaderboard-summary-mark" aria-hidden="true">✦</div>
          </section>
          <section className="leaderboard-card" aria-labelledby="leaderboard-table-title">
            <div className="leaderboard-card-heading"><div><p className="dashboard-section-kicker">A LITTLE PROGRESS ADDS UP</p><h2 id="leaderboard-table-title">{selectedClass.name}</h2></div><span>{selectedClass.students.length} learners</span></div>
            {selectedClass.students.length ? <div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th scope="col">Rank</th><th scope="col">Student</th><th scope="col">Streak</th><th scope="col">Solved</th></tr></thead><tbody>
              {selectedClass.students.map((student) => <tr className={student.uid === user?.uid ? 'leaderboard-self' : ''} key={student.uid}>
                <td><span className={`leaderboard-rank ${student.rank <= 3 ? `rank-${student.rank}` : ''}`}>{student.rank <= 3 ? ['①', '②', '③'][student.rank - 1] : student.rank}</span></td>
                <td><div className="leaderboard-student"><span className="leaderboard-avatar">{initials(student.name)}</span><span>{student.name}{student.uid === user?.uid && <small>You</small>}</span></div></td>
                <td><span className="leaderboard-streak">🔥 {student.streak} days</span></td>
                <td>{student.totalSolved}</td>
              </tr>)}
            </tbody></table></div> : <p className="leaderboard-no-students">Your teacher will add learners to this class soon.</p>}
            <p className="leaderboard-kind-note">Rankings are here to encourage practice. Your learning pace is your own.</p>
          </section>
        </>}
      </div>
    </main>
  )
}
