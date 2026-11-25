export default function StreakCard({ streak = 0, longestStreak = 0 }) {
  return (
    <article className="dashboard-stat-card streak-stat-card">
      <div className="dashboard-stat-icon streak-icon" aria-hidden="true">🔥</div>
      <div className="dashboard-stat-copy">
        <p className="dashboard-stat-label">ACTIVE STREAK</p>
        <p className="dashboard-stat-value">{streak}<span>{streak === 1 ? 'day' : 'days'}</span></p>
        <p className="dashboard-stat-note">Best streak: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}</p>
      </div>
    </article>
  )
}
