import { getEvidenceSnapshot } from '../../utils/detectionEvidence';
import { useState, useMemo } from 'react';
import type { PersonaActionType } from '../../types/persona';
import { PERSONA_DEFINITIONS } from '../../data/personaData';
import { usePersonaStateMachine } from '../../hooks/usePersonaStateMachine';
import { evaluateCollapseAgainstAllLidars } from '../../utils/lidarGeometry';
import { usePark } from '../../context/ParkContext';

const ACTION_LABELS: Record<PersonaActionType, { label: string; icon: string; category: 'motion' | 'normal' | 'emergency' }> = {
  walk: { label: 'Walk', icon: '🚶', category: 'motion' },
  jog: { label: 'Jog', icon: '🏃', category: 'motion' },
  sprint: { label: 'Sprint', icon: '⚡', category: 'motion' },
  crouch: { label: 'Crouch', icon: '🧘', category: 'normal' },
  tie_shoelaces: { label: 'Tie Shoelaces', icon: '👟', category: 'normal' },
  sit: { label: 'Sit (Ground)', icon: '🧎', category: 'normal' },
  bench_rest: { label: 'Rest on Bench', icon: '🪑', category: 'normal' },
  check_phone: { label: 'Check Phone', icon: '📱', category: 'normal' },
  pause_tree: { label: 'Pause near Tree', icon: '🌳', category: 'normal' },
  yoga: { label: 'Yoga (Tree Pose)', icon: '🤸', category: 'normal' },
  jumping_jacks: { label: 'Jumping Jacks', icon: '⭐', category: 'normal' },
  talking: { label: 'Talking', icon: '💬', category: 'normal' },
  laughing: { label: 'Laughing', icon: '😄', category: 'normal' },
  whistling: { label: 'Whistling', icon: '🎵', category: 'normal' },
  child_crying: { label: 'Child Crying', icon: '😢', category: 'normal' },
  collapse: { label: 'Collapse (Fall)', icon: '⚠️', category: 'emergency' },
  call_help: { label: 'Call for Help', icon: '🆘', category: 'emergency' },
};

