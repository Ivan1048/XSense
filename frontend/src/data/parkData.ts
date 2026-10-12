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

// Anonymous dot paths for simulated movement
export const PEOPLE_PATHS = [
  { x: -11, z: -2,  radius: 2.5, speed: 0.34, offset: 0.0 },
  { x:   5, z:  2,  radius: 3.0, speed: 0.26, offset: 1.5 },
  { x:  11, z:  10, radius: 1.3, speed: 0.48, offset: 3.0 },
  { x:  -3, z:   8, radius: 3.0, speed: 0.31, offset: 2.0 },
  { x:   0, z: -13, radius: 1.0, speed: 0.37, offset: 4.0 },
];
