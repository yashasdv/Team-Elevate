import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthLoading } from '../../components/auth/RequireAuth.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'

function getFriendlyError(error) {
  const knownErrors = {
    'auth/popup-closed-by-user': 'The sign-in window was closed before you finished. Try again when you’re ready.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
    'auth/cancelled-popup-request': 'A sign-in window is already open. Finish that sign-in first.',
    'auth/unauthorized-domain': 'This website address is not allowed in Firebase yet. Add localhost to your Firebase authorized domains.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet. Ask the project owner to enable it.',
    'auth/account-exists-with-different-credential': 'This email already uses another sign-in method. Use that method to sign in.',
  }
  return knownErrors[error?.code] || error?.message || 'Sign-in did not work. Please try again.'
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.1H12v3.98h5.38a4.6 4.6 0 0 1-2 3.02v2.58h3.24c1.9-1.75 2.98-4.33 2.98-7.48Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.45l-3.24-2.58c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.58-4.12H3.08v2.66A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.81A6 6 0 0 1 6.1 12c0-.63.11-1.24.32-1.81V7.53H3.08A10 10 0 0 0 2 12c0 1.62.39 3.15 1.08 4.47l3.34-2.66Z"/><path fill="#EA4335" d="M12 6.07c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.96 3.07 14.7 2 12 2a10 10 0 0 0-8.92 5.53l3.34 2.66C7.2 7.83 9.4 6.07 12 6.07Z"/></svg>
}

function GitHubMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.68-3.75-1.32-3.75-1.32-.5-1.29-1.24-1.64-1.24-1.64-1.01-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.47-.28-5.06-1.24-5.06-5.51 0-1.22.44-2.21 1.15-2.99-.12-.29-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.66.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.28-2.6 5.22-5.08 5.5.4.35.76 1.02.76 2.06v3.09c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg>
}

export default function Login() {
  const {
    user,
    authLoading,
    profileStatus,
    profileError,
    firebaseConfigured,
    demoLoginAvailable,
    startDemoSession,
    signInWithGoogle,
    signInWithGitHub,
    refreshProfile,
  } = useAuth()
  const [busyProvider, setBusyProvider] = useState('')
  const [error, setError] = useState('')

  if (user && (authLoading || profileStatus === 'checking')) return <AuthLoading />
  if (user && profileStatus === 'needs-setup') return <Navigate to="/profile-setup" replace />
  if (user && profileStatus === 'complete') return <Navigate to="/student/dashboard" replace />

  async function startSignIn(provider, action) {
    setBusyProvider(provider)
    setError('')
    try {
      await action()
    } catch (signInError) {
      setError(getFriendlyError(signInError))
    } finally {
      setBusyProvider('')
    }
  }

  return (
    <main className="auth-page">
      <header className="topbar auth-topbar">
        <a className="brand" href="/" aria-label="CodeMentor AI home">
          <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
          <span>CodeMentor <span className="brand-ai">AI</span></span>
        </a>
        <span className="setup-pill"><span className="status-dot" /> Your student space</span>
      </header>

      <div className="auth-layout">
        <section className="auth-story">
          <p className="eyebrow"><span className="eyebrow-line" /> A FRIENDLY PLACE TO PRACTICE</p>
          <h1>Curiosity is<br /><span>a great first step.</span></h1>
          <p className="auth-story-copy">Sign in to find your assignments, keep your progress, and get guidance while you learn.</p>
          <div className="auth-quote"><span aria-hidden="true">✦</span><p>Small steps count. Start where you are.</p></div>
        </section>

        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card-heading">
            <p className="card-kicker">WELCOME TO YOUR WORKSPACE</p>
            <h2 id="login-title">Sign in to continue</h2>
            <p>Choose an account to securely open your student portal.</p>
          </div>

          {!firebaseConfigured && (
            <div className="auth-message auth-message-info" role="status">
              Live Google and GitHub sign-in need the Firebase web app values in <code>.env.local</code>.
            </div>
          )}

          {error && <div className="auth-message auth-message-error" role="alert">{error}</div>}
          {user && profileStatus === 'error' && (
            <div className="auth-message auth-message-error" role="alert">
              {profileError}
              <button className="inline-action" onClick={() => refreshProfile(user)} type="button">Retry profile check</button>
            </div>
          )}
          {user && profileStatus === 'other-role' && (
            <div className="auth-message auth-message-info" role="status">This account is set up for a different role. Please use a student account.</div>
          )}

          <div className="provider-buttons">
            <button
              className="provider-button"
              disabled={!firebaseConfigured || Boolean(busyProvider)}
              onClick={() => startSignIn('google', signInWithGoogle)}
              type="button"
            >
              <GoogleMark />
              <span>{busyProvider === 'google' ? 'Opening Google…' : 'Continue with Google'}</span>
            </button>
            <button
              className="provider-button provider-button-dark"
              disabled={!firebaseConfigured || Boolean(busyProvider)}
              onClick={() => startSignIn('github', signInWithGitHub)}
              type="button"
            >
              <GitHubMark />
              <span>{busyProvider === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}</span>
            </button>
          </div>

          {demoLoginAvailable && (
            <div className="demo-preview">
              <div className="demo-divider"><span>Dashboard preview</span></div>
              <button className="provider-button demo-preview-button" onClick={startDemoSession} type="button">
                Continue with demo student
              </button>
              <p className="demo-preview-note">Local preview with sample data. No sign-in or class request is sent.</p>
            </div>
          )}

          <p className="auth-privacy">Your account is used to save your learning progress.</p>
        </section>
      </div>
      <footer className="auth-footer"><span>Made for curious minds.</span><span className="footer-code">&lt;learn /&gt;</span></footer>
    </main>
  )
}
