import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type {
  PersonaActionType,
  PersonaFsmState,
  PersonaRuntimeState,
} from '../types/persona';
import { PERSONA_DEFINITIONS } from '../data/personaData';
import { PEOPLE_PATHS } from '../data/parkData';

// ── Shared CatmullRom Spline Curves for Safe Locomotion ─────────────────────
export const PERSONA_CURVES = PEOPLE_PATHS.map((path) => {
  const pts = path.waypoints.map(([wx, wz]) => new THREE.Vector3(wx, 0.86, wz));
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.25);
});

export function getInitialSpawnPosition(personaIndex: number): [number, number, number] {
  const path = PEOPLE_PATHS[personaIndex] || PEOPLE_PATHS[0];
  const curve = PERSONA_CURVES[personaIndex] || PERSONA_CURVES[0];
  const pt = curve.getPointAt(path.offset % 1);
  return [Math.round(pt.x * 100) / 100, 0.86, Math.round(pt.z * 100) / 100];
}

export function getInitialHeadingAngle(personaIndex: number): number {
  const path = PEOPLE_PATHS[personaIndex] || PEOPLE_PATHS[0];
  const curve = PERSONA_CURVES[personaIndex] || PERSONA_CURVES[0];
  const t = path.offset % 1;
  const pt = curve.getPointAt(t);
  const ptNext = curve.getPointAt((t + 0.003) % 1);
  return Math.atan2(ptNext.x - pt.x, ptNext.z - pt.z);
}

export function validatePersonaPosition(
  personaIndex: number,
  pos: [number, number, number] | null | undefined
): [number, number, number] {
  if (
    !pos ||
    !Number.isFinite(pos[0]) ||
    !Number.isFinite(pos[2]) ||
    Math.hypot(pos[0], pos[2]) < 0.05
  ) {
    return getInitialSpawnPosition(personaIndex);
  }
  return [pos[0], pos[1], pos[2]];
}

// ── Extended Runtime State with Manual Override Flag ────────────────────────
export interface ExtendedPersonaRuntimeState extends PersonaRuntimeState {
  isManualOverride?: boolean;
  // Simulation display links only; these never change incident lifecycle state.
  fallIncidentId?: string;
  helpIncidentId?: string;
}

type PersonaStateListener = (states: ExtendedPersonaRuntimeState[]) => void;
const listeners = new Set<PersonaStateListener>();

let globalPersonaStates: ExtendedPersonaRuntimeState[] = PERSONA_DEFINITIONS.map((def) => {
  const path = PEOPLE_PATHS[def.index] || PEOPLE_PATHS[0];
  return {
    personaId: def.id,
    personaIndex: def.index,
    label: def.label,
    anonymousClusterId: `LIDAR-P-0${def.index + 1}`,
    fsmState: 'autonomous_moving',
    currentAction: def.supportedActions[0] || 'walk',
    worldPosition: getInitialSpawnPosition(def.index),
    headingAngleRad: getInitialHeadingAngle(def.index),
    stationaryDurationSec: 0,
    supportedActions: def.supportedActions,
    isAutonomousSchedulable: true,
    isManualOverride: false,
    waypointIndex: 0,
    movementProgress: path.offset,
    actionPhase: 0,
    movementSpeed: def.baseSpeed,
    lastUpdateTimestamp: Date.now(),
  };
});

export function getGlobalPersonaStates(): ExtendedPersonaRuntimeState[] {
  return [...globalPersonaStates];
}

