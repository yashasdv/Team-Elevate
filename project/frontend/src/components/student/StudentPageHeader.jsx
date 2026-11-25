import { Link } from 'react-router-dom'

function initialsFor(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S'
}

export default function StudentPageHeader({ user, signOut, active }) {
  const name = user?.displayName || 'Student'
  return (
    <header className="topbar student-page-topbar">
      <Link className="brand" to="/student/dashboard" aria-label="CodeMentor AI home">
        <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
        <span>CodeMentor <span className="brand-ai">AI</span></span>
      </Link>
      <nav className="student-page-nav" aria-label="Student pages">
        <Link className={active === 'dashboard' ? 'active' : ''} to="/student/dashboard">Dashboard</Link>
        <Link className={active === 'leaderboard' ? 'active' : ''} to="/student/leaderboard">Leaderboard</Link>
        <Link className={active === 'progress' ? 'active' : ''} to="/student/progress">Progress</Link>
      </nav>
      <div className="dashboard-account">
        <span className="dashboard-user-name">{name}</span>
        <span className="student-avatar" aria-hidden="true">{initialsFor(name)}</span>
        <button className="button button-link signout-link" onClick={signOut} type="button">Sign out</button>
      </div>
    </header>
  )
}
