export default function DailyGoalCard({ progress = 0, target = 2 }) {
  const safeTarget = Math.max(1, target)
  const safeProgress = Math.max(0, progress)
  const percentage = Math.min(100, Math.round((safeProgress / safeTarget) * 100))

  return (
    <article className="dashboard-stat-card goal-stat-card">
      <div className="dashboard-stat-icon goal-icon" aria-hidden="true">✦</div>
      <div className="dashboard-stat-copy">
        <p className="dashboard-stat-label">TODAY’S PRACTICE GOAL</p>
        <p className="dashboard-stat-value">{safeProgress}<span>of {safeTarget} problems</span></p>
        <div
          className="goal-progress-track"
          role="progressbar"
          aria-label="Daily problem goal progress"
          aria-valuemin={0}
          aria-valuemax={safeTarget}
          aria-valuenow={Math.min(safeProgress, safeTarget)}
        >
          <span className="goal-progress-fill" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </article>
  )
}
