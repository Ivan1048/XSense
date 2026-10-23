import { useState, useEffect, useCallback } from 'react';
import type {
  PersonaActionType,
  PersonaFsmState,
  PersonaRuntimeState,
} from '../types/persona';
import { PERSONA_DEFINITIONS } from '../data/personaData';

// ── Extended Runtime State with Manual Override Flag ────────────────────────
export interface ExtendedPersonaRuntimeState extends PersonaRuntimeState {
  isManualOverride?: boolean;
}

type PersonaStateListener = (states: ExtendedPersonaRuntimeState[]) => void;
const listeners = new Set<PersonaStateListener>();

let globalPersonaStates: ExtendedPersonaRuntimeState[] = PERSONA_DEFINITIONS.map((def) => ({
  personaId: def.id,
  personaIndex: def.index,
  label: def.label,
  fsmState: 'autonomous_moving',
  currentAction: def.supportedActions[0] || 'walk',
  worldPosition: [0, 0.86, 0],
  headingAngleRad: 0,
  stationaryDurationSec: 0,
  supportedActions: def.supportedActions,
  isAutonomousSchedulable: true,
  isManualOverride: false,
}));

// Demo controls stage ground truth explicitly; ParkContext evaluates that same
// position before creating any detection response. This does not emit an observation.
export function stageDemoCollapse(personaIndex: number, position: [number, number, number]) {
  const current = globalPersonaStates[personaIndex];
  if (!current) return;
  globalPersonaStates[personaIndex] = {
    ...current, worldPosition: [...position], currentAction: 'collapse',
    fsmState: 'collapsed', stationaryDurationSec: 0, isManualOverride: true,
  };
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
  observationHandler = handler;
  return () => { if (observationHandler === handler) observationHandler = undefined; };
}

let isSchedulerActive = true;

function notifyListeners() {
  const snapshot = [...globalPersonaStates];
  listeners.forEach((l) => l(snapshot));
}

// Timers belong to the shared persona store, so commands from any consumer
// reset the same scheduler rather than an inactive consumer's private timers.
const nextScheduledTimeRef = { current: [30, 42, 25, 38, 35] };
const activeActionDurationRef = { current: [0, 0, 0, 0, 0] };