// Update authoritative persona position and progress from active rendering frames or simulation ticks
export function updatePersonaPosition(
  personaIndex: number,
  movementProgress: number,
  worldPosition: [number, number, number],
  headingAngleRad: number,
  actionPhase: number,
  movementSpeed?: number
) {
  const current = globalPersonaStates[personaIndex];
  if (!current) return;

  const targetPos = current.fsmState === 'collapsed' ? current.worldPosition : worldPosition;
  const validPos = validatePersonaPosition(personaIndex, targetPos);

  const path = PEOPLE_PATHS[personaIndex] || PEOPLE_PATHS[0];
  let closestWpIndex = 0;
  let minWpDist = Infinity;
  path.waypoints.forEach((wp, wIdx) => {
    const d = Math.hypot(validPos[0] - wp[0], validPos[2] - wp[1]);
    if (d < minWpDist) {
      minWpDist = d;
      closestWpIndex = wIdx;
    }
  });

  globalPersonaStates[personaIndex] = {
    ...current,
    movementProgress,
    worldPosition: validPos,
    headingAngleRad,
    actionPhase,
    waypointIndex: closestWpIndex,
    movementSpeed: movementSpeed !== undefined ? movementSpeed : current.movementSpeed,
    lastUpdateTimestamp: Date.now(),
  };
}

// Advance simulation state programmatically (used by tests and frame-rate independent runners)
export function advancePersonaSimulationStep(
  personaIndex: number,
  deltaSec: number,
  paused = false
): ExtendedPersonaRuntimeState | undefined {
  const current = globalPersonaStates[personaIndex];
  if (!current) return undefined;

  const def = PERSONA_DEFINITIONS[personaIndex] || PERSONA_DEFINITIONS[0];
  const path = PEOPLE_PATHS[personaIndex] || PEOPLE_PATHS[0];
  const curve = PERSONA_CURVES[personaIndex] || PERSONA_CURVES[0];

  const isMobileAction =
    (current.currentAction === 'walk' ||
      current.currentAction === 'jog' ||
      current.currentAction === 'sprint') &&
    current.fsmState !== 'collapsed';
  const isMovementActive = !paused && isMobileAction;

  if (isMovementActive) {
    const speedMultiplier =
      current.currentAction === 'sprint' ? 2.2 : current.currentAction === 'jog' ? 1.25 : 1.0;
    const effectiveSpeed = (def.baseSpeed || path.speed) * speedMultiplier;
    const speedFactor = 0.08 * effectiveSpeed;

    const nextProgress = (current.movementProgress + deltaSec * speedFactor) % 1;
    const t = nextProgress < 0 ? nextProgress + 1 : nextProgress;

    const pt = curve.getPointAt(t);
    const ptNext = curve.getPointAt((t + 0.003) % 1);
    const dx = ptNext.x - pt.x;
    const dz = ptNext.z - pt.z;
    const headingAngle = Math.atan2(dx, dz);
    const actionPhase = current.actionPhase + deltaSec * effectiveSpeed * 8.5;

    updatePersonaPosition(
      personaIndex,
      nextProgress,
      [pt.x, 0.86, pt.z],
      headingAngle,
      actionPhase,
      effectiveSpeed
    );
  }
  return globalPersonaStates[personaIndex];
}

// Demo controls stage ground truth explicitly; ParkContext evaluates that same
// position before creating any detection response. This does not emit an observation.
export function stageDemoCollapse(personaIndex: number, position: [number, number, number]) {
  const current = globalPersonaStates[personaIndex];
  if (!current) return;
  const validPos = validatePersonaPosition(personaIndex, position);
  current.fallIncidentId = undefined;
  current.helpIncidentId = undefined;
  globalPersonaStates[personaIndex] = {
    ...current,
    worldPosition: [...validPos],
    currentAction: 'collapse',
    fsmState: 'collapsed',
    stationaryDurationSec: 0,
    isManualOverride: true,
    lastUpdateTimestamp: Date.now(),
  };
  notifyListeners();
}

// Link a scripted demo actor only to the incident that its scenario created.
export function linkDemoFallIncident(personaIndex: number, incidentId: string) {
  const current = globalPersonaStates[personaIndex];
  if (!current || current.fsmState !== 'collapsed') return;
  globalPersonaStates[personaIndex] = { ...current, fallIncidentId: incidentId };
  notifyListeners();
}

