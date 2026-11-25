import { Link, useParams } from 'react-router-dom'

export default function ProblemPlaceholder() {
  const { assignmentId } = useParams()
  return (
    <main className="auth-status-page">
      <section className="auth-status-card">
        <span className="status-spark" aria-hidden="true">⌘</span>
        <p className="eyebrow">LAB WORKSPACE</p>
        <h1>Your coding space is next</h1>
        <p>This assignment is ready for the IDE task. We’ll add the problem view and editor in the next phase.</p>
        <p className="problem-id-note">Assignment: {assignmentId}</p>
        <Link className="button button-primary" to="/student/dashboard">Back to dashboard</Link>
      </section>
    </main>
  )
}