export function usePersonaStateMachine(ownsScheduler = false) {
  const [states, setStates] = useState<ExtendedPersonaRuntimeState[]>(() => globalPersonaStates);
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean>(() => isSchedulerActive);


  useEffect(() => {
    const handleUpdate: PersonaStateListener = (newStates) => {
      setStates(newStates);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // ── Dispatch Action API ───────────────────────────────────────────────────
  const dispatchAction = useCallback(
    (personaIndex: number, action: PersonaActionType, durationSec?: number, isAutonomous = false) => {
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
          return { success: true, reason: 'Signaling distress from collapsed position', observation: observationHandler?.({
            type: 'audio_distress', personaIndex,
            worldPos: [current.worldPosition[0], current.worldPosition[2]], action,
          }) };
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
        return { success: false, reason: `Cannot perform "${action}" while collapsed. Use "Recover & Resume" first.` };
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
      };

      const observation = action === 'collapse' || action === 'call_help'
        ? observationHandler?.({
            type: action === 'collapse' ? 'fall' : 'audio_distress',
            personaIndex,
            worldPos: [current.worldPosition[0], current.worldPosition[2]],
            action,
          })
        : undefined;
      notifyListeners();
      return { success: true, reason: `Action "${action}" activated`, observation };
    },
    [],
  );

  // ── Recovery & Resume API ─────────────────────────────────────────────────
  const recoverPersona = useCallback((personaIndex: number) => {
    if (personaIndex < 0 || personaIndex >= globalPersonaStates.length) return;
    const def = PERSONA_DEFINITIONS[personaIndex];

    globalPersonaStates[personaIndex] = {
      ...globalPersonaStates[personaIndex],
      fsmState: 'recovering',
      currentAction: def.supportedActions[0] || 'walk',
      stationaryDurationSec: 0,
      isManualOverride: false, // Clear manual override so autonomous behavior can resume later
    };
    activeActionDurationRef.current[personaIndex] = 0;
    notifyListeners();

    // After 1.0s blend, return to autonomous_moving
    setTimeout(() => {
      if (globalPersonaStates[personaIndex]?.fsmState === 'recovering') {
        globalPersonaStates[personaIndex] = {
          ...globalPersonaStates[personaIndex],
          fsmState: 'autonomous_moving',
        };
        // Reset autonomous timer so they don't immediately trigger another activity
        nextScheduledTimeRef.current[personaIndex] = 30 + Math.floor(Math.random() * 20);
        notifyListeners();
      }
    }, 1000);
  }, []);

  // ── Reset All Personas API ────────────────────────────────────────────────
  const resetAllPersonas = useCallback(() => {
    globalPersonaStates = PERSONA_DEFINITIONS.map((def) => ({
      personaId: def.id,
      personaIndex: def.index,
      label: def.label,
      fsmState: 'autonomous_moving',
      currentAction: def.supportedActions[0] || 'walk',
      worldPosition: [0, 0.86, 0],
      headingAngleRad: 0,
      stationaryDurationSec: 0,
      supportedActions: def.supportedActions,
      isAutonomousSchedulable: true,
      isManualOverride: false,
    }));
    nextScheduledTimeRef.current = [28, 40, 24, 36, 32];
    activeActionDurationRef.current = [0, 0, 0, 0, 0];
    notifyListeners();
  }, []);

  // ── Toggle Autonomous Scheduler ───────────────────────────────────────────
  const toggleScheduler = useCallback((enabled?: boolean) => {
    isSchedulerActive = enabled !== undefined ? enabled : !isSchedulerActive;
    setSchedulerEnabled(isSchedulerActive);
  }, []);

  // ── Autonomous Behavior Scheduler Loop (1 Hz Tick) ────────────────────────
  useEffect(() => {
    if (!ownsScheduler) return;
    const interval = setInterval(() => {
      if (!isSchedulerActive) return;

      globalPersonaStates.forEach((persona, i) => {
        const def = PERSONA_DEFINITIONS[i];
        if (!def || !def.autonomousActivities.length) return;

        // If collapsed or performing stationary action, increment duration
        if (persona.fsmState === 'collapsed' || persona.fsmState === 'performing_action') {
          persona.stationaryDurationSec += 1;
        }

        // If performing an autonomous timed action (not manually overridden)
        if (!persona.isManualOverride && persona.fsmState === 'performing_action' && activeActionDurationRef.current[i] > 0) {
          activeActionDurationRef.current[i] -= 1;
          if (activeActionDurationRef.current[i] <= 0) {
            // Auto-recovery: action complete, return smoothly to walking
            recoverPersona(i);
          }
          return;
        }

        // STRICT SAFETY RULE: Do NOT override manual operator actions
        if (persona.isManualOverride) return;

        // Only schedule new autonomous normal activities if currently in autonomous_moving
        if (persona.fsmState !== 'autonomous_moving') return;

        nextScheduledTimeRef.current[i] -= 1;
        if (nextScheduledTimeRef.current[i] <= 0) {
          // Select an activity from the non-emergency autonomous pool
          const pool = def.autonomousActivities;
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

          // Trigger chosen normal activity autonomously
          dispatchAction(i, chosen.action, chosen.durationSec, true);

          // Reset next autonomous schedule window (30-55 seconds)
          nextScheduledTimeRef.current[i] = 30 + Math.floor(Math.random() * 25);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatchAction, recoverPersona, ownsScheduler]);

  return {
    states,
    schedulerEnabled,
    dispatchAction,
    recoverPersona,
    resetAllPersonas,
    toggleScheduler,
  };
}
