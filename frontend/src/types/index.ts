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
  lightingResponseNote?: string;
  cameraContext?: string;
  sensorBasis?: string;
  occurrenceCount?: number;
  lastUpdatedEpoch?: number;
  activityTrail: ActivityEntry[];
}

export interface Guard {
  id: string;
  displayName: string;
  role: string;
  availability: 'available' | 'busy';
}

export interface DispatchedGuardState {
  guardId: string;
  guardName: string;
  incidentId: string;
  targetPoleId: string;
  targetPos: [number, number];
  status: 'traveling' | 'arrived' | 'returning';
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

export interface AlertEventDetails {
  sourceDevice?: string;
  sensorBasis?: string;
  lightingAction?: string;
  cameraAvailability?: string;
}

export interface AlertEvent {
  id: number | string;
  title: string;
  message: string;
  at: string;
  kind: 'info' | 'warning' | 'urgent' | 'success';
  poleId?: string;
  details?: AlertEventDetails;
}

export interface LightingMap {
  [poleId: string]: number; // brightness 0–100
}

// ── Sound (YAMNet) & LiDAR Evaluation Types ─────────────────────────────────

export interface AudioClassPrediction {
  class_name: string;
  score: number;
}

export interface AudioInferenceResult {
  sample_id: string;
  source_mode: SourceMode;
  event_type: string;
  priority: AlertLevel;
  plain_label: string;
  plain_reason: string;
  distress_score: number;
  benign_score: number;
  duration_sec: number;
  top_classes: AudioClassPrediction[];
  waveform_metrics?: {
    rms: number;
    centroid_hz: number;
  };
}

export interface LidarKinematics {
  initial_height_m: number;
  final_height_m: number;
  drop_speed_mps: number;
  horizontal_speed_mps: number;
  aspect_ratio: number;
  stationary_seconds: number;
  box_dimensions_m: [number, number, number];
}

export interface LidarEvaluationResult {
  scenario_kind: string;
  device_id: string;
  zone_id: string;
  pole_id: string;
  source_mode: SourceMode;
  detected: boolean;
  trigger_incident: boolean;
  event_type: string;
  priority: AlertLevel;
  score?: number;
  plain_label: string;
  plain_reason: string;
  kinematics: LidarKinematics;
  lighting_boost_pct: number | null;
  lighting_note: string;
  camera_context: string;
}

export interface FusionEvaluationResult {
  fused: boolean;
  event_type: string;
  priority: AlertLevel;
  source_mode: SourceMode;
  score?: number;
  zone_id?: string;
  pole_id?: string;
  audio_zone_id?: string;
  audio_pole_id?: string;
  lidar_zone_id?: string;
  lidar_pole_id?: string;
  time_delta_seconds: number;
  plain_label: string;
  plain_reason: string;
  sensor_basis: string;
  lighting_boost_pct: number;
  lighting_note: string;
  camera_context: string;
}
