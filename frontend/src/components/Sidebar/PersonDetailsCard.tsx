import React from 'react';
import { evaluatePointLidarCoverage } from '../../utils/lidarGeometry';
import { formatPersonaState } from '../../utils/personaStateLabels';

export interface VisitorDetectionRecord {
  personaId: string;
  clusterId: string;
  verdict: string;
  sensorId: string | null;
  poleId: string | null;
  distanceM: number | null;
  timestampIso: string;
}

export interface PersonDetailsCardProps {
  personas: Array<{
    id: string;
    number: number;
    name: string;
    roleLabel: string;
    clusterId: string;
    sectorLabel: string;
    state: string;
    activeAction: string;
    position: [number, number, number];
    heightM: number;
    motionStatus: string;
    supportedActions: Array<{
      id: string;
      label: string;
      icon?: string;
      variant?: 'default' | 'warning' | 'danger';
    }>;
  }>;
  selectedPersonaId: string;
  /** Map-selected location text, when available. */
  approxLocation?: string;
  operationalLidarNodes: Array<{
    id: string;
    poleId: string;
    position: [number, number, number];
    status: 'online' | 'offline';
    minRangeM?: number;
    maxRangeM?: number;
  }>;
  lastDetectionByPersonaId: Record<string, VisitorDetectionRecord | undefined>;
  onOpenDemo: () => void;
}

/**
 * Details tab content for an anonymous LiDAR person cluster.
 * Simulator ground truth stays clearly separated from simulated sensor observations
 * so a persona name is never presented as an identity discovered by LiDAR.
 */
export const PersonDetailsCard: React.FC<PersonDetailsCardProps> = ({
  personas,
  selectedPersonaId,
  approxLocation,
  operationalLidarNodes,
  lastDetectionByPersonaId,
  onOpenDemo,
}) => {
  const selected = personas.find((persona) => persona.id === selectedPersonaId) || personas[0];
  if (!selected) return null;

  const isCollapsed = selected.state === 'collapsed';
  const liveEval = evaluatePointLidarCoverage(selected.position, operationalLidarNodes);
  const latestObservation = lastDetectionByPersonaId[selected.id];
  const location = approxLocation || selected.sectorLabel;

  return (
    <div className="details-card">
      <div className="details-card-header">
        <div>
          <div className="details-eyebrow">Anonymous person · LiDAR</div>
          <h2 className="details-title">Person detected (simulated)</h2>
        </div>
        <span className="badge badge-simulated">Anonymous</span>
      </div>

      <p className="details-subtitle">
        Cyan map dots are anonymous sensor clusters. No resident name or identity is attached.
      </p>

      <div className="details-grid">
        <div className="details-field">
          <span className="details-label">Cluster ID</span>
          <code className="details-value details-code">{selected.clusterId}</code>
        </div>
        <div className="details-field">
          <span className="details-label">Location</span>
          <span className="details-value">{location}</span>
        </div>
        <div className="details-field">
          <span className="details-label">Posture (simulated)</span>
          <span className={`details-value ${isCollapsed ? 'danger' : 'ok'}`}>
            {selected.heightM.toFixed(2)} m · {isCollapsed ? 'Collapsed' : 'Upright'}
          </span>
        </div>
        <div className="details-field">
          <span className="details-label">Movement</span>
          <span className="details-value">{selected.motionStatus}</span>
        </div>
        <div className="details-field">
          <span className="details-label">Current coverage</span>
          <span className={`details-value ${liveEval.isCovered ? 'ok' : 'warn'}`}>
            {liveEval.isCovered
              ? `Inside estimated coverage${liveEval.nearestSensorId ? ` · ${liveEval.nearestSensorId}` : ''}`
              : 'Outside estimated coverage'}
          </span>
        </div>
        <div className="details-field">
          <span className="details-label">Latest recorded detection</span>
          <span className="details-value">
            {latestObservation ? (
              <>
                {latestObservation.verdict}
                <span className="details-timestamp">Recorded {latestObservation.timestampIso}</span>
              </>
            ) : (
              'No detection recorded yet'
            )}
          </span>
        </div>
      </div>

      <div className="details-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenDemo}>
          Open Demo controls
        </button>
      </div>

      <details className="sidebar-details">
        <summary>More details</summary>
        <div className="sidebar-details-body">
          <h3 className="sidebar-subheading">Simulated Coverage Check</h3>
          <div className="metric-row">
            <span className="metric-label">Live X / Z coordinates</span>
            <code className="metric-value">
              [{selected.position[0].toFixed(2)}, {selected.position[2].toFixed(2)}]
            </code>
          </div>
          <div className="metric-row">
            <span className="metric-label">Nearest eligible LiDAR</span>
            <span className="metric-value">
              {liveEval.nearestSensorId
                ? `${liveEval.nearestSensorId}${liveEval.nearestPoleId ? ` (${liveEval.nearestPoleId})` : ''}`
                : 'None in range'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Estimated distance</span>
            <span className={`metric-value ${liveEval.isCovered ? 'ok' : 'warn'}`}>
              {liveEval.distanceM !== null ? `${liveEval.distanceM.toFixed(2)} m` : 'Not available'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Geometry result</span>
            <span className={`metric-value ${liveEval.isCovered ? 'ok' : 'danger'}`}>
              {liveEval.isCovered
                ? 'Inside estimated range, field of view, and clear line of sight'
                : liveEval.reason || 'Outside estimated coverage'}
            </span>
          </div>

          <h3 className="sidebar-subheading">Last recorded detection</h3>
          {latestObservation ? (
            <>
              <div className="metric-row">
                <span className="metric-label">Recorded verdict</span>
                <span className="metric-value">{latestObservation.verdict}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Observed sensor</span>
                <span className="metric-value">
                  {latestObservation.sensorId ?? 'None'}
                  {latestObservation.poleId ? ` · ${latestObservation.poleId}` : ''}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Recorded distance</span>
                <span className="metric-value">
                  {latestObservation.distanceM !== null
                    ? `${latestObservation.distanceM.toFixed(2)} m`
                    : 'Not available'}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Timestamp</span>
                <span className="metric-value">{latestObservation.timestampIso}</span>
              </div>
            </>
          ) : (
            <p className="details-note">
              No recorded detection observation exists for {selected.clusterId} yet. Current coverage above
              is a live geometric calculation, not a past detection.
            </p>
          )}

          <h3 className="sidebar-subheading">Simulator ground truth · not sensor telemetry</h3>
          <p className="details-note">
            These values come from the demonstration simulator. The persona name is a simulator label,
            not an identity discovered by LiDAR.
          </p>
          <div className="metric-row">
            <span className="metric-label">Simulator persona</span>
            <span className="metric-value">
              {selected.name} (Visitor #{selected.number})
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Ground-truth action</span>
            <span className="metric-value">{selected.activeAction}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Ground-truth state</span>
            <span className="metric-value">{formatPersonaState(selected.state)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Ground-truth height</span>
            <span className="metric-value">{selected.heightM.toFixed(2)} m</span>
          </div>
        </div>
      </details>
    </div>
  );
};

export default PersonDetailsCard;
