// StatusLabel — maps internal alert/status codes to plain-English badge labels.
// Per requirements: avoid engineering jargon in visible UI text.
import type { AlertLevel, SensorStatus, SourceMode, IncidentStatus } from '../types';

type LabelKey = AlertLevel | SensorStatus | SourceMode | IncidentStatus | string;

interface Config { label: string; className: string; }

const LABEL_MAP: Record<string, Config> = {
  // Alert levels
  normal:           { label: 'Normal',          className: 'badge badge-normal' },
  low:              { label: 'Low',              className: 'badge badge-low' },
  needs_review:     { label: 'Needs Review',     className: 'badge badge-needs-review' },
  urgent:           { label: 'Urgent',           className: 'badge badge-urgent' },
  coverage_warning: { label: 'Coverage Warning', className: 'badge badge-coverage' },
  lighting_warning: { label: 'Low Lighting',     className: 'badge badge-lighting' },
  // Sensor status
  online:           { label: 'Online',           className: 'badge badge-normal' },
  needs_attention:  { label: 'Needs Attention',  className: 'badge badge-needs-review' },
  offline:          { label: 'Offline',          className: 'badge badge-coverage' },
  // Source mode (provenance)
  simulated:        { label: 'Simulated',        className: 'badge badge-simulated' },
  recorded:         { label: 'Recorded Sample',  className: 'badge badge-simulated' },
  live:             { label: 'Live Input',        className: 'badge badge-urgent' },
  // Incident status
  open:             { label: 'Open',             className: 'badge badge-needs-review' },
  acknowledged:     { label: 'Acknowledged',     className: 'badge badge-low' },
  assigned:         { label: 'Guard Assigned',   className: 'badge badge-low' },
  investigating:    { label: 'Investigating',    className: 'badge badge-low' },
  resolved:         { label: 'Resolved',         className: 'badge badge-normal' },
  false_alarm:      { label: 'False Alarm',      className: 'badge badge-simulated' },
};

interface StatusLabelProps {
  level: LabelKey;
}

export default function StatusLabel({ level }: StatusLabelProps) {
  const cfg = LABEL_MAP[level] ?? { label: level, className: 'badge badge-simulated' };
  return <span className={cfg.className}>{cfg.label}</span>;
}
