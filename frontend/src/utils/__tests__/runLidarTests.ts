// Comprehensive Unit Tests for LiDAR Sensing Geometry & Detection Gating
// Covers: Boundary, FOV, Obstacle Occlusion, Overlapping Sensors, Sensor Offline, and Visual Polygon Generation.

import {
  evaluateLidarCoverageForSensor,
  evaluateCollapseAgainstAllLidars,
  checkRayIntersectsObstacle,
  generateLidarCoveragePolygonPoints,
  generateLidarCoverageTriangles,
  calculateBearingDeg,
  angularDistanceDeg,
} from '../lidarGeometry.ts';
import {
  OPERATIONAL_LIDARS,
  PARK_OBSTACLES,
  type LidarSensorDefinition,
  type ObstacleDefinition,
} from '../../data/lidarData.ts';

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

console.log('\n=== RUNNING LIDAR GEOMETRY & DETECTION TESTS ===\n');

// ── Test 1: Bearing & Angle Calculation ──────────────────────────────────────
console.log('[Suite 1: Bearing & Angular Distance]');
const bearingNorth = calculateBearingDeg([0, 0], [0, -5]);
assert(bearingNorth === 0, 'North bearing is 0°', `got ${bearingNorth}`);

const bearingEast = calculateBearingDeg([0, 0], [5, 0]);
assert(bearingEast === 90, 'East bearing is 90°', `got ${bearingEast}`);

const bearingSouth = calculateBearingDeg([0, 0], [0, 5]);
assert(bearingSouth === 180, 'South bearing is 180°', `got ${bearingSouth}`);

const bearingWest = calculateBearingDeg([0, 0], [-5, 0]);
assert(bearingWest === 270, 'West bearing is 270°', `got ${bearingWest}`);

assert(angularDistanceDeg(350, 10) === 20, 'Angular distance across 0° is 20°');
assert(angularDistanceDeg(90, 270) === 180, 'Angular distance across 180° is 180°');

// ── Test 2: In-Coverage Valid Detection (LID-002 at West Loop) ───────────────
console.log('\n[Suite 2: Valid Fall Detection]');
// Visitor 0 collapsing near AS-104 at [-10.5, 11.5]
// Distance to AS-104 [-12, 10]: sqrt((-10.5 - -12)^2 + (11.5 - 10)^2) = sqrt(2.25 + 2.25) = 2.12m
// Clear line of sight
const evalValid = evaluateCollapseAgainstAllLidars([-10.5, 0.34, 11.5], null, null);
assert(evalValid.detected === true, 'Fall within West Loop coverage is DETECTED');
assert(evalValid.primarySensor?.sensorId === 'LID-002', 'Primary sensor is LID-002');
assert(evalValid.failureReason === '', 'No failure reason on successful detection');

// ── Test 3: Out-of-Range Boundary Test ──────────────────────────────────────
console.log('\n[Suite 3: Range Limit Boundary]');
// Southeast Lake Perimeter Blind Zone at [9.5, -11.5]
// Distance to AS-103 [1, 1]: sqrt((9.5-1)^2 + (-11.5-1)^2) = sqrt(72.25 + 156.25) = 15.11m (> 13.5m)
// Distance to AS-104 [-12, 10]: > 25m
const evalOutOfRange = evaluateCollapseAgainstAllLidars([9.5, 0.34, -11.5], null, null);
assert(evalOutOfRange.detected === false, 'Collapse outside max range is NOT detected');
assert(
  evalOutOfRange.failureReason.toLowerCase().includes('exceeds') ||
  evalOutOfRange.failureReason.toLowerCase().includes('limit') ||
  evalOutOfRange.failureReason.toLowerCase().includes('distance'),
  'Failure reason specifies distance/range excess',
  evalOutOfRange.failureReason,
);

// ── Test 4: Field of View (FOV) Boundary Test ───────────────────────────────
console.log('\n[Suite 4: Field of View Boundary]');
// LID-002 is mounted on AS-104 at [-12, 10] with heading 55° (aimed East/NE) and FOV 210° (half-FOV = 105°).
// The blind sector behind the pole is from 160° to 310° (West/SW).
// Test a point directly West/Behind AS-104: [-16.0, 10.0] (dx = -4.0, dz = 0 -> Bearing = 270°)
// Angular distance: |270 - 55| = 145° (> 105°) -> Strictly outside FOV!
const evalOutsideFov = evaluateCollapseAgainstAllLidars([-16.0, 0.34, 10.0], null, null);
assert(evalOutsideFov.detected === false, 'Collapse behind sensor heading is NOT detected (outside FOV)');
const s2Eval = evalOutsideFov.allSensorEvaluations.find((s) => s.sensorId === 'LID-002');
assert(s2Eval?.checks.fieldOfView.passed === false, 'FOV check specifically failed for LID-002');

