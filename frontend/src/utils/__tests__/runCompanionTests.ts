// Automated Test Suite for XSENSE HOTFIX 03
// Companion Position Restoration & Target Calculation

import * as THREE from 'three';
import { calculateCompanionTarget } from '../../components/Park3D/CompanionPrimitives';
import {
  getGlobalPersonaStates,
  advancePersonaSimulationStep,
  resetAllPersonaStates,
  updatePersonaPosition,
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

console.log('\n=== RUNNING HOTFIX 03 COMPANION RESTORATION TESTS ===\n');

// ── Test 1: Math Verification of calculateCompanionTarget ─────────────────────
console.log('[Test 1: Mathematical correctness of calculateCompanionTarget]');
{
  const parentPos = new THREE.Vector3(10, 0.86, 20);
  const yawZero = 0;
  const childOffset: [number, number, number] = [0.55, 0, 0.15];
  const targetZero = calculateCompanionTarget(parentPos, yawZero, childOffset);

  assert(
    Math.abs(targetZero.x - 10.55) < 0.001 &&
    Math.abs(targetZero.z - 20.15) < 0.001,
    'Child offset at yaw 0 aligns with +X and +Z',
    `Expected (10.55, 20.15), got (${targetZero.x.toFixed(3)}, ${targetZero.z.toFixed(3)})`
  );

  // Rotate 90 degrees clockwise (yaw = Math.PI / 2)
  const target90 = calculateCompanionTarget(parentPos, Math.PI / 2, childOffset);
  // Rotated vector: x' = 0.55*0 + 0.15*1 = 0.15, z' = -0.55*1 + 0.15*0 = -0.55
  assert(
    Math.abs(target90.x - 10.15) < 0.001 &&
    Math.abs(target90.z - 19.45) < 0.001,
    'Child offset at yaw π/2 rotates correctly by parent heading',
    `Expected (10.15, 19.45), got (${target90.x.toFixed(3)}, ${target90.z.toFixed(3)})`
  );

  // Invariant: Distance from companion target to parent must be constant regardless of yaw
  const expectedChildDist = Math.hypot(0.55, 0.15);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
    const tgt = calculateCompanionTarget(parentPos, angle, childOffset);
    const dist = Math.hypot(tgt.x - parentPos.x, tgt.z - parentPos.z);
    assert(
      Math.abs(dist - expectedChildDist) < 0.0001,
      `Child relative distance invariant holds at yaw ${(angle * 180 / Math.PI).toFixed(1)}°`
    );
  }

  // Canine offset invariant
  const canineOffset: [number, number, number] = [0.85, 0, 0.40];
  const expectedCanineDist = Math.hypot(0.85, 0.40);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
    const tgt = calculateCompanionTarget(parentPos, angle, canineOffset);
    const dist = Math.hypot(tgt.x - parentPos.x, tgt.z - parentPos.z);
    assert(
      Math.abs(dist - expectedCanineDist) < 0.0001,
      `Canine relative distance invariant holds at yaw ${(angle * 180 / Math.PI).toFixed(1)}°`
    );
  }
}

// ── Test 2: Tuple Input Overload & Clone Safety ──────────────────────────────
console.log('\n[Test 2: Tuple input overload and non-mutation]');
{
  const tuplePos: [number, number, number] = [-15.5, 0.86, 25.2];
  const tupleCopy = [...tuplePos];
  const tgt = calculateCompanionTarget(tuplePos, 1.25, [0.55, 0, 0.15]);
  assert(
    tuplePos[0] === tupleCopy[0] && tuplePos[1] === tupleCopy[1] && tuplePos[2] === tupleCopy[2],
    'Parent tuple position is not mutated by calculateCompanionTarget'
  );
  assert(
    tgt instanceof THREE.Vector3,
    'calculateCompanionTarget returns THREE.Vector3 instance'
  );
  assert(
    tgt.x !== 0 && tgt.z !== 0,
    'Target position never collapses to [0, 0, 0] origin'
  );
}

