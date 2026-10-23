import React, { useState } from 'react';
import { PERSONA_DEFINITIONS } from '../../data/personaData';
import type { PersonaActionType } from '../../types/persona';
import { evaluatePointLidarCoverage } from '../../utils/lidarGeometry';

export interface VisitorDetectionRecord {
  personaId: string;
  clusterId: string;
  verdict: string;
  sensorId: string | null;
  poleId: string | null;
  distanceM: number | null;
  timestampIso: string;
}

export interface VisitorControlCenterProps {
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
      id: PersonaActionType | string;
      label: string;
      icon?: string;
      variant?: 'default' | 'warning' | 'danger';
    }>;
  }>;
  selectedPersonaId: string;
  onSelectPersona: (personaId: string) => void;
  onTriggerAction: (personaId: string, actionId: string) => void;
  onRecoverPersona: (personaId: string) => void;
  backgroundActivityEnabled: boolean;
  onToggleBackgroundActivity: (enabled: boolean) => void;
  operationalLidarNodes: Array<{
    id: string;
    poleId: string;
    position: [number, number, number];
    status: 'online' | 'offline';
    minRangeM?: number;
    maxRangeM?: number;
  }>;
  lastDetectionByPersonaId: Record<string, VisitorDetectionRecord | undefined>;
  lastFeedbackMessage?: string | null;
}