// ── Test 5: Obstacle Occlusion Test (LiDAR cannot see through solid objects) ─
console.log('\n[Suite 5: Obstacle Occlusion]');
// Footbridge West Pier at [2.3, -4.8] (bridge_pier_west, radius 0.35m, height 2.2m).
// LID-001 is at [1.0, 1.0] (~5.9m away).
// Target point at [2.82, 0.34, -7.12] is directly behind the pier at ~8.3m (in range of LID-001, out of range of LID-002 at 22.6m).
const pierObs = PARK_OBSTACLES.find((o) => o.id === 'bridge_pier_west')!;
const rayHit = checkRayIntersectsObstacle([1.0, 1.0], [2.82, -7.12], pierObs, 3.55, 0.34);
assert(rayHit.hit === true, 'Ray directly through Footbridge Pier is blocked');
assert(rayHit.obstacleName.includes('Footbridge'), 'Identifies Footbridge Pier as occluder');

// Evaluate full collapse at [2.82, 0.34, -7.12]
const evalOccluded = evaluateCollapseAgainstAllLidars([2.82, 0.34, -7.12], null, null);
assert(evalOccluded.detected === false, 'Collapse behind solid pier is NOT detected');
assert(
  evalOccluded.failureReason.toLowerCase().includes('blocked') ||
  evalOccluded.failureReason.toLowerCase().includes('footbridge') ||
  evalOccluded.failureReason.toLowerCase().includes('line of sight'),
  'Failure reason records obstacle occlusion',
  evalOccluded.failureReason,
);

// ── Test 6: Sensor Offline & Stale Heartbeat Gating ──────────────────────────
console.log('\n[Suite 6: Sensor Offline Gating]');
// Position [-10.5, 11.5] (normally valid for LID-002 on AS-104)
// When AS-104 is offline:
const evalOffline = evaluateCollapseAgainstAllLidars([-10.5, 0.34, 11.5], 'AS-104', null);
assert(evalOffline.detected === false, 'Fall near offline pole AS-104 is NOT detected');
assert(
  evalOffline.failureReason.includes('offline') || evalOffline.failureReason.includes('OFFLINE'),
  'Failure reason states sensor is offline',
  evalOffline.failureReason,
);

// ── Test 7: Overlapping Sensor Deduplication ────────────────────────────────
console.log('\n[Suite 7: Overlapping Sensor Deduplication]');
// Synthetic test setup: two sensors both covering the target point
const sensorA: LidarSensorDefinition = {
  id: 'LID-TEST-A',
  name: 'Test Sensor A',
  zoneId: 'test_zone',
  zoneName: 'Test Zone',
  mountPoleId: 'TEST-P1',
  position: [0, 0],
  mountHeightM: 3.55,
  nominalRangeM: 10,
  minRangeM: 0.5,
  fovDeg: 360,
  headingDeg: 0,
  description: 'Test Sensor A',
};
const sensorB: LidarSensorDefinition = {
  id: 'LID-TEST-B',
  name: 'Test Sensor B',
  zoneId: 'test_zone',
  zoneName: 'Test Zone',
  mountPoleId: 'TEST-P2',
  position: [0, 4],
  mountHeightM: 3.55,
  nominalRangeM: 10,
  minRangeM: 0.5,
  fovDeg: 360,
  headingDeg: 0,
  description: 'Test Sensor B',
};

// Target at [0, 1]: distance to A is 1m, distance to B is 3m
const evalOverlap = evaluateCollapseAgainstAllLidars([0, 0.34, 1], null, null, [sensorA, sensorB], []);
assert(evalOverlap.detected === true, 'Detected in overlapping coverage');
assert(evalOverlap.primarySensor?.sensorId === 'LID-TEST-A', 'Nearest sensor A is chosen as primary');
assert(evalOverlap.corroboratingSensors.length === 1, 'Exactly one corroborating sensor B');
assert(evalOverlap.corroboratingSensors[0].sensorId === 'LID-TEST-B', 'Sensor B recorded as corroborator');

