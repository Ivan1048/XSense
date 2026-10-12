import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AlertEvent, Incident, IncidentStatus, LightingMap, Guard, AlertLevel, DispatchedGuardState } from '../types';
import { POLES, ZONES, GUARDS } from '../data/parkData';
import { createInitialEvent } from '../data/mockData';

interface ParkContextType {
  // Incidents
  incidents: Incident[];
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
  acknowledgeIncident: (id: string) => void;
  assignGuard: (id: string, guardId: string) => boolean;
  markArrived: (id: string) => void;
  resolveIncident: (id: string, outcomeNote: string) => void;
  markFalseAlarm: (id: string, reasonNote: string) => void;
  addSOSIncident: (sosData: { zoneId?: string; zoneName?: string; poleId?: string; locationShared: boolean }) => string;

  // Guards
  guards: Guard[];
  dispatchedGuards: DispatchedGuardState[];
  removeDispatchedGuard: (guardId: string) => void;

  // 3D & Lighting State
  selectedPoleId: string;
  setSelectedPoleId: (id: string) => void;
  lighting: LightingMap;
  setPoleLight: (id: string, value: number) => void;
  nightMode: boolean;
  setNightMode: React.Dispatch<React.SetStateAction<boolean>>;
  showCoverage: boolean;
  setShowCoverage: React.Dispatch<React.SetStateAction<boolean>>;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  fallPoleId: string | null;
  offlinePoleId: string | null;
  acousticPoleId: string | null;
  blockedRouteZone: string | null;
  isRaining: boolean;
  resetCounter: number;
  resetView: () => void;

  // Alerts Feed
  events: AlertEvent[];
  addEvent: (title: string, message: string, kind?: AlertEvent['kind'], poleId?: string) => void;

  // Demo Scenarios (Phase 2b full suite)
  triggerSilentFall: () => void;
  triggerScream: () => void;
  triggerCombined: () => void;
  triggerBenignRain: () => void;
  triggerDark: () => void;
  triggerUnsafeRoute: () => void;
  triggerOffline: () => void;
  handleReset: () => void;

  // Metrics
  needsAttentionCount: number;
  darkAreasCount: number;
  sensorsOfflineCount: number;
  activeIncidentsCount: number;
}

const ParkContext = createContext<ParkContextType | undefined>(undefined);

function initialLighting(): LightingMap {
  return Object.fromEntries(POLES.map(p => [p.id, 70]));
}

