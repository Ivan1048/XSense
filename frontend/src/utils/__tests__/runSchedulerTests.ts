// Automated Test Suite for XSENSE HOTFIX 04
// Autonomous Scheduler & Manual Demo Mode

import {
  isBackgroundActivityEnabled,
  setBackgroundActivityEnabled,
  BENIGN_ACTION_ALLOWLIST,
  advanceSimulationSchedulerTick,
  advancePersonaSimulationStep,
  getGlobalPersonaStates,
  dispatchPersonaAction,
  resetAllPersonaStates,
} from '../../hooks/usePersonaStateMachine';
import { PERSONA_DEFINITIONS } from '../../data/personaData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

console.log('\n=== RUNNING HOTFIX 04 SCHEDULER & DEMO MODE TESTS ===\n');

// ── Test 1: Default State & Continuous Movement with Activity OFF ─────────────
console.log('[Test 1: Default State & Continuous Movement with Activity OFF]');
{
  resetAllPersonaStates();
  setBackgroundActivityEnabled(false);

  assert(
    isBackgroundActivityEnabled() === false,
    'Background activity is disabled by default (Manual Demo Mode)'
  );

  // All 5 visitors move continuously on normal routes even when Background Activity is OFF
  const initialStates = getGlobalPersonaStates();
  for (let i = 0; i < 5; i++) {
    advancePersonaSimulationStep(i, 3.0);
  }
  const progressedStates = getGlobalPersonaStates();
  for (let i = 0; i < 5; i++) {
    assert(
      progressedStates[i].movementProgress !== initialStates[i].movementProgress,
      `Visitor #${i + 1} (${progressedStates[i].label}) advances position while Background Activity is OFF`
    );
  }

  // Advance 120 discrete scheduler ticks (simulating 2 minutes of park operation)
  for (let tick = 0; tick < 120; tick++) {
    advanceSimulationSchedulerTick(1);
  }

  // Confirm NO random special actions occurred
  const statesAfterTicks = getGlobalPersonaStates();
  for (let i = 0; i < 5; i++) {
    const defaultAction = PERSONA_DEFINITIONS[i].supportedActions[0];
    assert(
      statesAfterTicks[i].currentAction === defaultAction,
      `Visitor #${i + 1} stayed in default mobile action (${defaultAction}), no random actions occurred`
    );
    assert(
      statesAfterTicks[i].fsmState === 'autonomous_moving',
      `Visitor #${i + 1} remained in autonomous_moving FSM state`
    );
  }
}

// ── Test 2: Manual Actions Work in Manual Demo Mode (Activity OFF) ─────────────
console.log('\n[Test 2: Manual Operator Actions in Manual Demo Mode]');
{
  assert(isBackgroundActivityEnabled() === false, 'Background Activity remains OFF');

  // Trigger manual yoga on Visitor #2 (Fitness Enthusiast)
  const resYoga = dispatchPersonaAction(2, 'yoga');
  assert(resYoga.success === true, 'Manual yoga dispatch succeeded');

  let states = getGlobalPersonaStates();
  assert(states[2].currentAction === 'yoga', 'Visitor #2 is performing yoga');
  assert(states[2].isManualOverride === true, 'Visitor #2 marked with manual override');

  // Trigger manual crouching on Visitor #3 (Parent)
  const resCrouch = dispatchPersonaAction(3, 'crouch');
  assert(resCrouch.success === true, 'Manual crouch dispatch succeeded');

  states = getGlobalPersonaStates();
  assert(states[3].currentAction === 'crouch', 'Visitor #3 is crouching');
  assert(states[3].isManualOverride === true, 'Visitor #3 marked with manual override');

  // Tick scheduler 30 times with activity OFF
  for (let tick = 0; tick < 30; tick++) {
    advanceSimulationSchedulerTick(1);
  }

  states = getGlobalPersonaStates();
  assert(
    states[2].currentAction === 'yoga' && states[2].isManualOverride === true,
    'Manual yoga remains active and is not cleared by scheduler'
  );
  assert(
    states[3].currentAction === 'crouch' && states[3].isManualOverride === true,
    'Manual crouch remains active and is not cleared by scheduler'
  );

  resetAllPersonaStates();
}

