import { useEffect, useRef } from 'react';
import './CodeInspectModal.css';

export default function CodeInspectModal({ student, onClose }) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  if (!student) return null;

  return (
    <div
      className="code-inspect-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="code-inspect-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-inspect-title"
      >
        <header className="code-inspect-modal__header">
          <div>
            <p className="code-inspect-modal__eyebrow">LIVE CODE / READ ONLY</p>
            <h2 id="code-inspect-title">{student.displayName}’s code</h2>
            <p className="code-inspect-modal__subheading">Student ID: {student.id}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="code-inspect-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close code inspection"
          >
            ×
          </button>
        </header>
        <pre className="code-inspect-modal__code"><code>{student.code || '# No code has been shared yet.'}</code></pre>
        <footer className="code-inspect-modal__footer">
          <span>{student.code ? `${student.code.split('\n').length} lines` : 'Waiting for student code'}</span>
          <button type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}
