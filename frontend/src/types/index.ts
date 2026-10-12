// ── Shared TypeScript types for XSense ──────────────────────────────────────

export type AlertLevel =
  | 'normal'
  | 'low'
  | 'needs_review'
  | 'urgent'
  | 'coverage_warning'
  | 'lighting_warning';

export type SourceMode = 'simulated' | 'recorded' | 'live';

export type IncidentStatus =
  | 'open'
  | 'acknowledged'
  | 'assigned'
  | 'investigating'
  | 'resolved'
  | 'false_alarm';

export type SensorStatus = 'online' | 'needs_attention' | 'offline';

export interface PoleData {
  id: string;
  name: string;
  position: [number, number]; // [x, z] in 3D world coordinates
  zone: string;
  sensorStatus: SensorStatus;
  lightSetting: number; // 0–100
  lastSeenAt?: string;
}

export interface ZoneData {
  id: string;
  name: string;
  isRouteOpen: boolean;
  lightThresholdDemo: number; // brightness below this triggers Lighting Warning
}

export interface ActivityEntry {
  time: string;
  action: string;
  actor?: string;
}

export interface Incident {
  id: string;
  createdAt: string;
  zoneId: string;
  zoneName: string;
  poleId: string;
  type: string;
  displayType: string; // plain English label
  priority: AlertLevel;
  status: IncidentStatus;
  reason: string;
  sourceMode: SourceMode;
  assignedGuardId?: string;
  score?: number;
  activityTrail: ActivityEntry[];
}

export interface Guard {
  id: string;
  displayName: string;
  role: string;
  availability: 'available' | 'busy';
}

export interface SOSRequest {
  id: string;
  createdAt: string;
  zoneId?: string;
  zoneName?: string;
  poleId?: string;
  locationShared: boolean;
  approxLat?: number;
  approxLng?: number;
  status: 'pending' | 'received' | 'acknowledged' | 'dispatched';
  linkedIncidentId?: string;
}

export interface AlertEvent {
  id: number | string;
  title: string;
  message: string;
  at: string;
  kind: 'info' | 'warning' | 'urgent' | 'success';
  poleId?: string;
}

export interface LightingMap {
  [poleId: string]: number; // brightness 0–100
}
