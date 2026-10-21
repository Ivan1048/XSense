// ── Guard Pathway Graph — City of Elmina Central Park ───────────────────────
// Guards navigate via real park paths rather than moving in straight lines.
// Coordinates match the 3D scene world space used in parkData.ts / Scene.tsx.
// All positions are simulated; no real guard tracking hardware is connected.

export type PathNodeId =
  | 'spawn'          // off-screen guard base (south)
  | 'south_gate'     // park entry junction from spawn
  | 'AS-101'         // North Entrance      [-15, -13]
  | 'AS-102'         // Lakeside Path       [ -4,  -9]
  | 'footbridge'     // Footbridge mid-span [  2,  -5]
  | 'AS-103'         // Central Path        [  1,   1]
  | 'AS-104'         // West Loop           [-12,  10]
  | 'AS-105';        // East Exit           [ 14,  11]

/** World-space [x, z] for each named node */
export const PATH_NODES: Record<PathNodeId, [number, number]> = {
  spawn:       [  0, -22],
  south_gate:  [  0, -16],
  'AS-101':    [-15, -13],
  'AS-102':    [ -4,  -9],
  footbridge:  [  2,  -5],
  'AS-103':    [  1,   1],
  'AS-104':    [-12,  10],
  'AS-105':    [ 14,  11],
};

/**
 * Undirected adjacency list — each edge is a direct path segment
 * that follows the visible park pathways.
 */
const EDGES: [PathNodeId, PathNodeId][] = [
  ['spawn',      'south_gate'],
  ['south_gate', 'AS-101'],
  ['south_gate', 'AS-102'],
  ['AS-101',     'AS-102'],
  ['AS-102',     'footbridge'],
  ['AS-102',     'AS-103'],
  ['footbridge', 'AS-103'],
  ['AS-103',     'AS-104'],
  ['AS-103',     'AS-105'],
  ['AS-104',     'AS-105'],  // west-to-east upper path
];

/** Build adjacency map once */
function buildAdjacency(): Map<PathNodeId, PathNodeId[]> {
  const adj = new Map<PathNodeId, PathNodeId[]>();
  for (const [a, b] of EDGES) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  return adj;
}

const ADJACENCY = buildAdjacency();

/** BFS shortest path between two named nodes */
function bfs(start: PathNodeId, end: PathNodeId): PathNodeId[] {
  if (start === end) return [start];
  const visited = new Set<PathNodeId>([start]);
  const queue: PathNodeId[][] = [[start]];
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    for (const neighbor of (ADJACENCY.get(current) ?? [])) {
      if (neighbor === end) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  // Fallback: direct line if graph disconnected (should not happen)
  return [start, end];
}

/**
 * Returns an ordered array of world-space [x, z] waypoints for a guard
 * travelling from the spawn base to a target pole.
 *
 * @param targetPoleId  The pole the guard is dispatched to (e.g. 'AS-104').
 *                      If the pole is not a graph node, the nearest node is used.
 * @param guardOffset   Per-guard tactical offset applied to the final waypoint
 *                      so multiple guards don't stack on the exact same spot.
 */
export function findGuardPath(
  targetPoleId: string,
  guardOffset: [number, number] = [0, 0],
): [number, number][] {
  // Resolve target: use the pole node directly if it exists, else 'AS-103' (central)
  const targetNode: PathNodeId =
    (targetPoleId as PathNodeId) in PATH_NODES
      ? (targetPoleId as PathNodeId)
      : 'AS-103';

  const nodeIds = bfs('spawn', targetNode);

  // Convert node IDs → world positions, applying guard offset to the last waypoint
  return nodeIds.map((id, idx) => {
    const [nx, nz] = PATH_NODES[id];
    if (idx === nodeIds.length - 1) {
      return [nx + guardOffset[0], nz + guardOffset[1]];
    }
    return [nx, nz];
  });
}
