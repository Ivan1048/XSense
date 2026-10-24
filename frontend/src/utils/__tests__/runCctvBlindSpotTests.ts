// Stage G3 verification — CCTV blind spot detected by operational LiDAR.
// Run with: esbuild --bundle --platform=node --format=esm, then node <out>.mjs
//
// Uses the real LiDAR geometry engine and the real camera coverage evaluator.
// No sensor, obstacle or camera data is mocked here.

import assert from 'node:assert/strict';

import { evaluateCollapseAgainstAllLidars } from '../../utils/lidarGeometry';
import { angularDistanceDeg, calculateBearingDeg } from '../../utils/lidarGeometry';
import {
  NO_CAMERA_VIEW_MESSAGE,
  cameraAimBearingDeg,
  cameraFootprintSectorPoints,
  evaluateCameraCoverage,
} from '../../utils/cameraCoverage';
import { CCTV_CAMERAS } from '../../data/cameraData';
import { SECTOR_BOUNDS } from '../../data/sectors';

const DEMO_POINT: [number, number] = [9.5, -3.0];

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

console.log('\n=== CCTV BLIND SPOT TESTS (STAGE G3) ===\n');

console.log('[1. Camera coverage estimate]');

check('the operator message never implies a live camera view', () => {
  assert.equal(NO_CAMERA_VIEW_MESSAGE, 'No camera view available. On-site check required.');
});

check('the demonstration point is outside every estimated camera footprint', () => {
  const result = evaluateCameraCoverage(DEMO_POINT[0], DEMO_POINT[1]);
  assert.equal(result.covered, false, `point should be uncovered, covered by ${result.coveredByCameraId}`);
  assert.equal(result.nearestCameraId, 'CAM-02');
  assert.ok(result.nearestDistanceM > 17 && result.nearestDistanceM < 18, `nearest distance ${result.nearestDistanceM}m`);
  assert.ok(result.nearestOffAxisDeg > 30, `off-axis ${result.nearestOffAxisDeg}° should exceed the 30° half-angle`);
  assert.equal(result.nearestFailure, 'range_and_field_of_view');
  assert.equal(result.cameraContext, NO_CAMERA_VIEW_MESSAGE);
  assert.equal(result.basis, 'estimated_from_mount_and_aim');
});

check('the demonstration point lies inside Sector D', () => {
  const bounds = SECTOR_BOUNDS.D;
  assert.ok(
    DEMO_POINT[0] >= bounds.minX &&
      DEMO_POINT[0] <= bounds.maxX &&
      DEMO_POINT[1] >= bounds.minZ &&
      DEMO_POINT[1] <= bounds.maxZ,
    'demo point should be inside Sector D',
  );
});

check('a point inside a footprint reports coverage without claiming a feed', () => {
  const camera = CCTV_CAMERAS.find((item) => item.id === 'CAM-02')!;
  const aim = (cameraAimBearingDeg(camera) * Math.PI) / 180;
  const insidePoint: [number, number] = [
    camera.position[0] + Math.sin(aim) * camera.footprint.estimatedRangeM * 0.5,
    camera.position[1] - Math.cos(aim) * camera.footprint.estimatedRangeM * 0.5,
  ];

  const result = evaluateCameraCoverage(insidePoint[0], insidePoint[1]);
  assert.equal(result.covered, true, 'expected the sample point to be inside an estimated footprint');
  assert.ok(result.coveredByCameraId, 'a covered point must name the covering camera');
  assert.match(result.cameraContext, /inventory marker only/i);
  assert.match(result.cameraContext, /no live feed/i);
  assert.ok(!/footage (is )?available/i.test(result.cameraContext), 'must not imply footage is available');
});

