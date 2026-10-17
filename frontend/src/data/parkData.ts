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

// Anonymous dot paths for simulated movement along curved pathways
export const PEOPLE_PATHS = [
  // Dot 0: West Walking Loop (encircles AS-104 at [-12, 10])
  {
    x: -8.5,
    z: 6.5,
    radius: 2.2,
    speed: 0.32,
    offset: 0.0,
    waypoints: [
      [  1.0,  1.0],
      [ -3.5,  2.8],
      [ -7.5,  5.5],
      [-11.0,  8.2],
      [-12.0, 10.0], // AS-104 West Loop Plaza
      [-10.2, 13.0],
      [ -5.5, 14.0],
      [  0.0, 12.0],
      [  1.8,  7.0],
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
      [ 1.0,   1.0], // Central Junction
      [ 1.2,  -1.8],
      [ 1.4,  -4.8], // Footbridge West End
      [ 3.6,  -4.8], // Footbridge Mid
      [ 5.8,  -4.8], // Footbridge East End
      [ 7.8,  -5.5],
      [ 9.2,  -8.5],
      [ 8.2, -11.8],
      [ 4.8, -13.2],
      [ 1.0, -13.0],
      [-2.5, -11.8],
      [-3.8,  -9.0], // AS-102 Lakeside Path
      [-2.6,  -5.5],
      [-1.2,  -2.5],
    ] as [number, number][],
  },
  // Dot 2: East Exit Promenade (near AS-105 at [14, 11])
  {
    x: 12.0,
    z: 9.5,
    radius: 1.8,
    speed: 0.38,
    offset: 0.6,
    waypoints: [
      [ 1.0,  1.0],
      [ 5.0,  3.5],
      [ 9.5,  7.0],
      [14.0, 11.0], // AS-105 East Exit Plaza
      [16.5, 12.5],
      [14.0, 11.0],
      [ 9.5,  7.0],
      [ 5.0,  3.5],
    ] as [number, number][],
  },
  // Dot 3: North Entrance Connector (AS-101 to AS-102)
  {
    x: -5.0,
    z: 13.5,
    radius: 2.0,
    speed: 0.30,
    offset: 0.2,
    waypoints: [
      [-16.5, -15.5],
      [-15.0, -13.0], // AS-101 North Entrance
      [-11.5, -11.8],
      [ -7.5, -10.5],
      [ -3.8,  -9.0], // AS-102 Lakeside Path
      [ -7.5, -10.5],
      [-11.5, -11.8],
      [-15.0, -13.0],
    ] as [number, number][],
  },
  // Dot 4: Southern Arc of the West Loop
  {
    x: -7.5,
    z: -10.5,
    radius: 1.6,
    speed: 0.34,
    offset: 0.75,
    waypoints: [
      [-12.0, 10.0],
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
