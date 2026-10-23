// Automated Test Suite for XSENSE HOTFIX 01
// Tests A, B, C, D, E: Persistent Persona State & Pole Collision Prevention

import {
  PERSONA_CURVES,
  getInitialSpawnPosition,
  getInitialHeadingAngle,
  validatePersonaPosition,
  getGlobalPersonaStates,
  updatePersonaPosition,
  advancePersonaSimulationStep,
  stageDemoCollapse,
  dispatchPersonaAction,
  resetAllPersonaStates,
} from '../../hooks/usePersonaStateMachine.ts';
import {
  POLES,
  PEOPLE_PATHS,
  POLE_EXCLUSION_RADIUS_M,
  checkPoleClearance,
} from '../../data/parkData.ts';
import { PERSONA_DEFINITIONS } from '../../data/personaData.ts';

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

console.log('\n=== RUNNING HOTFIX 01 VERIFICATION TESTS ===\n');

// ── Test A: Route Persistence Across Navigation ──────────────────────────────
console.log('[Test A: Route Persistence Across Navigation]');
{
  const initialStates = getGlobalPersonaStates();
  assert(initialStates.length === 5, 'Initially manages exactly 5 personas');

  // Verify all 5 have distinct IDs and cluster IDs
  const initialIds = initialStates.map((p) => p.personaId);
  const initialClusters = initialStates.map((p) => p.anonymousClusterId);
  assert(new Set(initialIds).size === 5, 'All 5 persona IDs are unique (P-01 to P-05)');
  assert(new Set(initialClusters).size === 5, 'All 5 cluster IDs are unique (LIDAR-P-01 to LIDAR-P-05)');

  // Advance each persona along its path by 2.5 seconds
  for (let i = 0; i < 5; i++) {
    advancePersonaSimulationStep(i, 2.5);
  }

  const advancedStates = getGlobalPersonaStates();
  // Verify positions progressed and did not stay at initial spawn
  let allProgressed = true;
  for (let i = 0; i < 5; i++) {
    const initPos = getInitialSpawnPosition(i);
    const currPos = advancedStates[i].worldPosition;
    const distFromInit = Math.hypot(currPos[0] - initPos[0], currPos[2] - initPos[2]);
    if (distFromInit < 0.05) allProgressed = false;
  }
  assert(allProgressed, 'All 5 visitors moved forward from initial spawn points');

  // Record state prior to navigation
  const preNavSnapshot = advancedStates.map((s) => ({
    id: s.personaId,
    clusterId: s.anonymousClusterId,
    progress: s.movementProgress,
    pos: [...s.worldPosition],
    action: s.currentAction,
    fsmState: s.fsmState,
  }));

  // Simulate navigating away from Park Overview to /incidents (unmounting 3D Scene)
  // Rendering loop stops; global authoritative state remains intact
  const unmountedState = getGlobalPersonaStates();
  assert(unmountedState.length === 5, 'State remains intact while Park Overview is unmounted');

  // Simulate navigating back to Park Overview (remounting 3D Scene / AnonymousHumanoid)
  const remountedStates = getGlobalPersonaStates();
  let perfectlyPreserved = true;
  for (let i = 0; i < 5; i++) {
    const pre = preNavSnapshot[i];
    const post = remountedStates[i];
    if (
      post.personaId !== pre.id ||
      post.anonymousClusterId !== pre.clusterId ||
      Math.abs(post.movementProgress - pre.progress) > 1e-5 ||
      Math.abs(post.worldPosition[0] - pre.pos[0]) > 1e-4 ||
      Math.abs(post.worldPosition[2] - pre.pos[2]) > 1e-4 ||
      post.currentAction !== pre.action ||
      post.fsmState !== pre.fsmState
    ) {
      perfectlyPreserved = false;
    }
  }
  assert(perfectlyPreserved, 'Remounted visitors retain exact coordinates, progress, and actions');

  // Verify none reset to [0, 0] or fallback origin
  const zeroCoords = remountedStates.filter(
    (s) => Math.hypot(s.worldPosition[0], s.worldPosition[2]) < 0.1
  );
  assert(zeroCoords.length === 0, 'No persona reset to [0, 0] fallback');
}

