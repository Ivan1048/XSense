import { PERSONA_DEFINITIONS } from '../../data/personaData';
import {
  COMPANION_CONFIGS,
  calculateCompanionTarget,
  stepCompanionTransform,
} from '../../components/Park3D/CompanionPrimitives';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✓ ${msg}`);
}

console.log('\n=== RUNNING COMPANION TRACKING & SEPARATION TESTS (HOTFIX 07) ===\n');

// ── Test 1: Companion Ownership ──────────────────────────────────────────────
console.log('[Test 1: Persona Companion Ownership]');
{
  const v4 = PERSONA_DEFINITIONS[3]; // Visitor #4
  const v5 = PERSONA_DEFINITIONS[4]; // Visitor #5

  assert(v4.id === 'persona_3', 'Visitor #4 definition id is persona_3');
  assert(v4.category === 'parent_child', 'Visitor #4 category is parent_child');
  assert(v4.accessoryType === 'child_companion', 'Visitor #4 owns child companion');

  assert(v5.id === 'persona_4', 'Visitor #5 definition id is persona_4');
  assert(v5.category === 'dog_walker', 'Visitor #5 category is dog_walker');
  assert(v5.accessoryType === 'dog_companion', 'Visitor #5 owns dog companion');
}

// ── Test 2: Initial Mount Snap & Discontinuity Snap ─────────────────────────
console.log('\n[Test 2: Initial Mount Snap & Large Discontinuity Teleport Snap]');
{
  const parentPos: [number, number, number] = [12.0, 0.86, -5.0];
  const parentYaw = 0.5;

  // Mount with null current position
  const mountStep = stepCompanionTransform(
    null,
    parentPos,
    parentYaw,
    COMPANION_CONFIGS.child,
    0.016,
    false
  );
  assert(mountStep.didSnap === true, 'Initial mount (null position) triggers immediate snap');
  assert(
    Math.hypot(mountStep.position[0] - parentPos[0], mountStep.position[2] - parentPos[2]) < 1.0,
    'Snapped position is directly adjacent to parent'
  );

  // Large discontinuity (teleportation across map >= 2.0m)
  const farAwayPos: [number, number, number] = [-25.0, 0.86, 30.0];
  const teleStep = stepCompanionTransform(
    farAwayPos,
    parentPos,
    parentYaw,
    COMPANION_CONFIGS.child,
    0.016,
    false
  );
  assert(teleStep.didSnap === true, 'Separation >= 2.0m triggers immediate snap beside parent');
  assert(
    Math.hypot(teleStep.position[0] - parentPos[0], teleStep.position[2] - parentPos[2]) < 1.0,
    'Snapped position teleported beside parent rather than traveling across map'
  );

  // Dog companion discontinuity test
  const dogTele = stepCompanionTransform(
    farAwayPos,
    parentPos,
    parentYaw,
    COMPANION_CONFIGS.dog,
    0.016,
    false
  );
  assert(dogTele.didSnap === true, 'Dog separation >= 2.2m triggers immediate snap beside walker');
}

// ── Test 3: Bounded Separation During Walking, Sprint, and Sharp Turns ────────
console.log('\n[Test 3: Separation Bounds Enforcement Under Motion]');
{
  // Child companion test during high-speed sprint (4.5 m/s)
  let childPos: [number, number, number] | null = null;
  let parentX = 0;
  const parentZ = 0;
  const dt = 0.016;

  // Initial step
  const init = stepCompanionTransform(childPos, [parentX, 0.86, parentZ], 0, COMPANION_CONFIGS.child, dt);
  childPos = init.position;

  // Simulate 60 frames of sprint and sharp 90-degree turn
  let maxChildError = 0;
  for (let f = 0; f < 60; f++) {
    parentX += 4.5 * dt; // Fast sprint
    const yaw = f > 30 ? Math.PI / 2 : 0; // Sharp turn at frame 30
    const step = stepCompanionTransform(childPos, [parentX, 0.86, parentZ], yaw, COMPANION_CONFIGS.child, dt);
    childPos = step.position;

    const desired = calculateCompanionTarget([parentX, 0.86, parentZ], yaw, COMPANION_CONFIGS.child.localOffset);
    const err = Math.hypot(childPos[0] - desired[0], childPos[2] - desired[2]);
    if (err > maxChildError) maxChildError = err;
  }
  assert(
    maxChildError <= COMPANION_CONFIGS.child.maxPermissibleErrorM + 1e-4,
    `Child companion error (${maxChildError.toFixed(4)}m) never exceeds max permissible limit (${COMPANION_CONFIGS.child.maxPermissibleErrorM}m)`
  );

  // Dog companion test during jog (2.5 m/s) and serpentine turns
  let dogPos: [number, number, number] | null = null;
  let walkerX = 0;
  let walkerZ = 0;
  let maxDogError = 0;

  const dogInit = stepCompanionTransform(dogPos, [walkerX, 0.86, walkerZ], 0, COMPANION_CONFIGS.dog, dt);
  dogPos = dogInit.position;

  for (let f = 0; f < 60; f++) {
    const yaw = Math.sin(f * 0.15) * 1.2; // Continuous weaving turn
    walkerX += Math.cos(yaw) * 2.5 * dt;
    walkerZ += Math.sin(yaw) * 2.5 * dt;

    const step = stepCompanionTransform(dogPos, [walkerX, 0.86, walkerZ], yaw, COMPANION_CONFIGS.dog, dt);
    dogPos = step.position;

    const desired = calculateCompanionTarget([walkerX, 0.86, walkerZ], yaw, COMPANION_CONFIGS.dog.localOffset);
    const err = Math.hypot(dogPos[0] - desired[0], dogPos[2] - desired[2]);
    if (err > maxDogError) maxDogError = err;
  }
  assert(
    maxDogError <= COMPANION_CONFIGS.dog.maxPermissibleErrorM + 1e-4,
    `Dog companion error (${maxDogError.toFixed(4)}m) never exceeds max permissible limit (${COMPANION_CONFIGS.dog.maxPermissibleErrorM}m)`
  );
}

// ── Test 4: Pole Shaft Clearance Avoidance ───────────────────────────────────
console.log('\n[Test 4: Pole Shaft Clearance Avoidance]');
{
  const mockPoles: Array<[number, number]> = [[5.0, 5.0]];
  // Parent positioned such that companion's unconstrained offset [0.55, 0, -0.15] would land at [5.05, 4.95] (dist 0.07m from pole!)
  const parentPos: [number, number, number] = [4.5, 0.86, 5.1];
  const target = calculateCompanionTarget(parentPos, 0, [0.55, 0, -0.15], mockPoles);

  const distToPole = Math.hypot(target[0] - mockPoles[0][0], target[2] - mockPoles[0][1]);
  assert(
    distToPole >= 0.65 - 1e-4,
    `Companion target was pushed outside pole clearance radius: dist=${distToPole.toFixed(3)}m >= 0.65m`
  );
  assert(
    parentPos[0] === 4.5 && parentPos[2] === 5.1,
    'Parent position was NOT mutated or relocated by companion pole avoidance'
  );
}

console.log('\n=== ALL HOTFIX 07 COMPANION TESTS PASSED! ===\n');
