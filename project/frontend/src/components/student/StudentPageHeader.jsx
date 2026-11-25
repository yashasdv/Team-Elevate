import { Link } from 'react-router-dom'

function initialsFor(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S'
}

export default function StudentPageHeader({ user, signOut, active }) {
  const name = user?.displayName || 'Student'
  return (
    <aside className="student-sidebar">
      <Link className="brand" to="/student/dashboard" aria-label="CodeMentor AI home">
        <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
        <span>CodeMentor <span className="brand-ai">AI</span></span>
      </Link>
      <p className="student-sidebar-label">YOUR SPACE</p>
      <nav className="student-page-nav" aria-label="Student pages">
        <Link className={active === 'dashboard' ? 'active' : ''} to="/student/dashboard"><span aria-hidden="true">⌂</span>Dashboard</Link>
        <Link className={active === 'assignments' ? 'active' : ''} to="/student/assignments"><span aria-hidden="true">▤</span>Assignments</Link>
        <Link className={active === 'leaderboard' ? 'active' : ''} to="/student/leaderboard"><span aria-hidden="true">♕</span>Leaderboard</Link>
        <Link className={active === 'progress' ? 'active' : ''} to="/student/progress"><span aria-hidden="true">◷</span>Progress</Link>
      </nav>
      <div className="student-sidebar-bottom">
        <div className="student-sidebar-encouragement"><span aria-hidden="true">✦</span><p>Small steps build big skills.</p></div>
        <div className="student-sidebar-account">
          <span className="student-avatar" aria-hidden="true">{initialsFor(name)}</span>
          <span className="student-sidebar-name">{name}</span>
          <button aria-label="Sign out" className="sidebar-signout" onClick={signOut} title="Sign out" type="button">↗</button>
        </div>
      </div>
    </aside>
  )
}