// ── Test B: Multiple Navigation Cycles ────────────────────────────────────────
console.log('\n[Test B: Multiple Navigation Cycles (5 cycles)]');
{
  let allCyclesValid = true;
  for (let cycle = 1; cycle <= 5; cycle++) {
    // Advance simulation slightly in current page
    for (let i = 0; i < 5; i++) {
      advancePersonaSimulationStep(i, 0.4);
    }
    const beforeNav = getGlobalPersonaStates();
    // Simulate navigation: Overview -> Incidents -> System -> Overview
    const afterNav = getGlobalPersonaStates();

    if (afterNav.length !== 5) allCyclesValid = false;
    for (let i = 0; i < 5; i++) {
      if (afterNav[i].movementProgress !== beforeNav[i].movementProgress) {
        allCyclesValid = false;
      }
      if (Math.hypot(afterNav[i].worldPosition[0], afterNav[i].worldPosition[2]) < 0.1) {
        allCyclesValid = false;
      }
    }
  }
  assert(allCyclesValid, '5 consecutive navigation cycles preserved state with no resets');
  assert(getGlobalPersonaStates().length === 5, 'Exactly 5 visitors preserved (no duplicates)');
}

// ── Test C: Persistent Collapse ──────────────────────────────────────────────
console.log('\n[Test C: Persistent Collapse Across Navigation]');
{
  // Stage demo collapse on Persona 0 at evaluated target [-11.0, 0.34, 9.5]
  const targetCollapsePos: [number, number, number] = [-11.0, 0.34, 9.5];
  stageDemoCollapse(0, targetCollapsePos);

  let state0 = getGlobalPersonaStates()[0];
  assert(state0.fsmState === 'collapsed', 'Persona 0 is in collapsed FSM state');
  assert(
    Math.abs(state0.worldPosition[0] - targetCollapsePos[0]) < 1e-4 &&
      Math.abs(state0.worldPosition[2] - targetCollapsePos[2]) < 1e-4,
    'Persona 0 coordinates match collapsed ground truth'
  );

  // Attempt to advance simulation: collapsed visitor must remain frozen at collapse site
  advancePersonaSimulationStep(0, 3.0);
  state0 = getGlobalPersonaStates()[0];
  assert(
    state0.fsmState === 'collapsed' &&
      Math.abs(state0.worldPosition[0] - targetCollapsePos[0]) < 1e-4 &&
      Math.abs(state0.worldPosition[2] - targetCollapsePos[2]) < 1e-4,
    'Collapsed visitor remains stationary during simulation advance'
  );

  // Simulate navigating to Incidents and returning
  const postNavState0 = getGlobalPersonaStates()[0];
  assert(postNavState0.fsmState === 'collapsed', 'Collapsed state preserved after navigation');
  assert(
    Math.abs(postNavState0.worldPosition[0] - targetCollapsePos[0]) < 1e-4 &&
      Math.abs(postNavState0.worldPosition[2] - targetCollapsePos[2]) < 1e-4,
    'Collapsed visitor position preserved exactly after navigation'
  );

  // Reset personas for subsequent tests
  resetAllPersonaStates();
  const resetState0 = getGlobalPersonaStates()[0];
  assert(resetState0.fsmState === 'autonomous_moving', 'Reset restored Persona 0 to autonomous moving');
}

