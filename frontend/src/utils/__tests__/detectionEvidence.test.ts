import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendCaptureSample, captureIsDue, clearDetectionEvidence, finishCapture,
  getEvidenceSnapshot, MAX_CAPTURE_SAMPLES, rememberAudio, selectEvidence,
  startCapture,
} from '../detectionEvidence.ts';

const sample = { heightM: 1.72, speedMps: 0.5, action: 'walk', coverage: [] };
const audio = (label: string) => ({
  sample_id: label, source_mode: 'recorded' as const, event_type: 'normal', priority: 'normal' as const,
  plain_label: label, plain_reason: 'Recorded test', distress_score: 0.1, benign_score: 0.9,
  duration_sec: 3, top_classes: [{ class_name: 'Rain', score: 0.9 }],
});

test('only the requested visitor is sampled, at a bounded frequency and duration', () => {
  clearDetectionEvidence(); startCapture(0, 0);
  appendCaptureSample(1, 0, sample);
  assert.equal((getEvidenceSnapshot().entries[0] as any).samples.length, 0);
  appendCaptureSample(0, 0, sample);
  appendCaptureSample(0, 100, sample);
  assert.equal((getEvidenceSnapshot().entries[0] as any).samples.length, 1);
  for (let time = 200; time <= 30_000; time += 200) appendCaptureSample(0, time, sample);
  const entry = getEvidenceSnapshot().entries[0];
  assert.equal(entry.kind, 'capture');
  if (entry.kind !== 'capture') return;
  assert.equal(entry.samples.length, MAX_CAPTURE_SAMPLES);
  assert.equal(entry.finished, true);
  assert.equal(getEvidenceSnapshot().capture, null);
  appendCaptureSample(0, 31_000, sample);
  assert.equal(entry.samples.length, MAX_CAPTURE_SAMPLES);
});

test('stopping preserves a selected trace across navigation and prevents later samples', () => {
  clearDetectionEvidence(); startCapture(2, 1000);
  const id = getEvidenceSnapshot().selectedId;
  appendCaptureSample(2, 1000, sample);
  rememberAudio(audio('rain.wav'));
  finishCapture(1);
  assert.ok(getEvidenceSnapshot().capture);
  finishCapture(2);
  assert.equal(getEvidenceSnapshot().selectedId, id);
  assert.equal(captureIsDue(2, 1500), false);
  selectEvidence(id);
  assert.equal(getEvidenceSnapshot().selectedId, id);
});

test('result history is bounded and does not evict an ongoing capture', () => {
  clearDetectionEvidence(); startCapture(0, 0);
  const id = getEvidenceSnapshot().selectedId;
  for (let i = 0; i < 30; i++) rememberAudio(audio(`sample-${i}`));
  assert.equal(getEvidenceSnapshot().entries.length, 12);
  assert.ok(getEvidenceSnapshot().entries.some(entry => entry.id === id));
  appendCaptureSample(0, 200, sample);
  finishCapture();
  const capture = getEvidenceSnapshot().entries.find(entry => entry.id === id);
  assert.equal(capture?.kind === 'capture' && capture.samples.length, 1);
});

test('summary objects are deduplicated; clear removes summaries and capture data', () => {
  clearDetectionEvidence();
  const result = audio('once.wav');
  rememberAudio(result); rememberAudio(result);
  assert.equal(getEvidenceSnapshot().entries.length, 1);
  startCapture(0, 0);
  appendCaptureSample(0, 0, { ...sample, speedMps: null });
  clearDetectionEvidence();
  assert.deepEqual(getEvidenceSnapshot(), { entries: [], selectedId: '', capture: null });
});

test('invalid values are rejected and duration limit does not invent missing samples', () => {
  clearDetectionEvidence(); startCapture(0, 0);
  appendCaptureSample(0, 0, { ...sample, heightM: NaN });
  appendCaptureSample(0, 0, { ...sample, speedMps: -1 });
  assert.equal((getEvidenceSnapshot().entries[0] as any).samples.length, 0);
  appendCaptureSample(0, 0, sample);
  assert.equal(captureIsDue(0, 31_000), false);
  const entry = getEvidenceSnapshot().entries[0];
  assert.equal(entry.kind === 'capture' && entry.samples.length, 1);
  assert.equal(entry.kind === 'capture' && entry.finished, true);
});
