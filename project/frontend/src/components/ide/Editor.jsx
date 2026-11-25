import { useEffect, useMemo, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'

export default function Editor({ userId, problemId, starterCode, value, onChange, onReset }) {
  const storageKey = useMemo(() => `codementor_draft_${userId}_${problemId}`, [userId, problemId])
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(storageKey)
    onChange(savedDraft ?? starterCode ?? '')
    setDraftReady(true)
  }, [storageKey, starterCode])

  useEffect(() => {
    if (!draftReady) return undefined
    const timer = window.setTimeout(() => window.localStorage.setItem(storageKey, value), 1000)
    return () => window.clearTimeout(timer)
  }, [draftReady, storageKey, value])

  function resetCode() {
    window.localStorage.removeItem(storageKey)
    onChange(starterCode || '')
    onReset?.()
  }

  return (
    <section className="ide-editor-card" aria-label="Python code editor">
      <div className="ide-editor-toolbar">
        <div className="ide-file-label"><span className="python-file-icon">Py</span><span>solution.py</span></div>
        <button className="ide-secondary-button" onClick={resetCode} type="button">Reset code</button>
      </div>
      <div className="ide-monaco-wrap">
        <MonacoEditor
          height="100%"
          language="python"
          theme="vs-dark"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            tabSize: 4,
            padding: { top: 18, bottom: 18 },
            roundedSelection: false,
            cursorBlinking: 'smooth',
            wordWrap: 'on',
          }}
        />
      </div>
      <p className="ide-save-note" aria-live="polite">Draft saves on this device automatically.</p>
    </section>
  )
}
