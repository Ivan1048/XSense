// ── LiDAR Sensing Geometry & Line-of-Sight Evaluation Engine ────────────────
// Implements authoritative distance, FOV, 3D line-of-sight raycasting,
// fail-safe status checking, multi-sensor deduplication, and visual mesh generation.

import {
  OPERATIONAL_LIDARS,
  PARK_OBSTACLES,
  type LidarSensorDefinition,
  type ObstacleDefinition,
} from '../data/lidarData';

export interface SingleSensorEvaluation {
  sensorId: string;
  poleId: string;
  zoneId: string;
  zoneName: string;
  detected: boolean;
  distanceM: number;
  bearingDeg: number;
  checks: {
    sensorStatus: { passed: boolean; note: string };
    range: { passed: boolean; distanceM: number; maxRangeM: number };
    fieldOfView: { passed: boolean; angleDeg: number; fovDeg: number };
    lineOfSight: { passed: boolean; occludingObstacle?: string };
  };
  failureReason?: string;
}

export interface UnifiedCollapseEvaluationResult {
  detected: boolean;
  groundTruthPosition: [number, number, number];
  primarySensor: SingleSensorEvaluation | null;
  corroboratingSensors: SingleSensorEvaluation[];
  allSensorEvaluations: SingleSensorEvaluation[];
  failureReason: string;
  diagnosticTitle: string;
  diagnosticDetails: string;
  nearestPoleId?: string;
  distanceToNearestSensorM: number;
}

// ── 1. Angle Utilities (Compass Bearing: 0° = North -Z, 90° = East +X) ───────
export function normalizeAngleDeg(deg: number): number {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a;
}

export function angularDistanceDeg(a1: number, a2: number): number {
  const diff = Math.abs(normalizeAngleDeg(a1) - normalizeAngleDeg(a2));
  return diff > 180 ? 360 - diff : diff;
}

