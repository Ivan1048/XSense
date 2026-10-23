// Authoritative Operational LiDAR Sensor Definitions & Park Obstacle Footprints.
// Matches park coordinates [x, z] shared across 3D geometries, persona paths, and smart poles.

export interface LidarSensorDefinition {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  mountPoleId: string;
  position: [number, number]; // [x, z] in world coordinates
  mountHeightM: number;       // Mounting height on pole
  nominalRangeM: number;      // Maximum radial detection threshold (meters)
  minRangeM: number;          // Blind radius immediately surrounding mounting post
  fovDeg: number;             // Horizontal field of view in degrees
  headingDeg: number;         // Primary azimuth orientation (degrees, 0 = -Z North, 90 = +X East, 180 = +Z South, 270 = -X West)
  description: string;
}

export type ObstacleType = 'cylinder' | 'box';

export interface ObstacleDefinition {
  id: string;
  name: string;
  type: ObstacleType;
  position: [number, number]; // Center [x, z]
  radius?: number;            // For cylinder
  size?: [number, number];    // [width (X), depth (Z)] for box
  rotationY?: number;         // Rotation in radians
  heightM: number;            // Physical vertical height (meters)
  isDynamic?: boolean;        // e.g. Temporary route barrier
}

// ── 1. Authoritative Operational LiDAR Nodes ─────────────────────────────────
// Note: Per DESIGN.md, devices carry stable IDs independent of mount poles.
// LID-001 is mounted on Pole AS-103 (Central Path).
// LID-002 is mounted on Pole AS-104 (West Loop High-Risk Fall Benchmark).
export const OPERATIONAL_LIDARS: LidarSensorDefinition[] = [
  {
    id: 'LID-001',
    name: 'Central Path LiDAR Node',
    zoneId: 'central_path',
    zoneName: 'Central Path',
    mountPoleId: 'AS-103',
    position: [1.0, 1.0],
    mountHeightM: 3.55,
    nominalRangeM: 13.5,
    minRangeM: 0.5,
    fovDeg: 240,
    headingDeg: 315, // Aimed North-West (-45°) across Central Junction toward Lake Promenade
    description: 'Covers Central Path junction and lakeside entrance. Back 120° sector is shaded by pole mount.',
  },
  {
    id: 'LID-002',
    name: 'West Loop Targeted LiDAR Node',
    zoneId: 'west_path',
    zoneName: 'West Loop',
    mountPoleId: 'AS-104',
    position: [-12.0, 10.0],
    mountHeightM: 3.55,
    nominalRangeM: 13.0,
    minRangeM: 0.5,
    fovDeg: 210,
    headingDeg: 55, // Aimed North-East/East (+55°) into the West Loop pedestrian arc
    description: 'High-risk unmonitored curve benchmark. Evaluates height drop and ground immobility along West Loop.',
  },
  {
    id: 'LID-005',
    name: 'Residential Promenade LiDAR Node',
    zoneId: 'east_exit',
    zoneName: 'Residential Promenade',
    mountPoleId: 'AS-106',
    position: [18.0, 12.0],
    mountHeightM: 3.55,
    nominalRangeM: 13.5,
    minRangeM: 0.5,
    fovDeg: 210,
    headingDeg: 280,
    description: 'Monitors Sector D residential promenade and pedestrian access connector.',
  },
];

