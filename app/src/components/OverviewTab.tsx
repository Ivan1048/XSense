import React from 'react';
import {
  ShieldAlert,
  BellRing,
  Users,
  Gauge,
  AlertTriangle,
  Radio,
  ExternalLink,
  CheckCircle2,
  Volume2,
  Footprints,
  Layers,
  CloudRain,
  ChevronRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import type { Pole, Incident, Patrol, EventCard, ScenarioPreset } from '../types';

interface OverviewTabProps {
  poles: Pole[];
  incidents: Incident[];
  patrols: Patrol[];
  eventFeed: EventCard[];
  onSelectIncident: (id: string) => void;
  onSelectPole: (id: string) => void;
  onAcknowledgeIncident: (id: string) => void;
  onTriggerPreset: (scenario: ScenarioPreset) => void;
  onNavigateToTab: (tab: 'map' | 'incidents' | 'patrols' | 'health') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  poles,
  incidents,
  patrols,
  eventFeed,
  onSelectIncident,
  onSelectPole,
  onAcknowledgeIncident,
  onTriggerPreset,
  onNavigateToTab,
}) => {
  const activeIncidents = incidents.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'False Alarm'
  );
  const unacknowledgedIncidents = incidents.filter((i) => i.status === 'New');
  const availablePatrols = patrols.filter((p) => p.status === 'Available');
  const normalPoles = poles.filter((p) => p.status === 'Normal');
  const degradedPoles = poles.filter((p) => p.status === 'Degraded');
  const offlinePoles = poles.filter((p) => p.status === 'Offline');

  const hasCoverageIssue = degradedPoles.length > 0 || offlinePoles.length > 0;

  const getEventIcon = (type: string) => {
    if (type.includes('fall')) return <Footprints size={14} className="text-rose" />;
    if (type.includes('distress')) return <Volume2 size={14} className="text-amber" />;
    if (type.includes('Combined')) return <Layers size={14} className="text-purple" />;
    if (type.includes('rain') || type.includes('wildlife')) return <CloudRain size={14} className="text-sky" />;
    return <Radio size={14} className="text-gray" />;
  };

  return (
    <div className="overview-container">
      {/* Coverage Degraded Warning if any offline/degraded */}
      {hasCoverageIssue && (
        <div className="coverage-warning-banner" role="alert">
          <div className="warning-content">
            <AlertTriangle size={20} className="warning-icon" />
            <div>
              <strong>Coverage degraded — do not assume the entire park area is monitored.</strong>
              <p>
                {offlinePoles.length} pole(s) offline ({offlinePoles.map((p) => p.id).join(', ')}), {degradedPoles.length} degraded ({degradedPoles.map((p) => p.id).join(', ')}). Manual patrol dispatch recommended for blind zones.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-warning-action"
            onClick={() => onNavigateToTab('health')}
          >
            <span>View Sensor Health</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <section className="kpi-grid" aria-label="Key Performance Indicators">
        <div
          className={`kpi-card ${activeIncidents.length > 0 ? 'accent-rose' : 'accent-teal'}`}
          onClick={() => onNavigateToTab('incidents')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-header">
            <span className="kpi-label">Active Incidents</span>
            <div className="kpi-icon-wrap rose">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-number">{activeIncidents.length}</span>
            <span className="kpi-tag">
              {activeIncidents.length === 0 ? 'All zones clear' : 'Requires Human Review'}
            </span>
          </div>
          <div className="kpi-footer">
            <span>{incidents.filter((i) => i.priority === 'High').length} High Priority</span>
            <span className="kpi-arrow">→</span>
          </div>
        </div>

        <div
          className={`kpi-card ${unacknowledgedIncidents.length > 0 ? 'accent-amber' : 'accent-teal'}`}
          onClick={() => onNavigateToTab('incidents')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-header">
            <span className="kpi-label">Awaiting Ack</span>
            <div className="kpi-icon-wrap amber">
              <BellRing size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-number">{unacknowledgedIncidents.length}</span>
            <span className="kpi-tag">Review Queue</span>
          </div>
          <div className="kpi-footer">
            <span>Operator action pending</span>
            <span className="kpi-arrow">→</span>
          </div>
        </div>

        <div
          className="kpi-card accent-sky"
          onClick={() => onNavigateToTab('patrols')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-header">
            <span className="kpi-label">Patrol Units</span>
            <div className="kpi-icon-wrap sky">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-number">{availablePatrols.length} / {patrols.length}</span>
            <span className="kpi-tag">Available Now</span>
          </div>
          <div className="kpi-footer">
            <span>Simulated town rangers</span>
            <span className="kpi-arrow">→</span>
          </div>
        </div>

        <div
          className={`kpi-card ${hasCoverageIssue ? 'accent-amber' : 'accent-emerald'}`}
          onClick={() => onNavigateToTab('health')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-header">
            <span className="kpi-label">Sensor Mesh Health</span>
            <div className="kpi-icon-wrap emerald">
              <Gauge size={18} />
            </div>
          </div>
          <div className="kpi-body">
            <span className="kpi-number">{normalPoles.length} / {poles.length}</span>
            <span className="kpi-tag">
              {Math.round((normalPoles.length / poles.length) * 100)}% Online
            </span>
          </div>
          <div className="kpi-footer">
            <span>{offlinePoles.length} offline • {degradedPoles.length} degraded</span>
            <span className="kpi-arrow">→</span>
          </div>
        </div>
      </section>

      {/* Quick Interactive Scenario Launchpad */}
      <section className="quick-scenario-strip">
        <div className="strip-title-row">
          <div className="strip-label-group">
            <Radio size={16} className="text-teal" />
            <strong>Quick Sensor Scenario Injection:</strong>
            <span className="strip-hint">Click any button to inject a simulated event instantly:</span>
          </div>
        </div>
        <div className="scenario-pill-group">
          <button
            type="button"
            className="scenario-pill pill-fall"
            onClick={() => onTriggerPreset('fall')}
            title="Simulate LiDAR Stillness / Fall at West Loop"
          >
            <Footprints size={14} />
            <span>1. Fall Event (AS-104)</span>
          </button>
          <button
            type="button"
            className="scenario-pill pill-distress"
            onClick={() => onTriggerPreset('distress')}
            title="Simulate Acoustic Distress at Family Playground"
          >
            <Volume2 size={14} />
            <span>2. Acoustic Distress (AS-103)</span>
          </button>
          <button
            type="button"
            className="scenario-pill pill-combined"
            onClick={() => onTriggerPreset('combined')}
            title="Simulate Dual Acoustic + Motion Anomaly"
          >
            <Layers size={14} />
            <span>3. Combined Anomaly (AS-106)</span>
          </button>
          <button
            type="button"
            className="scenario-pill pill-benign"
            onClick={() => onTriggerPreset('benign')}
            title="Simulate Rain & Wildlife Noise (Informational)"
          >
            <CloudRain size={14} />
            <span>4. Benign Rain (AS-102)</span>
          </button>
          <button
            type="button"
            className="scenario-pill pill-offline"
            onClick={() => onTriggerPreset('offline')}
            title="Simulate Pole Heartbeat Drop (AS-108)"
          >
            <AlertTriangle size={14} />
            <span>5. Sensor Outage (AS-108)</span>
          </button>
        </div>
      </section>

      {/* Main Dual Panels: Active Incidents + Live Stream */}
      <div className="overview-split-grid">
        {/* Active Incidents Queue */}
        <section className="panel-box">
          <div className="panel-box-header">
            <div>
              <h3>Active Review Queue</h3>
              <p className="panel-box-sub">Requires verification by authorised security operator</p>
            </div>
            <button
              type="button"
              className="btn-text-link"
              onClick={() => onNavigateToTab('incidents')}
            >
              <span>View All ({incidents.length})</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="panel-box-content">
            {activeIncidents.length === 0 ? (
              <div className="empty-state-card">
                <ShieldCheck size={36} className="text-emerald" />
                <p>No active incidents requiring immediate review.</p>
                <span>Trigger a scenario above to test the verification pipeline.</span>
              </div>
            ) : (
              <div className="overview-incident-list">
                {activeIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className={`overview-incident-card priority-${incident.priority.toLowerCase()}`}
                  >
                    <div className="oic-header">
                      <div className="oic-id-row">
                        <strong className="mono-id">{incident.id}</strong>
                        <span className={`status-badge ${incident.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {incident.status}
                        </span>
                        <span className={`priority-badge ${incident.priority.toLowerCase()}`}>
                          {incident.priority}
                        </span>
                      </div>
                      <span className="oic-time">
                        {new Date(incident.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="oic-body">
                      <h4 className="oic-title">{incident.eventType}</h4>
                      <p className="oic-reason">{incident.reason}</p>

                      <div className="oic-meta-row">
                        <span
                          className="meta-chip pole-chip"
                          onClick={() => {
                            onSelectPole(incident.poleId);
                            onNavigateToTab('map');
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          Pole: {incident.poleId} ({incident.zone}) ↗
                        </span>
                        <span className="meta-chip">
                          Simulated Conf: {(incident.confidence * 100).toFixed(0)}%
                        </span>
                        {incident.assignedPatrolId && (
                          <span className="meta-chip patrol-chip">
                            Assigned: {incident.assignedPatrolId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="oic-actions">
                      {incident.status === 'New' && (
                        <button
                          type="button"
                          className="btn-action-sm primary"
                          onClick={() => onAcknowledgeIncident(incident.id)}
                        >
                          <CheckCircle2 size={13} />
                          <span>Acknowledge</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-action-sm secondary"
                        onClick={() => {
                          onSelectIncident(incident.id);
                          onNavigateToTab('incidents');
                        }}
                      >
                        <Eye size={13} />
                        <span>Manage Case</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action-sm tertiary"
                        onClick={() => {
                          onSelectPole(incident.poleId);
                          onNavigateToTab('map');
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Show on Map</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Live Simulated Event Feed */}
        <section className="panel-box">
          <div className="panel-box-header">
            <div>
              <h3>Simulated Sensor Telemetry Stream</h3>
              <p className="panel-box-sub">Edge classifications • Metadata only, no raw audio</p>
            </div>
            <span className="demo-data-tag">Demo Stream</span>
          </div>

          <div className="panel-box-content">
            <div className="event-stream-list">
              {eventFeed.map((evt) => (
                <div key={evt.id} className="stream-event-item">
                  <div className="stream-icon-col">
                    {getEventIcon(evt.type)}
                    <div className="stream-vertical-line" />
                  </div>
                  <div className="stream-body-col">
                    <div className="stream-topline">
                      <span className="mono-id-sm">{evt.id}</span>
                      <span className="stream-time">
                        {new Date(evt.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="stream-type">{evt.type}</p>
                    <p className="stream-summary">{evt.summary}</p>
                    <div className="stream-chips">
                      <span
                        className="stream-chip clickable"
                        onClick={() => {
                          onSelectPole(evt.poleId);
                          onNavigateToTab('map');
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {evt.poleId} ({evt.zone})
                      </span>
                      <span className="stream-chip">
                        Simulated: {(evt.confidence * 100).toFixed(0)}%
                      </span>
                      <span className={`stream-chip outcome-${evt.outcome.toLowerCase().replace(/\s+/g, '-')}`}>
                        {evt.outcome}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Edge Privacy & Verification Architecture Bar */}
      <section className="privacy-trust-bar">
        <div className="trust-column">
          <div className="trust-icon-box">
            <ShieldCheck size={20} className="text-teal" />
          </div>
          <div>
            <strong>100% Edge Processing by Design</strong>
            <p>Raw acoustic audio & 3D LiDAR point clouds are processed locally on the pole and never transmitted or recorded.</p>
          </div>
        </div>
        <div className="trust-column">
          <div className="trust-icon-box">
            <Radio size={20} className="text-sky" />
          </div>
          <div>
            <strong>Minimal Metadata Transport</strong>
            <p>Only event classification tokens, timestamp, pole ID, and confidence values are sent over the simulated network.</p>
          </div>
        </div>
        <div className="trust-column">
          <div className="trust-icon-box">
            <AlertTriangle size={20} className="text-amber" />
          </div>
          <div>
            <strong>Mandatory Human Verification</strong>
            <p>AuraSense flags possible safety incidents. Operators must review context before taking field dispatch actions.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