export function calculateBearingDeg(from: [number, number], to: [number, number]): number {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  // Clockwise angle from North (-Z) to (dx, dz)
  const rad = Math.atan2(dx, -dz);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

// ── 2. 3D Line-of-Sight Ray Obstacle Intersection ───────────────────────────
// Sensor mount is at y = sensor.mountHeightM (typically ~3.55m).
// Collapsed person cluster is at y ~ 0.34m.
// Checks whether 3D ray penetrates the physical volume of solid obstacles.
export function checkRayIntersectsObstacle(
  rayStart: [number, number],
  rayEnd: [number, number],
  obs: ObstacleDefinition,
  startHeightM = 3.55,
  endHeightM = 0.34,
): { hit: boolean; distance: number; obstacleName: string } {
  const dx = rayEnd[0] - rayStart[0];
  const dz = rayEnd[1] - rayStart[1];
  const rayLen = Math.hypot(dx, dz);

  if (rayLen < 0.001) {
    return { hit: false, distance: Infinity, obstacleName: obs.name };
  }

  // Intersect the horizontal footprint and vertical slab over the entire segment.
  let entry = 0;
  let exit = 1;
  if (obs.type === 'cylinder') {
    const radius = obs.radius ?? 0.6;
    const ox = rayStart[0] - obs.position[0];
    const oz = rayStart[1] - obs.position[1];
    const proj = -(ox * dx + oz * dz) / (rayLen * rayLen);
    const discriminant = proj * proj - (ox * ox + oz * oz - radius * radius) / (rayLen * rayLen);
    if (discriminant < 0) return { hit: false, distance: Infinity, obstacleName: obs.name };
    entry = Math.max(entry, proj - Math.sqrt(discriminant));
    exit = Math.min(exit, proj + Math.sqrt(discriminant));
  } else {
    // Three.js Y rotation: inverse transform from world X/Z to local X/Z.
    const c = Math.cos(obs.rotationY ?? 0);
    const sn = Math.sin(obs.rotationY ?? 0);
    const ox = rayStart[0] - obs.position[0];
    const oz = rayStart[1] - obs.position[1];
    const starts = [c * ox - sn * oz, sn * ox + c * oz];
    const deltas = [c * dx - sn * dz, sn * dx + c * dz];
    const size = obs.size ?? [1, 1];
    for (let axis = 0; axis < 2; axis++) {
      if (Math.abs(deltas[axis]) < 1e-9) {
        if (Math.abs(starts[axis]) > size[axis] / 2) return { hit: false, distance: Infinity, obstacleName: obs.name };
      } else {
        const tA = (-size[axis] / 2 - starts[axis]) / deltas[axis];
        const tB = (size[axis] / 2 - starts[axis]) / deltas[axis];
        entry = Math.max(entry, Math.min(tA, tB));
        exit = Math.min(exit, Math.max(tA, tB));
      }
    }
  }
  const dh = endHeightM - startHeightM;
  if (Math.abs(dh) < 1e-9) {
    if (startHeightM < 0 || startHeightM > obs.heightM) exit = -1;
  } else {
    const tA = -startHeightM / dh;
    const tB = (obs.heightM - startHeightM) / dh;
    entry = Math.max(entry, Math.min(tA, tB));
    exit = Math.min(exit, Math.max(tA, tB));
  }
  if (entry <= exit && exit >= 0 && entry <= 1) {
    return { hit: true, distance: Math.max(0, entry) * rayLen, obstacleName: obs.name };
  }

  return { hit: false, distance: Infinity, obstacleName: obs.name };
}

// ── 3. Single Sensor Coverage Gating ────────────────────────────────────────
export function evaluateLidarCoverageForSensor(
  targetPos: [number, number],
  sensor: LidarSensorDefinition,
  obstacles: ObstacleDefinition[],
  isSensorOffline: boolean,
): SingleSensorEvaluation {
  const [tx, tz] = targetPos;
  const [sx, sz] = sensor.position;
  const dist = Math.hypot(tx - sx, tz - sz);
  const bearing = calculateBearingDeg([sx, sz], [tx, tz]);
  const fovDiff = angularDistanceDeg(bearing, sensor.headingDeg);

  // 1. Status Check (Fail-safe: offline, lost heartbeat, or degraded -> fail)
  const statusPassed = !isSensorOffline;
  const statusNote = statusPassed ? 'Sensor online and reporting healthy heartbeats' : `Sensor ${sensor.id} on pole ${sensor.mountPoleId} is OFFLINE`;

  // 2. Range Check
  const rangePassed = dist >= sensor.minRangeM - 1e-9 && dist <= sensor.nominalRangeM + 1e-9;

  // 3. FOV Check
  const halfFov = sensor.fovDeg / 2;
  const fovPassed = fovDiff <= halfFov + 1e-9;

  // 4. Line of Sight Obstacle Check (only perform if range and FOV passed)
  let losPassed = true;
  let occludingObstacle: string | undefined = undefined;

  if (rangePassed && fovPassed) {
    for (const obs of obstacles) {
      const res = checkRayIntersectsObstacle([sx, sz], [tx, tz], obs, sensor.mountHeightM, 0.34);
      if (res.hit) {
        losPassed = false;
        occludingObstacle = res.obstacleName;
        break; // First occluder blocks the beam
      }
    }
  }

  const allPassed = statusPassed && rangePassed && fovPassed && losPassed;

  let failureReason: string | undefined = undefined;
  if (!statusPassed) {
    failureReason = `Sensor ${sensor.id} offline on pole ${sensor.mountPoleId}`;
  } else if (!rangePassed) {
    failureReason = dist > sensor.nominalRangeM
      ? `Distance ${dist.toFixed(1)}m exceeds ${sensor.nominalRangeM}m detection limit`
      : `Within pole dead zone (${dist.toFixed(1)}m < ${sensor.minRangeM}m)`;
  } else if (!fovPassed) {
    failureReason = `Bearing ${bearing}° outside ${sensor.fovDeg}° FOV (sensor aimed at ${sensor.headingDeg}°)`;
  } else if (!losPassed) {
    failureReason = `Line of sight blocked by ${occludingObstacle}`;
  }

  return {
    sensorId: sensor.id,
    poleId: sensor.mountPoleId,
    zoneId: sensor.zoneId,
    zoneName: sensor.zoneName,
    detected: allPassed,
    distanceM: Number(dist.toFixed(2)),
    bearingDeg: bearing,
    checks: {
      sensorStatus: { passed: statusPassed, note: statusNote },
      range: { passed: rangePassed, distanceM: Number(dist.toFixed(2)), maxRangeM: sensor.nominalRangeM },
      fieldOfView: { passed: fovPassed, angleDeg: Number(fovDiff.toFixed(1)), fovDeg: sensor.fovDeg },
      lineOfSight: { passed: losPassed, occludingObstacle },
    },
    failureReason,
  };
}

// ── 4. Unified Centralized Collapse Gating & Deduplication ───────────────────
// Ensures all collapse sources (manual humanoid, autonomous FSM, and demo scenarios)
// pass through this single authoritative function. Deduplicates overlapping sensor hits.
export function evaluateCollapseAgainstAllLidars(
  worldPos: [number, number, number],
  offlinePoleId: string | null = null,
  blockedRouteZone: string | null = null,
  sensors: LidarSensorDefinition[] = OPERATIONAL_LIDARS,
  obstacles: ObstacleDefinition[] = PARK_OBSTACLES,
): UnifiedCollapseEvaluationResult {
  const [px, , pz] = worldPos;

  // Active obstacles: include dynamic barrier only when route is blocked
  const activeObstacles = obstacles.filter((obs) => {
    if (obs.id === 'dynamic_route_barrier') {
      return blockedRouteZone === 'central_path';
    }
    return true;
  });

  const sensorEvaluations: SingleSensorEvaluation[] = sensors.map((sensor) => {
    const isOffline = sensor.mountPoleId === offlinePoleId;
    return evaluateLidarCoverageForSensor([px, pz], sensor, activeObstacles, isOffline);
  });

  // Find all sensors that successfully detected the collapse
  const passingSensors = sensorEvaluations.filter((e) => e.detected);

  // Find the nearest sensor for reporting context
  let nearestSensor = sensorEvaluations[0];
  let minDistance = Infinity;
  for (const ev of sensorEvaluations) {
    if (ev.distanceM < minDistance) {
      minDistance = ev.distanceM;
      nearestSensor = ev;
    }
  }

  if (passingSensors.length > 0) {
    // Sort passing sensors by distance (closest is primary)
    passingSensors.sort((a, b) => a.distanceM - b.distanceM);
    const primary = passingSensors[0];
    const corroborating = passingSensors.slice(1);

    return {
      detected: true,
      groundTruthPosition: worldPos,
      primarySensor: primary,
      corroboratingSensors: corroborating,
      allSensorEvaluations: sensorEvaluations,
      failureReason: '',
      diagnosticTitle: `Fall Detected by LiDAR · ${primary.sensorId}`,
      diagnosticDetails: corroborating.length > 0
        ? `Observed by ${primary.sensorId} (${primary.distanceM}m away). Corroborated by ${corroborating.map((c) => `${c.sensorId} (${c.distanceM}m)`).join(', ')}.`
        : `Observed by ${primary.sensorId} mounted on ${primary.poleId} (${primary.distanceM}m away, clear line of sight).`,
      nearestPoleId: primary.poleId,
      distanceToNearestSensorM: primary.distanceM,
    };
  }

  // COVERAGE GAP — All sensors failed detection
  const reasonText = nearestSensor?.failureReason || 'Outside operational LiDAR monitoring envelope';

  return {
    detected: false,
    groundTruthPosition: worldPos,
    primarySensor: null,
    corroboratingSensors: [],
    allSensorEvaluations: sensorEvaluations,
    failureReason: reasonText,
    diagnosticTitle: 'Coverage Gap — Fall Not Detected by LiDAR',
    diagnosticDetails: `Target at [${px.toFixed(1)}, ${pz.toFixed(1)}] could not be verified by any operational LiDAR. Nearest node was ${nearestSensor?.sensorId ?? 'none'} on ${nearestSensor?.poleId ?? 'none'} (${minDistance.toFixed(1)}m away): ${reasonText}.`,
    nearestPoleId: nearestSensor?.poleId,
    distanceToNearestSensorM: Number(minDistance.toFixed(1)),
  };
}

// ── 5. Visual Coverage Mesh Generation with Ray Sampling & Tangent Edges ────
// Generates 2D boundary vertices representing the sensor's ground coverage polygon.
// Includes adaptive tangent sampling near obstacle edges to produce realistic,
// distinct obstacle shadow wedges (Adjustment 6).
export function generateLidarCoveragePolygonPoints(
  sensor: LidarSensorDefinition,
  obstacles: ObstacleDefinition[],
  isOffline: boolean,
  numRays = 90,
): [number, number][] {
  if (isOffline) {
    return [];
  }

  const [sx, sz] = sensor.position;
  const halfFov = sensor.fovDeg / 2;
  const startAngle = sensor.headingDeg - halfFov;
  const endAngle = sensor.headingDeg + halfFov;

  // Collect candidate ray angles
  const angles: number[] = [];

  // Uniform base samples
  for (let i = 0; i <= numRays; i++) {
    const frac = i / numRays;
    angles.push(startAngle + frac * sensor.fovDeg);
  }

  // Adaptive obstacle silhouette tangent sampling
  for (const obs of obstacles) {
    if (obs.type === 'cylinder') {
      const dx = obs.position[0] - sx;
      const dz = obs.position[1] - sz;
      const dist = Math.hypot(dx, dz);
      const radius = obs.radius || 0.6;

      if (dist > radius && dist <= sensor.nominalRangeM + radius) {
        const centerBearing = calculateBearingDeg([sx, sz], obs.position);
        const angularSpan = (Math.asin(Math.min(0.99, radius / dist)) * 180) / Math.PI;

        const leftEdge = centerBearing - angularSpan;
        const rightEdge = centerBearing + angularSpan;

        // Add edge samples slightly inside and outside the silhouette
        [-0.4, 0.4].forEach((offset) => {
          const a1 = leftEdge + offset;
          const a2 = rightEdge + offset;
          if (angularDistanceDeg(a1, sensor.headingDeg) <= halfFov) angles.push(startAngle + normalizeAngleDeg(a1 - startAngle));
          if (angularDistanceDeg(a2, sensor.headingDeg) <= halfFov) angles.push(startAngle + normalizeAngleDeg(a2 - startAngle));
        });
      }
    }
  }

  // Sort angles from startAngle to endAngle
  angles.sort((a, b) => a - b);

  // Deduplicate very close angles (< 0.2 deg)
  const dedupedAngles: number[] = [];
  for (let i = 0; i < angles.length; i++) {
    if (i === 0 || angles[i] - dedupedAngles[dedupedAngles.length - 1] > 0.25) {
      dedupedAngles.push(angles[i]);
    }
  }

  // Raycast each angle to determine maximum visible extent
  const boundaryPoints: [number, number][] = [];

  for (const angleDeg of dedupedAngles) {
    const rad = (angleDeg * Math.PI) / 180;
    // Ray direction: angleDeg is clockwise from -Z
    const dirX = Math.sin(rad);
    const dirZ = -Math.cos(rad);

    let maxDist = sensor.nominalRangeM;
    const rayEnd: [number, number] = [sx + dirX * maxDist, sz + dirZ * maxDist];

    for (const obs of obstacles) {
      const res = checkRayIntersectsObstacle([sx, sz], rayEnd, obs, sensor.mountHeightM, 0.34);
      if (res.hit && res.distance < maxDist) {
        maxDist = res.distance;
      }
    }

    boundaryPoints.push([sx + dirX * maxDist, sz + dirZ * maxDist]);
  }

  return boundaryPoints;
}

// Sample the actual person-down visibility field, including the mount dead zone
// and regions visible beyond low obstacles. A single radial fan cannot model these holes.
export function generateLidarCoverageTriangles(sensor: LidarSensorDefinition, obstacles: ObstacleDefinition[], isOffline: boolean): number[] {
  if (isOffline) return [];
  const vertices: number[] = [];
  const radialSteps = Math.ceil((sensor.nominalRangeM - sensor.minRangeM) / 0.25);
  const angularSteps = Math.ceil(sensor.fovDeg / 2);
  const point = (r: number, a: number): [number, number] => [sensor.position[0] + r * Math.sin(a), sensor.position[1] - r * Math.cos(a)];
  for (let ai = 0; ai < angularSteps; ai++) {
    const a0 = (sensor.headingDeg - sensor.fovDeg / 2 + ai * sensor.fovDeg / angularSteps) * Math.PI / 180;
    const a1 = a0 + sensor.fovDeg / angularSteps * Math.PI / 180;
    for (let ri = 0; ri < radialSteps; ri++) {
      const r0 = sensor.minRangeM + ri * (sensor.nominalRangeM - sensor.minRangeM) / radialSteps;
      const r1 = sensor.minRangeM + (ri + 1) * (sensor.nominalRangeM - sensor.minRangeM) / radialSteps;
      const corners = [point(r0, a0), point(r1, a0), point(r1, a1), point(r0, a1)];
      if (![...corners, point((r0 + r1) / 2, (a0 + a1) / 2)].every(p => evaluateLidarCoverageForSensor(p, sensor, obstacles, false).detected)) continue;
      for (const i of [0, 1, 2, 0, 2, 3]) vertices.push(corners[i][0], 0.065, corners[i][1]);
    }
  }
  return vertices;
}

export interface PointLidarCoverageResult {
  isCovered: boolean;
  nearestSensorId: string | null;
  nearestPoleId: string | null;
  distanceM: number | null;
  reason?: string;
}

export function evaluatePointLidarCoverage(
  point: [number, number, number],
  operationalLidarNodes?: Array<{
    id: string;
    poleId: string;
    position: [number, number, number];
    status: 'online' | 'offline';
    minRangeM?: number;
    maxRangeM?: number;
  }>,
  offlinePoleId?: string | null,
  blockedRouteZone?: string | null,
): PointLidarCoverageResult {
  let effectiveOfflinePole = offlinePoleId ?? null;
  if (!effectiveOfflinePole && operationalLidarNodes) {
    const offlineNode = operationalLidarNodes.find((n) => n.status === 'offline');
    if (offlineNode) effectiveOfflinePole = offlineNode.poleId;
  }
  const result = evaluateCollapseAgainstAllLidars(point, effectiveOfflinePole, blockedRouteZone);
  return {
    isCovered: result.detected,
    nearestSensorId: result.primarySensor?.sensorId ?? (result.nearestPoleId ? `LIDAR-${result.nearestPoleId}` : null),
    nearestPoleId: result.nearestPoleId ?? null,
    distanceM: result.distanceToNearestSensorM,
    reason: result.failureReason || undefined,
  };
}
