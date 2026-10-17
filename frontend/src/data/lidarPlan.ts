// Visualization-only placement study. No hardware, heartbeat, or incident rules.
export interface PlannedLidar {
  id: string;
  position: [number, number];
  area: string;
  range: number;
}

// A 15 m grid with 13 m nominal range gives overlapping radial envelopes.
// This is a layout assumption, not a manufacturer specification or visibility test.
export const PLANNED_LIDARS: PlannedLidar[] = [-22, -7, 8, 23].flatMap((z, row) =>
  [-32, -17, -2, 13].map((x, col) => ({
    id: `PLAN-L${String(row * 4 + col + 1).padStart(2, '0')}`,
    position: [row === 2 && col === 0 ? -35 : x, z] as [number, number],
    area: ['Forest-edge promenade', 'Garden & lakeside', 'Playground & central park', 'South walking loop'][row],
    range: 13,
  })),
);
export const LIDAR_PLAN_NOTE = '16 proposed LiDAR locations · 13 m nominal range. Range envelopes only; trees, terrain and structures may block visibility. Not connected to incident detection.';
