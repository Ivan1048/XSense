import type { PersonaId, PersonaActionType, DotPath } from '../types/persona';
import { PEOPLE_PATHS, POLES } from './parkData';

// ── Persona Profile Definition ──────────────────────────────────────────────
export interface PersonaDefinition {
  id: PersonaId;
  index: number;
  label: string;
  category: 'jogger' | 'senior' | 'fitness' | 'parent_child' | 'dog_walker';
  pathIndex: number;
  baseSpeed: number;
  description: string;
  postureDescription: string;
  supportedActions: PersonaActionType[];
  autonomousActivities: {
    action: PersonaActionType;
    durationSec: number;
    weight: number;
  }[];
  accessoryType?: 'visor' | 'cane' | 'wristband' | 'child_companion' | 'dog_companion';
}

// ── 5 Independent Visitor Persona Configurations ────────────────────────────
export const PERSONA_DEFINITIONS: PersonaDefinition[] = [
  {
    id: 'persona_0',
    index: 0,
    label: 'Morning Jogger',
    category: 'jogger',
    pathIndex: 0,
    baseSpeed: 0.38,
    description: 'Athletic park visitor maintaining high pace on the West Walking Loop.',
    postureDescription: 'Forward torso pitch (8°), dynamic arm swing, high cadence.',
    supportedActions: [
      'jog',
      'sprint',
      'tie_shoelaces',
      'check_phone',
      'pause_tree',
      'crouch',
      'collapse',
      'call_help',
    ],
    autonomousActivities: [
      { action: 'check_phone', durationSec: 6, weight: 3 },
      { action: 'tie_shoelaces', durationSec: 7, weight: 2 },
      { action: 'pause_tree', durationSec: 8, weight: 2 },
      { action: 'sprint', durationSec: 8, weight: 3 },
    ],
    accessoryType: 'visor',
  },
  {
    id: 'persona_1',
    index: 1,
    label: 'Senior Citizen',
    category: 'senior',
    pathIndex: 1,
    baseSpeed: 0.22,
    description: 'Elderly resident taking a leisurely stroll along the Lake Loop and Footbridge.',
    postureDescription: 'Slight thoracic stoop (10°), walking cane accessory, relaxed pace.',
    supportedActions: [
      'walk',
      'bench_rest',
      'pause_tree',
      'whistling',
      'sit',
      'crouch',
      'collapse',
      'call_help',
    ],
    autonomousActivities: [
      { action: 'bench_rest', durationSec: 12, weight: 4 },
      { action: 'pause_tree', durationSec: 10, weight: 3 },
      { action: 'whistling', durationSec: 8, weight: 2 },
    ],
    accessoryType: 'cane',
  },
  {
    id: 'persona_2',
    index: 2,
    label: 'Fitness Enthusiast',
    category: 'fitness',
    pathIndex: 2,
    baseSpeed: 0.34,
    description: 'Recreational exerciser along the East Exit Promenade doing aerobic training.',
    postureDescription: 'Upright athletic stance, dual wristbands, periodic calisthenics.',
    supportedActions: [
      'jog',
      'sprint',
      'jumping_jacks',
      'yoga',
      'crouch',
      'tie_shoelaces',
      'check_phone',
      'collapse',
      'call_help',
    ],
    autonomousActivities: [
      { action: 'jumping_jacks', durationSec: 9, weight: 3 },
      { action: 'yoga', durationSec: 10, weight: 3 },
      { action: 'crouch', durationSec: 7, weight: 2 },
      { action: 'sprint', durationSec: 7, weight: 3 },
    ],
    accessoryType: 'wristband',
  },
  {
    id: 'persona_3',
    index: 3,
    label: 'Parent & Child',
    category: 'parent_child',
    pathIndex: 3,
    baseSpeed: 0.26,
    description: 'Parent strolling with young child (0.95m) along the North Entrance Connector.',
    postureDescription: 'Dual figure formation: adult walking alongside accompanying child primitive.',
    supportedActions: [
      'walk',
      'crouch',
      'talking',
      'laughing',
      'child_crying',
      'bench_rest',
      'check_phone',
      'pause_tree',
      'collapse',
      'call_help',
    ],
    autonomousActivities: [
      { action: 'talking', durationSec: 8, weight: 4 },
      { action: 'laughing', durationSec: 6, weight: 3 },
      { action: 'crouch', durationSec: 7, weight: 2 },
      { action: 'bench_rest', durationSec: 10, weight: 2 },
    ],
    accessoryType: 'child_companion',
  },
  {
    id: 'persona_4',
    index: 4,
    label: 'Dog Walker',
    category: 'dog_walker',
    pathIndex: 4,
    baseSpeed: 0.28,
    description: 'Resident walking their pet canine (0.45m) on a leash around the Southern Arc.',
    postureDescription: 'Tandem movement: walker holding dynamic procedural leash attached to canine.',
    supportedActions: [
      'walk',
      'crouch',
      'pause_tree',
      'whistling',
      'talking',
      'bench_rest',
      'check_phone',
      'collapse',
      'call_help',
    ],
    autonomousActivities: [
      { action: 'pause_tree', durationSec: 9, weight: 4 },
      { action: 'crouch', durationSec: 7, weight: 3 },
      { action: 'whistling', durationSec: 8, weight: 3 },
      { action: 'check_phone', durationSec: 6, weight: 2 },
    ],
    accessoryType: 'dog_companion',
  },
];

