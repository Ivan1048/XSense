// API service — wraps all fetch calls to the FastAPI backend.
import type {
  AudioInferenceResult,
  FusionEvaluationResult,
  LidarEvaluationResult,
} from '../types';

// import.meta.env is undefined when this module is bundled for the Node test runner.
const BASE = import.meta.env?.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getAudioSampleFileUrl(sampleId: string): string {
  return `${BASE}/audio/files/${encodeURIComponent(sampleId)}`;
}

// ── Park ─────────────────────────────────────────────────────────────
export const getPark = () =>
  request<{ zones: unknown[]; poles: unknown[] }>('/park');

// ── Incidents ─────────────────────────────────────────────────────────
export const getIncidents = (status?: string) =>
  request<{ incidents: unknown[] }>('/incidents' + (status ? `?status=${status}` : ''));

export const getIncident = (id: string) =>
  request<unknown>(`/incidents/${id}`);

export const acknowledgeIncident = (id: string) =>
  request<unknown>(`/incidents/${id}/acknowledge`, { method: 'POST' });

export const assignIncident = (id: string, guardId: string) =>
  request<unknown>(`/incidents/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ guard_id: guardId }),
  });

export const updateIncidentStatus = (id: string, status: string, note: string) =>
  request<unknown>(`/incidents/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  });

// ── Resident SOS ──────────────────────────────────────────────────────
export interface SOSPayload {
  zone_id?: string;
  pole_id?: string;
  location_shared: boolean;
  approx_lat?: number;
  approx_lng?: number;
}

export const submitSOS = (payload: SOSPayload) =>
  request<{ request_id: string; status: string; message: string }>('/sos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getSOSStatus = (requestId: string) =>
  request<{ request_id: string; status: string }>(`/sos/${requestId}`);

// ── Demo ──────────────────────────────────────────────────────────────
export const triggerDemoEvent = (eventType: string, poleId: string) =>
  request<unknown>('/demo/events', {
    method: 'POST',
    body: JSON.stringify({ event_type: eventType, pole_id: poleId, source_mode: 'simulated' }),
  });

export const setDemoLighting = (poleId: string, brightness: number) =>
  request<unknown>('/demo/lighting', {
    method: 'POST',
    body: JSON.stringify({ pole_id: poleId, brightness }),
  });

// ── Audio Inference (YAMNet) ──────────────────────────────────────────
export interface AudioAnalyzeApiResponse {
  ok: boolean;
  device_id: string;
  zone_id: string;
  pole_id?: string;
  inference: AudioInferenceResult;
}

export const analyzeAudioSample = (
  sampleId: string,
  deviceId = 'AUD-001',
  zoneId = 'north_entrance',
  poleId = 'AS-101',
): Promise<AudioAnalyzeApiResponse> =>
  request<AudioAnalyzeApiResponse>('/audio/analyze-sample', {
    method: 'POST',
    body: JSON.stringify({
      sample_id: sampleId,
      device_id: deviceId,
      zone_id: zoneId,
      pole_id: poleId,
    }),
  });

export async function analyzeLiveAudio(
  wavBlob: Blob,
  deviceId = 'MIC-LIVE',
  zoneId = 'north_entrance',
  poleId = 'AS-101',
): Promise<AudioAnalyzeApiResponse> {
  const formData = new FormData();
  formData.append('audio_file', wavBlob, 'live_mic_capture.wav');
  formData.append('device_id', deviceId);
  formData.append('zone_id', zoneId);
  formData.append('pole_id', poleId);

  const res = await fetch(`${BASE}/audio/analyze-live`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Live audio upload failed (${res.status})`);
  }
  return res.json();
}

// ── LiDAR Kinematic & Spatio-Temporal Fusion Evaluation ───────────────
export interface LidarEvalApiResponse {
  ok: boolean;
  evaluation: LidarEvaluationResult;
}

export const evaluateLidarScenario = (
  scenarioKind: 'standing_stop' | 'bench_sit' | 'silent_fall' | 'occluded_fall',
  deviceId = 'LID-002',
  zoneId = 'west_path',
  poleId = 'AS-104',
  sensorOffline = false,
  routeBlocked = false,
  personPosition?: [number, number],
): Promise<LidarEvalApiResponse> =>
  request<LidarEvalApiResponse>('/lidar/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      scenario_kind: scenarioKind,
      device_id: deviceId,
      zone_id: zoneId,
      pole_id: poleId,
      sensor_offline: sensorOffline,
      route_blocked: routeBlocked,
      person_position: personPosition,
    }),
  });

export interface FusionEvalApiResponse {
  ok: boolean;
  fusion: FusionEvaluationResult;
}

export const evaluateSensorFusion = (
  audioZoneId: string,
  audioPoleId: string,
  lidarZoneId: string,
  lidarPoleId: string,
  timeDeltaSeconds = 4.0,
  routeBlocked = false,
): Promise<FusionEvalApiResponse> =>
  request<FusionEvalApiResponse>('/lidar/fusion', {
    method: 'POST',
    body: JSON.stringify({
      audio_zone_id: audioZoneId,
      audio_pole_id: audioPoleId,
      lidar_zone_id: lidarZoneId,
      lidar_pole_id: lidarPoleId,
      time_delta_seconds: timeDeltaSeconds,
      route_blocked: routeBlocked,
    }),
  });

// ── WebSocket ─────────────────────────────────────────────────────────
export function createWebSocket(onMessage: (data: unknown) => void): WebSocket {
  const wsBase = (import.meta.env.VITE_WS_URL as string) || `ws://${window.location.host}`;
  const ws = new WebSocket(`${wsBase}/ws/updates`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      /* ignore parse errors */
    }
  };
  return ws;
}