export const ParkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPoleId, setSelectedPoleId] = useState<string>('AS-103');
  const [lighting, setLighting]             = useState<LightingMap>(initialLighting);
  const [nightMode, setNightMode]           = useState<boolean>(true);
  const [showCoverage, setShowCoverage]     = useState<boolean>(false);
  const [paused, setPaused]                 = useState<boolean>(false);
  const [fallPoleId, setFallPoleId]         = useState<string | null>(null);
  const [offlinePoleId, setOfflinePoleId]   = useState<string | null>(null);
  const [acousticPoleId, setAcousticPoleId] = useState<string | null>(null);
  const [blockedRouteZone, setBlockedRouteZone] = useState<string | null>(null);
  const [isRaining, setIsRaining]           = useState<boolean>(false);
  const [resetCounter, setResetCounter]     = useState<number>(0);
  const [events, setEvents]                 = useState<AlertEvent[]>([createInitialEvent()]);
  const [guards, setGuards]                 = useState<Guard[]>(GUARDS);
  const [dispatchedGuards, setDispatchedGuards] = useState<DispatchedGuardState[]>([]);
  const [incidents, setIncidents]           = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const addEvent = useCallback((
    title:   string,
    message: string,
    kind:    AlertEvent['kind'] = 'info',
    poleId?: string,
  ) => {
    const entry: AlertEvent = {
      id: Date.now() + Math.random(),
      title,
      message,
      at: new Date().toLocaleTimeString(),
      kind,
      poleId,
    };
    setEvents(prev => [entry, ...prev].slice(0, 25));
  }, []);

  const resetView = useCallback(() => {
    setResetCounter(c => c + 1);
  }, []);

  const setPoleLight = useCallback((id: string, value: number) => {
    setLighting(prev => ({ ...prev, [id]: value }));
    if (value < 30) {
      const pole = POLES.find(p => p.id === id);
      addEvent(
        `Low Lighting — ${id}`,
        `SIMULATED: Virtual brightness below demo threshold at ${pole?.name}. This is not a measured lux value.`,
        'warning',
        id,
      );
    }
  }, [addEvent]);

  // ── Phase 2b: Complete Scenario Suite & Alert Rules ─────────────────

  // 1. Silent Possible Fall (AS-104) — Rule: Reviewable without audio
  const triggerSilentFall = useCallback(() => {
    setFallPoleId('AS-104');
    setSelectedPoleId('AS-104');

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'west_path',
      zoneName: 'West Loop',
      poleId: 'AS-104',
      type: 'silent_fall',
      displayType: 'Silent Possible Fall',
      priority: 'needs_review',
      status: 'open',
      reason: 'SIMULATED: Persistent stationary detection for 45s following abrupt deceleration. No audio detected.',
      sourceMode: 'simulated',
      score: 0.78,
      activityTrail: [
        { time: now, action: 'Depth/position change anomaly flagged by motion algorithm', actor: 'System (Simulated)' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);

    addEvent(
      'Possible Fall — West Loop · AS-104',
      'SIMULATED: Depth/position change anomaly. Stationary dot for 45s. Guard review required (silent fall rule applied).',
      'warning',
      'AS-104',
    );
  }, [addEvent]);

  // 2. Possible Scream / Acoustic Anomaly (AS-101) — Needs Review
  const triggerScream = useCallback(() => {
    setAcousticPoleId('AS-101');
    setSelectedPoleId('AS-101');

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'north_entrance',
      zoneName: 'North Entrance',
      poleId: 'AS-101',
      type: 'acoustic_scream',
      displayType: 'Possible Distress Sound',
      priority: 'needs_review',
      status: 'open',
      reason: 'SIMULATED: Acoustic classifier matched scream/distress signature (confidence 0.84, YAMNet profile).',
      sourceMode: 'recorded',
      score: 0.84,
      activityTrail: [
        { time: now, action: 'Acoustic waveform matched distress scream pattern', actor: 'Acoustic Classifier (Recorded)' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);

    addEvent(
      'Acoustic Anomaly — North Entrance · AS-101',
      'SIMULATED: Acoustic pattern classified as possible scream (score 0.84). Needs review; source visible.',
      'warning',
      'AS-101',
    );
  }, [addEvent]);

  // 3. Combined Anomaly (Sound + Fall at AS-104) — Escalates to Urgent
  const triggerCombined = useCallback(() => {
    setFallPoleId('AS-104');
    setAcousticPoleId('AS-104');
    setSelectedPoleId('AS-104');

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'west_path',
      zoneName: 'West Loop',
      poleId: 'AS-104',
      type: 'combined_anomaly',
      displayType: 'Combined Anomaly (Sound + Fall)',
      priority: 'urgent',
      status: 'open',
      reason: 'SIMULATED: Distress audio signal (score 0.88) corroborated with stationary depth anomaly at AS-104. Multi-modal alert.',
      sourceMode: 'simulated',
      score: 0.94,
      activityTrail: [
        { time: now, action: 'Co-located acoustic distress and stationary motion signals corroborated', actor: 'Multi-Sensor Fusion' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);

    addEvent(
      '🚨 Combined Anomaly — West Loop · AS-104',
      'SIMULATED: Urgent corroboration — possible distress sound plus fall detected at West Loop. Immediate guard check advised.',
      'urgent',
      'AS-104',
    );
  }, [addEvent]);

  // 4. Benign Rain / Noise — Rule: No emergency case, telemetry log only
  const triggerBenignRain = useCallback(() => {
    setIsRaining(prev => !prev);

    addEvent(
      'Benign Acoustic Event — Ambient Rain',
      'SIMULATED: Acoustic telemetry classified ambient precipitation & foliage noise (confidence 0.92 benign). Normal overview maintained.',
      'info',
      'AS-102',
    );
  }, [addEvent]);

  // 5. Dark Pathway (AS-102) — Lighting Warning
  const triggerDark = useCallback(() => {
    setPoleLight('AS-102', 0);
    setSelectedPoleId('AS-102');

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'lakeside_path',
      zoneName: 'Lakeside Path',
      poleId: 'AS-102',
      type: 'lighting_warning',
      displayType: 'Low Lighting Warning',
      priority: 'lighting_warning',
      status: 'open',
      reason: 'SIMULATED: Virtual pathway brightness dropped to 0% at Lakeside Path.',
      sourceMode: 'simulated',
      activityTrail: [
        { time: now, action: 'Virtual lighting threshold warning triggered', actor: 'System (Simulated)' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);
  }, [setPoleLight]);

  // 6. Unsafe Route / Blocked Path (Central Path)
  const triggerUnsafeRoute = useCallback(() => {
    const isCurrentlyBlocked = blockedRouteZone === 'central_path';
    const newBlockedState = isCurrentlyBlocked ? null : 'central_path';
    setBlockedRouteZone(newBlockedState);

    if (newBlockedState) {
      const incidentId = `INC-${Date.now().toString().slice(-4)}`;
      const now = new Date().toLocaleTimeString();

      const newIncident: Incident = {
        id: incidentId,
        createdAt: now,
        zoneId: 'central_path',
        zoneName: 'Central Path',
        poleId: 'AS-103',
        type: 'route_blocked',
        displayType: 'Unsafe Route — Path Blocked',
        priority: 'coverage_warning',
        status: 'open',
        reason: 'SIMULATED: Path obstruction / maintenance hazard on Central Path. Route marked closed; diverted to West Loop.',
        sourceMode: 'simulated',
        activityTrail: [
          { time: now, action: 'Central Path marked blocked in simulated safety routing system', actor: 'Routing Engine' },
        ],
      };

      setIncidents(prev => [newIncident, ...prev]);
      setSelectedIncidentId(incidentId);

      addEvent(
        'Route Notice — Central Path Blocked',
        'SIMULATED: Central Path route closed due to simulated hazard. Safe pedestrian route diversion advised.',
        'warning',
        'AS-103',
      );
    } else {
      addEvent('Route Cleared — Central Path', 'Central Path route reopened to normal pedestrian flow.', 'success');
    }
  }, [blockedRouteZone, addEvent]);

  // 7. Sensor Offline (AS-103) — Coverage Warning
  const triggerOffline = useCallback(() => {
    setOfflinePoleId('AS-103');
    setSelectedPoleId('AS-103');

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'central_path',
      zoneName: 'Central Path',
      poleId: 'AS-103',
      type: 'sensor_offline',
      displayType: 'Sensor Offline',
      priority: 'coverage_warning',
      status: 'open',
      reason: 'SIMULATED: AS-103 missed 3 consecutive telemetry heartbeats. Sensor coverage degraded.',
      sourceMode: 'simulated',
      activityTrail: [
        { time: now, action: 'Sensor heartbeat failure detected', actor: 'System (Simulated)' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);

    addEvent(
      'Sensor Offline — Central Path · AS-103',
      'SIMULATED: AS-103 missed heartbeat. Monitoring may be unavailable in this area. Coverage Warning.',
      'warning',
      'AS-103',
    );
  }, [addEvent]);

  // 8. Reset All Scenarios
  const handleReset = useCallback(() => {
    setLighting(initialLighting());
    setFallPoleId(null);
    setOfflinePoleId(null);
    setAcousticPoleId(null);
    setBlockedRouteZone(null);
    setIsRaining(false);
    setSelectedPoleId('AS-103');
    setResetCounter(c => c + 1);
    setIncidents([]);
    setSelectedIncidentId(null);
    setGuards(GUARDS);
    setDispatchedGuards([]);
    addEvent('Demo Reset', 'All simulation events and incidents cleared. Lighting and sensors restored.', 'success');
  }, [addEvent]);

  // ── SOS Incident Creation ───────────────────────────────────────────
  const addSOSIncident = useCallback((sosData: { zoneId?: string; zoneName?: string; poleId?: string; locationShared: boolean }): string => {
    const incidentId = `SOS-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();
    const zoneName = sosData.zoneName || (sosData.zoneId ? ZONES.find(z => z.id === sosData.zoneId)?.name : 'General Park Area') || 'Unknown Location';

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: sosData.zoneId || 'unknown',
      zoneName,
      poleId: sosData.poleId || 'N/A',
      type: 'resident_sos',
      displayType: 'Resident SOS Call',
      priority: 'urgent',
      status: 'open',
      reason: `SIMULATED: Resident triggered emergency request via QR portal (${sosData.locationShared ? 'Location Shared' : 'General Request'}).`,
      sourceMode: 'simulated',
      activityTrail: [
        { time: now, action: `SOS request received from resident (${zoneName})`, actor: 'Resident Portal' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);

    addEvent(
      `🚨 Resident SOS — ${zoneName}`,
      `SIMULATED: Emergency assistance requested at ${zoneName}. Guard response needed immediately.`,
      'urgent',
      sosData.poleId,
    );

    return incidentId;
  }, [addEvent]);

  // ── Incident Lifecycle Transitions ──────────────────────────────────
  const acknowledgeIncident = useCallback((id: string) => {
    const now = new Date().toLocaleTimeString();
    setIncidents(prev => prev.map(inc => {
      if (inc.id !== id) return inc;
      return {
        ...inc,
        status: inc.status === 'open' ? 'acknowledged' : inc.status,
        activityTrail: [
          ...inc.activityTrail,
          { time: now, action: 'Incident acknowledged by guard console', actor: 'Guard Station' },
        ],
      };
    }));
  }, []);

  const assignGuard = useCallback((id: string, guardId: string): boolean => {
    const now = new Date().toLocaleTimeString();
    const guard = guards.find(g => g.id === guardId);
    if (!guard) return false;

    const targetIncident = incidents.find(i => i.id === id);
    const targetPole = targetIncident ? POLES.find(p => p.id === targetIncident.poleId) : undefined;
    const targetPos: [number, number] = targetPole ? targetPole.position : [0, 0];

    setIncidents(prev => prev.map(inc => {
      if (inc.id !== id) return inc;
      return {
        ...inc,
        status: 'assigned',
        assignedGuardId: guardId,
        activityTrail: [
          ...inc.activityTrail,
          { time: now, action: `Dispatched to ${guard.displayName} (${guard.role})`, actor: guard.displayName },
        ],
      };
    }));

    // Update 3D dispatched officers registry
    setDispatchedGuards(prev => {
      const remaining = prev.filter(dg => dg.incidentId !== id && dg.guardId !== guardId);
      return [
        ...remaining,
        {
          guardId,
          guardName: guard.displayName,
          incidentId: id,
          targetPoleId: targetIncident?.poleId || '',
          targetPos,
          status: 'traveling',
        },
      ];
    });

    setGuards(prev => prev.map(g => (g.id === guardId ? { ...g, availability: 'busy' } : g)));
    return true;
  }, [guards, incidents]);

  const markArrived = useCallback((id: string) => {
    const now = new Date().toLocaleTimeString();
    setIncidents(prev => prev.map(inc => {
      if (inc.id !== id) return inc;
      const guard = guards.find(g => g.id === inc.assignedGuardId);
      const actorName = guard?.displayName || 'Responding Guard';
      return {
        ...inc,
        status: 'investigating',
        activityTrail: [
          ...inc.activityTrail,
          { time: now, action: `${actorName} arrived on scene — investigating`, actor: actorName },
        ],
      };
    }));

    // Update officer position status in 3D scene to arrived
    setDispatchedGuards(prev => prev.map(dg =>
      dg.incidentId === id ? { ...dg, status: 'arrived' } : dg
    ));
  }, [guards]);

  const resolveIncident = useCallback((id: string, outcomeNote: string) => {
    const now = new Date().toLocaleTimeString();
    let assignedId: string | undefined;

    setIncidents(prev => prev.map(inc => {
      if (inc.id !== id) return inc;
      assignedId = inc.assignedGuardId;
      return {
        ...inc,
        status: 'resolved',
        activityTrail: [
          ...inc.activityTrail,
          { time: now, action: `Resolved: ${outcomeNote}`, actor: 'Guard Station' },
        ],
      };
    }));

    // Dispatch officer back to Security Station
    setDispatchedGuards(prev => prev.map(dg =>
      dg.incidentId === id ? { ...dg, status: 'returning' } : dg
    ));

    if (assignedId) {
      setGuards(prev => prev.map(g => (g.id === assignedId ? { ...g, availability: 'available' } : g)));
    }

    addEvent('Incident Resolved', `Case ${id} marked resolved: ${outcomeNote}`, 'success');
  }, [addEvent]);

  const markFalseAlarm = useCallback((id: string, reasonNote: string) => {
    const now = new Date().toLocaleTimeString();
    let assignedId: string | undefined;

    setIncidents(prev => prev.map(inc => {
      if (inc.id !== id) return inc;
      assignedId = inc.assignedGuardId;
      return {
        ...inc,
        status: 'false_alarm',
        activityTrail: [
          ...inc.activityTrail,
          { time: now, action: `Closed as False Alarm: ${reasonNote}`, actor: 'Guard Station' },
        ],
      };
    }));

    // Dispatch officer back to Security Station
    setDispatchedGuards(prev => prev.map(dg =>
      dg.incidentId === id ? { ...dg, status: 'returning' } : dg
    ));

    if (assignedId) {
      setGuards(prev => prev.map(g => (g.id === assignedId ? { ...g, availability: 'available' } : g)));
    }

    addEvent('False Alarm Recorded', `Case ${id} marked false alarm: ${reasonNote}`, 'info');
  }, [addEvent]);

  const removeDispatchedGuard = useCallback((guardId: string) => {
    setDispatchedGuards(prev => prev.filter(dg => dg.guardId !== guardId));
  }, []);

  // ── Derived Metrics ─────────────────────────────────────────────────
  const darkAreasCount = useMemo(() => {
    return POLES.filter(p => p.id !== offlinePoleId && (lighting[p.id] ?? 70) < 30).length;
  }, [lighting, offlinePoleId]);

  const needsAttentionCount = useMemo(() => {
    const activeUrgent = incidents.filter(i => i.status !== 'resolved' && i.status !== 'false_alarm').length;
    return activeUrgent + darkAreasCount;
  }, [incidents, darkAreasCount]);

  const sensorsOfflineCount = offlinePoleId ? 1 : 0;

  const activeIncidentsCount = useMemo(() => {
    return incidents.filter(i => i.status !== 'resolved' && i.status !== 'false_alarm').length;
  }, [incidents]);

  const value = {
    incidents,
    selectedIncidentId,
    setSelectedIncidentId,
    acknowledgeIncident,
    assignGuard,
    markArrived,
    resolveIncident,
    markFalseAlarm,
    addSOSIncident,
    guards,
    dispatchedGuards,
    removeDispatchedGuard,
    selectedPoleId,
    setSelectedPoleId,
    lighting,
    setPoleLight,
    nightMode,
    setNightMode,
    showCoverage,
    setShowCoverage,
    paused,
    setPaused,
    fallPoleId,
    offlinePoleId,
    acousticPoleId,
    blockedRouteZone,
    isRaining,
    resetCounter,
    resetView,
    events,
    addEvent,
    triggerSilentFall,
    triggerScream,
    triggerCombined,
    triggerBenignRain,
    triggerDark,
    triggerUnsafeRoute,
    triggerOffline,
    handleReset,
    needsAttentionCount,
    darkAreasCount,
    sensorsOfflineCount,
    activeIncidentsCount,
  };

  return <ParkContext.Provider value={value}>{children}</ParkContext.Provider>;
};

export function usePark(): ParkContextType {
  const ctx = useContext(ParkContext);
  if (!ctx) {
    throw new Error('usePark must be used within a ParkProvider');
  }
  return ctx;
}