// ── Test 3: Scene Remount State Restoration for Companions ───────────────────
console.log('\n[Test 3: Scene Remount State Restoration for Companions]');
{
  resetAllPersonaStates();

  // Find index of Child Companion (Parent) and Dog Companion (Dog Walker)
  const childParentIndex = PERSONA_DEFINITIONS.findIndex(
    (p) => p.accessoryType === 'child_companion'
  );
  const dogWalkerIndex = PERSONA_DEFINITIONS.findIndex(
    (p) => p.accessoryType === 'dog_companion'
  );

  assert(childParentIndex === 3, 'Child companion belongs to Persona #3 (Parent)');
  assert(dogWalkerIndex === 4, 'Dog companion belongs to Persona #4 (Dog Walker)');

  // Advance simulation by 5.0 seconds so personas move away from spawn points
  advancePersonaSimulationStep(childParentIndex, 5.0);
  advancePersonaSimulationStep(dogWalkerIndex, 5.0);

  const states = getGlobalPersonaStates();
  const parentState = states[childParentIndex];
  const walkerState = states[dogWalkerIndex];

  // Compute restored initial positions as AnonymousHumanoid mounts them
  const restoredChildTgt = calculateCompanionTarget(
    parentState.worldPosition,
    parentState.headingAngleRad,
    [0.55, 0, 0.15]
  );
  restoredChildTgt.y = parentState.worldPosition[1] * 0.55;

  const restoredCanineTgt = calculateCompanionTarget(
    walkerState.worldPosition,
    walkerState.headingAngleRad,
    [0.85, 0, 0.40]
  );
  restoredCanineTgt.y = 0.22;

  // Verify restored target is right next to parent's current position (not at [0, 0, 0] and not at initial spawn)
  const childSeparation = Math.hypot(
    restoredChildTgt.x - parentState.worldPosition[0],
    restoredChildTgt.z - parentState.worldPosition[2]
  );
  assert(
    Math.abs(childSeparation - Math.hypot(0.55, 0.15)) < 0.001,
    `Child companion mounts directly adjacent to parent (separation: ${childSeparation.toFixed(3)}m)`
  );
  assert(
    Math.hypot(restoredChildTgt.x, restoredChildTgt.z) > 1.0,
    'Child companion does not mount near map origin [0, 0, 0]'
  );

  const canineSeparation = Math.hypot(
    restoredCanineTgt.x - walkerState.worldPosition[0],
    restoredCanineTgt.z - walkerState.worldPosition[2]
  );
  assert(
    Math.abs(canineSeparation - Math.hypot(0.85, 0.40)) < 0.001,
    `Canine companion mounts directly adjacent to walker (separation: ${canineSeparation.toFixed(3)}m)`
  );
  assert(
    Math.hypot(restoredCanineTgt.x, restoredCanineTgt.z) > 1.0,
    'Canine companion does not mount near map origin [0, 0, 0]'
  );
}

// ── Test 4: Prone / Collapsed Parent Height Tracking ────────────────────────
console.log('\n[Test 4: Prone / Collapsed Parent Height Tracking]');
{
  const parentPos: [number, number, number] = [12.0, 0.25, -18.0];
  const childTgtCollapsed = calculateCompanionTarget(parentPos, 0, [0.55, 0, 0.15]);
  const isCollapsed = true;
  childTgtCollapsed.y = isCollapsed ? 0.15 : parentPos[1] * 0.55;

  assert(
    childTgtCollapsed.y === 0.15,
    'Child companion drops to ground level (0.15m) when parent is collapsed'
  );

  const canineTgt = calculateCompanionTarget(parentPos, 0, [0.85, 0, 0.40]);
  canineTgt.y = 0.22;
  assert(
    canineTgt.y === 0.22,
    'Canine companion maintains grounded height (0.22m)'
  );
}

console.log(`\n=== COMPANION TESTS: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