export interface PersonaObservation {
  type: 'fall' | 'audio_distress';
  personaIndex: number;
  worldPos: [number, number];
  action: string;
}
type ObservationResult = { detected: boolean; reason: string; incidentId?: string };
let observationHandler: ((obs: PersonaObservation) => ObservationResult) | undefined;
export function subscribePersonaObservations(handler: (obs: PersonaObservation) => ObservationResult) {
  // Keep main's dispatcher and motion state authoritative. Annotate its returned
  // observation only so existing incident display/recovery links remain usable.
  const annotatedHandler = (obs: PersonaObservation): ObservationResult => {
    const result = handler(obs);
    const current = globalPersonaStates[obs.personaIndex];
    if (current) {
      globalPersonaStates[obs.personaIndex] = {
        ...current,
        [obs.type === 'fall' ? 'fallIncidentId' : 'helpIncidentId']: result.incidentId,
      };
    }
    return result;
  };
  observationHandler = annotatedHandler;
  return () => { if (observationHandler === annotatedHandler) observationHandler = undefined; };
}

export const BENIGN_ACTION_ALLOWLIST: readonly PersonaActionType[] = [
  'walk',
  'jog',
  'sprint',
  'tie_shoelaces',
  'check_phone',
  'pause_tree',
  'bench_rest',
  'whistling',
  'yoga',
  'jumping_jacks',
  'crouch',
  'talking',
  'laughing',
  'sit',
];

// Authoritative toggle for background visitor activity (Default: OFF / Manual Demo Mode)
let backgroundActivityEnabled = false;

type BackgroundActivityListener = (enabled: boolean) => void;
const activityListeners = new Set<BackgroundActivityListener>();

export function isBackgroundActivityEnabled(): boolean {
  return backgroundActivityEnabled;
}

export function setBackgroundActivityEnabled(enabled: boolean): void {
  backgroundActivityEnabled = enabled;
  activityListeners.forEach((l) => l(enabled));
}

function notifyListeners() {
  const snapshot = [...globalPersonaStates];
  listeners.forEach((l) => l(snapshot));
}

// Timers belong to the shared persona store, so commands from any consumer
// reset the same scheduler rather than an inactive consumer's private timers.
const nextScheduledTimeRef = { current: [30, 42, 25, 38, 35] };
const activeActionDurationRef = { current: [0, 0, 0, 0, 0] };

  // ── Standalone Persona API ────────────────────────────────────────────────
export function dispatchPersonaAction(
  personaIndex: number,
  action: PersonaActionType,
  durationSec?: number,
  isAutonomous = false
) {
  if (personaIndex < 0 || personaIndex >= globalPersonaStates.length) {
    return { success: false, reason: 'Invalid persona index' };
  }

  const current = globalPersonaStates[personaIndex];

  // Emergency State Lock: When collapsed, ordinary actions cannot be executed
  if (current.fsmState === 'collapsed') {
    if (action === 'call_help') {
      // Allowed: Signaling distress from the ground while remaining collapsed
      globalPersonaStates[personaIndex] = {
        ...current,
        currentAction: 'call_help',
        isManualOverride: true,
      };
      notifyListeners();
      return {
        success: true,
        reason: 'Signaling distress from collapsed position',
        observation: observationHandler?.({
          type: 'audio_distress',
          personaIndex,
          worldPos: [current.worldPosition[0], current.worldPosition[2]],
          action,
        }),
      };
    }
    if (action === 'collapse') {
      // Already collapsed; maintain collapsed state
      globalPersonaStates[personaIndex] = {
        ...current,
        currentAction: 'collapse',
        isManualOverride: true,
      };
      notifyListeners();
      return { success: true, reason: 'Visitor remains collapsed' };
    }
    // Strict safety lock: All ordinary actions rejected until explicit recovery
    return {
      success: false,
      reason: `Cannot perform "${action}" while collapsed. Use "Recover & Resume" first.`,
    };
  }

  // Determine new FSM state
  let nextFsmState: PersonaFsmState = 'performing_action';
  if (action === 'collapse') {
    nextFsmState = 'collapsed';
  } else if (action === 'call_help') {
    nextFsmState = 'calling_help';
  } else if (action === 'walk' || action === 'jog') {
    nextFsmState = 'autonomous_moving';
  }

  // Clean up any previous action timer
  activeActionDurationRef.current[personaIndex] = isAutonomous && durationSec ? durationSec : 0;

  globalPersonaStates[personaIndex] = {
    ...current,
    fsmState: nextFsmState,
    currentAction: action,
    stationaryDurationSec: action === 'collapse' ? 0 : current.stationaryDurationSec,
    isManualOverride: !isAutonomous, // Manual action locks out autonomous scheduler
    lastUpdateTimestamp: Date.now(),
  };

  const observation =
    action === 'collapse' || action === 'call_help'
      ? observationHandler?.({
          type: action === 'collapse' ? 'fall' : 'audio_distress',
          personaIndex,
          worldPos: [current.worldPosition[0], current.worldPosition[2]],
          action,
        })
      : undefined;
  notifyListeners();
  return { success: true, reason: `Action "${action}" activated`, observation };
}

