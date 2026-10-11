export type TabKey =
  | 'overview'
  | 'map'
  | 'incidents'
  | 'patrols'
  | 'health'
  | 'analytics'
  | 'privacy'
  | 'settings';

export type UserRole = 'operator' | 'admin' | 'resident';

export type PoleStatus = 'Normal' | 'Alert' | 'Degraded' | 'Offline';

export type IncidentStatus =
  | 'New'
  | 'Acknowledged'
  | 'Patrol Assigned'
  | 'Investigating'
  | 'Resolved'
  | 'False Alarm';

export type PriorityLevel = 'Informational' | 'Low' | 'Medium' | 'High';

export type ModuleHealth = 'Online' | 'Degraded' | 'Offline';

export type Pole = {
  id: string;
  name: string;
  zone: string;
  x: number;
  y: number;
  status: PoleStatus;
  lastHeartbeat: string;
  acousticStatus: ModuleHealth;
  lidarStatus: ModuleHealth;
  lightingStatus: string;
  connectivityStatus: 'Stable' | 'Intermittent' | 'Offline';
  coordinates: string;
  batteryLevel?: string;
  description?: string;
};

export type TimelineEntry = {
  time: string;
  status: IncidentStatus;
  note: string;
  actor?: string;
};

export type Incident = {
  id: string;
  createdAt: string;
  poleId: string;
  zone: string;
  eventType: string;
  confidence: number;
  priority: PriorityLevel;
  ruleEvaluated: string;
  reason: string;
  status: IncidentStatus;
  assignedPatrolId?: string;
  timeline: TimelineEntry[];
  resolutionNote?: string;
  isSimulated: true;
};

export type Patrol = {
  id: string;
  name: string;
  callsign: string;
  status: 'Available' | 'Assigned' | 'En Route' | 'Investigating';
  currentIncidentId?: string;
  illustrativeEta: string;
  locationZone: string;
};

export type AuditEntry = {
  id: string;
  timestamp: string;
  actorRole: string;
  action: string;
  incidentId?: string;
  details: string;
};

export type EventCard = {
  id: string;
  timestamp: string;
  poleId: string;
  zone: string;
  type: string;
  confidence: number;
  rule: string;
  outcome: string;
  priority: PriorityLevel;
  summary: string;
};

export type RuleSettings = {
  acousticThreshold: number;
  fallThreshold: number;
  combinedThreshold: number;
  benignThreshold: number;
};

export type RuleOutcome = {
  triggerIncident: boolean;
  priority: PriorityLevel;
  status: IncidentStatus | 'Logged';
  outcome: string;
  reason: string;
  rule: string;
};

export type ScenarioPreset = 'benign' | 'fall' | 'distress' | 'combined' | 'offline';
