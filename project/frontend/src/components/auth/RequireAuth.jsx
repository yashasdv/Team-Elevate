import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

function AuthStatus({ title, message, children }) {
  return (
    <main className="auth-status-page">
      <section className="auth-status-card" aria-live="polite">
        <span className="status-spark" aria-hidden="true">✦</span>
        <p className="eyebrow">CODEMENTOR AI</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {children}
      </section>
    </main>
  )
}

export function AuthLoading() {
  return <AuthStatus title="One moment…" message="We’re getting your learning space ready." />
}

export function ProfileCheckError() {
  const { profileError, refreshProfile, signOut, user } = useAuth()
  return (
    <AuthStatus title="We couldn’t load your profile" message={profileError}>
      <button className="button button-primary" onClick={() => refreshProfile(user)} type="button">Try again</button>
      <button className="button button-link" onClick={signOut} type="button">Sign out</button>
    </AuthStatus>
  )
}

export default function RequireAuth({ children, needsProfile = false }) {
  const { user, authLoading, profileStatus } = useAuth()

  if (authLoading || profileStatus === 'checking') return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (profileStatus === 'error') return <ProfileCheckError />
  if (profileStatus === 'other-role') {
    return <AuthStatus title="This space is for students" message="Your account is set up with a different role. Ask your teacher if you think this is a mistake." />
  }
  if (needsProfile && profileStatus === 'complete') return <Navigate to="/student/dashboard" replace />
  if (!needsProfile && profileStatus === 'needs-setup') return <Navigate to="/profile-setup" replace />
  return children
}
