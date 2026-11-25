import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import AiPanel from '../../components/ai/AiPanel.jsx'
import Editor from '../../components/ide/Editor.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { db } from '../../lib/firebase.js'
import { apiRequest } from '../../services/apiClient.js'
import { getStudentAssignment } from '../../services/studentDashboard.js'

function TestResults({ results }) {
  if (!results?.length) return null
  const passed = results.filter((item) => item.passed).length
  return (
    <div className="ide-test-results" aria-live="polite">
      <div className="ide-console-heading"><span>Test cases</span><span>{passed}/{results.length} passed</span></div>
      {results.map((item, index) => (
        <div className={`ide-test-row ${item.passed ? 'test-passed' : 'test-failed'}`} key={index}>
          <span aria-hidden="true">{item.passed ? '✓' : '×'}</span>
          <span>Test {index + 1}</span>
          <span>{item.passed ? 'Passed' : 'Needs another try'}</span>
        </div>
      ))}
    </div>
  )
}

function ConfettiBurst() {
  return <div className="submission-confetti" aria-hidden="true">{Array.from({ length: 44 }, (_, index) => <span key={index} style={{ '--confetti-x': `${(index * 37) % 100}%`, '--confetti-delay': `${(index % 11) * 35}ms`, '--confetti-hue': `${(index * 47) % 360}`, '--confetti-drift': `${((index * 29) % 240) - 120}px` }} />)}</div>
}

