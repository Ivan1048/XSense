import type { Incident } from '../types/index';

const FOCUS_TYPES = new Set(['resident_sos', 'silent_fall', 'possible_scream', 'combined_anomaly']);

export function alertFocusKey(incident: Incident): string {
  return `${incident.type}:${incident.priority}:${incident.poleId}`;
}

/** Only new alerts or changed alert severity/location should interrupt map navigation. */
export function nextFocusAlert(
  incidents: Incident[],
  previous: ReadonlyMap<string, string>,
): Incident | undefined {
  return incidents
    .filter((incident) =>
      incident.status !== 'resolved' && incident.status !== 'false_alarm' &&
      FOCUS_TYPES.has(incident.type) &&
      (incident.priority === 'urgent' || incident.priority === 'needs_review') &&
      previous.get(incident.id) !== alertFocusKey(incident),
    )
    // Preserve the incident feed's newest-first order within each priority.
    .sort((a, b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent'))[0];
}
