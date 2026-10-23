import type { AudioInferenceResult, LidarEvaluationResult } from '../types';
import type { SingleSensorEvaluation } from './lidarGeometry';

export interface CaptureSample {
  seconds: number;
  heightM: number;
  speedMps: number | null;
  action: string;
  coverage: SingleSensorEvaluation[];
}
interface EvidenceBase { id: string; createdAt: string; label: string }
export type Evidence =
  | (EvidenceBase & { kind: 'audio'; result: AudioInferenceResult })
  | (EvidenceBase & { kind: 'lidar'; result: LidarEvaluationResult })
  | (EvidenceBase & { kind: 'capture'; visitorIndex: number; samples: CaptureSample[]; finished: boolean });
interface Snapshot {
  entries: Evidence[];
  selectedId: string;
  capture: { id: string; visitorIndex: number; startedMs: number; lastSampleMs: number } | null;
}
const MAX_ENTRIES = 12;
export const CAPTURE_DURATION_MS = 30_000;
export const CAPTURE_INTERVAL_MS = 200;
export const MAX_CAPTURE_SAMPLES = 151;
let snapshot: Snapshot = { entries: [], selectedId: '', capture: null };
let nextId = 0;
let seen = new WeakSet<object>();
const listeners = new Set<() => void>();
function publish(next: Snapshot) { snapshot = next; listeners.forEach(listener => listener()); }
export const getEvidenceSnapshot = () => snapshot;
export const subscribeEvidence = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function selectEvidence(selectedId: string) { publish({ ...snapshot, selectedId }); }
function add(entry: Evidence) {
  // Preserve an active capture if other result types arrive during recording.
  const entries = [entry, ...snapshot.entries].slice(0, MAX_ENTRIES);
  if (snapshot.capture && !entries.some(item => item.id === snapshot.capture!.id)) {
    const active = snapshot.entries.find(item => item.id === snapshot.capture!.id);
    if (active) entries[entries.length - 1] = active;
  }
  publish({ ...snapshot, entries, selectedId: entry.id });
}
export function rememberAudio(result: AudioInferenceResult | null) {
  if (!result || seen.has(result)) return;
  seen.add(result);
  add({ id: `audio-${++nextId}`, kind: 'audio', createdAt: new Date().toLocaleTimeString(), label: result.sample_id, result });
}
export function rememberLidar(result: LidarEvaluationResult | null) {
  if (!result || seen.has(result)) return;
  seen.add(result);
  add({ id: `lidar-${++nextId}`, kind: 'lidar', createdAt: new Date().toLocaleTimeString(), label: result.plain_label, result });
}
export function finishCapture(visitorIndex?: number) {
  const capture = snapshot.capture;
  if (!capture || (visitorIndex !== undefined && capture.visitorIndex !== visitorIndex)) return;
  publish({ ...snapshot, selectedId: capture.id, capture: null, entries: snapshot.entries.map(entry =>
    entry.id === capture.id && entry.kind === 'capture' ? { ...entry, finished: true } : entry),
  });
}
export function startCapture(visitorIndex: number, nowMs = performance.now()) {
  if (!Number.isInteger(visitorIndex) || visitorIndex < 0 || visitorIndex > 4) return;
  finishCapture();
  const id = `capture-${++nextId}`;
  add({ id, kind: 'capture', label: `Visitor #${visitorIndex + 1} simulation capture`, createdAt: new Date().toLocaleTimeString(), visitorIndex, samples: [], finished: false });
  publish({ ...snapshot, capture: { id, visitorIndex, startedMs: nowMs, lastSampleMs: -Infinity } });
}
export function captureIsDue(visitorIndex: number, nowMs: number) {
  const capture = snapshot.capture;
  if (!capture || capture.visitorIndex !== visitorIndex) return false;
  if (nowMs - capture.startedMs > CAPTURE_DURATION_MS) { finishCapture(visitorIndex); return false; }
  return nowMs - capture.lastSampleMs >= CAPTURE_INTERVAL_MS;
}
export function appendCaptureSample(visitorIndex: number, nowMs: number, sample: Omit<CaptureSample, 'seconds'>) {
  if (!captureIsDue(visitorIndex, nowMs)) return;
  if (!Number.isFinite(sample.heightM) || sample.heightM < 0 || (sample.speedMps !== null && (!Number.isFinite(sample.speedMps) || sample.speedMps < 0))) return;
  const capture = snapshot.capture!;
  const item: CaptureSample = { ...sample, seconds: (nowMs - capture.startedMs) / 1000 };
  const entries = snapshot.entries.map(entry => entry.id === capture.id && entry.kind === 'capture'
    ? { ...entry, samples: [...entry.samples, item].slice(0, MAX_CAPTURE_SAMPLES) } : entry);
  publish({ ...snapshot, entries, capture: { ...capture, lastSampleMs: nowMs } });
  const entry = entries.find(entry => entry.id === capture.id);
  if (entry?.kind === 'capture' && entry.samples.length >= MAX_CAPTURE_SAMPLES) finishCapture(visitorIndex);
}
export function clearDetectionEvidence() {
  seen = new WeakSet<object>();
  publish({ entries: [], selectedId: '', capture: null });
}