export default function ProblemView() {
  const { assignmentId } = useParams()
  const { user, isDemoUser, signOut } = useAuth()
  const [assignment, setAssignment] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [outputTab, setOutputTab] = useState('tests')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const allTestsPassed = Boolean(runResult?.testResults?.length)
    && runResult.testResults.every((result) => result.passed === true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    getStudentAssignment(user, assignmentId, { demo: isDemoUser })
      .then((item) => {
        if (!cancelled) {
          setAssignment(item)
          if (!item) setLoadError('This lab could not be found. It may have been removed or is not available to your class.')
        }
      })
      .catch((error) => { if (!cancelled) setLoadError(error.message || 'We could not load this lab.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, assignmentId, isDemoUser])

  async function runCode() {
    setSubmitted(false)
    setSubmitError('')
    if (isDemoUser) {
      const sampleOutput = assignment.testCases
        ?.map((testCase) => testCase.expected ?? testCase.expectedOutput ?? testCase.output)
        .filter((value) => value !== undefined && value !== null)
        .join('\n') || '(sample output is not available for this lab)'
      setRunError('')
      setOutputTab('output')
      setRunResult({
        exitCode: 0,
        stdout: sampleOutput,
        stderr: '',
        testResults: [],
        demoPreview: true,
      })
      return
    }
    setRunning(true)
    setRunError('')
    setRunResult(null)
    setOutputTab('tests')
    try {
      const result = await apiRequest('/api/execute', user, {
        method: 'POST',
        body: JSON.stringify({
          code,
          stdin: assignment.testCases?.[0]?.input || '',
          testCases: assignment.testCases || [],
        }),
      })
      setRunResult(result)
      setOutputTab(result.testResults?.length ? 'tests' : result.stderr ? 'errors' : 'output')
    } catch (error) {
      setRunError(error.message || 'We could not run your code. Please try again.')
      setOutputTab('errors')
    } finally {
      setRunning(false)
    }
  }

  async function submitSolution() {
    if (!allTestsPassed || isDemoUser || !user || !db || submitting || submitted) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await addDoc(collection(db, 'submissions'), {
        studentId: user.uid,
        assignmentId,
        code,
        status: 'passed',
        testResults: runResult.testResults.map(({ passed }) => ({ passed: Boolean(passed) })),
        submittedAt: serverTimestamp(),
      })
      setSubmitted(true)
      setShowConfetti(true)
      window.setTimeout(() => setShowConfetti(false), 2600)
    } catch (error) {
      setSubmitError(error.code === 'permission-denied'
        ? 'Your submission passed, but Firestore is not allowing saves yet. Ask the project owner to check the submissions write rules.'
        : error.message || 'We could not save your submission. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="ide-state-page"><p>Opening your lab…</p></main>
  if (loadError) {
    return (
      <main className="ide-state-page">
        <section className="ide-state-card" role="alert"><p className="eyebrow">LAB WORKSPACE</p><h1>We couldn’t open this lab</h1><p>{loadError}</p><Link className="button button-primary" to="/student/dashboard">Back to dashboard</Link></section>
      </main>
    )
  }

  return (
    <main className="ide-page">
      {showConfetti && <ConfettiBurst />}
      <header className="topbar ide-topbar">
        <Link className="brand" to="/student/dashboard" aria-label="Back to dashboard"><span className="brand-mark" aria-hidden="true">&lt;/&gt;</span><span>CodeMentor <span className="brand-ai">AI</span></span></Link>
        <div className="ide-topbar-actions"><span className="ide-user-name">{user?.displayName || 'Student'}</span><button className="button button-link signout-link" onClick={signOut} type="button">Sign out</button></div>
      </header>

      <div className="ide-content">
        <div className="ide-breadcrumb"><Link to="/student/dashboard">My dashboard</Link><span>/</span><span>{assignment.className || 'Lab workspace'}</span></div>
        <div className="ide-workspace-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> CODING LAB</p><h1>{assignment.title}</h1></div><span className="ide-language-pill"><span /> Python</span></div>

        <div className="ide-workspace-grid">
          <section className="ide-problem-card" aria-labelledby="problem-description-title">
            <p className="ide-panel-kicker">THE CHALLENGE</p>
            <h2 id="problem-description-title">Problem description</h2>
            <p className="ide-problem-description">{assignment.description}</p>
            {assignment.examples?.length > 0 && <div className="ide-example-block"><h3>Example</h3>{assignment.examples.map((example, index) => <div className="ide-example" key={index}><p><span>Input</span><code>{example.input ?? example.stdin ?? '—'}</code></p><p><span>Output</span><code>{example.output ?? example.expected ?? '—'}</code></p></div>)}</div>}
            {assignment.constraints?.length > 0 && <div className="ide-constraints"><h3>Constraints</h3><ul>{assignment.constraints.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
            <div className="ide-kind-note"><span aria-hidden="true">✦</span><p>Take it one step at a time. You can run your code whenever you’re ready.</p></div>
          </section>

          <div className="ide-work-area">
            <Editor userId={user?.uid || 'student'} problemId={assignmentId} starterCode={assignment.starterCode || '# Write your solution here\n'} value={code} onChange={setCode} />
            <section className="ide-console-card" aria-label="Program output">
              <div className="ide-console-heading"><span>Output</span><span>{running ? 'Running…' : runResult?.demoPreview ? 'Sample preview' : runResult ? (runResult.exitCode === 0 ? 'Finished' : 'Exited with an error') : 'Ready when you are'}</span></div>
              {runError && <p className="ide-run-error" role="alert">{runError}</p>}
              {runResult ? <>
                {runResult.demoPreview && <p className="ide-demo-output-note">Sample output for this lab. Demo mode does not execute or validate your code.</p>}
                <div className="ide-console-tabs" role="tablist" aria-label="Run results">
                  {runResult.testResults?.length > 0 && <button aria-selected={outputTab === 'tests'} className={outputTab === 'tests' ? 'active' : ''} onClick={() => setOutputTab('tests')} role="tab" type="button">Tests <span>{runResult.testResults.filter((item) => item.passed).length}/{runResult.testResults.length}</span></button>}
                  <button aria-selected={outputTab === 'output'} className={outputTab === 'output' ? 'active' : ''} onClick={() => setOutputTab('output')} role="tab" type="button">Output</button>
                  <button aria-selected={outputTab === 'errors'} className={outputTab === 'errors' ? 'active' : ''} onClick={() => setOutputTab('errors')} role="tab" type="button">Errors{runResult.stderr ? ' •' : ''}</button>
                </div>
                <div className="ide-console-tab-panel" role="tabpanel">
                  {outputTab === 'tests' && <TestResults results={runResult.testResults} />}
                  {outputTab === 'output' && <div className="ide-stream"><span>Standard output</span><pre>{runResult.stdout || '(no output)'}</pre></div>}
                  {outputTab === 'errors' && (runResult.stderr ? <div className="ide-stream ide-stderr"><span>Error output</span><pre>{runResult.stderr}</pre></div> : <p className="ide-output-empty">No errors in this run.</p>)}
                </div>
              </> : <p className="ide-output-empty">Your program’s output will appear here.</p>}
            </section>
            {submitError && <p className="ide-submit-error" role="alert">{submitError}</p>}
            {submitted && <p className="ide-submit-success" role="status">Solution saved. Great work—you passed every test!</p>}
            {isDemoUser && <p className="ide-submit-demo-note" role="note">Demo mode shows sample output only. Connect the live runner to validate and submit a solution.</p>}
            <div className="ide-run-row">
              {isDemoUser && <span className="ide-demo-note">Demo run shows the sample output.</span>}
              {allTestsPassed && !isDemoUser && <button className="ide-submit-button" disabled={submitting || submitted} onClick={submitSolution} type="button"><span aria-hidden="true">{submitted ? '✓' : '✦'}</span>{submitted ? 'Submitted' : submitting ? 'Saving…' : 'Submit solution'}</button>}
              <button className="ide-run-button" disabled={running} onClick={runCode} type="button"><span aria-hidden="true">{running ? '◌' : '▶'}</span>{running ? 'Running code…' : 'Run code'}</button>
            </div>
            <AiPanel user={user} code={code} assignment={assignment} errorOutput={runResult?.stderr || runError} demo={isDemoUser} />
          </div>
        </div>
      </div>
    </main>
  )
}
