import { useNavigate } from 'react-router-dom'

function formatDueDate(value) {
  if (!value) return ''
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function difficultyClass(difficulty) {
  const value = String(difficulty || 'starter').toLowerCase()
  if (value.includes('hard') || value.includes('advanced')) return 'difficulty-hard'
  if (value.includes('medium') || value.includes('intermediate')) return 'difficulty-medium'
  return 'difficulty-easy'
}

export default function AssignmentCard({ assignment }) {
  const navigate = useNavigate()
  const dueDate = formatDueDate(assignment.dueAt)
  return (
    <article className="assignment-card">
      <div className="assignment-card-topline">
        <span className={`difficulty-badge ${difficultyClass(assignment.difficulty)}`}>{assignment.difficulty}</span>
        {dueDate && <span className="assignment-due">Due {dueDate}</span>}
      </div>
      <p className="assignment-class">{assignment.classNames?.join(', ') || 'Class assignment'}</p>
      <h3>{assignment.title}</h3>
      <p className="assignment-description">{assignment.description}</p>
      <button className="assignment-start" onClick={() => navigate(`/student/problem/${assignment.id}`)} type="button">
        Start lab <span aria-hidden="true">→</span>
      </button>
    </article>
  )
}
