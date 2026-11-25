import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentPageHeader from '../../components/student/StudentPageHeader.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { getStudentProgress } from '../../services/studentDashboard.js'

function formatPracticeTime(minutes) {
  if (!minutes) return '0 min'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours ? `${hours} hr${hours === 1 ? '' : 's'} ${remainingMinutes ? `${remainingMinutes} min` : ''}`.trim() : `${remainingMinutes} min`
}

function TopicList({ title, topics, type, emptyMessage }) {
  return (
    <section className={`progress-topics-card topics-${type}`}>
      <div className="progress-topics-heading"><span aria-hidden="true">{type === 'strong' ? '↗' : '◎'}</span><div><p className="dashboard-section-kicker">{type === 'strong' ? 'KEEP IT UP' : 'ROOM TO GROW'}</p><h2>{title}</h2></div></div>
      {topics.length ? <ul className="progress-topic-list">{topics.map((topic, index) => <li key={`${topic.name}-${index}`}><span className="topic-name">{topic.name}</span>{topic.detail && <span className="topic-detail">{topic.detail}</span>}</li>)}</ul> : <p className="progress-empty-topics">{emptyMessage}</p>}
    </section>
  )
}

export default function Progress() {
  const { user, isDemoUser, signOut } = useAuth()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getStudentProgress(user, { demo: isDemoUser })
      .then((result) => { if (!cancelled) setProgress(result) })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || 'We could not load your progress yet.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, isDemoUser])

  return (
    <div className="student-app-layout">
      <StudentPageHeader user={user} signOut={signOut} active="progress" />
      <main className="student-page">
      <div className="student-page-content">
        <section className="student-page-intro">
          <p className="eyebrow"><span className="eyebrow-line" /> YOUR GROWTH, IN VIEW</p>
          <div className="student-page-title-row"><div><h1>Your progress</h1><p>Notice what’s getting easier and choose what you’d like to practice next.</p></div></div>
        </section>
        {loading && <div className="student-page-state">Gathering your learning progress…</div>}
        {!loading && error && <div className="student-page-error" role="alert"><p>{error}</p><Link to="/student/dashboard" className="button button-primary">Back to dashboard</Link></div>}
        {!loading && !error && progress && <>
          {progress.source === 'firestore' && <p className="progress-source-note" role="status">Showing the progress saved to your student record. Live analytics are temporarily unavailable.</p>}
          <section className="progress-stat-grid" aria-label="Progress summary">
            <article className="progress-stat-card"><span className="progress-stat-icon">✓</span><div><p>Problems solved</p><strong>{progress.totalSolved}</strong></div></article>
            <article className="progress-stat-card"><span className="progress-stat-icon streak">🔥</span><div><p>Current streak</p><strong>{progress.streak}<small> days</small></strong></div></article>
            <article className="progress-stat-card"><span className="progress-stat-icon time">◷</span><div><p>Practice time</p><strong>{formatPracticeTime(progress.totalPracticeMinutes)}</strong></div></article>
            <article className="progress-stat-card"><span className="progress-stat-icon rank">✦</span><div><p>Class rank</p><strong>{progress.rank ? `#${progress.rank}` : '—'}</strong></div></article>
          </section>
          <div className="progress-topics-grid">
            <TopicList title="Topics you’re growing in" topics={progress.weakTopics} type="weak" emptyMessage="You’re building your first learning signals. Keep practicing and topics will appear here." />
            <TopicList title="Your strengths" topics={progress.strongTopics} type="strong" emptyMessage="Your strengths will show up as you solve more problems." />
          </div>
          <section className="progress-next-step"><span aria-hidden="true">✦</span><div><h2>Keep your momentum</h2><p>One small practice session is a good next step.</p></div><Link to="/student/dashboard">Find a lab <span aria-hidden="true">→</span></Link></section>
        </>}
      </div>
      </main>
    </div>
  )
}