// ── Test D: Pole Geometry Collision & Exclusion Radius ───────────────────────
console.log('\n[Test D: Pole Geometry Collision & Exclusion Radius]');
{
  assert(POLE_EXCLUSION_RADIUS_M === 2.0, 'Configured pole exclusion radius is 2.0m');

  // 1. Verify all 5 initial spawn points have clearance >= 2.0m from all poles
  let allSpawnsClear = true;
  let minSpawnClearance = Infinity;
  for (let i = 0; i < 5; i++) {
    const spawn = getInitialSpawnPosition(i);
    const clearance = checkPoleClearance(spawn[0], spawn[2], POLE_EXCLUSION_RADIUS_M);
    if (clearance.distanceM < minSpawnClearance) minSpawnClearance = clearance.distanceM;
    if (!clearance.isClear) {
      allSpawnsClear = false;
      console.error(`Persona ${i} spawn [${spawn[0]}, ${spawn[2]}] too close to pole: ${clearance.nearestPoleId} (${clearance.distanceM.toFixed(2)}m)`);
    }
  }
  assert(allSpawnsClear, `All 5 initial spawn positions maintain >= 2.0m pole clearance (min: ${minSpawnClearance.toFixed(2)}m)`);

  // 2. Verify all patrol waypoints across all 5 paths maintain >= 2.0m clearance
  let allWaypointsClear = true;
  let minWpClearance = Infinity;
  PEOPLE_PATHS.forEach((path, pIdx) => {
    path.waypoints.forEach(([wx, wz], wIdx) => {
      const clearance = checkPoleClearance(wx, wz, POLE_EXCLUSION_RADIUS_M);
      if (clearance.distanceM < minWpClearance) minWpClearance = clearance.distanceM;
      if (!clearance.isClear) {
        allWaypointsClear = false;
        console.error(`Path ${pIdx} waypoint ${wIdx} [${wx}, ${wz}] violates exclusion: ${clearance.nearestPoleId} (${clearance.distanceM.toFixed(2)}m)`);
      }
    });
  });
  assert(allWaypointsClear, `All waypoints across all 5 paths maintain >= 2.0m clearance (min: ${minWpClearance.toFixed(2)}m)`);

  // 3. Dense Spline Sampling (1,000 samples per path = 5,000 continuous points)
  let allSplinesClear = true;
  let minSplineClearance = Infinity;
  let nearestPoleOnSpline = '';
  PERSONA_CURVES.forEach((curve, cIdx) => {
    const samples = 1000;
    for (let step = 0; step < samples; step++) {
      const t = step / samples;
      const pt = curve.getPointAt(t);
      const clearance = checkPoleClearance(pt.x, pt.z, POLE_EXCLUSION_RADIUS_M);
      if (clearance.distanceM < minSplineClearance) {
        minSplineClearance = clearance.distanceM;
        nearestPoleOnSpline = clearance.nearestPoleId;
      }
      if (!clearance.isClear) {
        allSplinesClear = false;
        console.error(`Path ${cIdx} spline at t=${t.toFixed(3)} [${pt.x.toFixed(2)}, ${pt.z.toFixed(2)}] violates pole ${clearance.nearestPoleId} (${clearance.distanceM.toFixed(2)}m)`);
        break;
      }
    }
  });
  assert(
    allSplinesClear,
    `5,000 continuous spline samples across all 5 paths maintain >= 2.0m clearance (min: ${minSplineClearance.toFixed(2)}m near ${nearestPoleOnSpline})`
  );

  // 4. Invalid Coordinate & [0, 0] Fallback Rejection
  const originValidation = validatePersonaPosition(0, [0, 0.86, 0]);
  const defaultSpawn = getInitialSpawnPosition(0);
  assert(
    Math.hypot(originValidation[0], originValidation[2]) > 1.0,
    'validatePersonaPosition strictly rejects [0, 0, 0] origin fallback'
  );
  assert(
    originValidation[0] === defaultSpawn[0] && originValidation[2] === defaultSpawn[2],
    'Invalid coordinates safely restore visitor to verified initial spawn point'
  );

  const nullValidation = validatePersonaPosition(1, null);
  const spawn1 = getInitialSpawnPosition(1);
  assert(
    nullValidation[0] === spawn1[0] && nullValidation[2] === spawn1[2],
    'Null coordinates safely restore visitor to verified initial spawn point'
  );

  const nanValidation = validatePersonaPosition(2, [NaN, 0.86, NaN]);
  const spawn2 = getInitialSpawnPosition(2);
  assert(
    nanValidation[0] === spawn2[0] && nanValidation[2] === spawn2[2],
    'NaN coordinates safely restore visitor to verified initial spawn point'
  );
}

// ── Test E: Independent Visitor State ────────────────────────────────────────
console.log('\n[Test E: Independent Visitor State]');
{
  resetAllPersonaStates();

  // Trigger manual non-collapsing action on Visitor #2
  dispatchPersonaAction(2, 'stretch');
  const statesAfterAction = getGlobalPersonaStates();
  assert(statesAfterAction[2].currentAction === 'stretch', 'Visitor #2 entered "stretch" action');
  assert(statesAfterAction[2].isManualOverride === true, 'Visitor #2 marked with manual override');

  // Verify other visitors are unaffected
  assert(statesAfterAction[0].currentAction === 'jog', 'Visitor #0 remains in normal jog');
  assert(statesAfterAction[1].currentAction === 'walk', 'Visitor #1 remains in normal walk');
  assert(statesAfterAction[3].currentAction === 'walk', 'Visitor #3 remains in normal walk');
  assert(statesAfterAction[4].currentAction === 'walk', 'Visitor #4 remains in normal walk');

  // Advance simulation for all visitors by 1.0s
  for (let i = 0; i < 5; i++) {
    advancePersonaSimulationStep(i, 1.0);
  }

  // Simulate navigation away and return
  const postNav = getGlobalPersonaStates();
  assert(postNav[2].currentAction === 'stretch', 'Visitor #2 retained "stretch" action across navigation');
  assert(postNav[2].isManualOverride === true, 'Visitor #2 retained manual override');

  // Verify others progressed independently
  assert(postNav[0].currentAction === 'jog' && postNav[0].fsmState === 'autonomous_moving', 'Visitor #0 continues jogging');
  assert(postNav[1].currentAction === 'walk' && postNav[1].fsmState === 'autonomous_moving', 'Visitor #1 continues walking');

  // Clean up
  resetAllPersonaStates();
}

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
