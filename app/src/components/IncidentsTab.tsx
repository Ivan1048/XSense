import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Users,
  Compass,
  ArrowLeft,
  Clock,
  MessageSquare,
  Shield,
  Eye,
} from 'lucide-react';
import type { Incident, Patrol, IncidentStatus } from '../types';
import { ResolveModal } from './ResolveModal';

interface IncidentsTabProps {
  incidents: Incident[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  patrols: Patrol[];
  onAcknowledgeIncident: (id: string) => void;
  onAssignPatrol: (incidentId: string, patrolId: string) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus, note: string) => void;
  onNavigateToMap: (poleId: string) => void;
}

export const IncidentsTab: React.FC<IncidentsTabProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  patrols,
  onAcknowledgeIncident,
  onAssignPatrol,
  onUpdateStatus,
  onNavigateToMap,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [mobileDetailView, setMobileDetailView] = useState<boolean>(false);
  
  // Modal state
  const [modalAction, setModalAction] = useState<'Resolve' | 'False Alarm' | 'Add Note' | null>(null);

  // Selected incident
  const currentIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  // Filtering
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.poleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.eventType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Active'
        ? incident.status !== 'Resolved' && incident.status !== 'False Alarm'
        : incident.status === statusFilter;

    const matchesPriority =
      priorityFilter === 'All' ? true : incident.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleSelectOnMobile = (id: string) => {
    onSelectIncident(id);
    setMobileDetailView(true);
  };

  return (
    <div className="incident-page-wrapper">
      {/* Search and Filters Bar */}
      <div className="incident-toolbar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search incident ID, pole, zone, or event type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-field"
          />
          {searchTerm && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="filter-chip-group">
          {['All', 'Active', 'New', 'Acknowledged', 'Investigating', 'Resolved', 'False Alarm'].map(
            (status) => (
              <button
                key={status}
                type="button"
                className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            )
          )}
        </div>

        {/* Priority Filter */}
        <div className="priority-select-wrap">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="priority-dropdown"
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
            <option value="Informational">Informational</option>
          </select>
        </div>
      </div>

      {/* Main Dual Pane Layout */}
      <div className={`incident-dual-layout ${mobileDetailView ? 'mobile-show-detail' : 'mobile-show-list'}`}>
        {/* Left Pane: Incident Queue List */}
        <section className="incident-list-panel">
          <div className="panel-subhead">
            <span className="queue-count-text">
              Showing {filteredIncidents.length} of {incidents.length} records
            </span>
            <span className="queue-disclaimer">Simulated Cases</span>
          </div>

          <div className="incident-scroll-list">
            {filteredIncidents.length === 0 ? (
              <div className="empty-results-box">
                <p>No incidents match the selected filters.</p>
                <button
                  type="button"
                  className="btn-text-link"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('All');
                    setPriorityFilter('All');
                  }}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const isSelected = incident.id === currentIncident?.id;
                return (
                  <div
                    key={incident.id}
                    className={`incident-queue-card ${isSelected ? 'selected' : ''} priority-${incident.priority.toLowerCase()}`}
                    onClick={() => handleSelectOnMobile(incident.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-topline">
                      <div className="card-tags">
                        <strong className="mono-id">{incident.id}</strong>
                        <span className={`status-badge ${incident.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {incident.status}
                        </span>
                        <span className={`priority-badge ${incident.priority.toLowerCase()}`}>
                          {incident.priority}
                        </span>
                      </div>
                      <span className="card-time">
                        {new Date(incident.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="card-event-title">{incident.eventType}</h4>

                    <div className="card-meta-row">
                      <span className="card-meta-item">
                        Pole: <strong>{incident.poleId}</strong>
                      </span>
                      <span className="card-meta-item">
                        Zone: <strong>{incident.zone}</strong>
                      </span>
                      <span className="card-meta-item">
                        Conf: <strong>{(incident.confidence * 100).toFixed(0)}% (sim)</strong>
                      </span>
                    </div>

                    {incident.assignedPatrolId && (
                      <div className="card-patrol-chip">
                        <Users size={12} />
                        <span>Assigned to {incident.assignedPatrolId}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Pane: Incident Details & Case Management */}
        <section className="incident-detail-panel">
          {/* Mobile Back Button to return to list */}
          <div className="mobile-detail-nav">
            <button
              type="button"
              className="btn-back-to-queue"
              onClick={() => setMobileDetailView(false)}
            >
              <ArrowLeft size={16} />
              <span>Back to Incident Queue</span>
            </button>
          </div>

          {currentIncident ? (
            <div className="detail-inner-scroll">
              {/* Header Box */}
              <div className="detail-top-card">
                <div className="detail-id-banner">
                  <div>
                    <div className="detail-badges">
                      <span className={`status-badge big ${currentIncident.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {currentIncident.status}
                      </span>
                      <span className={`priority-badge ${currentIncident.priority.toLowerCase()}`}>
                        {currentIncident.priority} Priority
                      </span>
                      <span className="sim-verified-tag">Simulated Record</span>
                    </div>
                    <h2 className="detail-headline">{currentIncident.eventType}</h2>
                  </div>
                  <div className="detail-time-block">
                    <span className="time-label">Created At</span>
                    <strong className="time-val">
                      {new Date(currentIncident.createdAt).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="detail-props-grid">
                  <div className="prop-box">
                    <span className="prop-label">Incident Reference</span>
                    <strong className="prop-val mono-val">{currentIncident.id}</strong>
                  </div>
                  <div className="prop-box">
                    <span className="prop-label">Pole & Location</span>
                    <strong className="prop-val">
                      {currentIncident.poleId} ({currentIncident.zone})
                    </strong>
                  </div>
                  <div className="prop-box">
                    <span className="prop-label">Simulated Confidence</span>
                    <strong className="prop-val mono-val">
                      {(currentIncident.confidence * 100).toFixed(0)}% (illustrative)
                    </strong>
                  </div>
                  <div className="prop-box">
                    <span className="prop-label">Active Patrol</span>
                    <strong className="prop-val">
                      {currentIncident.assignedPatrolId || 'Unassigned'}
                    </strong>
                  </div>
                </div>

                {/* Rule Evaluated */}
                <div className="eval-rule-card">
                  <div className="rule-card-label">Rule Evaluation & Reason:</div>
                  <strong className="rule-name">{currentIncident.ruleEvaluated}</strong>
                  <p className="rule-reason">{currentIncident.reason}</p>
                </div>

                {/* Resolution note banner if resolved */}
                {currentIncident.resolutionNote && (
                  <div className="resolution-note-banner">
                    <CheckCircle2 size={18} className="text-emerald" />
                    <div>
                      <strong>Resolution Note:</strong>
                      <p>{currentIncident.resolutionNote}</p>
                    </div>
                  </div>
                )}

                {/* Operator Actions Bar */}
                <div className="operator-action-toolbar">
                  <span className="toolbar-label">Operator Case Actions:</span>
                  <div className="action-button-row">
                    {/* Acknowledge */}
                    {currentIncident.status === 'New' && (
                      <button
                        type="button"
                        className="btn-case-action primary"
                        onClick={() => onAcknowledgeIncident(currentIncident.id)}
                      >
                        <CheckCircle2 size={15} />
                        <span>Acknowledge Alert</span>
                      </button>
                    )}

                    {/* Assign Patrol Dropdown */}
                    <div className="patrol-assign-dropdown-wrap">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            onAssignPatrol(currentIncident.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="assign-patrol-select"
                      >
                        <option value="" disabled>
                          Assign Patrol Unit...
                        </option>
                        {patrols.map((patrol) => (
                          <option key={patrol.id} value={patrol.id}>
                            {patrol.callsign} ({patrol.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mark Investigating */}
                    {currentIncident.status !== 'Investigating' &&
                      currentIncident.status !== 'Resolved' &&
                      currentIncident.status !== 'False Alarm' && (
                        <button
                          type="button"
                          className="btn-case-action secondary"
                          onClick={() =>
                            onUpdateStatus(
                              currentIncident.id,
                              'Investigating',
                              'Patrol has arrived on scene and is conducting visual verification.'
                            )
                          }
                        >
                          <Clock size={15} />
                          <span>Mark Investigating</span>
                        </button>
                      )}

                    {/* Resolve */}
                    {currentIncident.status !== 'Resolved' && (
                      <button
                        type="button"
                        className="btn-case-action success"
                        onClick={() => setModalAction('Resolve')}
                      >
                        <CheckCircle2 size={15} />
                        <span>Resolve Case</span>
                      </button>
                    )}

                    {/* False Alarm */}
                    {currentIncident.status !== 'False Alarm' && (
                      <button
                        type="button"
                        className="btn-case-action danger"
                        onClick={() => setModalAction('False Alarm')}
                      >
                        <Shield size={15} />
                        <span>Mark False Alarm</span>
                      </button>
                    )}

                    {/* Add Log Note */}
                    <button
                      type="button"
                      className="btn-case-action outline"
                      onClick={() => setModalAction('Add Note')}
                    >
                      <MessageSquare size={15} />
                      <span>Add Note</span>
                    </button>

                    {/* Jump to Map */}
                    <button
                      type="button"
                      className="btn-case-action tertiary"
                      onClick={() => onNavigateToMap(currentIncident.poleId)}
                    >
                      <Compass size={15} />
                      <span>View on Map</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="timeline-container">
                <div className="timeline-header">
                  <h3>Audit & Status Timeline</h3>
                  <span className="mono-sub">Sequential event history</span>
                </div>

                <div className="timeline-chain">
                  {currentIncident.timeline.map((entry, index) => (
                    <div key={`${entry.time}-${index}`} className="timeline-step">
                      <div className="timeline-marker-col">
                        <div className={`step-dot ${entry.status.toLowerCase().replace(/\s+/g, '-')}`} />
                        {index < currentIncident.timeline.length - 1 && (
                          <div className="step-connecting-line" />
                        )}
                      </div>
                      <div className="timeline-content-card">
                        <div className="step-topline">
                          <span className={`step-status-tag ${entry.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {entry.status}
                          </span>
                          <span className="step-time">
                            {new Date(entry.time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="step-note">{entry.note}</p>
                        {entry.actor && (
                          <span className="step-actor">Logged by: {entry.actor}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection-box">
              <Eye size={40} className="text-gray" />
              <p>Select an incident from the queue to view full case telemetry and dispatch controls.</p>
            </div>
          )}
        </section>
      </div>

      {/* Resolution & False Alarm Modal */}
      {modalAction && currentIncident && (
        <ResolveModal
          isOpen={true}
          onClose={() => setModalAction(null)}
          incidentId={currentIncident.id}
          actionType={modalAction}
          onSubmit={onUpdateStatus}
        />
      )}
    </div>
  );
};
