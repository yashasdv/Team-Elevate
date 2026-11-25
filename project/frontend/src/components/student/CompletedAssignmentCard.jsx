import { useNavigate } from 'react-router-dom'

function formatCompletedDate(value) {
  if (!value) return ''
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export default function CompletedAssignmentCard({ assignment }) {
  const navigate = useNavigate()
  const completedDate = formatCompletedDate(assignment.completedAt)
  return (
    <article className="completed-assignment-card">
      <div className="completed-assignment-icon" aria-hidden="true">✓</div>
      <div className="completed-assignment-main">
        <div className="completed-assignment-meta"><span>{assignment.classNames?.join(', ') || 'Class assignment'}</span>{completedDate && <span>Completed {completedDate}</span>}</div>
        <h3>{assignment.title}</h3>
        <p>{assignment.description}</p>
      </div>
      <button className="completed-assignment-review" onClick={() => navigate(`/student/problem/${assignment.id}`)} type="button">Review <span aria-hidden="true">→</span></button>
    </article>
  )
}
