import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { getStudentDashboardData } from '../../services/studentDashboard.js'
import StreakCard from '../../components/student/StreakCard.jsx'
import DailyGoalCard from '../../components/student/DailyGoalCard.jsx'
import CompletedAssignmentCard from '../../components/student/CompletedAssignmentCard.jsx'
import DailyPracticeCard from '../../components/student/DailyPracticeCard.jsx'
import StudentPageHeader from '../../components/student/StudentPageHeader.jsx'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function AssignmentLoading() {
  return (
    <div className="completed-assignment-loading" aria-label="Loading completed assignments" aria-live="polite">
      {[0, 1].map((item) => <div className="completed-assignment-skeleton" key={item} />)}
    </div>
  )
}

function TopicCard({ title, topics, kind }) {
  const isStrong = kind === 'strong'
  return (
    <section className={`dashboard-topic-card topic-card-${kind}`}>
      <div className="dashboard-topic-heading"><span aria-hidden="true">{isStrong ? '↗' : '◎'}</span><div><p>{isStrong ? 'YOUR BRIGHT SPOTS' : 'A LITTLE PRACTICE'}</p><h2>{title}</h2></div></div>
      {topics?.length ? <ul>{topics.slice(0, 3).map((topic, index) => {
        const name = typeof topic === 'string' ? topic : topic.name || topic.topic || 'Topic'
        const detail = typeof topic === 'string' ? '' : topic.detail || topic.note || ''
        return <li key={`${name}-${index}`}><strong>{name}</strong>{detail && <span>{detail}</span>}</li>
      })}</ul> : <p className="dashboard-topic-empty">Solve a few labs and your topics will appear here.</p>}
    </section>
  )
}

export default function Dashboard() {
  const { user, isDemoUser, signOut } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizCompleted, setQuizCompleted] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDashboard(await getStudentDashboardData(user, { demo: isDemoUser }))
    } catch (loadError) {
      setError(loadError.code === 'permission-denied'
        ? 'Your student account cannot read its learning records yet. Ask the Firebase/Firestore owner to check student access rules.'
        : loadError.message || 'We could not load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, isDemoUser])

  const markQuizComplete = useCallback(() => setQuizCompleted(true), [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const name = user?.displayName || 'learner'
  const firstName = name.split(' ')[0]
  const dailyGoalTarget = dashboard?.dailyGoalTarget || 2
  const dailyGoalProgress = Math.min(dailyGoalTarget, (dashboard?.dailyGoalProgress || 0) + (quizCompleted ? 1 : 0))
  const completedAssignments = dashboard?.completedAssignments || []

  return (
    <div className="student-app-layout">
      <StudentPageHeader user={user} signOut={signOut} active="dashboard" />
      <main className="dashboard-page">
        <div className="dashboard-content-shell">
          <section className="dashboard-greeting" aria-labelledby="dashboard-title">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING SPACE</p>
              <h1 id="dashboard-title">{getGreeting()}, <span>{firstName}!</span></h1>
              <p>You’re building skills one small win at a time. Let’s keep it going.</p>
            </div>
            <div className="dashboard-greeting-badge" aria-hidden="true"><span>✦</span><small>YOU’VE GOT THIS</small></div>
          </section>

          {error && <div className="dashboard-load-error" role="alert"><p>{error}</p><button className="button button-link" onClick={loadDashboard} type="button">Try again</button></div>}

          <section className="dashboard-stats dashboard-stats-redesigned" aria-label="Your learning at a glance">
            <StreakCard streak={dashboard?.streak || 0} longestStreak={dashboard?.longestStreak || 0} />
            <DailyGoalCard progress={dailyGoalProgress} target={dailyGoalTarget} />
            <article className="dashboard-stat-card solved-stat-card">
              <div className="dashboard-stat-icon solved-icon" aria-hidden="true">✓</div>
              <div className="dashboard-stat-copy"><p className="dashboard-stat-label">PROBLEMS SOLVED</p><p className="dashboard-stat-value">{dashboard?.totalSolved || 0}<span>total</span></p><p className="dashboard-stat-note">Every attempt counts.</p></div>
            </article>
            <article className="dashboard-stat-card completed-stat-card">
              <div className="dashboard-stat-icon completed-stat-icon" aria-hidden="true">✧</div>
              <div className="dashboard-stat-copy"><p className="dashboard-stat-label">LABS COMPLETED</p><p className="dashboard-stat-value">{completedAssignments.length}<span>labs</span></p><p className="dashboard-stat-note">Look how far you’ve come.</p></div>
            </article>
          </section>

          <div className="dashboard-main-grid dashboard-main-grid-redesigned">
            <section className="assignments-section completed-section" aria-labelledby="completed-title">
              <div className="dashboard-section-heading">
                <div><p className="dashboard-section-kicker">YOUR WINS</p><h2 id="completed-title">Completed assignments</h2></div>
                {!loading && <span className="assignment-count">{completedAssignments.length} completed</span>}
              </div>
              {loading && <AssignmentLoading />}
              {!loading && dashboard?.completedAssignmentsUnavailable && <div className="completed-assignment-notice" role="status">Completed labs will appear after your submission access is set up in Firestore.</div>}
              {!loading && !dashboard?.completedAssignmentsUnavailable && completedAssignments.length > 0 && <div className="completed-assignment-list">{completedAssignments.map((assignment) => <CompletedAssignmentCard assignment={assignment} key={assignment.id} />)}</div>}
              {!loading && !dashboard?.completedAssignmentsUnavailable && completedAssignments.length === 0 && <div className="assignment-empty-state completed-empty-state"><span className="empty-state-icon" aria-hidden="true">✧</span><h3>Your first completed lab is waiting.</h3><p>Finish a lab from your class and you’ll see it celebrated here.</p></div>}
            </section>

            <aside className="dashboard-sidebar dashboard-sidebar-redesigned" aria-label="Daily practice and topics">
              <DailyPracticeCard userId={user?.uid || 'student'} weakTopics={dashboard?.weakTopics || []} onCompleted={markQuizComplete} />
              <TopicCard title="Topics you’re growing in" topics={dashboard?.weakTopics || []} kind="weak" />
              <TopicCard title="Your strengths" topics={dashboard?.strongTopics || []} kind="strong" />
            </aside>
          </div>
        </div>
        <footer className="dashboard-footer"><span>Made for curious minds.</span><span className="footer-code">&lt;learn /&gt;</span></footer>
      </main>
    </div>
  )
}
