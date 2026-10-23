import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { POLES } from '../data/parkData';
import { usePark } from '../context/ParkContext';
import StatusLabel from '../components/StatusLabel';

export default function Incidents() {
  const {
    incidents,
    selectedIncidentId,
    setSelectedIncidentId,
    acknowledgeIncident,
    assignGuard,
    markArrived,
    resolveIncident,
    markFalseAlarm,
    guards,
    setSelectedPoleId,
    setOverviewSelection,
    setCameraView,
    setSelectedSectorId,
    setPerspPose,
  } = usePark();

  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Needs Review' | 'Urgent' | 'In Progress' | 'Closed'>('All');
  const [selectedGuardToAssign, setSelectedGuardToAssign] = useState<string>('G01');
  const [resolveNote, setResolveNote] = useState<string>('');
  const [showResolveForm, setShowResolveForm] = useState<boolean>(false);
  const [falseAlarmNote, setFalseAlarmNote] = useState<string>('');
  const [showFalseAlarmForm, setShowFalseAlarmForm] = useState<boolean>(false);

  const FILTERS: ('All' | 'Needs Review' | 'Urgent' | 'In Progress' | 'Closed')[] = [
    'All',
    'Needs Review',
    'Urgent',
    'In Progress',
    'Closed',
  ];

  // Keep selectedGuardToAssign pointed at an available guard when possible
  useEffect(() => {
    const current = guards.find((g) => g.id === selectedGuardToAssign);
    if (!current || current.availability === 'busy') {
      const nextAvailable = guards.find((g) => g.availability === 'available');
      if (nextAvailable) {
        setSelectedGuardToAssign(nextAvailable.id);
      }
    }
  }, [guards, selectedGuardToAssign]);

  const filteredIncidents = incidents.filter((inc) => {
    if (activeFilter === 'All') return true;
    const closed = inc.status === 'resolved' || inc.status === 'false_alarm';
    if (activeFilter !== 'Closed' && closed) return false;
    if (activeFilter === 'Needs Review') {
      return inc.priority === 'needs_review' || inc.status === 'open';
    }
    if (activeFilter === 'Urgent') {
      return inc.priority === 'urgent';
    }
    if (activeFilter === 'In Progress') {
      return inc.status === 'acknowledged' || inc.status === 'assigned' || inc.status === 'investigating';
    }
    if (activeFilter === 'Closed') {
      return inc.status === 'resolved' || inc.status === 'false_alarm';
    }
    return true;
  });

  const selectedIncident =
    filteredIncidents.find((i) => i.id === selectedIncidentId) || filteredIncidents[0] || null;
  const selectedId = selectedIncident?.id ?? null;
  useEffect(() => {
    setSelectedIncidentId(selectedId);
    setResolveNote('');
    setFalseAlarmNote('');
    setShowResolveForm(false);
    setShowFalseAlarmForm(false);
  }, [selectedId, setSelectedIncidentId]);

  const mapPole = POLES.find((pole) => pole.id === selectedIncident?.poleId);
  const locateOnMap = () => {
    if (!selectedIncident || !mapPole) return;
    const [x, z] = mapPole.position;
    setSelectedPoleId(mapPole.id);
    setOverviewSelection({ type: 'pole', poleId: mapPole.id });
    setCameraView('3d');
    setSelectedSectorId(null);
    setPerspPose({ position: [x + 18, 28, z + 25], target: [x, 0, z] });
    navigate('/', { state: { locatedIncidentId: selectedIncident.id } });
  };
  const assignedIds =
    selectedIncident?.assignedGuardIds ??
    (selectedIncident?.assignedGuardId ? [selectedIncident.assignedGuardId] : []);
  const assignedGuardsList = guards.filter((g) => assignedIds.includes(g.id));
  const availableGuardsCount = guards.filter((g) => g.availability === 'available').length;
  const selectedCandidateGuard = guards.find((g) => g.id === selectedGuardToAssign);
  const canDispatchCandidate =
    Boolean(selectedCandidateGuard) &&
    selectedCandidateGuard?.availability === 'available';

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !resolveNote.trim()) return;
    resolveIncident(selectedIncident.id, resolveNote.trim());
    setResolveNote('');
    setShowResolveForm(false);
  };

  const handleFalseAlarmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !falseAlarmNote.trim()) return;
    markFalseAlarm(selectedIncident.id, falseAlarmNote.trim());
    setFalseAlarmNote('');
    setShowFalseAlarmForm(false);
  };

  const isClosed =
    selectedIncident?.status === 'resolved' || selectedIncident?.status === 'false_alarm';

  return (
    <div className="incidents-page">
      {/* Header bar */}
      <div className="incidents-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ marginBottom: '4px' }}>Incidents</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Review possible distress alerts, inspect sensor &amp; camera context, dispatch guards, and record outcomes.
            </p>
          </div>
          <div className="filter-tabs" role="tablist" aria-label="Filter incidents">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`filter-tab${activeFilter === f ? ' active' : ''}`}
                role="tab"
                aria-selected={activeFilter === f}
                id={`filter-${f.toLowerCase().replace(' ', '-')}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main split body */}
      <div className="incidents-body">
        {/* Left column: Incident List */}
        <div className="incidents-list" role="list" aria-label="Incident alerts list">
          {filteredIncidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                ✓
              </div>
              <h3>No active alerts</h3>
              <p>
                {activeFilter === 'All'
                  ? 'Go to Park Overview and trigger a demo scenario to see incidents appear here.'
                  : `No incidents matching the "${activeFilter}" filter.`}
              </p>
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const count = inc.occurrenceCount ?? 1;
              return (
                <article
                  key={inc.id}
                  className={`incident-card ${inc.priority}${isSelected ? ' selected' : ''}`}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIncidentId(inc.id);
                    }
                  }}
                  aria-label={`${inc.displayType} at ${inc.zoneName}`}
                >
                  <div className="incident-card-header">
                    <span className="incident-card-title">
                      {inc.displayType}
                      {count > 1 && (
                        <span
                          style={{
                            marginLeft: '6px',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            fontSize: 'var(--text-sm)',
                            background: 'rgba(45, 184, 176, 0.18)',
                            color: 'var(--accent)',
                            border: '1px solid rgba(45, 184, 176, 0.35)',
                          }}
                          title="Merged duplicate sensor detections within 30s window"
                        >
                          ×{count}
                        </span>
                      )}
                    </span>
                    <span className="incident-card-time">{inc.createdAt}</span>
                  </div>
                  <div className="incident-card-location">
                    {inc.zoneName} · {inc.poleId}
                  </div>
                  <div className="incident-card-footer">
                    <StatusLabel level={inc.priority} />
                    <StatusLabel level={inc.status} />
                    <StatusLabel level={inc.sourceMode} />
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right column: Full-Width 2-Column Incident Dossier */}
        <div className="incident-detail-panel" aria-label="Incident details">
          {!selectedIncident ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                📋
              </div>
              <h3>No incident selected</h3>
              <p>
                Select an incident from the list to view telemetry details, assign guards, and record outcomes.
              </p>
            </div>
          ) : (
            <div className="incident-detail-content">
              <div className="incident-dossier-grid">
                {/* ── Left Dossier Column: Summary + Guard Actions ── */}
                <div className="incident-dossier-col">
                  {/* Header Info Card */}
                  <section className="detail-header-card">
                    <div className="detail-title-row">
                      <div>
                        <span
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          ID: {selectedIncident.id}
                          {(selectedIncident.occurrenceCount ?? 1) > 1
                            ? ` · Merged (${selectedIncident.occurrenceCount} signals in 30s)`
                            : ''}
                        </span>
                        <h2>{selectedIncident.displayType}</h2>
                      </div>
                      <div className="detail-badges">
                        <StatusLabel level={selectedIncident.priority} />
                        <StatusLabel level={selectedIncident.status} />
                        <StatusLabel level={selectedIncident.sourceMode} />
                      </div>
                    </div>

                    <div className="detail-reason-box">
                      <strong>Detection Note:</strong> {selectedIncident.reason}
                    </div>

                    <div className="detail-grid">
                      <div>
                        <div className="detail-item-label">Location Area</div>
                        <div className="detail-item-value">{selectedIncident.zoneName}</div>
                        <button className="btn btn-secondary" onClick={locateOnMap} disabled={!mapPole}>Locate on map</button>
                        <div className="detail-item-label">{mapPole ? 'Approximate location based on recorded sensor / pole.' : 'Map location unavailable for this case.'}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Sensor / Pole</div>
                        <div className="detail-item-value">{selectedIncident.poleId}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Time Logged</div>
                        <div className="detail-item-value">{selectedIncident.createdAt}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Assigned Guard</div>
                        <div
                          className="detail-item-value"
                          style={{
                            color: assignedGuardsList.length > 0 ? 'var(--accent)' : 'var(--text-muted)',
                          }}
                        >
                          {assignedGuardsList.length > 0
                            ? assignedGuardsList.map((g) => `${g.displayName} (${g.role})`).join(', ')
                            : 'Unassigned'}
                        </div>
                      </div>
                      {selectedIncident.score !== undefined && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div className="detail-item-label">Model Score (Uncalibrated)</div>
                          <div
                            className="detail-item-value"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                          >
                            <span>{(selectedIncident.score * 100).toFixed(0)}%</span>
                            <span
                              style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: 'normal',
                                color: 'var(--text-muted)',
                              }}
                            >
                              Model anomaly score only — not a calibrated emergency probability.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Action Controls Card */}
                  <section className="detail-actions-card">
                    <h3>Guard Response Actions</h3>

                    {isClosed ? (
                      <div className="notice notice-ok">
                        This incident has been closed (
                        {selectedIncident.status === 'resolved' ? 'Resolved' : 'False Alarm'}
                        ). Assigned officer has been released back to patrol.
                      </div>
                    ) : (
                      <>
                        <div className="actions-toolbar">
                          {selectedIncident.status === 'open' && (
                            <button
                              id="btn-acknowledge"
                              className="btn btn-primary"
                              onClick={() => acknowledgeIncident(selectedIncident.id)}
                            >
                              ✓ Acknowledge Incident
                            </button>
                          )}

                          {selectedIncident.status === 'assigned' && (
                            <button
                              id="btn-mark-arrived"
                              className="btn btn-primary"
                              onClick={() => markArrived(selectedIncident.id)}
                            >
                              📍 Mark Officer Arrived on Scene
                            </button>
                          )}

                          <button
                            id="btn-toggle-resolve"
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowResolveForm((prev) => !prev);
                              setShowFalseAlarmForm(false);
                            }}
                          >
                            ✓ Resolve Incident
                          </button>

                          <button
                            id="btn-toggle-false-alarm"
                            className="btn btn-ghost"
                            onClick={() => {
                              setShowFalseAlarmForm((prev) => !prev);
                              setShowResolveForm(false);
                            }}
                          >
                            ✕ Mark False Alarm
                          </button>
                        </div>

                        {/* Guard Assignment Section */}
                        {assignedGuardsList.length > 0 && (
                          <div
                            className="notice notice-info"
                            style={{ marginTop: '12px', fontSize: 'var(--text-sm)' }}
                          >
                            <strong>Assigned Responder(s):</strong>{' '}
                            {assignedGuardsList.map((g) => `${g.displayName} (${g.role})`).join(', ')}{' '}
                            {selectedIncident.status === 'investigating'
                              ? 'are currently on scene investigating.'
                              : 'have been dispatched. Click "Mark Officer Arrived on Scene" once they reach the location.'}
                          </div>
                        )}

                        {(availableGuardsCount > 0 || assignedGuardsList.length === 0) && (
                          <div
                            className="guard-assign-row"
                            style={{ marginTop: assignedGuardsList.length > 0 ? '12px' : '0' }}
                          >
                            <label
                              htmlFor="guard-select"
                              style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}
                            >
                              {assignedGuardsList.length > 0 ? 'Assign Backup Guard:' : 'Assign Guard:'}
                            </label>
                            <select
                              id="guard-select"
                              className="form-control"
                              style={{ width: 'auto', minWidth: 230 }}
                              value={selectedGuardToAssign}
                              onChange={(e) => setSelectedGuardToAssign(e.target.value)}
                            >
                              {guards.map((g) => (
                                <option
                                  key={g.id}
                                  value={g.id}
                                  disabled={g.availability === 'busy'}
                                >
                                  {g.displayName} ({g.role}) —{' '}
                                  {g.availability === 'available' ? 'Available' : 'Busy (Assigned)'}
                                </option>
                              ))}
                            </select>
                            <button
                              id="btn-assign-guard"
                              className="btn btn-secondary"
                              disabled={!canDispatchCandidate}
                              onClick={() =>
                                assignGuard(selectedIncident.id, selectedGuardToAssign)
                              }
                            >
                              {availableGuardsCount === 0
                                ? 'All Guards Busy'
                                : assignedGuardsList.length > 0
                                ? 'Dispatch Backup Guard'
                                : 'Dispatch Guard'}
                            </button>
                          </div>
                        )}

                        {/* Outcome Note Form for Resolve */}
                        {showResolveForm && (
                          <form className="note-input-box" onSubmit={handleResolveSubmit}>
                            <label htmlFor="resolve-note-input" className="form-label">
                              Resolution Outcome Note (Required):
                            </label>
                            <input
                              id="resolve-note-input"
                              type="text"
                              className="form-control"
                              placeholder="e.g. Checked on resident; confirmed safe and walking home."
                              value={resolveNote}
                              onChange={(e) => setResolveNote(e.target.value)}
                              required
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button type="submit" className="btn btn-primary btn-sm">
                                Confirm &amp; Resolve
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowResolveForm(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Reason Note Form for False Alarm */}
                        {showFalseAlarmForm && (
                          <form className="note-input-box" onSubmit={handleFalseAlarmSubmit}>
                            <label htmlFor="false-alarm-note-input" className="form-label">
                              False Alarm Reason Note (Required):
                            </label>
                            <input
                              id="false-alarm-note-input"
                              type="text"
                              className="form-control"
                              placeholder="e.g. Resident was stretching on grass; not a fall."
                              value={falseAlarmNote}
                              onChange={(e) => setFalseAlarmNote(e.target.value)}
                              required
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button type="submit" className="btn btn-danger btn-sm">
                                Confirm False Alarm
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowFalseAlarmForm(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    )}
                  </section>
                </div>

                {/* ── Right Dossier Column: Evidence Context + Activity Trail ── */}
                <div className="incident-dossier-col">
                  {/* Sensor, Lighting & Camera Evidence Context Card */}
                  <section className="detail-actions-card">
                    <h3>Sensor, Lighting &amp; Camera Context</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.55)',
                          borderRadius: '8px',
                          border: '1px solid rgba(56, 189, 248, 0.22)',
                        }}
                      >
                        <div className="detail-item-label" style={{ marginBottom: '4px' }}>
                          Sensor Observation Basis
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                          {selectedIncident.sensorBasis ||
                            'Simulated threshold event logged by park monitoring node.'}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.55)',
                          borderRadius: '8px',
                          border: '1px solid rgba(250, 204, 21, 0.25)',
                        }}
                      >
                        <div className="detail-item-label" style={{ marginBottom: '4px' }}>
                          Safety Lighting Response
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: '#fde68a', lineHeight: 1.45 }}>
                          {selectedIncident.lightingResponseNote ||
                            'Standard virtual pathway lighting maintained (70%).'}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.55)',
                          borderRadius: '8px',
                          border: '1px solid rgba(148, 163, 184, 0.22)',
                        }}
                      >
                        <div className="detail-item-label" style={{ marginBottom: '4px' }}>
                          CCTV Camera Availability
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          📹{' '}
                          {selectedIncident.cameraContext ||
                            'No camera view available. On-site check required.'}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Activity Trail Card */}
                  <section className="detail-actions-card">
                    <h3>Activity Trail</h3>
                    <div
                      className="activity-trail"
                      role="list"
                      aria-label="Incident activity chronology"
                    >
                      {selectedIncident.activityTrail.map((act, index) => (
                        <div key={index} className="activity-step" role="listitem">
                          <div className="activity-step-time">{act.time}</div>
                          <div className="activity-step-desc">{act.action}</div>
                          {act.actor && <div className="activity-step-actor">— {act.actor}</div>}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
