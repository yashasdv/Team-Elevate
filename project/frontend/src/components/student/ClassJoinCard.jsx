import { useState } from 'react'
import { joinClass } from '../../services/studentDashboard.js'

export default function ClassJoinCard({ user, onJoined, demo = false }) {
  const [classCode, setClassCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  async function handleSubmit(event) {
    event.preventDefault()
    if (demo) {
      setMessage('This is a local preview. Class requests are turned off.')
      setMessageType('info')
      setClassCode('')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const result = await joinClass(user, classCode)
      setMessage(result.message || 'Your class request was sent.')
      setMessageType('success')
      setClassCode('')
      onJoined?.()
    } catch (error) {
      setMessage(error.status === 404 ? 'We could not find that class code. Check it and try again.' : error.message)
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="join-class-card" aria-labelledby="join-class-title">
      <div className="join-card-heading">
        <span className="join-card-icon" aria-hidden="true">⌁</span>
        <div>
          <p className="dashboard-section-kicker">LEARNING TOGETHER</p>
          <h2 id="join-class-title">Join your class</h2>
        </div>
      </div>
      <p className="join-card-description">Enter the code your teacher shared to see your class labs.</p>
      <form className="join-class-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="class-code">Class code</label>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          id="class-code"
          maxLength={16}
          onChange={(event) => setClassCode(event.target.value.toUpperCase())}
          placeholder="CS101-XK9P"
          required
          value={classCode}
        />
        <button className="button button-primary" disabled={submitting || !classCode.trim()} type="submit">
          {submitting ? 'Sending…' : 'Send request'}
        </button>
      </form>
      {message && <p className={`join-message join-message-${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</p>}
    </section>
  )
}