// ── Test 3: Background Activity ON — Only Benign Allowlisted Actions ──────────
console.log('\n[Test 3: Background Activity ON — Benign Allowlist Enforcement]');
{
  resetAllPersonaStates();
  setBackgroundActivityEnabled(true);
  assert(isBackgroundActivityEnabled() === true, 'Background activity enabled');

  // Ensure all actions in BENIGN_ACTION_ALLOWLIST strictly exclude emergency actions
  assert(
    !BENIGN_ACTION_ALLOWLIST.includes('collapse'),
    'BENIGN_ACTION_ALLOWLIST strictly excludes "collapse"'
  );
  assert(
    !BENIGN_ACTION_ALLOWLIST.includes('call_help'),
    'BENIGN_ACTION_ALLOWLIST strictly excludes "call_help"'
  );
  assert(
    !BENIGN_ACTION_ALLOWLIST.includes('child_crying'),
    'BENIGN_ACTION_ALLOWLIST strictly excludes "child_crying"'
  );

  // Advance ticks to trigger scheduled autonomous actions
  let scheduledActionObserved = false;
  let allActionsBenign = true;

  for (let tick = 0; tick < 300; tick++) {
    advanceSimulationSchedulerTick(1);
    const states = getGlobalPersonaStates();
    for (const persona of states) {
      if (persona.currentAction !== PERSONA_DEFINITIONS[persona.personaIndex].supportedActions[0]) {
        scheduledActionObserved = true;
        if (!BENIGN_ACTION_ALLOWLIST.includes(persona.currentAction)) {
          allActionsBenign = false;
        }
      }
    }
  }

  assert(scheduledActionObserved, 'Autonomous background activities triggered when enabled');
  assert(allActionsBenign, 'All triggered autonomous actions are in BENIGN_ACTION_ALLOWLIST');
}

// ── Test 4: Manual Collapse Protection Against Scheduler Interruption ─────────
console.log('\n[Test 4: Manual Collapse Protection Against Scheduler Interruption]');
{
  resetAllPersonaStates();
  setBackgroundActivityEnabled(true);

  // Operator triggers manual collapse for Visitor #0
  const collapseRes = dispatchPersonaAction(0, 'collapse');
  assert(collapseRes.success === true, 'Manual collapse dispatched');

  let states = getGlobalPersonaStates();
  assert(states[0].fsmState === 'collapsed', 'Visitor #0 is collapsed');
  assert(states[0].currentAction === 'collapse', 'Visitor #0 current action is "collapse"');
  assert(states[0].isManualOverride === true, 'Visitor #0 marked with manual override');

  // Tick scheduler 100 times while Background Activity is ON
  for (let tick = 0; tick < 100; tick++) {
    advanceSimulationSchedulerTick(1);
  }

  states = getGlobalPersonaStates();
  assert(
    states[0].fsmState === 'collapsed',
    'Visitor #0 remains collapsed; scheduler NEVER overrides emergency state'
  );
  assert(
    states[0].currentAction === 'collapse',
    'Visitor #0 current action remains "collapse"'
  );
  assert(
    states[0].stationaryDurationSec >= 100,
    `Stationary duration tracked continuously (${states[0].stationaryDurationSec}s)`
  );
}

// ── Test 5: Toggling Activity OFF Prevents Further Scheduling ─────────────────
console.log('\n[Test 5: Toggling Activity OFF Prevents Further Scheduling]');
{
  resetAllPersonaStates();
  setBackgroundActivityEnabled(false);
  assert(isBackgroundActivityEnabled() === false, 'Toggled Background Activity OFF');

  // Verify across 60 ticks that nobody triggers background actions
  for (let tick = 0; tick < 60; tick++) {
    advanceSimulationSchedulerTick(1);
  }

  const states = getGlobalPersonaStates();
  const allDefault = states.every(
    (p) => p.currentAction === PERSONA_DEFINITIONS[p.personaIndex].supportedActions[0]
  );
  assert(allDefault, 'No new random actions scheduled after disabling activity');
}

console.log(`\n=== SCHEDULER TESTS: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
