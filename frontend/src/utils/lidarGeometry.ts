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
  return Number(deg.toFixed(1));
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

  const dirX = dx / rayLen;
  const dirZ = dz / rayLen;

  if (obs.type === 'cylinder') {
    const radius = obs.radius || 0.6;
    const toCenterStart = [obs.position[0] - rayStart[0], obs.position[1] - rayStart[1]];
    const tProj = toCenterStart[0] * dirX + toCenterStart[1] * dirZ;

    // Nearest point along the 2D ray line
    const tClamped = Math.max(0, Math.min(rayLen, tProj));
    const closestPt = [rayStart[0] + tClamped * dirX, rayStart[1] + tClamped * dirZ];
    const distToCenter = Math.hypot(obs.position[0] - closestPt[0], obs.position[1] - closestPt[1]);

    if (distToCenter <= radius) {
      // Ray passes through horizontal footprint. Check 3D ray height at this point.
      const fraction = tClamped / rayLen;
      const rayHeightAtHit = startHeightM + fraction * (endHeightM - startHeightM);

      // Check if ray height is below obstacle top and above ground
      if (rayHeightAtHit >= 0 && rayHeightAtHit <= obs.heightM) {
        // Compute entry point distance
        const halfChord = Math.sqrt(Math.max(0, radius * radius - distToCenter * distToCenter));
        const entryT = tProj - halfChord;

        // Ignore hits behind the sensor mount (e.g. < 0.4m from origin) or past the target
        if (entryT > 0.4 && entryT < rayLen - 0.1) {
          return { hit: true, distance: entryT, obstacleName: obs.name };
        }
      }
    }
  } else if (obs.type === 'box') {
    const [boxW, boxD] = obs.size || [1, 1];
    const rot = -(obs.rotationY || 0);

    // Transform ray start and end into box local coordinates
    const localStart = [rayStart[0] - obs.position[0], rayStart[1] - obs.position[1]];
    const localEnd = [rayEnd[0] - obs.position[0], rayEnd[1] - obs.position[1]];

    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const sX = localStart[0] * cosR - localStart[1] * sinR;
    const sZ = localStart[0] * sinR + localStart[1] * cosR;
    const eX = localEnd[0] * cosR - localEnd[1] * sinR;
    const eZ = localEnd[0] * sinR + localEnd[1] * cosR;

    const minX = -boxW / 2;
    const maxX = boxW / 2;
    const minZ = -boxD / 2;
    const maxZ = boxD / 2;

    // Liang-Barsky 2D line clipping in local coordinate space
    const dLocalX = eX - sX;
    const dLocalZ = eZ - sZ;

    let t0 = 0.0;
    let t1 = 1.0;

    const p = [-dLocalX, dLocalX, -dLocalZ, dLocalZ];
    const q = [sX - minX, maxX - sX, sZ - minZ, maxZ - sZ];

    let intersectsAABB = true;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-6) {
        if (q[i] < 0) {
          intersectsAABB = false;
          break;
        }
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0) {
          if (t > t1) { intersectsAABB = false; break; }
          if (t > t0) t0 = t;
        } else {
          if (t < t0) { intersectsAABB = false; break; }
          if (t < t1) t1 = t;
        }
      }
    }

    if (intersectsAABB && t0 <= t1) {
      const hitFraction = t0;
      const hitDist = hitFraction * rayLen;
      if (hitDist > 0.4 && hitDist < rayLen - 0.1) {
        const rayHeightAtHit = startHeightM + hitFraction * (endHeightM - startHeightM);
        if (rayHeightAtHit >= 0 && rayHeightAtHit <= obs.heightM) {
          return { hit: true, distance: hitDist, obstacleName: obs.name };
        }
      }
    }
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
  const rangePassed = dist >= sensor.minRangeM && dist <= sensor.nominalRangeM;

  // 3. FOV Check
  const halfFov = sensor.fovDeg / 2;
  const fovPassed = fovDiff <= halfFov;

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
    diagnosticDetails: `Target at [${px.toFixed(1)}, ${pz.toFixed(1)}] could not be verified by any operational LiDAR. Nearest node was ${nearestSensor.sensorId} on ${nearestSensor.poleId} (${minDistance.toFixed(1)}m away): ${reasonText}.`,
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
          if (angularDistanceDeg(a1, sensor.headingDeg) <= halfFov) angles.push(a1);
          if (angularDistanceDeg(a2, sensor.headingDeg) <= halfFov) angles.push(a2);
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
