// API service — wraps all fetch calls to the FastAPI backend.
// Phase 1 & 2: data is managed in component state (mock).
// Phase 3: these functions will be called from components.

const BASE = import.meta.env.VITE_API_URL || '/api';

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
  zone_id?:       string;
  pole_id?:       string;
  location_shared: boolean;
  approx_lat?:    number;
  approx_lng?:    number;
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

// ── WebSocket ─────────────────────────────────────────────────────────
export function createWebSocket(onMessage: (data: unknown) => void): WebSocket {
  const wsBase = (import.meta.env.VITE_WS_URL as string) || `ws://${window.location.host}`;
  const ws = new WebSocket(`${wsBase}/ws/updates`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); }
    catch { /* ignore parse errors */ }
  };
  return ws;
}
