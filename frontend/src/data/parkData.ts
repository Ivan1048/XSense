// ── Static park data — poles and zones ──────────────────────────────────────
// Positions are 3D world coordinates [x, z].
// All sensor data is simulated; no real hardware is connected.

import type { PoleData, ZoneData, Guard } from '../types';

export const POLES: PoleData[] = [
  {
    id: 'AS-101',
    name: 'North Entrance',
    position: [-15, -13],
    zone: 'north_entrance',
    sensorStatus: 'online',
    lightSetting: 70,
  },
  {
    id: 'AS-102',
    name: 'Lakeside Path',
    position: [-4, -9],
    zone: 'lakeside_path',
    sensorStatus: 'online',
    lightSetting: 70,
  },
  {
    id: 'AS-103',
    name: 'Central Path',
    position: [1, 1],
    zone: 'central_path',
    sensorStatus: 'online',
    lightSetting: 70,
  },
  {
    id: 'AS-104',
    name: 'West Loop',
    position: [-12, 10],
    zone: 'west_path',
    sensorStatus: 'online',
    lightSetting: 70,
  },
  {
    id: 'AS-105',
    name: 'East Exit',
    position: [14, 11],
    zone: 'east_exit',
    sensorStatus: 'online',
    lightSetting: 70,
  },
];

export const ZONES: ZoneData[] = [
  { id: 'north_entrance', name: 'North Entrance', isRouteOpen: true, lightThresholdDemo: 30 },
  { id: 'lakeside_path',  name: 'Lakeside Path',  isRouteOpen: true, lightThresholdDemo: 30 },
  { id: 'central_path',  name: 'Central Path',   isRouteOpen: true, lightThresholdDemo: 30 },
  { id: 'west_path',     name: 'West Loop',       isRouteOpen: true, lightThresholdDemo: 30 },
  { id: 'east_exit',     name: 'East Exit',       isRouteOpen: true, lightThresholdDemo: 30 },
];

export const GUARDS: Guard[] = [
  { id: 'G01', displayName: 'Officer Chen',  role: 'Senior Guard', availability: 'available' },
  { id: 'G02', displayName: 'Officer Malik', role: 'Guard',        availability: 'available' },
  { id: 'G03', displayName: 'Officer Siti',  role: 'Guard',        availability: 'available' },
];

// ── Pole Exclusion & Collision Prevention ──────────────────────────────────
// Configurable horizontal exclusion radius around operational pole geometry (visual/path-planning constraint)
export const POLE_EXCLUSION_RADIUS_M = 2.0;

export function checkPoleClearance(
  x: number,
  z: number,
  exclusionRadiusM = POLE_EXCLUSION_RADIUS_M
): { isClear: boolean; nearestPoleId: string; distanceM: number } {
  let minDistance = Infinity;
  let nearestPole = POLES[0].id;

  for (const pole of POLES) {
    const dist = Math.hypot(x - pole.position[0], z - pole.position[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPole = pole.id;
    }
  }

  return {
    isClear: minDistance >= exclusionRadiusM,
    nearestPoleId: nearestPole,
    distanceM: Math.round(minDistance * 100) / 100,
  };
}

// Anonymous dot paths for simulated movement along curved pathways
// All waypoints and interpolated splines maintain >= 2.0m clearance from all active pole shafts
export const PEOPLE_PATHS = [
  // Dot 0: West Walking Loop (encircles AS-104 at [-12, 10] with safe plaza bypass)
  {
    x: -8.5,
    z: 6.5,
    radius: 2.2,
    speed: 0.32,
    offset: 0.0,
    waypoints: [
      [ -0.8,  2.8], // Central Plaza safe bypass (dist to AS-103 [1,1] = 2.54m)
      [ -3.5,  2.8],
      [ -7.5,  5.5],
      [-10.2,  8.0], // West Loop approach
      [ -9.6, 10.2], // West Loop Plaza inner bypass (dist to AS-104 [-12,10] = 2.41m)
      [-10.2, 12.8],
      [ -5.5, 14.0],
      [  0.0, 12.0],
      [  1.8,  7.0],
      [  0.8,  3.5], // Approach back to plaza (dist to AS-103 = 2.51m)
    ] as [number, number][],
  },
  // Dot 1: Lake Walking Loop (walks the lake perimeter and crosses over the Footbridge!)
  {
    x: 3.5,
    z: 2.2,
    radius: 2.0,
    speed: 0.28,
    offset: 0.35,
    waypoints: [
      [ 2.6,  -1.2], // Central Junction lakeside (dist to AS-103 [1,1] = 2.72m)
      [ 1.4,  -2.2], // dist to AS-103 = 3.22m
      [ 1.4,  -4.8], // Footbridge West End
      [ 3.6,  -4.8], // Footbridge Mid
      [ 5.8,  -4.8], // Footbridge East End
      [ 7.8,  -5.5],
      [ 9.2,  -8.5],
      [ 8.2, -11.8],
      [ 4.8, -13.2],
      [ 1.0, -13.0],
      [-2.5, -11.8],
      [-1.8,  -8.8], // Lakeside Path bypass (dist to AS-102 [-4,-9] = 2.21m)
      [-2.4,  -5.5],
      [-1.2,  -2.5],
      [ 0.6,  -2.2], // Lakeside bypass south of AS-103 (dist to AS-103 = 3.22m)
    ] as [number, number][],
  },
  // Dot 2: East Exit Promenade (near AS-105 at [14, 11] with safe promenade bypass)
  {
    x: 12.0,
    z: 9.5,
    radius: 1.8,
    speed: 0.38,
    offset: 0.6,
    waypoints: [
      [ 2.6,   2.6], // Turnaround near Central Junction (dist to AS-103 = 2.26m)
      [ 5.5,   4.2],
      [ 9.5,   7.0],
      [12.0,   8.6], // Promenade safe corridor south of AS-105 (dist to [14,11] = 3.12m)
      [14.2,   8.6], // Promenade safe corridor south of AS-105 (dist to [14,11] = 2.41m)
      [16.2,   8.8], // East gate approach
      [16.8,  10.5], // East turnaround loop
      [16.0,   8.8],
      [14.2,   8.6],
      [12.0,   8.6],
      [ 9.5,   7.0],
      [ 5.5,   4.2],
    ] as [number, number][],
  },
  // Dot 3: North Entrance Connector (AS-101 to Lakeside corridor)
  {
    x: -5.0,
    z: 13.5,
    radius: 2.0,
    speed: 0.30,
    offset: 0.2,
    waypoints: [
      [-16.5, -15.5], // Gateway
      [-13.2, -14.4], // North Entrance bypass (dist to AS-101 [-15,-13] = 2.28m)
      [-11.5, -12.0],
      [ -8.5, -11.4],
      [ -5.8, -11.4], // Turnaround before AS-102 (dist to AS-102 [-4,-9] = 3.00m)
      [ -8.5, -11.4],
      [-11.5, -12.0],
      [-13.2, -14.4],
    ] as [number, number][],
  },
  // Dot 4: Southern Arc of the West Loop (near AS-104 at [-12, 10])
  {
    x: -7.5,
    z: -10.5,
    radius: 1.6,
    speed: 0.34,
    offset: 0.75,
    waypoints: [
      [ -9.6, 10.2], // West Loop inner bypass (dist to AS-104 = 2.41m)
      [-10.2, 13.0],
      [ -5.5, 14.0],
      [  0.0, 12.0],
      [  1.8,  7.0],
      [  0.0, 12.0],
      [ -5.5, 14.0],
      [-10.2, 13.0],
    ] as [number, number][],
  },
];
