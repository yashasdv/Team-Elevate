import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import StudentPageHeader from '../../components/student/StudentPageHeader.jsx'
import { getStudentAssignments } from '../../services/studentDashboard.js'

const filters = [
  { id: 'all', label: 'All assignments', key: 'total' },
  { id: 'completed', label: 'Completed', key: 'completed' },
  { id: 'not-completed', label: 'Not completed', key: 'notCompleted' },
  { id: 'not-started', label: 'Not started', key: 'notStarted' },
]

function formatDate(value) {
  if (!value) return ''
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function AssignmentStatusCard({ assignment }) {
  const completed = assignment.status === 'completed'
  const inProgress = assignment.status === 'in-progress'
  const status = completed ? 'Completed' : inProgress ? 'In progress' : 'Not started'
  return (
    <article className={`assignment-dashboard-card assignment-status-${assignment.status}`}>
      <div className="assignment-dashboard-card-top">
        <span className="assignment-status-pill"><span aria-hidden="true">{completed ? '✓' : inProgress ? '◷' : '○'}</span>{status}</span>
        <span className="assignment-difficulty-pill">{assignment.difficulty || 'Starter'}</span>
      </div>
      <p className="assignment-dashboard-class">{assignment.classNames?.join(', ') || 'Class assignment'}</p>
      <h2>{assignment.title}</h2>
      <p className="assignment-dashboard-description">{assignment.description}</p>
      <div className="assignment-dashboard-card-bottom">
        {completed && assignment.completedAt && <span className="assignment-completed-date">Finished {formatDate(assignment.completedAt)}</span>}
        <Link className={`assignment-dashboard-action ${completed ? 'action-review' : ''}`} to={`/student/problem/${assignment.id}`}>
          {completed ? 'Review assignment' : inProgress ? 'Continue assignment' : 'Start assignment'} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

function AssignmentStat({ label, value, icon, tone }) {
  return (
    <article className={`assignment-stat-card assignment-stat-${tone}`}>
      <span className="assignment-stat-icon" aria-hidden="true">{icon}</span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </article>
  )
}

export default function Assignments() {
  const { user, isDemoUser, signOut } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    getStudentAssignments(user, { demo: isDemoUser })
      .then((result) => { if (!cancelled) setData(result) })
      .catch((loadError) => { if (!cancelled) setError(loadError.code === 'permission-denied'
        ? 'Your account cannot read the class assignments or submission status yet. Ask the class owner to check the student Firestore rules.'
        : loadError.message || 'We could not load your assignments.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, isDemoUser])

  const assignments = data?.assignments || []
  const counts = data?.counts || { total: 0, completed: 0, notCompleted: 0, notStarted: 0 }
  const visibleAssignments = useMemo(() => {
    if (activeFilter === 'completed') return assignments.filter((item) => item.status === 'completed')
    if (activeFilter === 'not-completed') return assignments.filter((item) => item.status !== 'completed')
    if (activeFilter === 'not-started') return assignments.filter((item) => item.status === 'not-started')
    return assignments
  }, [activeFilter, assignments])

  return (
    <div className="student-app-layout">
      <StudentPageHeader user={user} signOut={signOut} active="assignments" />
      <main className="student-page assignments-page">
        <div className="student-page-content">
          <section className="student-page-intro assignments-page-intro">
            <p className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING PATH</p>
            <div className="student-page-title-row"><div><h1>Assignments</h1><p>Every assignment is another chance to grow. Pick up where you left off.</p></div><span className="assignments-hero-spark" aria-hidden="true">✦</span></div>
          </section>

          <section className="assignment-stats-grid" aria-label="Assignment totals">
            <AssignmentStat label="Total assignments" value={counts.total} icon="▤" tone="total" />
            <AssignmentStat label="Completed" value={counts.completed} icon="✓" tone="completed" />
            <AssignmentStat label="Not completed" value={counts.notCompleted} icon="◷" tone="open" />
          </section>

          <section className="assignment-browser-card" aria-labelledby="assignment-list-title">
            <div className="assignment-browser-heading"><div><p className="dashboard-section-kicker">YOUR CLASSWORK</p><h2 id="assignment-list-title">All assignments</h2></div><span>{counts.total} {counts.total === 1 ? 'assignment' : 'assignments'}</span></div>
            <div className="assignment-filter-row" aria-label="Filter assignments">
              {filters.map((filter) => <button aria-pressed={activeFilter === filter.id} className={`assignment-filter ${activeFilter === filter.id ? 'active' : ''}`} key={filter.id} onClick={() => setActiveFilter(filter.id)} type="button">{filter.label}<span>{counts[filter.key] || 0}</span></button>)}
            </div>

            {loading && <div className="assignment-dashboard-grid" aria-label="Loading assignments" aria-live="polite">{[0, 1, 2].map((item) => <div className="assignment-dashboard-skeleton" key={item} />)}</div>}
            {!loading && error && <div className="student-page-error" role="alert">{error}</div>}
            {!loading && !error && visibleAssignments.length > 0 && <div className="assignment-dashboard-grid">{visibleAssignments.map((assignment) => <AssignmentStatusCard assignment={assignment} key={assignment.id} />)}</div>}
            {!loading && !error && visibleAssignments.length === 0 && <div className="assignment-dashboard-empty"><span aria-hidden="true">✧</span><h3>{assignments.length ? 'Nothing in this section yet.' : 'Your assignments will appear here.'}</h3><p>{assignments.length ? 'Try another filter to see the rest of your classwork.' : 'Join a class or check back when your teacher shares a lab.'}</p></div>}
          </section>
        </div>
      </main>
    </div>
  )
}
