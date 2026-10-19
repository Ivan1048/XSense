import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertFocusKey, nextFocusAlert } from './alertFocus.ts';

const fall = { id: 'fall', type: 'silent_fall', priority: 'needs_review', status: 'open', poleId: 'AS-104' };
const sos = { ...fall, id: 'sos', type: 'resident_sos', priority: 'urgent', poleId: 'AS-101' };
const seen = new Map([[fall.id, alertFocusKey(fall)]]);

test('new fall and SOS alerts qualify; urgent wins a simultaneous batch', () => {
  assert.equal(nextFocusAlert([fall], new Map()), fall);
  assert.equal(nextFocusAlert([fall, sos], new Map()), sos);
});
test('routine acknowledgement, dispatch and repeated observations do not refocus', () => {
  for (const status of ['open', 'acknowledged', 'assigned', 'investigating']) {
    assert.equal(nextFocusAlert([{ ...fall, status, occurrenceCount: 2 }], seen), undefined);
  }
});
test('escalation and changed location refocus an existing incident', () => {
  assert.ok(nextFocusAlert([{ ...fall, priority: 'urgent' }], seen));
  assert.ok(nextFocusAlert([{ ...fall, poleId: 'AS-105' }], seen));
});
test('closed, benign and infrastructure incidents never move the camera', () => {
  for (const status of ['resolved', 'false_alarm']) {
    assert.equal(nextFocusAlert([{ ...sos, status }], new Map()), undefined);
  }
  for (const type of ['benign_stop', 'sensor_offline', 'lighting_warning', 'route_blocked']) {
    assert.equal(nextFocusAlert([{ ...fall, type }], new Map()), undefined);
  }
});
test('distress and combined signals qualify; normal results do not', () => {
  for (const type of ['possible_scream', 'combined_anomaly']) {
    assert.ok(nextFocusAlert([{ ...fall, type }], new Map()));
  }
  assert.equal(nextFocusAlert([{ ...fall, priority: 'normal' }], new Map()), undefined);
});
