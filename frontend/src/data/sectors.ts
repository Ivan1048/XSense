// Four Tactical Security Sectors configuration for City of Elmina Demonstration
// Coordinates and viewing targets are derived from verified park geometry and sensor coordinates.
import type { CameraPose } from '../types';

export type SectorId = 'A' | 'B' | 'C' | 'D';

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const PARK_BOUNDS: WorldBounds = {
  minX: -36,
  maxX: 36,
  minZ: -30,
  maxZ: 28,
};

export const SECTOR_BOUNDS: Record<SectorId, WorldBounds> = {
  A: { minX: -18, maxX: 6, minZ: -26, maxZ: -4 },
  B: { minX: -12, maxX: 14, minZ: -18, maxZ: 1 },
  C: { minX: -28, maxX: -4, minZ: 2, maxZ: 24 },
  D: { minX: 4, maxX: 28, minZ: -8, maxZ: 18 },
};

export interface OrthographicFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  target: [number, number, number];
}

/**
 * Calculates orthographic frustum planes given bounding box and viewport aspect ratio.
 * Applies a 12% padding factor around the requested bounds per Step D2.1 specifications.
 */
export function calculateOrthographicFrustum(
  bounds: WorldBounds,
  aspect: number,
  paddingFactor = 1.12
): OrthographicFrustum {
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const halfHeight = Math.max(worldHeight / 2, worldWidth / (2 * aspect)) * paddingFactor;
  const halfWidth = halfHeight * aspect;

  return {
    left: -halfWidth,
    right: halfWidth,
    top: halfHeight,
    bottom: -halfHeight,
    near: 0.1,
    far: 500,
    target: [centerX, 0, centerZ],
  };
}

export interface SectorConfig {
  id: SectorId;
  name: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  landmarks: string[];
  operationalDevices: string[];
  target: [number, number, number];
  perspectivePosition: [number, number, number];
  radarPosition: [number, number, number];
  radarZoom: number;
}

export const SECTORS: Record<SectorId, SectorConfig> = {
  A: {
    id: 'A',
    name: 'Sector A',
    code: 'SEC-A',
    title: 'Iconic Bridge & Gate',
    subtitle: 'North Entrance, Bridge Pier & Access Corridor',
    description:
      'Demonstration security sector covering the North Entrance gate, iconic pedestrian footbridge crossing, and vehicle access link. Monitored by smart pole AS-101 and CCTV-01 viewing corridor.',
    landmarks: ['North Entrance (AS-101)', 'Pedestrian Footbridge', 'North Access Gate', 'CAM-01 Corridor'],
    operationalDevices: ['AS-101', 'CAM-01'],
    target: [-6, 0, -15],
    perspectivePosition: [12, 32, 16],
    radarPosition: [-6, 100, -15],
    radarZoom: 1.85,
  },
  B: {
    id: 'B',
    name: 'Sector B',
    code: 'SEC-B',
    title: 'Lakeside Promenade',
    subtitle: 'Central Lake Basin & Waterside Path',
    description:
      'Demonstration security sector covering the scenic lake perimeter, southern promenade, and water reflection basin. Monitored by smart pole AS-102 and illustrative acoustic sensor AUD-001.',
    landmarks: ['Lakeside Path (AS-102)', 'Central Lake Basin', 'Waterside Promenade', 'AUD-001 Acoustic Zone'],
    operationalDevices: ['AS-102', 'AUD-001'],
    target: [1, 0, -8.5],
    perspectivePosition: [16, 28, 15.5],
    radarPosition: [1, 100, -8.5],
    radarZoom: 2.0,
  },
  C: {
    id: 'C',
    name: 'Sector C',
    code: 'SEC-C',
    title: 'West Loop & Play Garden',
    subtitle: 'West Loop Plaza & Recreational Garden',
    description:
      'Demonstration security sector covering the West Loop pedestrian network, family play garden, and recreational paths. Primary location for fall detection benchmark LID-002 and smart pole AS-104.',
    landmarks: ['West Loop Plaza (AS-104)', 'Play Garden Recreational Zone', 'LID-002 Fall Benchmark', 'West Walking Circuit'],
    operationalDevices: ['AS-104', 'LID-002'],
    target: [-16, 0, 13],
    perspectivePosition: [2, 30, 36],
    radarPosition: [-16, 100, 13],
    radarZoom: 1.75,
  },
  D: {
    id: 'D',
    name: 'Sector D',
    code: 'SEC-D',
    title: 'Residential Edge & Woods',
    subtitle: 'East Exit, Woodland Ridge & Perimeter Road',
    description:
      'Demonstration security sector covering the eastern park boundary, residential neighborhood access, woodland ridge buffer, and East Exit link. Monitored by smart pole AS-105 and CAM-02.',
    landmarks: ['East Exit Plaza (AS-105)', 'Residential Perimeter Arterial', 'Woodland Ridge Contour', 'CAM-02 Approach'],
    operationalDevices: ['AS-105', 'CAM-02'],
    target: [16, 0, 5],
    perspectivePosition: [38, 36, 31],
    radarPosition: [16, 100, 5],
    radarZoom: 1.45,
  },
};

export const SECTOR_LIST: SectorConfig[] = [
  SECTORS.A,
  SECTORS.B,
  SECTORS.C,
  SECTORS.D,
];

export const OVERVIEW_PERSPECTIVE_POSE: CameraPose = {
  position: [36, 70, 77],
  target: [0, 0, 0],
};

export const OVERVIEW_RADAR_POSE: CameraPose = {
  position: [0, 100, -1],
  target: [0, 0, -1],
  zoom: 1.0,
};

export const OVERVIEW_RADAR_ZOOM = 1.0;
