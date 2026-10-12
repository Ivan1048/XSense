import { useState } from 'react';
import { usePark } from '../context/ParkContext';
import StatusLabel from '../components/StatusLabel';
import type { IncidentStatus, AlertLevel } from '../types';

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
  } = usePark();

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

  // Filter logic
  const filteredIncidents = incidents.filter(inc => {
    if (activeFilter === 'All') return true;
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

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || filteredIncidents[0] || null;
  const assignedGuard = guards.find(g => g.id === selectedIncident?.assignedGuardId);

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

  const isClosed = selectedIncident?.status === 'resolved' || selectedIncident?.status === 'false_alarm';

  return (
    <div className="incidents-page">
      {/* Header bar */}
      <div className="incidents-header">
        <h1>Incidents</h1>
        <div className="filter-tabs" role="tablist" aria-label="Filter incidents">
          {FILTERS.map(f => (
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

      {/* Main split body */}
      <div className="incidents-body">
        {/* Left column: Incident List */}
        <div className="incidents-list" role="list" aria-label="Incident alerts list">
          {filteredIncidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">✓</div>
              <h3>No active alerts</h3>
              <p>
                {activeFilter === 'All'
                  ? 'Go to Park Overview and trigger a demo scenario to see incidents appear here.'
                  : `No incidents matching the "${activeFilter}" filter.`}
              </p>
            </div>
          ) : (
            filteredIncidents.map(inc => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <article
                  key={inc.id}
                  className={`incident-card ${inc.priority}${isSelected ? ' selected' : ''}`}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIncidentId(inc.id);
                    }
                  }}
                  aria-label={`${inc.displayType} at ${inc.zoneName}`}
                >
                  <div className="incident-card-header">
                    <span className="incident-card-title">{inc.displayType}</span>
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

        {/* Right column: Incident Detail Panel */}
        <div className="incident-detail-panel" aria-label="Incident details">
          {!selectedIncident ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">📋</div>
              <h3>No incident selected</h3>
              <p>Select an incident from the list to view telemetry details, assign guards, and record outcomes.</p>
            </div>
          ) : (
            <div className="incident-detail-content">
              {/* Header Info Card */}
              <section className="detail-header-card">
                <div className="detail-title-row">
                  <div>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      ID: {selectedIncident.id}
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
                    <div className="detail-item-value" style={{ color: assignedGuard ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {assignedGuard ? `${assignedGuard.displayName} (${assignedGuard.role})` : 'Unassigned'}
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Controls Card */}
              <section className="detail-actions-card">
                <h3>Guard Response Actions</h3>

                {isClosed ? (
                  <div className="notice notice-ok">
                    This incident has been closed ({selectedIncident.status === 'resolved' ? 'Resolved' : 'False Alarm'}).
                    No further immediate action required.
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
                          📍 Mark Arrived on Scene
                        </button>
                      )}

                      <button
                        id="btn-toggle-resolve"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowResolveForm(prev => !prev);
                          setShowFalseAlarmForm(false);
                        }}
                      >
                        ✓ Resolve Incident
                      </button>

                      <button
                        id="btn-toggle-false-alarm"
                        className="btn btn-ghost"
                        onClick={() => {
                          setShowFalseAlarmForm(prev => !prev);
                          setShowResolveForm(false);
                        }}
                      >
                        ✕ Mark False Alarm
                      </button>
                    </div>

                    {/* Guard Assignment Section */}
                    <div className="guard-assign-row">
                      <label htmlFor="guard-select" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                        Assign Guard:
                      </label>
                      <select
                        id="guard-select"
                        className="form-control"
                        style={{ width: 'auto', minWidth: 220 }}
                        value={selectedGuardToAssign}
                        onChange={e => setSelectedGuardToAssign(e.target.value)}
                      >
                        {guards.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.displayName} ({g.role}) — {g.availability === 'available' ? 'Available' : 'Busy'}
                          </option>
                        ))}
                      </select>
                      <button
                        id="btn-assign-guard"
                        className="btn btn-secondary"
                        onClick={() => assignGuard(selectedIncident.id, selectedGuardToAssign)}
                      >
                        Dispatch Guard
                      </button>
                    </div>

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
                          onChange={e => setResolveNote(e.target.value)}
                          required
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button type="submit" className="btn btn-primary btn-sm">
                            Confirm & Resolve
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
                          placeholder="e.g. Resident was doing yoga / stretching on grass; not a fall."
                          value={falseAlarmNote}
                          onChange={e => setFalseAlarmNote(e.target.value)}
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

              {/* Activity Trail Card */}
              <section className="detail-actions-card">
                <h3>Activity Trail</h3>
                <div className="activity-trail" role="list" aria-label="Incident activity chronology">
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
          )}
        </div>
      </div>
    </div>
  );
}
