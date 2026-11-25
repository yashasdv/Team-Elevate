import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { getStudentDashboardData } from '../../services/studentDashboard.js'
import StreakCard from '../../components/student/StreakCard.jsx'
import DailyGoalCard from '../../components/student/DailyGoalCard.jsx'
import ClassJoinCard from '../../components/student/ClassJoinCard.jsx'
import AssignmentCard from '../../components/student/AssignmentCard.jsx'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function initialsFor(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S'
}

function AssignmentLoading() {
  return (
    <div className="assignment-grid" aria-label="Loading assignments" aria-live="polite">
      {[0, 1].map((item) => <div className="assignment-skeleton" key={item} />)}
    </div>
  )
}

export default function Dashboard() {
  const { user, isDemoUser, signOut } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDashboard(await getStudentDashboardData(user, { demo: isDemoUser }))
    } catch (loadError) {
      setError(loadError.code === 'permission-denied'
        ? 'Your student account cannot read these class records yet. Ask the Firebase/Firestore owner to check the student access rules.'
        : loadError.message || 'We could not load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, isDemoUser])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const name = user?.displayName || 'learner'

  return (
    <main className="dashboard-page">
      <header className="topbar dashboard-topbar">
        <a className="brand" href="/student/dashboard" aria-label="CodeMentor AI home">
          <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
          <span>CodeMentor <span className="brand-ai">AI</span></span>
        </a>
        <div className="dashboard-account">
          <span className="dashboard-user-name">{name}</span>
          <span className="student-avatar" aria-hidden="true">{initialsFor(name)}</span>
          <button className="button button-link signout-link" onClick={signOut} type="button">Sign out</button>
        </div>
      </header>

      <div className="dashboard-content-shell">
        <section className="dashboard-greeting" aria-labelledby="dashboard-title">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING SPACE</p>
            <h1 id="dashboard-title">{getGreeting()}, <span>{name.split(' ')[0]}.</span></h1>
            <p>Small steps make strong coders. Ready for one more?</p>
          </div>
          <div className="greeting-decoration" aria-hidden="true"><span>✦</span><span>⌘</span><span>·</span></div>
        </section>

        <section className="dashboard-stats" aria-label="Your learning progress">
          <StreakCard streak={dashboard?.streak || 0} longestStreak={dashboard?.longestStreak || 0} />
          <DailyGoalCard progress={dashboard?.dailyGoalProgress || 0} target={dashboard?.dailyGoalTarget || 2} />
          <article className="dashboard-stat-card solved-stat-card">
            <div className="dashboard-stat-icon solved-icon" aria-hidden="true">✓</div>
            <div className="dashboard-stat-copy">
              <p className="dashboard-stat-label">PROBLEMS SOLVED</p>
              <p className="dashboard-stat-value">{dashboard?.totalSolved || 0}<span>total</span></p>
              <p className="dashboard-stat-note">Every attempt helps you grow.</p>
            </div>
          </article>
        </section>

        <div className="dashboard-main-grid">
          <section className="assignments-section" aria-labelledby="assignments-title">
            <div className="dashboard-section-heading">
              <div>
                <p className="dashboard-section-kicker">PICK UP WHERE YOU LEFT OFF</p>
                <h2 id="assignments-title">Active assignments</h2>
              </div>
              {dashboard?.assignments?.length > 0 && <span className="assignment-count">{dashboard.assignments.length} labs</span>}
            </div>

            {loading && <AssignmentLoading />}
            {!loading && error && (
              <div className="dashboard-load-error" role="alert">
                <p>{error}</p>
                <button className="button button-link" onClick={loadDashboard} type="button">Try loading again</button>
              </div>
            )}
            {!loading && !error && dashboard?.assignments?.length > 0 && (
              <div className="assignment-grid">
                {dashboard.assignments.map((assignment) => <AssignmentCard assignment={assignment} key={assignment.id} />)}
              </div>
            )}
            {!loading && !error && dashboard?.assignments?.length === 0 && (
              <div className="assignment-empty-state">
                <span className="empty-state-icon" aria-hidden="true">✧</span>
                <h3>{dashboard?.classes?.length ? 'You’re all caught up.' : 'Your labs will appear here.'}</h3>
                <p>{dashboard?.classes?.length ? 'Your teacher has not shared a new lab yet. Take a little break or review an earlier problem.' : 'Join a class with the code from your teacher to see your assignments.'}</p>
              </div>
            )}
          </section>

          <aside className="dashboard-sidebar" aria-label="Class and study information">
            <ClassJoinCard user={user} onJoined={loadDashboard} demo={isDemoUser} />
            <section className="gentle-reminder-card">
              <span className="reminder-icon" aria-hidden="true">✦</span>
              <p className="dashboard-section-kicker">A GENTLE REMINDER</p>
              <p>It’s okay to get stuck. That’s where learning begins.</p>
            </section>
          </aside>
        </div>
      </div>
      <footer className="dashboard-footer"><span>Made for curious minds.</span><span className="footer-code">&lt;learn /&gt;</span></footer>
    </main>
  )
}