// ── 2. Authoritative Static & Dynamic Park Obstacles ────────────────────────
// Extracted from ParkGeometry.tsx and ParkSurroundings.tsx.
// Used for both 2.5D line-of-sight raycasting and 3D visual coverage mesh generation.
export const PARK_OBSTACLES: ObstacleDefinition[] = [
  // 15 Rain Trees (dense trunks and low canopy branches)
  { id: 'tree_rt_0', name: 'Rain Tree (North Entrance)', type: 'cylinder', position: [-16, -17], radius: 0.75, heightM: 3.5 },
  { id: 'tree_rt_1', name: 'Rain Tree (West Perimeter A)', type: 'cylinder', position: [-20, -6], radius: 0.65, heightM: 3.2 },
  { id: 'tree_rt_2', name: 'Rain Tree (West Loop Garden)', type: 'cylinder', position: [-17, 14], radius: 0.72, heightM: 3.4 },
  { id: 'tree_rt_3', name: 'Rain Tree (East Gate Lawn)', type: 'cylinder', position: [17, 15], radius: 0.78, heightM: 3.6 },
  { id: 'tree_rt_4', name: 'Rain Tree (East Perimeter)', type: 'cylinder', position: [20, -5], radius: 0.68, heightM: 3.3 },
  { id: 'tree_rt_5', name: 'Rain Tree (North-East Lawn)', type: 'cylinder', position: [16, -15], radius: 0.72, heightM: 3.4 },
  { id: 'tree_rt_6', name: 'Rain Tree (South Loop A)', type: 'cylinder', position: [-8, 19], radius: 0.68, heightM: 3.3 },
  { id: 'tree_rt_7', name: 'Rain Tree (South Loop B)', type: 'cylinder', position: [8, 19], radius: 0.75, heightM: 3.5 },
  { id: 'tree_rt_8', name: 'Rain Tree (Central West Spur A)', type: 'cylinder', position: [-12, -4], radius: 0.55, heightM: 2.8 },
  { id: 'tree_rt_9', name: 'Rain Tree (Central West Spur B)', type: 'cylinder', position: [-15, -2], radius: 0.62, heightM: 3.0 },
  { id: 'tree_rt_10', name: 'Rain Tree (Central West Spur C)', type: 'cylinder', position: [-11, -1], radius: 0.50, heightM: 2.6 },
  { id: 'tree_rt_11', name: 'Rain Tree (West Loop Connector A)', type: 'cylinder', position: [-7, 8], radius: 0.48, heightM: 2.5 },
  { id: 'tree_rt_12', name: 'Rain Tree (West Loop Connector B)', type: 'cylinder', position: [-5, 9], radius: 0.52, heightM: 2.7 },
  { id: 'tree_rt_13', name: 'Rain Tree (East Lake Bank A)', type: 'cylinder', position: [15, -6], radius: 0.55, heightM: 2.8 },
  { id: 'tree_rt_14', name: 'Rain Tree (East Lake Bank B)', type: 'cylinder', position: [17, -3], radius: 0.60, heightM: 3.0 },

  // 7 Royal Palm Trees (slender trunks)
  { id: 'tree_pt_0', name: 'Palm Tree (North Lawn A)', type: 'cylinder', position: [-12, -17], radius: 0.38, heightM: 4.2 },
  { id: 'tree_pt_1', name: 'Palm Tree (North Lawn B)', type: 'cylinder', position: [-6, -16], radius: 0.35, heightM: 4.0 },
  { id: 'tree_pt_2', name: 'Palm Tree (North-East Perimeter)', type: 'cylinder', position: [13, -16], radius: 0.42, heightM: 4.4 },
  { id: 'tree_pt_3', name: 'Palm Tree (East Lake Lawn)', type: 'cylinder', position: [16, -9], radius: 0.35, heightM: 4.0 },
  { id: 'tree_pt_4', name: 'Palm Tree (South-West Lawn)', type: 'cylinder', position: [-10, 17], radius: 0.38, heightM: 4.2 },
  { id: 'tree_pt_5', name: 'Palm Tree (East Promenade)', type: 'cylinder', position: [18, 10], radius: 0.40, heightM: 4.3 },
  { id: 'tree_pt_6', name: 'Palm Tree (West Garden)', type: 'cylinder', position: [-15, 4], radius: 0.32, heightM: 3.8 },

  // Footbridge Stone Piers (Lake inlet footbridge at [3.6, -4.8])
  { id: 'bridge_pier_west', name: 'Footbridge West Pier', type: 'cylinder', position: [2.3, -4.8], radius: 0.35, heightM: 2.2 },
  { id: 'bridge_pier_east', name: 'Footbridge East Pier', type: 'cylinder', position: [4.9, -4.8], radius: 0.35, heightM: 2.2 },

  // North Entrance Gateway Building
  { id: 'gateway_building', name: 'North Entrance Guard Building', type: 'box', position: [-17.1, -17.0], size: [2.4, 2.4], heightM: 3.0 },

  // Dynamic Route Barrier: Placed at [1.1, -0.6] across the Central Path north branch
  // (Notice: deliberately offset from AS-103 at [1.0, 1.0] to prevent overlapping sensor origin!)
  {
    id: 'dynamic_route_barrier',
    name: 'Central Path Closed Barrier',
    type: 'box',
    position: [1.1, -0.6],
    size: [3.0, 0.35],
    heightM: 0.9,
    isDynamic: true,
  },
];