check('each footprint drawn on the map matches the evaluator footprint', () => {
  for (const camera of CCTV_CAMERAS) {
    const points = cameraFootprintSectorPoints(camera);
    assert.equal(points.length, 26, `${camera.id} sector should have an origin plus 25 arc points`);
    assert.deepEqual(points[0], camera.position, `${camera.id} sector must start at the mount`);

    const last = points[points.length - 1];
    const radius = Math.hypot(last[0] - camera.position[0], last[1] - camera.position[1]);
    assert.ok(
      Math.abs(radius - camera.footprint.estimatedRangeM) < 0.001,
      `${camera.id} drawn radius ${radius.toFixed(2)}m does not match the estimate`,
    );

    // The arc must span the documented field of view around the aim line.
    const aim = cameraAimBearingDeg(camera);
    const halfFov = camera.footprint.horizontalFovDeg / 2;
    const firstOff = angularDistanceDeg(aim, calculateBearingDeg(camera.position, points[1]));
    const lastOff = angularDistanceDeg(
      aim,
      calculateBearingDeg(camera.position, points[points.length - 1]),
    );
    assert.ok(
      Math.abs(firstOff - halfFov) < 1,
      `${camera.id} arc starts ${firstOff.toFixed(1)}° off aim, expected ${halfFov}°`,
    );
    assert.ok(
      Math.abs(lastOff - halfFov) < 1,
      `${camera.id} arc ends ${lastOff.toFixed(1)}° off aim, expected ${halfFov}°`,
    );
  }
});

check('a point just beyond the estimated range is not covered by that camera', () => {
  for (const camera of CCTV_CAMERAS) {
    const aim = cameraAimBearingDeg(camera);
    const rad = (aim * Math.PI) / 180;
    const far: [number, number] = [
      camera.position[0] + Math.sin(rad) * camera.footprint.estimatedRangeM * 1.05,
      camera.position[1] - Math.cos(rad) * camera.footprint.estimatedRangeM * 1.05,
    ];
    const result = evaluateCameraCoverage(far[0], far[1]);
    assert.notEqual(result.coveredByCameraId, camera.id, `${camera.id} claimed coverage beyond its estimate`);
  }
});

console.log('\n[2. Operational LiDAR detection]');

check('operational LiDAR detects the blind-spot fall', () => {
  const result = evaluateCollapseAgainstAllLidars([DEMO_POINT[0], 0.34, DEMO_POINT[1]]);
  assert.equal(result.detected, true, `expected detection, got: ${result.failureReason}`);
  assert.equal(result.primarySensor?.sensorId, 'LID-001');
  assert.equal(result.primarySensor?.poleId, 'AS-103');
  assert.ok(
    Math.abs((result.primarySensor?.distanceM ?? 0) - 9.39) < 0.05,
    `distance ${result.primarySensor?.distanceM}m should be about 9.39m`,
  );
  assert.ok(result.primarySensor?.checks.lineOfSight.passed, 'line of sight should be clear');
  assert.ok(result.primarySensor?.checks.fieldOfView.passed, 'point should be inside the LiDAR field of view');
});

check('the same location is LiDAR-covered but camera-uncovered', () => {
  const lidar = evaluateCollapseAgainstAllLidars([DEMO_POINT[0], 0.34, DEMO_POINT[1]]);
  const camera = evaluateCameraCoverage(DEMO_POINT[0], DEMO_POINT[1]);
  assert.equal(lidar.detected, true);
  assert.equal(camera.covered, false);
});

check('the demonstration point stays blind while the LiDAR pole is online', () => {
  const result = evaluateCollapseAgainstAllLidars([DEMO_POINT[0], 0.34, DEMO_POINT[1]], 'AS-104');
  assert.equal(result.detected, true, 'unrelated pole outage must not hide the demonstration');
});

check('a LiDAR outage at the blind spot fails safe instead of inventing a detection', () => {
  const result = evaluateCollapseAgainstAllLidars([DEMO_POINT[0], 0.34, DEMO_POINT[1]], 'AS-103');
  assert.equal(result.detected, false);
  assert.ok(result.failureReason.length > 0, 'a miss must explain itself');
});

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
