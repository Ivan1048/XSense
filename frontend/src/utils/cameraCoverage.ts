// ── Estimated CCTV Coverage Evaluation ──────────────────────────────────────
// The camera inventory has positions and aim points but no verified footprint.
// This module turns the documented estimate (mount + aim + assumed range/FOV)
// into an explicit, testable coverage test so the 3D footprint, the incident
// camera line and the blind-spot demonstration cannot drift apart.
//
// Boundaries: a positive result means "inside the estimated footprint". It does
// not mean a live feed exists, that footage is retrievable, that a person is
// identifiable, or that the camera would actually detect a fall. Trees, weather
// and mounting details are not modelled.

import { CCTV_CAMERAS, type CameraFootprint, type CameraInventoryItem } from '../data/cameraData';
import { angularDistanceDeg, calculateBearingDeg } from './lidarGeometry';

export const NO_CAMERA_VIEW_MESSAGE = 'No camera view available. On-site check required.';

export type CameraCoverageFailure = 'none' | 'range' | 'field_of_view' | 'range_and_field_of_view';

export interface CameraCoverageResult {
  /** Inside at least one camera's estimated ground footprint. */
  covered: boolean;
  coveredByCameraId: string | null;
  nearestCameraId: string | null;
  nearestCameraName: string | null;
  nearestDistanceM: number;
  nearestOffAxisDeg: number;
  /** Why the nearest camera does not cover the point (or 'none' if it does). */
  nearestFailure: CameraCoverageFailure;
  basis: CameraFootprint['coverageBasis'];
  /** Plain-language operator line; never implies a live feed or identification. */
  cameraContext: string;
  /** Detail string for diagnostics and demonstration text. */
  explanation: string;
}

export function cameraAimBearingDeg(camera: CameraInventoryItem): number {
  return calculateBearingDeg(camera.position, camera.targetPoint);
}

/** Ground sector points (world [x, z]) for the camera's estimated footprint. */
export function cameraFootprintSectorPoints(camera: CameraInventoryItem, segments = 24): [number, number][] {
  const aim = cameraAimBearingDeg(camera);
  const halfFov = camera.footprint.horizontalFovDeg / 2;
  const points: [number, number][] = [[camera.position[0], camera.position[1]]];
  for (let i = 0; i <= segments; i++) {
    const bearing = aim - halfFov + (camera.footprint.horizontalFovDeg * i) / segments;
    const rad = (bearing * Math.PI) / 180;
    points.push([
      camera.position[0] + Math.sin(rad) * camera.footprint.estimatedRangeM,
      camera.position[1] - Math.cos(rad) * camera.footprint.estimatedRangeM,
    ]);
  }
  return points;
}

function failureFor(distanceM: number, offAxisDeg: number, footprint: CameraFootprint): CameraCoverageFailure {
  const outOfRange = distanceM > footprint.estimatedRangeM;
  const outOfFov = offAxisDeg > footprint.horizontalFovDeg / 2;
  if (outOfRange && outOfFov) return 'range_and_field_of_view';
  if (outOfRange) return 'range';
  if (outOfFov) return 'field_of_view';
  return 'none';
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Evaluate estimated CCTV coverage for a ground position.
 * Uses only the documented footprint estimate; nothing here is a site survey.
 */
export function evaluateCameraCoverage(x: number, z: number): CameraCoverageResult {
  const point: [number, number] = [x, z];

  let nearest: CameraInventoryItem | null = null;
  let nearestDistance = Infinity;
  let nearestOffAxis = 0;

  let covering: CameraInventoryItem | null = null;
  let coveringDistance = Infinity;
  let coveringOffAxis = 0;

  for (const camera of CCTV_CAMERAS) {
    const distance = Math.hypot(point[0] - camera.position[0], point[1] - camera.position[1]);
    const offAxis = angularDistanceDeg(cameraAimBearingDeg(camera), calculateBearingDeg(camera.position, point));

    if (distance < nearestDistance) {
      nearest = camera;
      nearestDistance = distance;
      nearestOffAxis = offAxis;
    }

    const inside =
      distance <= camera.footprint.estimatedRangeM && offAxis <= camera.footprint.horizontalFovDeg / 2;
    if (inside && distance < coveringDistance) {
      covering = camera;
      coveringDistance = distance;
      coveringOffAxis = offAxis;
    }
  }

  const basis: CameraFootprint['coverageBasis'] = 'estimated_from_mount_and_aim';
  const nearestFailure = nearest
    ? failureFor(nearestDistance, nearestOffAxis, nearest.footprint)
    : 'none';

  if (covering) {
    const distance = round1(coveringDistance);
    const offAxis = round1(coveringOffAxis);
    return {
      covered: true,
      coveredByCameraId: covering.id,
      nearestCameraId: covering.id,
      nearestCameraName: covering.name,
      nearestDistanceM: distance,
      nearestOffAxisDeg: offAxis,
      nearestFailure: 'none',
      basis,
      cameraContext: `${covering.id} (${covering.name}) is estimated to view this area — inventory marker only; no live feed, footage retrieval or identification is connected. On-site check still required to confirm.`,
      explanation: `Inside ${covering.id}'s estimated footprint: ${distance}m from the mount, ${offAxis}° off its aim line (estimate: ${covering.footprint.estimatedRangeM}m / ${covering.footprint.horizontalFovDeg}°). Not verified on site.`,
    };
  }

  const distance = round1(nearestDistance);
  const offAxis = round1(nearestOffAxis);
  const failureText =
    nearestFailure === 'range_and_field_of_view'
      ? `beyond its estimated ${nearest!.footprint.estimatedRangeM}m range and ${round1(nearest!.footprint.horizontalFovDeg / 2)}° half-angle`
      : nearestFailure === 'range'
      ? `beyond its estimated ${nearest!.footprint.estimatedRangeM}m range`
      : `outside its estimated ±${round1(nearest!.footprint.horizontalFovDeg / 2)}° field of view`;

  return {
    covered: false,
    coveredByCameraId: null,
    nearestCameraId: nearest?.id ?? null,
    nearestCameraName: nearest?.name ?? null,
    nearestDistanceM: distance,
    nearestOffAxisDeg: offAxis,
    nearestFailure,
    basis,
    cameraContext: NO_CAMERA_VIEW_MESSAGE,
    explanation: nearest
      ? `Nearest camera ${nearest.id} (${nearest.name}) is ${distance}m away and ${offAxis}° off its aim line — ${failureText}. Outside all estimated CCTV footprints.`
      : 'No cameras are defined in the inventory.',
  };
}
