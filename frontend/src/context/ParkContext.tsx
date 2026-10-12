import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AlertEvent, Incident, IncidentStatus, LightingMap, Guard, AlertLevel } from '../types';
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
  resetCounter: number;
  resetView: () => void;

  // Alerts Feed
  events: AlertEvent[];
  addEvent: (title: string, message: string, kind?: AlertEvent['kind'], poleId?: string) => void;

  // Demo Scenarios
  triggerFall: () => void;
  triggerDark: () => void;
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
  const [resetCounter, setResetCounter]     = useState<number>(0);
  const [events, setEvents]                 = useState<AlertEvent[]>([createInitialEvent()]);
  const [guards, setGuards]                 = useState<Guard[]>(GUARDS);
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
    setEvents(prev => [entry, ...prev].slice(0, 20));
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

  // ── Demo Scenario Triggers ──────────────────────────────────────────
  const triggerFall = useCallback(() => {
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
      type: 'possible_fall',
      displayType: 'Possible Fall',
      priority: 'urgent',
      status: 'open',
      reason: 'SIMULATED: Dot stopped moving for 45s following sudden deceleration. Visual check advised.',
      sourceMode: 'simulated',
      activityTrail: [
        { time: now, action: 'Anomaly flagged by movement simulation', actor: 'System (Simulated)' },
      ],
    };

    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncidentId(incidentId);

    addEvent(
      'Possible Fall — West Loop · AS-104',
      'SIMULATED: Unusual movement detected. A dot stopping does not prove a fall. Guard review required.',
      'urgent',
      'AS-104',
    );
  }, [addEvent]);

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

  const handleReset = useCallback(() => {
    setLighting(initialLighting());
    setFallPoleId(null);
    setOfflinePoleId(null);
    setSelectedPoleId('AS-103');
    setResetCounter(c => c + 1);
    setIncidents([]);
    setSelectedIncidentId(null);
    setGuards(GUARDS);
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

    // Update incident
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

    // Update guard availability to busy
    setGuards(prev => prev.map(g => (g.id === guardId ? { ...g, availability: 'busy' } : g)));
    return true;
  }, [guards]);

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

    // Free up assigned guard if any
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

    // Free up assigned guard if any
    if (assignedId) {
      setGuards(prev => prev.map(g => (g.id === assignedId ? { ...g, availability: 'available' } : g)));
    }

    addEvent('False Alarm Recorded', `Case ${id} marked false alarm: ${reasonNote}`, 'info');
  }, [addEvent]);

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
    resetCounter,
    resetView,
    events,
    addEvent,
    triggerFall,
    triggerDark,
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
