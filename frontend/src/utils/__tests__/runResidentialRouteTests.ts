// Stage G2 verification — Sector D residential walking route.
// Run with: esbuild --bundle --platform=node --format=esm, then node <out>.mjs
//
// Checks the real curve used by the persona engine, not a copy of the waypoints:
// pole clearance, lake/shore overlap, Sector D membership, spawn validity, and
// that the other four personas are untouched.

import assert from 'node:assert/strict';

import { PERSONA_CURVES, getInitialSpawnPosition } from '../../hooks/usePersonaStateMachine';
import { PEOPLE_PATHS, POLES, POLE_EXCLUSION_RADIUS_M, checkPoleClearance } from '../../data/parkData';
import { PERSONA_DEFINITIONS } from '../../data/personaData';
import { SECTOR_BOUNDS } from '../../data/sectors';

const RESIDENTIAL_INDEX = 2;
const DEMO_POINT: [number, number] = [9.5, -3.0];
const SPLINE_SAMPLES = 4000;

// Shore contour used by ParkGeometry's lake buffer (documented approximation).
const SHORE: [number, number][] = [
  [-1.7, -9], [-1.1, -11.2], [1.3, -12.1], [4.4, -12.1], [6.7, -11],
  [7.3, -8.5], [6.6, -6.8], [5.1, -5.8], [5, -3.3], [3.6, -2.7], [2.3, -3.3],
  [2.2, -5.8], [-0.2, -7.1], [-1.6, -7.8],
];

function insidePolygon(x: number, z: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** The footbridge is the only place the route may cross the lake buffer. */
function onFootbridge(x: number, z: number): boolean {
  return z >= -5.25 && z <= -4.35 && x >= 1.2 && x <= 6.0;
}

function inSectorD(x: number, z: number): boolean {
  const bounds = SECTOR_BOUNDS.D;
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ✗ FAIL: ${name} — ${(error as Error).message}`);
    failed++;
  }
}

console.log('\n=== RESIDENTIAL ROUTE TESTS (STAGE G2) ===\n');

const route = PEOPLE_PATHS[RESIDENTIAL_INDEX];
const curve = PERSONA_CURVES[RESIDENTIAL_INDEX];

console.log('[1. Route shape]');

check('five personas and five paths are preserved', () => {
  assert.equal(PEOPLE_PATHS.length, 5);
  assert.equal(PERSONA_DEFINITIONS.length, 5);
  assert.equal(PERSONA_CURVES.length, 5);
});

check('residential route is a closed walking loop of at least 16 waypoints', () => {
  assert.ok(route.waypoints && route.waypoints.length >= 16, `found ${route.waypoints?.length} waypoints`);
  assert.ok(curve.closed, 'the loop should be closed so the walker keeps circulating');
  assert.ok(curve.getLength() > 55, `loop length ${curve.getLength().toFixed(1)}m looks too short`);
});

check('persona #2 is a residential walker on this path at walking pace', () => {
  const definition = PERSONA_DEFINITIONS[RESIDENTIAL_INDEX];
  assert.equal(definition.pathIndex, RESIDENTIAL_INDEX);
  assert.equal(definition.category, 'walker');
  assert.match(definition.label, /Residential/i);
  assert.match(definition.description, /residen/i);
  assert.ok(definition.baseSpeed <= 0.3, `walking pace expected, got ${definition.baseSpeed}`);
  assert.equal(definition.baseSpeed, route.speed, 'path and persona speed should agree');
});

console.log('\n[2. Collision safety]');

check('every waypoint clears all poles by the exclusion radius', () => {
  const violations: string[] = [];
  route.waypoints!.forEach(([x, z], index) => {
    const clearance = checkPoleClearance(x, z, POLE_EXCLUSION_RADIUS_M);
    if (!clearance.isClear) {
      violations.push(`#${index} [${x}, ${z}] ${clearance.distanceM}m from ${clearance.nearestPoleId}`);
    }
  });
  assert.deepEqual(violations, [], violations.join('; '));
});

check('dense spline sampling clears all poles by the exclusion radius', () => {
  let minimum = Infinity;
  let worst = '';
  for (let step = 0; step < SPLINE_SAMPLES; step++) {
    const point = curve.getPointAt(step / SPLINE_SAMPLES);
    const clearance = checkPoleClearance(point.x, point.z, POLE_EXCLUSION_RADIUS_M);
    if (clearance.distanceM < minimum) {
      minimum = clearance.distanceM;
      worst = `[${point.x.toFixed(2)}, ${point.z.toFixed(2)}] near ${clearance.nearestPoleId}`;
    }
    if (!clearance.isClear) {
      throw new Error(`spline crosses ${clearance.nearestPoleId} at [${point.x.toFixed(2)}, ${point.z.toFixed(2)}] (${clearance.distanceM}m)`);
    }
  }
  assert.ok(minimum >= POLE_EXCLUSION_RADIUS_M, `minimum clearance ${minimum.toFixed(2)}m at ${worst}`);
  console.log(`      min clearance ${minimum.toFixed(2)}m at ${worst}`);
});

