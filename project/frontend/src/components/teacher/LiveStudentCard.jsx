import './LiveStudentCard.css';

function sessionState(student) {
  const score = Number(student.struggleScore ?? 0);
  if (student.status === 'struggling' || score >= 3) return 'struggling';
  if (['passed', 'pass', 'completed', 'complete'].includes(student.status)) return 'passed';
  return 'working';
}

function formatUpdatedAt(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : null;
  if (!date || Number.isNaN(date.getTime())) return 'Waiting for update';
  return `Updated ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function LiveStudentCard({ student, onInspect }) {
  const state = sessionState(student);
  const stateLabel = state === 'passed' ? 'Passed' : state === 'struggling' ? 'Struggling' : 'Working';
  const latestError = String(student.latestError ?? student.error ?? '').trim();
  const score = Number(student.struggleScore ?? 0);

  return (
    <article className={`live-student-card live-student-card--${state}`}>
      <div className="live-student-card__topline">
        <span className={`live-student-card__status live-student-card__status--${state}`}>
          <span className="live-student-card__status-dot" aria-hidden="true" />
          {stateLabel}
        </span>
        <span className="live-student-card__updated">{formatUpdatedAt(student.updatedAt)}</span>
      </div>

      <div className="live-student-card__identity">
        <span className="live-student-card__avatar" aria-hidden="true">
          {(student.displayName || 'S').trim().slice(0, 1).toUpperCase()}
        </span>
        <div className="live-student-card__name-block">
          <h3>{student.displayName || 'Student'}</h3>
          <p>{student.college || 'Student session'}</p>
        </div>
      </div>

      {state === 'struggling' ? (
        <div className="live-student-card__signal live-student-card__signal--error">
          <span className="live-student-card__signal-label">LATEST ERROR</span>
          <p title={latestError || 'Repeated errors reported'}>
            {latestError || 'Repeated errors reported'}
          </p>
          <span className="live-student-card__score">Struggle score {score}</span>
        </div>
      ) : state === 'passed' ? (
        <div className="live-student-card__signal live-student-card__signal--passed">
          <span className="live-student-card__signal-label">STATUS</span>
          <p>All tests passed</p>
        </div>
      ) : (
        <div className="live-student-card__signal">
          <span className="live-student-card__signal-label">CURRENT ACTIVITY</span>
          <p>{latestError || 'Working through the assignment'}</p>
        </div>
      )}

      <footer className="live-student-card__footer">
        <span className="live-student-card__student-id">{student.id}</span>
        <button type="button" onClick={() => onInspect(student)}>Inspect code</button>
      </footer>
    </article>
  );
}