export function recoverPersonaState(personaIndex: number) {
  if (personaIndex < 0 || personaIndex >= globalPersonaStates.length) return;
  const def = PERSONA_DEFINITIONS[personaIndex];

  globalPersonaStates[personaIndex] = {
    ...globalPersonaStates[personaIndex],
    fallIncidentId: undefined,
    helpIncidentId: undefined,
    fsmState: 'recovering',
    currentAction: def.supportedActions[0] || 'walk',
    stationaryDurationSec: 0,
    isManualOverride: false, // Clear manual override so autonomous behavior can resume later
    lastUpdateTimestamp: Date.now(),
  };
  activeActionDurationRef.current[personaIndex] = 0;
  notifyListeners();

  // After 1.0s blend, return to autonomous_moving
  setTimeout(() => {
    if (globalPersonaStates[personaIndex]?.fsmState === 'recovering') {
      globalPersonaStates[personaIndex] = {
        ...globalPersonaStates[personaIndex],
        fsmState: 'autonomous_moving',
        lastUpdateTimestamp: Date.now(),
      };
      // Reset autonomous timer so they don't immediately trigger another activity
      nextScheduledTimeRef.current[personaIndex] = 30 + Math.floor(Math.random() * 20);
      notifyListeners();
    }
  }, 1000);
}

export function resetAllPersonaStates() {
  globalPersonaStates = PERSONA_DEFINITIONS.map((def) => {
    const path = PEOPLE_PATHS[def.index] || PEOPLE_PATHS[0];
    return {
      personaId: def.id,
      personaIndex: def.index,
      label: def.label,
      anonymousClusterId: `LIDAR-P-0${def.index + 1}`,
      fsmState: 'autonomous_moving',
      currentAction: def.supportedActions[0] || 'walk',
      worldPosition: getInitialSpawnPosition(def.index),
      headingAngleRad: getInitialHeadingAngle(def.index),
      stationaryDurationSec: 0,
      supportedActions: def.supportedActions,
      isAutonomousSchedulable: true,
      isManualOverride: false,
      waypointIndex: 0,
      movementProgress: path.offset,
      actionPhase: 0,
      movementSpeed: def.baseSpeed,
      lastUpdateTimestamp: Date.now(),
    };
  });
  nextScheduledTimeRef.current = [28, 40, 24, 36, 32];
  activeActionDurationRef.current = [0, 0, 0, 0, 0];
  notifyListeners();
}

