import { PEOPLE_PATHS, POLES } from '../data/parkData';
import { SECTOR_BOUNDS, type SectorId } from '../data/sectors';
import { OPERATIONAL_LIDARS, PARK_OBSTACLES } from '../data/lidarData';
import { evaluateCollapseAgainstAllLidars } from '../utils/lidarGeometry';
import { CCTV_CAMERAS } from '../components/Park3D/CameraAndGapOverlay';
import { AUDIO_COVERAGE } from '../components/Park3D/AudioCoverage';

// Sample points every 1.0m along segments between waypoints
export function samplePathPoints(waypoints: [number, number][], stepM = 1.0): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % waypoints.length];
    const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.round(dist / stepM));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push([
        p1[0] + (p2[0] - p1[0]) * t,
        p1[1] + (p2[1] - p1[1]) * t,
      ]);
    }
  }
  return points;
}

export function isInsideSector(p: [number, number], sectorId: SectorId): boolean {
  const b = SECTOR_BOUNDS[sectorId];
  return p[0] >= b.minX && p[0] <= b.maxX && p[1] >= b.minZ && p[1] <= b.maxZ;
}

export function isPointInCctv(p: [number, number], cameras = CCTV_CAMERAS): boolean {
  for (const cam of cameras) {
    const [cx, cz] = cam.position;
    const [tx, tz] = cam.targetPoint;
    const camDir = Math.atan2(tx - cx, tz - cz);

    const pdx = p[0] - cx;
    const pdz = p[1] - cz;
    const dist = Math.hypot(pdx, pdz);

    if (dist < 1.0 || dist > 8.5) continue;

    const ptDir = Math.atan2(pdx, pdz);
    let diff = Math.abs(ptDir - camDir);
    while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
    const diffDeg = (diff * 180) / Math.PI;

    if (diffDeg <= 32) {
      return true;
    }
  }
  return false;
}

export function isPointInAudio(p: [number, number], audioNodes = AUDIO_COVERAGE, poles = POLES): boolean {
  for (const a of audioNodes) {
    const pole = poles.find((pol) => pol.id === a.poleId);
    if (!pole) continue;
    const dist = Math.hypot(p[0] - pole.position[0], p[1] - pole.position[1]);
    if (dist <= a.radius) {
      return true;
    }
  }
  return false;
}

export interface SectorAuditResult {
  sector: SectorId;
  totalPoints: number;
  lidarCovered: number;
  lidarPct: number;
  audioCovered: number;
  audioPct: number;
  cctvCovered: number;
  cctvPct: number;
  gapCount: number;
  gapPct: number;
}

export function runSectorAudit(
  lidarSensors = OPERATIONAL_LIDARS,
  audioNodes = AUDIO_COVERAGE,
  poles = POLES
): Record<SectorId, SectorAuditResult> {
  // Candidate Sector D residential corridor points (along modeled residential connector)
  const candidateSectorDCorridor: [number, number][] = [
    [12.0, 8.6],
    [13.0, 8.6],
    [14.2, 8.6],
    [15.2, 8.7],
    [16.2, 8.8],
    [16.8, 10.5],
    [18.0, 11.5],
    [19.2, 12.5],
    [20.5, 13.8],
    [21.8, 14.8],
    [23.0, 15.8],
    [24.0, 16.5],
  ];

  // Collect all active path points
  const allSampled: [number, number][] = [];
  PEOPLE_PATHS.forEach((path) => {
    allSampled.push(...samplePathPoints(path.waypoints, 1.0));
  });
  allSampled.push(...candidateSectorDCorridor);

  const sectors: SectorId[] = ['A', 'B', 'C', 'D'];
  const results = {} as Record<SectorId, SectorAuditResult>;

  for (const s of sectors) {
    const pts = allSampled.filter((p) => isInsideSector(p, s));
    const total = pts.length;
    let lidarCov = 0;
    let audioCov = 0;
    let cctvCov = 0;
    let gapCov = 0;

    for (const p of pts) {
      const evalRes = evaluateCollapseAgainstAllLidars(
        [p[0], 0.34, p[1]],
        null,
        null,
        lidarSensors,
        PARK_OBSTACLES
      );
      const isLidar = evalRes.detected;
      const isAud = isPointInAudio(p, audioNodes, poles);
      const isCam = isPointInCctv(p);

      if (isLidar) lidarCov++;
      if (isAud) audioCov++;
      if (isCam) cctvCov++;
      if (!isLidar && !isCam) gapCov++;
    }

    results[s] = {
      sector: s,
      totalPoints: total,
      lidarCovered: lidarCov,
      lidarPct: total > 0 ? Number(((lidarCov / total) * 100).toFixed(1)) : 0,
      audioCovered: audioCov,
      audioPct: total > 0 ? Number(((audioCov / total) * 100).toFixed(1)) : 0,
      cctvCovered: cctvCov,
      cctvPct: total > 0 ? Number(((cctvCov / total) * 100).toFixed(1)) : 0,
      gapCount: gapCov,
      gapPct: total > 0 ? Number(((gapCov / total) * 100).toFixed(1)) : 0,
    };
  }

  return results;
}
