// ── Shared Types for Autonomous Personas & Humanoid Movement Simulation ────
// Stage 1: Anonymous Humanoid Foundations
// Stage 2: Autonomous Persona Engine, Kinematics, Telemetry & Action Bus

export interface DotPath {
  x: number;
  z: number;
  radius: number;
  speed: number;
  offset: number;
  waypoints?: [number, number][];
}

/**
 * Stage 1 Humanoid Props — 100% drop-in compatible with AnonymousDotProps.
 */
export interface AnonymousHumanoidProps {
  path: DotPath;
  paused: boolean;
  highlight: boolean;
  stationary: boolean;
  isLookalikeStop?: boolean;
  isCollapsed?: boolean;
  isSOS?: boolean;
  sosTargetPos?: [number, number] | null;
  onSelect?: () => void;
  // Stage 1 extension hooks
  personaIndex?: number;
  showPostureLabel?: boolean;
}

export type PersonaId =
  | 'persona_0'
  | 'persona_1'
  | 'persona_2'
  | 'persona_3'
  | 'persona_4';

export type PersonaActionType =
  | 'walk'
  | 'jog'
  | 'sprint'
  | 'crouch'
  | 'tie_shoelaces'
  | 'sit'
  | 'bench_rest'
  | 'check_phone'
  | 'pause_tree'
  | 'yoga'
  | 'jumping_jacks'
  | 'talking'
  | 'laughing'
  | 'whistling'
  | 'child_crying'
  | 'collapse'
  | 'call_help';

export type PersonaFsmState =
  | 'autonomous_moving'
  | 'preparing_action'
  | 'performing_action'
  | 'recovering'
  | 'collapsed'
  | 'calling_help';

export interface PersonaRuntimeState {
  personaId: PersonaId;
  personaIndex: number;
  label: string;
  fsmState: PersonaFsmState;
  currentAction: PersonaActionType;
  worldPosition: [number, number, number];
  headingAngleRad: number;
  stationaryDurationSec: number;
  supportedActions: PersonaActionType[];
  isAutonomousSchedulable: boolean;
}

export interface PersonaActionCommand {
  targetIndex: number;
  action: PersonaActionType;
  durationSec?: number;
  navigationTarget?: [number, number];
  timestamp: number;
}

/**
 * Strictly anonymous kinematic telemetry emitted to guard feeds.
 * Guarantees zero identity leakage (no name, persona, face, or demographic attributes).
 */
export interface AnonymousKinematicObservation {
  clusterId: string; // e.g. "LIDAR-P-01"
  timestamp: number;
  worldPosition: [number, number, number];
  horizontalSpeedMps: number;
  verticalVelocityMps: number;
  clusterHeightM: number;
  aspectRatio: number; // width / height
  postureClassification:
    | 'upright_mobile'
    | 'upright_stationary'
    | 'crouching'
    | 'seated'
    | 'prone_collapsed';
  stationaryDurationSec: number;
  isCoveredByOperationalSensor: boolean;
  coveringPoleId: string | null;
}

/**
 * Transparent audio observation request for sound-emitting actions.
 * Never fabricates synthetic AI/YAMNet detection scores.
 */
export interface AudioObservationRequest {
  requestId: string;
  sourcePersonaIndex: number;
  approxLocation: [number, number];
  nearestPoleId: string;
  nearestZoneId: string;
  acousticEventHint:
    | 'vocal_distress'
    | 'sudden_impact_thud'
    | 'rapid_footsteps'
    | 'child_crying'
    | 'whistling';
  timestamp: number;
  verificationStatus: 'pending_acoustic_confirmation';
  sourceDisclaimer: 'SIMULATION_ACTION_TRIGGER · NO_SYNTHETIC_SENSOR_FABRICATION';
}