// ── Test 8: Visual Coverage Mesh Generation ─────────────────────────────────
console.log('\n[Suite 8: Visual Coverage Mesh Generation]');
const polygonPoints = generateLidarCoveragePolygonPoints(OPERATIONAL_LIDARS[1], PARK_OBSTACLES, false, 60);
assert(polygonPoints.length > 30, `Generates ${polygonPoints.length} polygon boundary points`);
// Offline sensor must produce 0 points (hidden)
const offlinePolygon = generateLidarCoveragePolygonPoints(OPERATIONAL_LIDARS[1], PARK_OBSTACLES, true, 60);
assert(offlinePolygon.length === 0, 'Offline sensor produces 0 mesh points (hidden)');

// Regressions: volume intersections, unrounded FOV, and visible mesh holes.
const box: ObstacleDefinition = { id: 'box', name: 'Low box', type: 'box', position: [0, -5], size: [2, 4], heightM: 2 };
assert(checkRayIntersectsObstacle([0, 0], [0, -10], box).hit, 'Ray entering above box top is blocked when descending inside it');
const cylinder: ObstacleDefinition = { id: 'cylinder', name: 'Cylinder', type: 'cylinder', position: [0, -5], radius: 2, heightM: 1.5 };
assert(checkRayIntersectsObstacle([0, 0], [0, -10], cylinder).hit, 'Cylinder exit volume blocks even when center ray is above top');
assert(checkRayIntersectsObstacle([0, 0], [0, -5], cylinder).hit, 'Target inside obstacle is blocked');
const edgeSensor = { ...sensorA, fovDeg: 90 };
const outsideAngle = 45.01 * Math.PI / 180;
assert(!evaluateLidarCoverageForSensor([5 * Math.sin(outsideAngle), -5 * Math.cos(outsideAngle)], edgeSensor, [], false).detected, 'Unrounded bearing rejects point just outside FOV');
assert(!evaluateCollapseAgainstAllLidars([0, 0, 0], null, null, [], []).detected, 'Empty sensor inventory fails closed without crashing');
const wrapPoints = generateLidarCoveragePolygonPoints(OPERATIONAL_LIDARS[0], PARK_OBSTACLES, false);
const offsets = wrapPoints.map(p => Math.round(((calculateBearingDeg(OPERATIONAL_LIDARS[0].position, p) - 195 + 360) % 360) * 1e8) / 1e8 % 360);
assert(offsets.every((v, i) => i === 0 || v >= offsets[i - 1] - 1e-8), 'Coverage boundary angles stay ordered across north');
const triangles = generateLidarCoverageTriangles(edgeSensor, [box], false);
let meshMatches = true;
for (let i = 0; i < triangles.length; i += 9) {
  const x = (triangles[i] + triangles[i + 3] + triangles[i + 6]) / 3;
  const z = (triangles[i + 2] + triangles[i + 5] + triangles[i + 8]) / 3;
  if (!evaluateLidarCoverageForSensor([x, z], edgeSensor, [box], false).detected) meshMatches = false;
}
assert(triangles.length > 0 && meshMatches, 'Every sampled mesh triangle centroid passes detection geometry and excludes dead zone');
assert(generateLidarCoverageTriangles(edgeSensor, [], true).length === 0, 'Offline sensor hides sampled coverage');

// ── Test 9: Sector D Residential Expansion & Intentional Gap ────────────────
console.log('\n[Suite 9: Sector D Residential Expansion & Intentional Gap]');
// Point on Sector D walkway at [15.0, 11.0] (dist to AS-106 [18,12] is 3.16m, clear line of sight)
const evalSectorD = evaluateCollapseAgainstAllLidars([15.0, 0.34, 11.0], null, null);
assert(evalSectorD.detected === true, 'Fall on Sector D residential walkway is DETECTED by LID-005');
assert(evalSectorD.primarySensor?.sensorId === 'LID-005', 'Primary sensor is LID-005');
assert(evalSectorD.primarySensor?.poleId === 'AS-106', 'Mounted on pole AS-106');

// Gating when AS-106 is offline
const evalSectorDOffline = evaluateCollapseAgainstAllLidars([15.0, 0.34, 11.0], 'AS-106', null);
assert(evalSectorDOffline.detected === false, 'Fall on Sector D walkway is gated when AS-106 is offline');

// Intentional coverage gap point: Southern Lake Loop at [4.8, -13.2]
const evalIntentionalGap = evaluateCollapseAgainstAllLidars([4.8, 0.34, -13.2], null, null);
assert(evalIntentionalGap.detected === false, 'Intentional coverage gap at [4.8, -13.2] is NOT detected');
assert(evalIntentionalGap.distanceToNearestSensorM > 13.5, 'Distance to nearest operational sensor exceeds 13.5m');

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
}
