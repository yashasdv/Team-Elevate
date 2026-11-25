import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

const academicYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other']

export default function ProfileSetup() {
  const { user, saveStudentProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [college, setCollege] = useState('')
  const [year, setYear] = useState('1st Year')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await saveStudentProfile({
        displayName: displayName.trim(),
        college: college.trim(),
        year,
      })
      navigate('/student/dashboard', { replace: true })
    } catch (saveError) {
      setError(saveError.message || 'Your profile could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="auth-page">
      <header className="topbar auth-topbar">
        <a className="brand" href="/" aria-label="CodeMentor AI home">
          <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
          <span>CodeMentor <span className="brand-ai">AI</span></span>
        </a>
        <button className="button button-link signout-link" onClick={signOut} type="button">Sign out</button>
      </header>

      <div className="profile-layout">
        <section className="profile-story">
          <p className="eyebrow"><span className="eyebrow-line" /> YOUR FIRST STEP</p>
          <h1>Let’s make this<br /><span>space yours.</span></h1>
          <p>Share a few details so your learning space can welcome you properly.</p>
          <div className="profile-progress" aria-label="Setup step one of one">
            <span className="progress-check" aria-hidden="true">✓</span>
            <div><strong>Student profile</strong><small>A quick one-time setup</small></div>
          </div>
        </section>

        <section className="auth-card profile-card" aria-labelledby="profile-title">
          <div className="auth-card-heading">
            <p className="card-kicker">JUST THE BASICS</p>
            <h2 id="profile-title">Set up your profile</h2>
            <p>You can update these details later.</p>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="displayName">Full name</label>
            <input
              autoComplete="name"
              id="displayName"
              maxLength={120}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should we call you?"
              required
              value={displayName}
            />

            <label className="field-label" htmlFor="college">College name</label>
            <input
              autoComplete="organization"
              id="college"
              maxLength={160}
              onChange={(event) => setCollege(event.target.value)}
              placeholder="Your college or university"
              required
              value={college}
            />

            <label className="field-label" htmlFor="year">Academic year</label>
            <select id="year" onChange={(event) => setYear(event.target.value)} value={year}>
              {academicYears.map((academicYear) => <option key={academicYear} value={academicYear}>{academicYear}</option>)}
            </select>

            <label className="field-label" htmlFor="role">Role</label>
            <select id="role" disabled value="student">
              <option value="student">Student</option>
            </select>
            <p className="field-help">Your role is set by the student portal.</p>

            {error && <div className="auth-message auth-message-error" role="alert">{error}</div>}
            <button className="button button-primary profile-submit" disabled={saving} type="submit">
              {saving ? 'Saving your profile…' : 'Save and continue'}
              {!saving && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </section>
      </div>
      <footer className="auth-footer"><span>Made for curious minds.</span><span className="footer-code">&lt;learn /&gt;</span></footer>
    </main>
  )
}