// ── Programmatic Simulation Scheduler Tick ────────────────────────────────────
// Separates normal continuous movement from random background behavioral activities.
// Can be called per-second by the timer loop or discrete-stepped by test suites.
export function advanceSimulationSchedulerTick(deltaSeconds = 1): void {
  globalPersonaStates.forEach((persona, i) => {
    const def = PERSONA_DEFINITIONS[i];
    if (!def) return;

    // 1. Advance stationary time progression regardless of background activity toggle
    if (persona.fsmState === 'collapsed' || persona.fsmState === 'performing_action') {
      persona.stationaryDurationSec += deltaSeconds;
    }

    // 2. Auto-recovery: If performing an autonomous timed action (not manually overridden)
    if (
      !persona.isManualOverride &&
      persona.fsmState === 'performing_action' &&
      activeActionDurationRef.current[i] > 0
    ) {
      activeActionDurationRef.current[i] -= deltaSeconds;
      if (activeActionDurationRef.current[i] <= 0) {
        recoverPersonaState(i);
      }
      return;
    }

    // 3. SEPARATION: If Background Visitor Activity is OFF, do NOT schedule random activities
    if (!backgroundActivityEnabled) return;

    // 4. Strict Safety Validations before scheduling any background activity:
    // - Persona must be marked schedulable
    if (!persona.isAutonomousSchedulable) return;
    // - Persona must NOT be collapsed
    if (persona.fsmState === 'collapsed') return;
    // - Persona must NOT be awaiting emergency response or calling for help
    if (persona.fsmState === 'calling_help' || persona.currentAction === 'call_help') return;
    // - Strict protection: NEVER override manual operator actions
    if (persona.isManualOverride) return;
    // - Only schedule when persona is currently in normal autonomous_moving
    if (persona.fsmState !== 'autonomous_moving') return;

    nextScheduledTimeRef.current[i] -= deltaSeconds;
    if (nextScheduledTimeRef.current[i] <= 0) {
      // Filter activities against explicit benign allowlist AND persona supported actions
      const pool = def.autonomousActivities.filter(
        (item) =>
          BENIGN_ACTION_ALLOWLIST.includes(item.action) &&
          def.supportedActions.includes(item.action)
      );
      if (!pool.length) return;

      const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
      let rand = Math.random() * totalWeight;
      let chosen = pool[0];

      for (const item of pool) {
        if (rand < item.weight) {
          chosen = item;
          break;
        }
        rand -= item.weight;
      }

      // Dispatch chosen benign activity autonomously (marked with isAutonomous = true)
      dispatchPersonaAction(i, chosen.action, chosen.durationSec, true);

      // Reset next autonomous schedule window (30-55 seconds)
      nextScheduledTimeRef.current[i] = 30 + Math.floor(Math.random() * 25);
    }
  });
}

export function usePersonaStateMachine(ownsScheduler = false) {
  const [states, setStates] = useState<ExtendedPersonaRuntimeState[]>(() => globalPersonaStates);
  const [backgroundActivity, setBackgroundActivity] = useState<boolean>(() => backgroundActivityEnabled);

  useEffect(() => {
    const handleUpdate: PersonaStateListener = (newStates) => {
      setStates(newStates);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleActivity: BackgroundActivityListener = (enabled) => {
      setBackgroundActivity(enabled);
    };
    activityListeners.add(handleActivity);
    return () => {
      activityListeners.delete(handleActivity);
    };
  }, []);

  const dispatchAction = useCallback(dispatchPersonaAction, []);
  const recoverPersona = useCallback(recoverPersonaState, []);
  const resetAllPersonas = useCallback(resetAllPersonaStates, []);

  // ── Toggle Background Activity / Scheduler ────────────────────────────────
  const toggleBackgroundActivity = useCallback((enabled?: boolean) => {
    const nextVal = enabled !== undefined ? enabled : !backgroundActivityEnabled;
    setBackgroundActivityEnabled(nextVal);
  }, []);

  // ── Single Authoritative Background Activity Loop (1 Hz Tick) ────────────
  useEffect(() => {
    if (!ownsScheduler) return;
    const interval = setInterval(() => {
      advanceSimulationSchedulerTick(1);
    }, 1000);

    return () => clearInterval(interval);
  }, [ownsScheduler]);

  return {
    states,
    schedulerEnabled: backgroundActivity,
    backgroundActivityEnabled: backgroundActivity,
    dispatchAction,
    recoverPersona,
    resetAllPersonas,
    toggleScheduler: toggleBackgroundActivity,
    toggleBackgroundActivity,
    setBackgroundActivityEnabled: toggleBackgroundActivity,
  };
}
