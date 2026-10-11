import React from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Radio,
} from 'lucide-react';
import type { Patrol, Incident } from '../types';

interface PatrolsTabProps {
  patrols: Patrol[];
  incidents: Incident[];
  onAssignPatrol: (incidentId: string, patrolId: string) => void;
  onMarkArrived: (patrolId: string) => void;
  onResetPatrol: (patrolId: string) => void;
  onSelectIncident: (incidentId: string) => void;
  onNavigateToIncidents: () => void;
}

export const PatrolsTab: React.FC<PatrolsTabProps> = ({
  patrols,
  incidents,
  onAssignPatrol,
  onMarkArrived,
  onResetPatrol,
  onSelectIncident,
  onNavigateToIncidents,
}) => {
  const activeIncidents = incidents.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'False Alarm'
  );

  return (
    <div className="patrols-page-wrapper">
      <div className="section-intro-bar">
        <div>
          <h3>Simulated Township Patrol Fleet</h3>
          <p className="intro-sub">
            Fictional township auxiliary safety units. No real GPS or personal data is collected or tracked.
          </p>
        </div>
        <div className="fleet-status-chips">
          <span className="fleet-chip available">
            {patrols.filter((p) => p.status === 'Available').length} Available
          </span>
          <span className="fleet-chip busy">
            {patrols.filter((p) => p.status !== 'Available').length} Dispatched
          </span>
        </div>
      </div>

      <div className="patrol-card-grid">
        {patrols.map((patrol) => {
          const assignedIncident = incidents.find(
            (i) => i.id === patrol.currentIncidentId
          );
          const isBusy = patrol.status !== 'Available';

          return (
            <div
              key={patrol.id}
              className={`patrol-unit-card ${isBusy ? 'status-busy' : 'status-avail'}`}
            >
              <div className="unit-card-header">
                <div className="unit-title-group">
                  <div className="unit-icon-box">
                    <Shield size={20} className="text-sky" />
                  </div>
                  <div>
                    <strong className="unit-id">{patrol.callsign}</strong>
                    <span className="unit-zone">Base: {patrol.locationZone}</span>
                  </div>
                </div>
                <span className={`status-badge ${patrol.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {patrol.status}
                </span>
              </div>

              <div className="unit-card-body">
                <div className="unit-metric-row">
                  <div className="unit-metric">
                    <Clock size={14} />
                    <span>ETA: <strong>{patrol.illustrativeEta}</strong></span>
                  </div>
                  <div className="unit-metric">
                    <Radio size={14} />
                    <span>Telemetry: <strong>Simulated LoRa</strong></span>
                  </div>
                </div>

                <div className="unit-assignment-box">
                  <span className="assignment-label">Current Incident Task:</span>
                  {assignedIncident ? (
                    <div className="assigned-incident-snippet">
                      <div className="snippet-top">
                        <strong className="mono-id">{assignedIncident.id}</strong>
                        <span className={`status-badge-sm ${assignedIncident.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {assignedIncident.status}
                        </span>
                      </div>
                      <p className="snippet-type">{assignedIncident.eventType}</p>
                      <span className="snippet-pole">
                        Location: Pole {assignedIncident.poleId} ({assignedIncident.zone})
                      </span>
                      <button
                        type="button"
                        className="btn-text-link-sm"
                        onClick={() => {
                          onSelectIncident(assignedIncident.id);
                          onNavigateToIncidents();
                        }}
                      >
                        <Eye size={12} />
                        <span>Open Incident Dossier</span>
                      </button>
                    </div>
                  ) : (
                    <p className="unit-idle-text">No active incident assigned (Unit in routine standby patrol).</p>
                  )}
                </div>
              </div>

              <div className="unit-card-footer">
                {patrol.status === 'Available' ? (
                  <div className="assign-action-group">
                    <select
                      className="quick-dispatch-select"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignPatrol(e.target.value, patrol.id);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>
                        Dispatch to Active Incident...
                      </option>
                      {activeIncidents.map((inc) => (
                        <option key={inc.id} value={inc.id}>
                          {inc.id} — {inc.poleId} ({inc.eventType.slice(0, 24)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : patrol.status === 'Assigned' || patrol.status === 'En Route' ? (
                  <div className="active-action-buttons">
                    <button
                      type="button"
                      className="btn-patrol-action arrive"
                      onClick={() => onMarkArrived(patrol.id)}
                    >
                      <CheckCircle2 size={15} />
                      <span>Mark Unit Arrived on Scene</span>
                    </button>
                    <button
                      type="button"
                      className="btn-patrol-action clear"
                      onClick={() => onResetPatrol(patrol.id)}
                    >
                      <span>Recall Unit</span>
                    </button>
                  </div>
                ) : (
                  <div className="active-action-buttons">
                    <button
                      type="button"
                      className="btn-patrol-action arrive"
                      onClick={() => onResetPatrol(patrol.id)}
                    >
                      <CheckCircle2 size={15} />
                      <span>Complete & Return to Patrol</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="patrol-governance-note">
        <AlertCircle size={16} className="text-sky" />
        <span>
          <strong>Ethical Operations Note:</strong> Units are dispatched only upon verified sensor threshold triggers.
          Patrol response times and routes shown are mathematical simulations designed for hackathon evaluation.
        </span>
      </div>
    </div>
  );
};