// ── Reachable Spatial Navigation Targets ────────────────────────────────────
// Extracted from verified ParkGeometry fixtures to ensure collision-safe destinations

export const REACHABLE_BENCHES: { id: string; x: number; z: number; rotY: number; pathIndex: number }[] = [
  { id: 'bench_west_lake', x: -4.8, z: -7.0, rotY: Math.PI / 2, pathIndex: 1 },
  { id: 'bench_north_lake', x: 3.5, z: -14.4, rotY: Math.PI, pathIndex: 1 },
  { id: 'bench_east_lake', x: 11.0, z: -8.5, rotY: -Math.PI / 2, pathIndex: 1 },
  { id: 'bench_west_loop', x: -8.5, z: 3.8, rotY: 0.7, pathIndex: 0 },
  { id: 'bench_central_junction', x: 4.0, z: 0.2, rotY: -1.2, pathIndex: 3 },
];

export const REACHABLE_TREES: { id: string; x: number; z: number; pathIndex: number }[] = [
  { id: 'tree_west_loop_a', x: -14.5, z: 5.5, pathIndex: 0 },
  { id: 'tree_west_loop_b', x: -7.0, z: 12.0, pathIndex: 0 },
  { id: 'tree_lake_bridge', x: 0.5, z: -3.5, pathIndex: 1 },
  { id: 'tree_east_exit', x: 11.5, z: 5.5, pathIndex: 2 },
  { id: 'tree_north_gate', x: -13.5, z: -10.5, pathIndex: 3 },
  { id: 'tree_south_arc', x: -3.0, z: 15.0, pathIndex: 4 },
];

// ── Verified Simulated Coverage Gaps ────────────────────────────────────────
// Locations with distance > 12.0m from any online operational pole (AS-101..AS-105)
export const VERIFIED_COVERAGE_GAPS: { name: string; position: [number, number]; note: string }[] = [
  {
    name: 'Southeast Lake Perimeter Blind Zone',
    position: [9.5, -11.5],
    note: 'Lakeside walkway bend (near Path 1). Distance to AS-102 is 15.8m and AS-103 is 16.7m. Outside all active sensor envelopes.',
  },
  {
    name: 'East Promenade Corridor Shadow',
    position: [7.0, 4.5],
    note: 'Unmonitored corridor between Central Path AS-103 (7.2m) and East Exit AS-105 (9.5m).',
  },
  {
    name: 'South Loop Far Arc',
    position: [2.0, 16.5],
    note: 'Southern arc perimeter beyond 14m from AS-104 and AS-103.',
  },
];

// ── Operational Sensor Coverage Radius (Meters) ────────────────────────────
// Standard nominal pole-mounted 3D LiDAR coverage envelope
export const OPERATIONAL_LIDAR_RADIUS_M = 12.0;
