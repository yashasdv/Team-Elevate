import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AiPanel from '../../components/ai/AiPanel.jsx'
import Editor from '../../components/ide/Editor.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
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
    if (isDemoUser) {
      const sampleOutput = assignment.testCases
        ?.map((testCase) => testCase.expected ?? testCase.expectedOutput ?? testCase.output)
        .filter((value) => value !== undefined && value !== null)
        .join('\n') || '(sample output is not available for this lab)'
      setRunError('')
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
    } catch (error) {
      setRunError(error.message || 'We could not run your code. Please try again.')
    } finally {
      setRunning(false)
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
                {runResult.testResults && <TestResults results={runResult.testResults} />}
                <div className="ide-stream"><span>Standard output</span><pre>{runResult.stdout || '(no output)'}</pre></div>
                {runResult.stderr && <div className="ide-stream ide-stderr"><span>Error output</span><pre>{runResult.stderr}</pre></div>}
              </> : <p className="ide-output-empty">Your program’s output will appear here.</p>}
            </section>
            <div className="ide-run-row">
              {isDemoUser && <span className="ide-demo-note">Demo run shows the sample output.</span>}
              <button className="ide-run-button" disabled={running} onClick={runCode} type="button"><span aria-hidden="true">{running ? '◌' : '▶'}</span>{running ? 'Running code…' : 'Run code'}</button>
            </div>
            <AiPanel user={user} code={code} assignment={assignment} errorOutput={runResult?.stderr || runError} demo={isDemoUser} />
          </div>
        </div>
      </div>
    </main>
  )
}