check('the route only crosses the lake buffer on the footbridge', () => {
  const violations: string[] = [];
  let footbridgeSamples = 0;
  for (let step = 0; step < SPLINE_SAMPLES; step++) {
    const point = curve.getPointAt(step / SPLINE_SAMPLES);
    if (!insidePolygon(point.x, point.z, SHORE)) continue;
    if (onFootbridge(point.x, point.z)) {
      footbridgeSamples++;
      continue;
    }
    violations.push(`[${point.x.toFixed(2)}, ${point.z.toFixed(2)}]`);
  }
  assert.deepEqual(violations.slice(0, 5), [], `route enters lake/shore outside the bridge: ${violations.slice(0, 5).join(', ')}`);
  assert.ok(footbridgeSamples > 0, 'expected the loop to use the footbridge');
});

check('the route stays inside the park bounds', () => {
  const violations: string[] = [];
  for (let step = 0; step < SPLINE_SAMPLES; step++) {
    const point = curve.getPointAt(step / SPLINE_SAMPLES);
    if (Math.abs(point.x) > 36 || point.z < -30 || point.z > 28) {
      violations.push(`[${point.x.toFixed(1)}, ${point.z.toFixed(1)}]`);
    }
  }
  assert.deepEqual(violations.slice(0, 5), [], violations.slice(0, 5).join(', '));
});

console.log('\n[3. Sector D coverage]');

check('the residential leg runs through Sector D', () => {
  const inSector = route.waypoints!.filter(([x, z]) => inSectorD(x, z));
  assert.ok(inSector.length >= 8, `only ${inSector.length} waypoints fall inside Sector D`);
});

check('the CCTV blind-spot demonstration point lies on the route inside Sector D', () => {
  assert.ok(inSectorD(DEMO_POINT[0], DEMO_POINT[1]), 'demo point should be inside Sector D');

  let nearest = Infinity;
  for (let step = 0; step < SPLINE_SAMPLES; step++) {
    const point = curve.getPointAt(step / SPLINE_SAMPLES);
    nearest = Math.min(nearest, Math.hypot(point.x - DEMO_POINT[0], point.z - DEMO_POINT[1]));
  }
  assert.ok(nearest <= 0.1, `route passes ${nearest.toFixed(2)}m from the demo point`);
});

console.log('\n[4. Spawn and regression]');

check('persona #2 spawns on the pavement clear of poles', () => {
  const [x, , z] = getInitialSpawnPosition(RESIDENTIAL_INDEX);
  const clearance = checkPoleClearance(x, z, POLE_EXCLUSION_RADIUS_M);
  assert.ok(clearance.isClear, `spawn [${x}, ${z}] is ${clearance.distanceM}m from ${clearance.nearestPoleId}`);
  assert.ok(inSectorD(x, z) || x >= 15, `spawn [${x}, ${z}] should start near the residential approach`);
});

check('the other four persona routes still clear every pole', () => {
  const violations: string[] = [];
  PERSONA_CURVES.forEach((personaCurve, index) => {
    if (index === RESIDENTIAL_INDEX) return;
    for (let step = 0; step < 600; step++) {
      const point = personaCurve.getPointAt(step / 600);
      const clearance = checkPoleClearance(point.x, point.z, POLE_EXCLUSION_RADIUS_M);
      if (!clearance.isClear) {
        violations.push(`path ${index} at [${point.x.toFixed(2)}, ${point.z.toFixed(2)}]`);
        break;
      }
    }
  });
  assert.deepEqual(violations, [], violations.join('; '));
});

check('all five personas still separate from each other on the map', () => {
  const spawns = PERSONA_DEFINITIONS.map((_, index) => getInitialSpawnPosition(index));
  for (let i = 0; i < spawns.length; i++) {
    for (let j = i + 1; j < spawns.length; j++) {
      const distance = Math.hypot(spawns[i][0] - spawns[j][0], spawns[i][2] - spawns[j][2]);
      assert.ok(distance > 1.5, `personas ${i} and ${j} spawn ${distance.toFixed(2)}m apart`);
    }
  }
});

check('pole inventory is unchanged by this stage', () => {
  assert.equal(POLES.length, 5);
});

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
