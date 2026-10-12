// Incidents page — Phase 1a skeleton with correct layout and empty state.
// Incident list and workflow will be implemented in Phase 2c.
export default function Incidents() {
  const FILTERS = ['All', 'Needs Review', 'Urgent', 'In Progress', 'Closed'];

  return (
    <div className="incidents-page">
      <div className="incidents-header">
        <h1>Incidents</h1>
        <div className="filter-tabs" role="tablist" aria-label="Filter incidents">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              className={`filter-tab${i === 0 ? ' active' : ''}`}
              role="tab"
              aria-selected={i === 0}
              id={`filter-${f.toLowerCase().replace(' ', '-')}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="incidents-body" style={{ alignItems: 'stretch' }}>
        {/* List column */}
        <div className="incidents-list">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">✓</div>
            <h3>No active alerts</h3>
            <p>
              Go to <strong>Park Overview</strong> and trigger a demo scenario
              to see incidents appear here.
            </p>
          </div>
        </div>

        {/* Detail column */}
        <div className="incident-detail-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: 380 }}>
            <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Select an incident from the list to view details, acknowledge, assign a guard,
              and record the outcome.
            </p>
            <p style={{ fontSize: '13px', marginTop: '12px', color: 'var(--text-muted)' }}>
              Full incident workflow coming in Phase 2.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
