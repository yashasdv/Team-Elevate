import { useState } from 'react'
import { apiRequest } from '../../services/apiClient.js'

const modes = [
  { id: 'guide', label: 'Guide me', icon: '✦' },
  { id: 'explain', label: 'Explain code', icon: '☷' },
  { id: 'optimize', label: 'Optimize', icon: '↗' },
]

function ExplainResult({ items }) {
  if (!Array.isArray(items) || !items.length) return <p className="ai-empty-result">No explanation was returned. Try again in a moment.</p>
  return (
    <ol className="ai-explanation-list">
      {items.map((item, index) => (
        <li key={`${item.line ?? index}-${index}`}>
          <span className="ai-line-number">Line {item.line ?? index + 1}</span>
          <code>{item.code || ''}</code>
          <p>{item.explanation || ''}</p>
        </li>
      ))}
    </ol>
  )
}

function OptimizeResult({ result }) {
  if (!result) return null
  return (
    <div className="ai-optimize-result">
      <div className="ai-complexity-grid">
        <div><span>Time</span><strong>{result.timeComplexity || '—'}</strong></div>
        <div><span>Space</span><strong>{result.spaceComplexity || '—'}</strong></div>
      </div>
      {typeof result.isCorrect === 'boolean' && <p className={`ai-correctness ${result.isCorrect ? 'is-correct' : 'needs-work'}`}>{result.isCorrect ? 'Your solution looks correct.' : 'There may be a case your solution misses.'}</p>}
      {result.suggestion && <p className="ai-suggestion">{result.suggestion}</p>}
    </div>
  )
}

export default function AiPanel({ user, code, assignment, errorOutput = '', demo = false }) {
  const [activeMode, setActiveMode] = useState('guide')
  const [hintLevel, setHintLevel] = useState(0)
  const [results, setResults] = useState({})
  const [errors, setErrors] = useState({})
  const [loadingMode, setLoadingMode] = useState('')

  async function requestHelp(mode) {
    if (demo) {
      setErrors((current) => ({ ...current, [mode]: 'Sign in with Google or GitHub to use AI mentoring.' }))
      return
    }

    const nextHintLevel = mode === 'guide' ? Math.min(hintLevel + 1, 3) : hintLevel
    const paths = { guide: '/api/ai/guide', explain: '/api/ai/explain', optimize: '/api/ai/optimize' }
    const bodies = {
      guide: {
        problemTitle: assignment.title,
        problemDescription: assignment.description,
        studentCode: code,
        errorOutput,
        hintLevel: nextHintLevel || 1,
      },
      explain: { code },
      optimize: { code, problemDescription: assignment.description },
    }

    setLoadingMode(mode)
    setErrors((current) => ({ ...current, [mode]: '' }))
    try {
      const result = await apiRequest(paths[mode], user, {
        method: 'POST',
        body: JSON.stringify(bodies[mode]),
      })
      setResults((current) => ({ ...current, [mode]: result }))
      if (mode === 'guide') setHintLevel(nextHintLevel || 1)
    } catch (error) {
      setErrors((current) => ({ ...current, [mode]: error.message || 'The mentoring request could not be completed.' }))
    } finally {
      setLoadingMode('')
    }
  }

  const result = results[activeMode]
  const guideMessage = result?.message
  const explainItems = result?.explanation

  return (
    <section className="ai-panel-card" aria-labelledby="ai-panel-title">
      <div className="ai-panel-heading">
        <div><p className="ide-panel-kicker">A LITTLE GUIDANCE</p><h2 id="ai-panel-title">AI mentor</h2></div>
        <span className="ai-panel-spark" aria-hidden="true">✦</span>
      </div>
      <div className="ai-tabs" role="tablist" aria-label="AI mentoring tools">
        {modes.map((mode) => (
          <button
            aria-selected={activeMode === mode.id}
            className={`ai-tab ${activeMode === mode.id ? 'active' : ''}`}
            id={`ai-tab-${mode.id}`}
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            role="tab"
            type="button"
          ><span aria-hidden="true">{mode.icon}</span>{mode.label}</button>
        ))}
      </div>
      <div className="ai-tab-content" role="tabpanel" aria-labelledby={`ai-tab-${activeMode}`}>
        <p className="ai-mode-description">
          {activeMode === 'guide' && 'Get a gentle nudge that helps you think through the next step.'}
          {activeMode === 'explain' && 'Ask for a plain-language explanation of each line in your code.'}
          {activeMode === 'optimize' && 'Review correctness, time and space complexity, and possible improvements.'}
        </p>
        {errors[activeMode] && <p className="ai-error" role="alert">{errors[activeMode]}</p>}
        {activeMode === 'guide' && guideMessage && <div className="ai-hint-result"><span>HINT {result.hintLevel || hintLevel}</span><p>{guideMessage}</p></div>}
        {activeMode === 'explain' && result && <ExplainResult items={explainItems} />}
        {activeMode === 'optimize' && result && <OptimizeResult result={result} />}
        {activeMode === 'guide' && !guideMessage && result && <p className="ai-empty-result">No hint was returned. Try again in a moment.</p>}
        <div className="ai-action-row">
          {activeMode === 'guide' && hintLevel > 0 && <span className="ai-hint-count">Hint {hintLevel} of 3</span>}
          <button
            className="ai-action-button"
            disabled={Boolean(loadingMode) || (activeMode === 'guide' && hintLevel >= 3)}
            onClick={() => requestHelp(activeMode)}
            type="button"
          >{loadingMode === activeMode ? 'Thinking…' : activeMode === 'guide' ? (hintLevel === 0 ? 'Get a hint' : 'Next hint') : activeMode === 'explain' ? 'Explain my code' : 'Review my solution'}</button>
        </div>
        {demo && <p className="ai-demo-note">Preview mode · sign in to send mentoring requests.</p>}
      </div>
    </section>
  )
}