export const VisitorControlCenter: React.FC<VisitorControlCenterProps> = ({
  personas,
  selectedPersonaId,
  onSelectPersona,
  onTriggerAction,
  onRecoverPersona,
  backgroundActivityEnabled,
  onToggleBackgroundActivity,
  operationalLidarNodes,
  lastDetectionByPersonaId,
  lastFeedbackMessage,
}) => {
  const [groundTruthOpen, setGroundTruthOpen] = useState(false);

  const selected = personas.find((p) => p.id === selectedPersonaId) || personas[0];
  if (!selected) return null;

  // Authoritative single-source live spatial evaluation (prevents stale 2.5m vs 7.0m mismatch)
  const liveEval = evaluatePointLidarCoverage(
    selected.position,
    operationalLidarNodes
  );

  const latestObservation = lastDetectionByPersonaId[selected.id];
  const isCollapsed = selected.state === 'collapsed';

  return (
    <div className="visitor-control-center" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* SECTION A — Selected Visitor */}
      <div className="sidebar-card" style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          Section A · Selected Visitor
        </div>

        {/* Single Authoritative #1-#5 Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '12px' }}>
          {personas.map((p) => {
            const isSelected = p.id === selected.id;
            const isFallen = p.state === 'collapsed';
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPersona(p.id)}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  border: isSelected
                    ? '1.5px solid #38bdf8'
                    : isFallen
                    ? '1px solid rgba(239, 68, 68, 0.7)'
                    : '1px solid rgba(148, 163, 184, 0.25)',
                  background: isSelected
                    ? 'rgba(56, 189, 248, 0.18)'
                    : isFallen
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(30, 41, 59, 0.6)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '11px',
                }}
              >
                <div style={{ fontWeight: 700 }}>#{p.number}</div>
                <div style={{ fontSize: '10px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.roleLabel}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Simulator Persona</span>
            <strong style={{ color: '#f8fafc' }}>{selected.name}</strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Anonymous Cluster ID</span>
            <code style={{ color: '#38bdf8', fontWeight: 600 }}>{selected.clusterId}</code>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Action / State</span>
            <span style={{ color: isCollapsed ? '#f87171' : '#34d399', fontWeight: 600 }}>
              {selected.activeAction} ({selected.state})
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Sector / Location</span>
            <span style={{ color: '#e2e8f0' }}>{selected.sectorLabel}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>3D Cluster Height</span>
            <span style={{ color: isCollapsed ? '#f87171' : '#34d399', fontWeight: 600 }}>
              {selected.heightM.toFixed(2)}m ({isCollapsed ? 'Collapsed' : 'Upright'})
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Movement State</span>
            <span style={{ color: '#e2e8f0' }}>{selected.motionStatus}</span>
          </div>
        </div>
      </div>

      {/* SECTION B — Live Sensor Evaluation */}
      <div className="sidebar-card" style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          Section B · Live Sensor Evaluation
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '10px' }}>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Live X / Z Coordinates</span>
            <code style={{ color: '#f8fafc' }}>
              [{selected.position[0].toFixed(2)}, {selected.position[2].toFixed(2)}]
            </code>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Nearest Eligible LiDAR</span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>
              {liveEval.nearestSensorId
                ? `${liveEval.nearestSensorId} (${liveEval.nearestPoleId})`
                : 'None in range'}
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Live Evaluated Distance</span>
            <span style={{ color: liveEval.isCovered ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
              {liveEval.distanceM !== null ? `${liveEval.distanceM.toFixed(2)}m` : 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>Coverage Eligibility</span>
            <span style={{ color: liveEval.isCovered ? '#34d399' : '#f87171', fontWeight: 600 }}>
              {liveEval.isCovered ? 'ELIGIBLE (COVERED)' : `GAP (${liveEval.reason || 'Out of bounds'})`}
            </span>
          </div>
        </div>

        {/* Distinct Historical Observation vs Live Spatial Calculation */}
        <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', fontSize: '11px' }}>
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
            Last Recorded Detection Observation ({selected.clusterId}):
          </div>
          {latestObservation ? (
            <div style={{ color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>
                <strong>Verdict:</strong> {latestObservation.verdict}
              </div>
              <div>
                <strong>Observed Sensor / Distance:</strong>{' '}
                {latestObservation.sensorId ?? 'None'}{' '}
                {latestObservation.distanceM !== null ? `at ${latestObservation.distanceM.toFixed(2)}m` : ''}
              </div>
              <div style={{ color: '#94a3b8' }}>
                <strong>Timestamp:</strong> {latestObservation.timestampIso}
              </div>
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
              No recorded detection observation for {selected.clusterId} yet.
            </div>
          )}
        </div>
      </div>

      {/* SECTION C — Persona Actions */}
      <div className="sidebar-card" style={{ padding: '12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
          Section C · Persona Actions (Visitor #{selected.number})
        </div>

        {lastFeedbackMessage && (
          <div style={{ marginBottom: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '11px', color: '#bae6fd' }}>
            {lastFeedbackMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          {selected.supportedActions.map((act) => {
            const isActive = selected.activeAction === act.id;
            const isDanger = act.id === 'collapse' || act.id === 'call_help' || act.variant === 'danger';
            const isDisabled = isCollapsed && act.id !== 'call_help' && act.id !== 'collapse';
            return (
              <button
                key={act.id}
                type="button"
                disabled={isDisabled}
                onClick={() => onTriggerAction(selected.id, String(act.id))}
                style={{
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: isActive
                    ? '1.5px solid #38bdf8'
                    : isDanger
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(148, 163, 184, 0.25)',
                  background: isActive
                    ? 'rgba(56, 189, 248, 0.22)'
                    : isDanger
                    ? 'rgba(127, 29, 29, 0.35)'
                    : 'rgba(30, 41, 59, 0.7)',
                  color: isDisabled ? '#64748b' : '#f8fafc',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                {act.icon ? `${act.icon} ` : ''}{act.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onRecoverPersona(selected.id)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            background: 'rgba(6, 95, 70, 0.35)',
            color: '#6ee7b7',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ↺ Recover &amp; Resume Autonomous Loop
        </button>
      </div>

      {/* SECTION D — Background Visitor Activity */}
      <div className="sidebar-card" style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(148, 163, 184, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
            Background Visitor Activity
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            Benign idle actions only · Default OFF · Never triggers emergencies
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleBackgroundActivity(!backgroundActivityEnabled)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: backgroundActivityEnabled ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.3)',
            background: backgroundActivityEnabled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.8)',
            color: backgroundActivityEnabled ? '#38bdf8' : '#cbd5e1',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {backgroundActivityEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* SECTION E — Simulator Ground Truth (Collapsible) */}
      <div className="sidebar-card" style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.55)', border: '1px dashed rgba(148, 163, 184, 0.25)' }}>
        <button
          type="button"
          onClick={() => setGroundTruthOpen((prev) => !prev)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span>SIMULATOR GROUND TRUTH — NOT SENSOR TELEMETRY</span>
          <span>{groundTruthOpen ? '▲' : '▼'}</span>
        </button>
        {groundTruthOpen && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div>• Simulator Identity: {selected.name} (Visitor #{selected.number})</div>
            <div>• Operational Telemetry ID: {selected.clusterId} (Identity protected by design)</div>
            <div>• Ground-Truth Posture: {selected.heightM.toFixed(2)}m · State: {selected.state}</div>
            <div>• Live Sensor Observation: {liveEval.isCovered ? `Observed by ${liveEval.nearestSensorId}` : 'Not observed by operational LiDAR'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitorControlCenter;
