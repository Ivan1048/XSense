// Shared camera inventory: estimated coverage only; no connected feeds.
export interface CameraInventoryItem {
  id: string;
  name: string;
  zoneName: string;
  position: [number, number]; // [x, z]
  targetPoint: [number, number]; // [tx, tz] point on ground path the camera aims at
  status: 'inventory_only';
  coverageNote: string;
  limitations: string;
}

export const CCTV_CAMERAS: CameraInventoryItem[] = [
  {
    id: 'CAM-01',
    name: 'North Gate CCTV',
    zoneName: 'North Entrance',
    position: [-17.5, -14.8],
    targetPoint: [-11.5, -10.5],
    status: 'inventory_only',
    coverageNote: 'Estimated viewing cone covering North Entrance gate and upper path (near AS-101).',
    limitations: 'Inventory marker only — no live video stream integrated. Does not cover West Loop (AS-104).',
  },
  {
    id: 'CAM-02',
    name: 'East Exit CCTV',
    zoneName: 'East Exit',
    position: [16.5, 13.0],
    targetPoint: [10.5, 8.8],
    status: 'inventory_only',
    coverageNote: 'Estimated viewing cone covering East Exit walkway (near AS-105).',
    limitations: 'Inventory marker only — no live video stream integrated. Tree foliage blocks Central Path.',
  },
  {
    id: 'CAM-03',
    name: 'Playground Entrance CCTV',
    zoneName: 'Play Garden',
    position: [-35, 16],
    targetPoint: [-29, 12],
    status: 'inventory_only',
    coverageNote: 'Proposed camera location; estimated viewing direction toward the public play garden.',
    limitations: 'Simulation inventory only. No camera feed connected; visibility and detection require site verification.',
  },
  {
    id: 'CAM-04',
    name: 'West Loop CCTV',
    zoneName: 'West Loop',
    position: [-17, 14],
    targetPoint: [-11, 10],
    status: 'inventory_only',
    coverageNote: 'Proposed camera location; estimated viewing direction toward the public west loop.',
    limitations: 'Simulation inventory only. No camera feed connected; visibility and detection require site verification.',
  },
  {
    id: 'CAM-05',
    name: 'Lakeside CCTV',
    zoneName: 'Lakeside Path',
    position: [-7, -15],
    targetPoint: [-3, -9],
    status: 'inventory_only',
    coverageNote: 'Proposed camera location; estimated viewing direction toward the public lakeside path.',
    limitations: 'Simulation inventory only. No camera feed connected; visibility and detection require site verification.',
  },
  {
    id: 'CAM-06',
    name: 'Residential Approach CCTV',
    zoneName: 'Residential Approach',
    position: [24, 19],
    targetPoint: [25, 25],
    status: 'inventory_only',
    coverageNote: 'Proposed camera location; estimated viewing direction toward the public residential approach.',
    limitations: 'Simulation inventory only. No camera feed connected; visibility and detection require site verification.',
  },
];