export default function PersonaCommandHUD({
  selectedIndex,
  onSelectPersona,
}: {
  selectedIndex?: number | null;
  onSelectPersona?: (index: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<number>(() => selectedIndex ?? getEvidenceSnapshot().capture?.visitorIndex ?? 0);
  const [isCollapsedHUD, setIsCollapsedHUD] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{
    detected: boolean;
    message: string;
    incidentId?: string;
    category: 'emergency_detected' | 'coverage_gap' | 'rejected' | 'normal';
  } | null>(null);

  const {
    states,
    schedulerEnabled,
    dispatchAction,
    recoverPersona,
    resetAllPersonas,
    toggleScheduler,
  } = usePersonaStateMachine();

  const { offlinePoleId, blockedRouteZone } = usePark();

  // Synchronize active tab if external selection changes
  const currentPersonaIndex = selectedIndex !== undefined && selectedIndex !== null ? selectedIndex : activeTab;
  const currentPersona = states[currentPersonaIndex] || states[0];
  const definition = PERSONA_DEFINITIONS[currentPersonaIndex] || PERSONA_DEFINITIONS[0];

  // Evaluate real-time sensor coverage for current persona
  const coverage = useMemo(() => {
    return evaluateCollapseAgainstAllLidars(
      [currentPersona.worldPosition[0], 0.34, currentPersona.worldPosition[2]],
      offlinePoleId,
      blockedRouteZone,
    );
  }, [currentPersona.worldPosition, offlinePoleId, blockedRouteZone]);

  const handleTriggerAction = (actionKey: PersonaActionType) => {
    const res = dispatchAction(currentPersonaIndex, actionKey);
    if (!res.success) {
      setActionFeedback({
        detected: false,
        message: res.reason,
        category: 'rejected',
      });
      return;
    }

    if (res.observation) {
      const obsResult = res.observation;

      setActionFeedback({
        detected: obsResult.detected,
        message: obsResult.reason,
        incidentId: obsResult.incidentId,
        category: obsResult.detected ? 'emergency_detected' : 'coverage_gap',
      });
    } else {
      setActionFeedback({
        detected: true,
        message: `Action "${ACTION_LABELS[actionKey]?.label || actionKey}" activated for Visitor #${currentPersonaIndex + 1}`,
        category: 'normal',
      });
    }
  };

  const handleRecover = () => {
    recoverPersona(currentPersonaIndex);
    setActionFeedback({
      detected: true,
      message: `Visitor #${currentPersonaIndex + 1} recovering to autonomous movement.`,
      category: 'normal',
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: isCollapsedHUD ? 260 : 440,
        maxHeight: 'calc(100vh - 120px)',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 12,
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}
    >
      {/* ── HUD Header (Clean professional layout without game controller emoji) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'rgba(30, 41, 59, 0.85)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 13, letterSpacing: '0.04em', color: '#38bdf8' }}>
            VISITOR COMMAND HUD
          </strong>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setIsCollapsedHUD(!isCollapsedHUD)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 6px',
            }}
          >
            {isCollapsedHUD ? '▲ Expand' : '▼ Minimize'}
          </button>
        </div>
      </div>

      {!isCollapsedHUD && (
        <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── Visitor Selector Tabs ──────────────────────────────────────── */}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>
              SELECT PERSONA
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
              {PERSONA_DEFINITIONS.map((def, idx) => {
                const isSelected = idx === currentPersonaIndex;
                const personaState = states[idx];
                const isActionActive = personaState?.fsmState === 'performing_action';
                const isEmergency = personaState?.fsmState === 'collapsed' || personaState?.fsmState === 'calling_help';

                return (
                  <button
                    key={def.id}
                    onClick={() => {
                      setActiveTab(idx);
                      onSelectPersona?.(idx);
                      setActionFeedback(null);
                    }}
                    style={{
                      padding: '6px 2px',
                      borderRadius: 6,
                      border: isSelected
                        ? '1px solid #38bdf8'
                        : isEmergency
                        ? '1px solid #ef4444'
                        : isActionActive
                        ? '1px solid #f59e0b'
                        : '1px solid #334155',
                      background: isSelected
                        ? 'rgba(2, 132, 199, 0.35)'
                        : isEmergency
                        ? 'rgba(220, 38, 38, 0.25)'
                        : 'rgba(30, 41, 59, 0.6)',
                      color: isSelected ? '#38bdf8' : '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'center',
                    }}
                  >
                    #{idx + 1}
                    <div style={{ fontSize: 9, color: isSelected ? '#7dd3fc' : '#94a3b8' }}>
                      {def.category.replace('_', ' ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Active Persona Status Card ─────────────────────────────────── */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              borderRadius: 8,
              padding: 10,
              border: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
                {definition.label}
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 600,
                  background:
                    currentPersona.fsmState === 'collapsed'
                      ? '#7f1d1d'
                      : currentPersona.fsmState === 'calling_help'
                      ? '#991b1b'
                      : currentPersona.fsmState === 'performing_action'
                      ? '#78350f'
                      : '#064e3b',
                  color:
                    currentPersona.fsmState === 'collapsed' || currentPersona.fsmState === 'calling_help'
                      ? '#fca5a5'
                      : currentPersona.fsmState === 'performing_action'
                      ? '#fde68a'
                      : '#6ee7b7',
                }}
              >
                {currentPersona.fsmState.toUpperCase().replace('_', ' ')}
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
              {definition.description}
            </div>

            {/* Sensor Coverage Readout */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 4,
                background: coverage.detected ? 'rgba(6, 78, 59, 0.4)' : 'rgba(120, 53, 15, 0.4)',
                border: `1px solid ${coverage.detected ? '#059669' : '#d97706'}`,
              }}
            >
              <span>{coverage.detected ? '📡' : '⚠️'}</span>
              <span style={{ color: coverage.detected ? '#6ee7b7' : '#fde68a' }}>
                {coverage.detected
                  ? `Covered by Pole ${coverage.primarySensor?.sensorId} (${coverage.distanceToNearestSensorM}m)`
                  : `COVERAGE GAP · Nearest: ${coverage.nearestPoleId} (${coverage.distanceToNearestSensorM}m)`}
              </span>
            </div>
          </div>

          {/* ── Real-Time Incident / Action Status Feedback Banner ──────────── */}
          {actionFeedback && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 11,
                lineHeight: '1.45',
                background:
                  actionFeedback.category === 'emergency_detected'
                    ? 'rgba(185, 28, 28, 0.28)'
                    : actionFeedback.category === 'coverage_gap'
                    ? 'rgba(217, 119, 6, 0.25)'
                    : actionFeedback.category === 'rejected'
                    ? 'rgba(153, 27, 27, 0.22)'
                    : 'rgba(5, 150, 105, 0.22)',
                border: `1px solid ${
                  actionFeedback.category === 'emergency_detected'
                    ? '#ef4444'
                    : actionFeedback.category === 'coverage_gap'
                    ? '#f59e0b'
                    : actionFeedback.category === 'rejected'
                    ? '#f87171'
                    : '#10b981'
                }`,
                color:
                  actionFeedback.category === 'emergency_detected'
                    ? '#fca5a5'
                    : actionFeedback.category === 'coverage_gap'
                    ? '#fde68a'
                    : actionFeedback.category === 'rejected'
                    ? '#fecaca'
                    : '#6ee7b7',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>
                  {actionFeedback.category === 'emergency_detected'
                    ? '⚠️'
                    : actionFeedback.category === 'coverage_gap'
                    ? '📡'
                    : actionFeedback.category === 'rejected'
                    ? '⛔'
                    : '✓'}
                </span>
                <span>
                  {actionFeedback.category === 'emergency_detected'
                    ? `INCIDENT REPORTED (${actionFeedback.incidentId})`
                    : actionFeedback.category === 'coverage_gap'
                    ? 'SENSOR COVERAGE STATUS'
                    : actionFeedback.category === 'rejected'
                    ? 'ACTION REJECTED'
                    : 'ACTION DISPATCHED'}
                </span>
              </div>
              <div>{actionFeedback.message}</div>
              {actionFeedback.incidentId && (
                <div style={{ marginTop: 4, fontSize: 10, color: '#fca5a5', opacity: 0.9 }}>
                  Incident logged in Incidents tab · Local lighting boosted · Guard review needed
                </div>
              )}
            </div>
          )}

          {/* ── Supported Actions Grid ─────────────────────────────────────── */}
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>
              TRIGGER ACTION FOR VISITOR #{currentPersonaIndex + 1}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {definition.supportedActions.map((actionKey) => {
                const meta = ACTION_LABELS[actionKey] || { label: actionKey, icon: '•', category: 'normal' };
                const isActive = currentPersona.currentAction === actionKey;
                const isEmergency = meta.category === 'emergency';

                return (
                  <button
                    key={actionKey}
                    onClick={() => handleTriggerAction(actionKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: isActive
                        ? '1px solid #38bdf8'
                        : isEmergency
                        ? '1px solid rgba(239, 68, 68, 0.45)'
                        : '1px solid #334155',
                      background: isActive
                        ? 'rgba(2, 132, 199, 0.45)'
                        : isEmergency
                        ? 'rgba(220, 38, 38, 0.20)'
                        : 'rgba(30, 41, 59, 0.70)',
                      color: isActive ? '#38bdf8' : isEmergency ? '#fca5a5' : '#f8fafc',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Operator Control Bar ───────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
            <button
              onClick={handleRecover}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #059669',
                background: 'rgba(5, 150, 105, 0.25)',
                color: '#6ee7b7',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              🔄 Recover & Resume
            </button>
            <button
              onClick={() => toggleScheduler()}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #334155',
                background: schedulerEnabled ? 'rgba(2, 132, 199, 0.25)' : 'rgba(71, 85, 105, 0.35)',
                color: schedulerEnabled ? '#7dd3fc' : '#94a3b8',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ⏱ Autonomous Scheduler: {schedulerEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* ── Guard Anonymous Observation Preview ───────────────────────── */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px dashed #334155',
              borderRadius: 6,
              padding: 8,
              fontSize: 10,
              color: '#94a3b8',
            }}
          >
            <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
              SIMULATOR GROUND TRUTH — NOT SENSOR TELEMETRY:
            </div>
            <div>• Simulated visitor #{currentPersonaIndex + 1}</div>
            <div>
              • Height: {currentPersona.fsmState === 'collapsed' ? '0.34m (Collapsed)' : '1.72m (Upright)'} · Action: {currentPersona.currentAction}
            </div>
            <div>
              • Sensor Status: {coverage.detected ? `Monitored by ${coverage.primarySensor?.sensorId}` : 'Not observed by LiDAR'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
