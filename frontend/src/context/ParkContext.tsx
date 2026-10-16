import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type {
  AlertEvent,
  AudioInferenceResult,
  DispatchedGuardState,
  Guard,
  Incident,
  LidarEvaluationResult,
  LightingMap,
} from '../types';
import { POLES, ZONES, GUARDS } from '../data/parkData';
import { createInitialEvent } from '../data/mockData';
import {
  analyzeAudioSample,
  analyzeLiveAudio,
  evaluateLidarScenario,
  evaluateSensorFusion,
} from '../services/api';

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
  lightingNote: string;
  nightMode: boolean;
  setNightMode: React.Dispatch<React.SetStateAction<boolean>>;
  showCoverage: boolean;
  setShowCoverage: React.Dispatch<React.SetStateAction<boolean>>;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  fallPoleId: string | null;
  sosPoleId: string | null;
  isLookalikeStop: boolean;
  offlinePoleId: string | null;
  acousticPoleId: string | null;
  blockedRouteZone: string | null;
  isRaining: boolean;
  resetCounter: number;
  resetView: () => void;

  // Latest AI Evaluation Telemetry
  latestAudioInference: AudioInferenceResult | null;
  latestLidarEval: LidarEvaluationResult | null;
  clearLatestResults: () => void;

  // Alerts Feed
  events: AlertEvent[];
  addEvent: (
    title: string,
    message: string,
    kind?: AlertEvent['kind'],
    poleId?: string,
    details?: AlertEvent['details'],
  ) => void;

  // Demo Scenarios
  triggerSilentFall: () => Promise<LidarEvaluationResult>;
  triggerStandingStopLookalike: () => Promise<LidarEvaluationResult>;
  triggerScream: () => void;
  triggerCombined: () => Promise<void>;
  triggerUnrelatedSignals: () => Promise<void>;
  triggerRecordedAudio: (sampleId: string) => Promise<AudioInferenceResult>;
  triggerLiveMic: (wavBlob: Blob) => Promise<AudioInferenceResult>;
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
  return Object.fromEntries(POLES.map((p) => [p.id, 70]));
}

export const ParkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPoleId, setSelectedPoleId] = useState<string>('AS-103');
  const [lighting, setLighting] = useState<LightingMap>(initialLighting);
  const [lightingNote, setLightingNote] = useState<string>('');
  const [nightMode, setNightMode] = useState<boolean>(true);
  const [showCoverage, setShowCoverage] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [fallPoleId, setFallPoleId] = useState<string | null>(null);
  const [sosPoleId, setSosPoleId] = useState<string | null>(null);
  const [isLookalikeStop, setIsLookalikeStop] = useState<boolean>(false);
  const [offlinePoleId, setOfflinePoleId] = useState<string | null>(null);
  const [acousticPoleId, setAcousticPoleId] = useState<string | null>(null);
  const [blockedRouteZone, setBlockedRouteZone] = useState<string | null>(null);
  const [isRaining, setIsRaining] = useState<boolean>(false);
  const [resetCounter, setResetCounter] = useState<number>(0);
  const [events, setEvents] = useState<AlertEvent[]>([createInitialEvent()]);
  const [guards, setGuards] = useState<Guard[]>(GUARDS);
  const [dispatchedGuards, setDispatchedGuards] = useState<DispatchedGuardState[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Multi-tab real-time synchronization for side-by-side Resident SOS & Guard Console demo
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('xsense_state_sync');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'SYNC_INCIDENTS' && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
      }
      if (data.type === 'SYNC_GUARDS' && Array.isArray(data.guards)) {
        setGuards(data.guards);
      }
      if (data.type === 'SYNC_DISPATCHED' && Array.isArray(data.dispatchedGuards)) {
        setDispatchedGuards(data.dispatchedGuards);
      }
      if (data.type === 'SOS_CREATED' && data.incident) {
        const inc = data.incident as Incident;
        setIncidents((prev) => {
          if (prev.some((i) => i.id === inc.id)) return prev;
          return [inc, ...prev];
        });
        setSelectedIncidentId(inc.id);
        if (inc.poleId && inc.poleId !== 'N/A') {
          setSosPoleId(inc.poleId);
          setSelectedPoleId(inc.poleId);
          setLighting((prev) => ({ ...prev, [inc.poleId]: 100 }));
          setLightingNote(inc.lightingResponseNote || `Nearby Lights On — SOS pole ${inc.poleId} illuminated to 100%.`);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Broadcast incident and guard updates to any open Resident SOS tab
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('xsense_state_sync');
    channel.postMessage({ type: 'SYNC_INCIDENTS', incidents });
    channel.postMessage({ type: 'SYNC_GUARDS', guards });
    channel.postMessage({ type: 'SYNC_DISPATCHED', dispatchedGuards });
    return () => {
      channel.close();
    };
  }, [incidents, guards, dispatchedGuards]);

  const [latestAudioInference, setLatestAudioInference] = useState<AudioInferenceResult | null>(null);
  const [latestLidarEval, setLatestLidarEval] = useState<LidarEvaluationResult | null>(null);

  const clearLatestResults = useCallback(() => {
    setLatestAudioInference(null);
    setLatestLidarEval(null);
  }, []);

  const addEvent = useCallback(
    (
      title: string,
      message: string,
      kind: AlertEvent['kind'] = 'info',
      poleId?: string,
      details?: AlertEvent['details'],
    ) => {
      const entry: AlertEvent = {
        id: Date.now() + Math.random(),
        title,
        message,
        at: new Date().toLocaleTimeString(),
        kind,
        poleId,
        details,
      };
      setEvents((prev) => [entry, ...prev].slice(0, 25));
    },
    [],
  );

  const DEDUP_WINDOW_MS = 30_000;

  const upsertSensorIncident = useCallback((incoming: Incident) => {
    const nowEpoch = Date.now();
    const nowStr = new Date().toLocaleTimeString();

    setIncidents((prev) => {
      // Never deduplicate resident_sos
      if (incoming.type !== 'resident_sos') {
        const existingIdx = prev.findIndex(
          (inc) =>
            inc.type === incoming.type &&
            inc.poleId === incoming.poleId &&
            inc.status !== 'resolved' &&
            inc.status !== 'false_alarm' &&
            nowEpoch - (inc.lastUpdatedEpoch ?? 0) <= DEDUP_WINDOW_MS,
        );

        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          const nextCount = (existing.occurrenceCount ?? 1) + 1;
          const updated: Incident = {
            ...existing,
            occurrenceCount: nextCount,
            lastUpdatedEpoch: nowEpoch,
            activityTrail: [
              ...existing.activityTrail,
              {
                time: nowStr,
                action: `Repeated ${incoming.displayType} signal merged within 30s deduplication window (×${nextCount})`,
                actor: 'Alert Deduplication Filter',
              },
            ],
          };
          setSelectedIncidentId(existing.id);
          const copy = [...prev];
          copy[existingIdx] = updated;
          return copy;
        }
      }

      const withMeta: Incident = {
        ...incoming,
        occurrenceCount: 1,
        lastUpdatedEpoch: nowEpoch,
      };
      setSelectedIncidentId(withMeta.id);
      return [withMeta, ...prev];
    });
  }, []);

  const resetView = useCallback(() => {
    setResetCounter((c) => c + 1);
  }, []);

  const setPoleLight = useCallback(
    (id: string, value: number) => {
      setLighting((prev) => ({ ...prev, [id]: value }));
      if (value < 30) {
        const pole = POLES.find((p) => p.id === id);
        addEvent(
          `Low Lighting — ${id}`,
          `SIMULATED: Virtual brightness below demo threshold at ${pole?.name}. This is not a measured lux value.`,
          'warning',
          id,
        );
      }
    },
    [addEvent],
  );

  // 1a. Standing Stop Lookalike (AS-104) — Proves upright stopped dot does NOT trigger a fall alert
  const triggerStandingStopLookalike = useCallback(async (): Promise<LidarEvaluationResult> => {
    setFallPoleId(null);
    setIsLookalikeStop(true);
    setSelectedPoleId('AS-104');

    let evalResult: LidarEvaluationResult;
    try {
      const apiRes = await evaluateLidarScenario(
        'standing_stop',
        'LID-002',
        'west_path',
        'AS-104',
        offlinePoleId === 'AS-104',
        blockedRouteZone === 'central_path',
      );
      evalResult = apiRes.evaluation;
    } catch {
      evalResult = {
        scenario_kind: 'standing_stop',
        device_id: 'LID-002',
        zone_id: 'west_path',
        pole_id: 'AS-104',
        source_mode: 'simulated',
        detected: true,
        trigger_incident: false,
        event_type: 'benign_stop',
        priority: 'normal',
        plain_label: 'Standing Stationary (No Alert)',
        plain_reason:
          'Person stopped walking (0.03 m/s) while remaining upright (height 1.72m, aspect ratio 3.13). A stopped dot without height collapse does not trigger a fall alert.',
        kinematics: {
          initial_height_m: 1.72,
          final_height_m: 1.72,
          drop_speed_mps: 0.0,
          horizontal_speed_mps: 0.03,
          aspect_ratio: 3.13,
          stationary_seconds: 18,
          box_dimensions_m: [0.55, 1.72, 0.55],
        },
        lighting_boost_pct: 70,
        lighting_note: 'Normal pathway lighting maintained (70%).',
        camera_context: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      };
    }

    setLatestLidarEval(evalResult);
    addEvent(
      'Normal Posture — Person Stopped Upright (AS-104)',
      `SIMULATED: ${evalResult.plain_reason}`,
      'info',
      'AS-104',
      {
        sourceDevice: 'LID-002 · West Loop (Mounted on AS-104)',
        sensorBasis: `Height: ${evalResult.kinematics.final_height_m}m (Upright) | Aspect Ratio: ${evalResult.kinematics.aspect_ratio} | Speed: ${evalResult.kinematics.horizontal_speed_mps} m/s`,
        lightingAction: evalResult.lighting_note,
        cameraAvailability: evalResult.camera_context,
      },
    );
    return evalResult;
  }, [addEvent, blockedRouteZone, offlinePoleId]);

  // 1b. Silent Possible Fall (AS-104) — Reviewable without sound + 100% local light boost
  const triggerSilentFall = useCallback(async (): Promise<LidarEvaluationResult> => {
    setIsLookalikeStop(false);
    setFallPoleId('AS-104');
    setSelectedPoleId('AS-104');

    const isRouteBlocked = blockedRouteZone === 'central_path';
    let evalResult: LidarEvaluationResult;
    try {
      const apiRes = await evaluateLidarScenario(
        'silent_fall',
        'LID-002',
        'west_path',
        'AS-104',
        offlinePoleId === 'AS-104',
        isRouteBlocked,
      );
      evalResult = apiRes.evaluation;
    } catch {
      const fallbackLightNote = isRouteBlocked
        ? 'Nearby lights on — route not verified.'
        : 'Nearby Lights On — Local pole AS-104 automatically raised to 100%.';
      evalResult = {
        scenario_kind: 'silent_fall',
        device_id: 'LID-002',
        zone_id: 'west_path',
        pole_id: 'AS-104',
        source_mode: 'simulated',
        detected: true,
        trigger_incident: true,
        event_type: 'silent_fall',
        priority: 'needs_review',
        score: 0.86,
        plain_label: 'Unusual Movement (Possible Fall)',
        plain_reason:
          'Possible fall followed by prolonged low movement: 3D cluster height dropped from 1.72m to 0.34m (-1.42 m/s) and remained motionless on the ground for 45s. Reviewable without requiring sound.',
        kinematics: {
          initial_height_m: 1.72,
          final_height_m: 0.34,
          drop_speed_mps: -1.42,
          horizontal_speed_mps: 0.01,
          aspect_ratio: 0.21,
          stationary_seconds: 45,
          box_dimensions_m: [1.65, 0.34, 0.60],
        },
        lighting_boost_pct: 100,
        lighting_note: fallbackLightNote,
        camera_context: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      };
    }

    setLatestLidarEval(evalResult);
    setLighting((prev) => ({ ...prev, 'AS-104': 100 }));
    setLightingNote(evalResult.lighting_note);

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();
    const basisText = `Height change: ${evalResult.kinematics.initial_height_m}m → ${evalResult.kinematics.final_height_m}m | Drop speed: ${evalResult.kinematics.drop_speed_mps} m/s | Stationary: ${evalResult.kinematics.stationary_seconds}s`;

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'west_path',
      zoneName: 'West Loop',
      poleId: 'AS-104',
      type: 'silent_fall',
      displayType: 'Unusual Movement (Possible Fall)',
      priority: 'needs_review',
      status: 'open',
      reason: `SIMULATED: ${evalResult.plain_reason}`,
      sourceMode: 'simulated',
      score: evalResult.score ?? 0.86,
      lightingResponseNote: evalResult.lighting_note,
      cameraContext: evalResult.camera_context,
      sensorBasis: basisText,
      activityTrail: [
        { time: now, action: '3D cluster height collapse flagged by LiDAR evaluator', actor: 'LiDAR Node LID-002 (Simulated)' },
        { time: now, action: evalResult.lighting_note, actor: 'Safety Lighting Response' },
      ],
    };

    upsertSensorIncident(newIncident);

    addEvent(
      'Unusual Movement — West Loop · AS-104',
      `SIMULATED: ${evalResult.plain_reason}`,
      'warning',
      'AS-104',
      {
        sourceDevice: 'LID-002 · West Loop (Mounted on AS-104)',
        sensorBasis: basisText,
        lightingAction: evalResult.lighting_note,
        cameraAvailability: evalResult.camera_context,
      },
    );

    return evalResult;
  }, [addEvent, blockedRouteZone, offlinePoleId, upsertSensorIncident]);

  // 2. Simulated Distress Scream (AS-101) — Strictly labeled 'simulated'
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
      type: 'possible_scream',
      displayType: 'Possible Distress Sound',
      priority: 'needs_review',
      status: 'open',
      reason:
        'SIMULATED: Synthetic acoustic distress event injected at North Entrance (uncalibrated score 0.84, not confirmed danger).',
      sourceMode: 'simulated',
      score: 0.84,
      cameraContext:
        'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
      sensorBasis: 'Synthetic distress score: 84% at AUD-001 (Simulated scenario)',
      activityTrail: [
        { time: now, action: 'Simulated distress sound alert generated', actor: 'Demo Scenario (Simulated)' },
      ],
    };

    upsertSensorIncident(newIncident);

    addEvent(
      'Possible Distress Sound — North Entrance · AS-101',
      'SIMULATED: Synthetic acoustic distress event triggered (score 84%). Guard review needed.',
      'warning',
      'AS-101',
      {
        sourceDevice: 'AUD-001 · North Entrance (Mounted on AS-101)',
        sensorBasis: 'Simulated distress score: 84% (Not a real audio recording)',
        lightingAction: 'Normal lighting maintained',
        cameraAvailability:
          'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
      },
    );
  }, [addEvent, upsertSensorIncident]);

  // 3a. Combined Anomaly (Same Zone AS-104 within 15s) -> Escalates to Urgent (Signals Agree)
  const triggerCombined = useCallback(async () => {
    setIsLookalikeStop(false);
    setFallPoleId('AS-104');
    setAcousticPoleId('AS-104');
    setSelectedPoleId('AS-104');

    const isRouteBlocked = blockedRouteZone === 'central_path';
    let lightNote = isRouteBlocked
      ? 'Nearby lights on — route not verified.'
      : 'Nearby Lights On — Local pole AS-104 boosted to 100%.';
    let reasonText =
      'Possible distress sound and 3D height collapse occurred in the same zone (AS-104) within 4s (≤ 15s threshold). Escalated to Urgent human review.';
    let basisText = 'Co-located at AS-104: Acoustic distress (88%) + LiDAR height drop (1.72m → 0.34m) Δt = 4.0s';

    try {
      const res = await evaluateSensorFusion('west_path', 'AS-104', 'west_path', 'AS-104', 4.0, isRouteBlocked);
      lightNote = res.fusion.lighting_note;
      reasonText = res.fusion.plain_reason;
      basisText = res.fusion.sensor_basis;
    } catch {
      /* fallback values already set */
    }

    setLighting((prev) => ({ ...prev, 'AS-104': 100 }));
    setLightingNote(lightNote);

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toLocaleTimeString();

    const newIncident: Incident = {
      id: incidentId,
      createdAt: now,
      zoneId: 'west_path',
      zoneName: 'West Loop',
      poleId: 'AS-104',
      type: 'combined_anomaly',
      displayType: 'Signals Agree (Sound + Movement)',
      priority: 'urgent',
      status: 'open',
      reason: `SIMULATED: ${reasonText}`,
      sourceMode: 'simulated',
      score: 0.94,
      lightingResponseNote: lightNote,
      cameraContext: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      sensorBasis: basisText,
      activityTrail: [
        { time: now, action: 'Same-zone sound + movement corroborated within 15s window', actor: 'Spatio-Temporal Fusion Engine' },
        { time: now, action: lightNote, actor: 'Safety Lighting Response' },
      ],
    };

    upsertSensorIncident(newIncident);

    addEvent(
      '🚨 Signals Agree — West Loop · AS-104',
      `SIMULATED: ${reasonText}`,
      'urgent',
      'AS-104',
      {
        sourceDevice: 'LID-002 + AUD-002 · West Loop (AS-104)',
        sensorBasis: basisText,
        lightingAction: lightNote,
        cameraAvailability: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      },
    );
  }, [addEvent, blockedRouteZone, upsertSensorIncident]);

  // 3b. Unrelated Signals (Different Zones: AS-101 vs AS-104) -> Kept as 2 separate Needs Review cases
  const triggerUnrelatedSignals = useCallback(async () => {
    setIsLookalikeStop(false);
    setAcousticPoleId('AS-101');
    setFallPoleId('AS-104');
    setSelectedPoleId('AS-104');

    const isRouteBlocked = blockedRouteZone === 'central_path';
    const lightNote = isRouteBlocked
      ? 'Nearby lights on — route not verified.'
      : 'Nearby Lights On — Local pole AS-104 boosted to 100%.';

    try {
      await evaluateSensorFusion('north_entrance', 'AS-101', 'west_path', 'AS-104', 4.0, isRouteBlocked);
    } catch {
      /* ignore network error */
    }

    setLighting((prev) => ({ ...prev, 'AS-104': 100 }));
    setLightingNote(lightNote);

    const nowEpoch = Date.now();
    const now = new Date().toLocaleTimeString();
    const suffix = nowEpoch.toString().slice(-4);
    const incNorthId = `INC-${suffix}A`;
    const incWestId = `INC-${suffix}B`;

    const incNorth: Incident = {
      id: incNorthId,
      createdAt: now,
      zoneId: 'north_entrance',
      zoneName: 'North Entrance',
      poleId: 'AS-101',
      type: 'possible_scream',
      displayType: 'Possible Distress Sound',
      priority: 'needs_review',
      status: 'open',
      reason:
        'SIMULATED: Possible distress sound at North Entrance (AS-101). Kept separate from West Loop movement anomaly (different spatial zone).',
      sourceMode: 'simulated',
      score: 0.83,
      cameraContext:
        'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
      sensorBasis: 'Spatial separation: AS-101 ≠ AS-104 (Not fused)',
      occurrenceCount: 1,
      lastUpdatedEpoch: nowEpoch,
      activityTrail: [{ time: now, action: 'Logged as separate Needs Review incident at AS-101', actor: 'Alert Rules' }],
    };

    const incWest: Incident = {
      id: incWestId,
      createdAt: now,
      zoneId: 'west_path',
      zoneName: 'West Loop',
      poleId: 'AS-104',
      type: 'silent_fall',
      displayType: 'Unusual Movement (Possible Fall)',
      priority: 'needs_review',
      status: 'open',
      reason:
        'SIMULATED: Possible fall at West Loop (AS-104). Kept separate from North Entrance sound anomaly (different spatial zone).',
      sourceMode: 'simulated',
      score: 0.85,
      lightingResponseNote: lightNote,
      cameraContext: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      sensorBasis: 'Spatial separation: AS-104 ≠ AS-101 (Not fused)',
      occurrenceCount: 1,
      lastUpdatedEpoch: nowEpoch,
      activityTrail: [
        { time: now, action: 'Logged as separate Needs Review incident at AS-104', actor: 'Alert Rules' },
        { time: now, action: lightNote, actor: 'Safety Lighting Response' },
      ],
    };

    setIncidents((prev) => [incWest, incNorth, ...prev]);
    setSelectedIncidentId(incWestId);

    addEvent(
      'Separate Anomalies — AS-101 & AS-104 (Not Fused)',
      'SIMULATED: Sound at North Entrance (AS-101) and fall at West Loop (AS-104) are in different zones and remain 2 separate Needs Review alerts.',
      'warning',
      'AS-104',
      {
        sourceDevice: 'AUD-001 (AS-101) & LID-002 (AS-104)',
        sensorBasis: 'Different spatial zones (North Entrance vs West Loop) — automatic fusion blocked',
        lightingAction: lightNote,
        cameraAvailability: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      },
    );
  }, [addEvent, blockedRouteZone]);

  // 4a. Recorded Audio Sample Inference (YAMNet on real .wav file -> source_mode = 'recorded')
  const triggerRecordedAudio = useCallback(
    async (sampleId: string): Promise<AudioInferenceResult> => {
      const apiRes = await analyzeAudioSample(sampleId, 'AUD-001', 'north_entrance', 'AS-101');
      const inf = apiRes.inference;
      setLatestAudioInference(inf);

      const topSummary = inf.top_classes
        .map((c) => `${c.class_name} (${Math.round(c.score * 100)}%)`)
        .join(', ');

      if (inf.event_type === 'possible_scream') {
        setAcousticPoleId('AS-101');
        setSelectedPoleId('AS-101');

        const now = new Date().toLocaleTimeString();
        const incidentId = `INC-${Date.now().toString().slice(-4)}`;

        const newIncident: Incident = {
          id: incidentId,
          createdAt: now,
          zoneId: 'north_entrance',
          zoneName: 'North Entrance',
          poleId: 'AS-101',
          type: 'possible_scream',
          displayType: 'Possible Distress Sound',
          priority: 'needs_review',
          status: 'open',
          reason: `RECORDED SAMPLE: ${inf.plain_reason}`,
          sourceMode: 'recorded',
          score: inf.distress_score,
          cameraContext:
            'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
          sensorBasis: `YAMNet Recorded WAV (${inf.sample_id}): ${topSummary}`,
          activityTrail: [
            {
              time: now,
              action: `Processed recorded file ${inf.sample_id} via YAMNet (${Math.round(inf.distress_score * 100)}% distress)`,
              actor: 'YAMNet Audio Classifier (Recorded Sample)',
            },
          ],
        };

        upsertSensorIncident(newIncident);

        addEvent(
          `Possible Distress Sound — ${inf.sample_id}`,
          `RECORDED SAMPLE: ${inf.plain_reason}`,
          'warning',
          'AS-101',
          {
            sourceDevice: `AUD-001 · Recorded WAV (${inf.sample_id})`,
            sensorBasis: `Top AudioSet classes: ${topSummary}`,
            lightingAction: 'Normal pathway lighting maintained',
            cameraAvailability:
              'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
          },
        );
      } else {
        setAcousticPoleId(null);
        addEvent(
          `${inf.plain_label} — ${inf.sample_id}`,
          `RECORDED SAMPLE: ${inf.plain_reason}`,
          'info',
          'AS-101',
          {
            sourceDevice: `AUD-001 · Recorded WAV (${inf.sample_id})`,
            sensorBasis: `Top AudioSet classes: ${topSummary}`,
            lightingAction: 'No emergency lighting needed (benign sound)',
            cameraAvailability:
              'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
          },
        );
      }

      return inf;
    },
    [addEvent, upsertSensorIncident],
  );

  // 4b. Live Browser Microphone Inference (16kHz PCM WAV -> source_mode = 'live')
  const triggerLiveMic = useCallback(
    async (wavBlob: Blob): Promise<AudioInferenceResult> => {
      const apiRes = await analyzeLiveAudio(wavBlob, 'MIC-LIVE', 'north_entrance', 'AS-101');
      const inf = apiRes.inference;
      setLatestAudioInference(inf);

      const topSummary = inf.top_classes
        .map((c) => `${c.class_name} (${Math.round(c.score * 100)}%)`)
        .join(', ');

      if (inf.event_type === 'possible_scream') {
        setAcousticPoleId('AS-101');
        setSelectedPoleId('AS-101');

        const now = new Date().toLocaleTimeString();
        const incidentId = `INC-${Date.now().toString().slice(-4)}`;

        const newIncident: Incident = {
          id: incidentId,
          createdAt: now,
          zoneId: 'north_entrance',
          zoneName: 'North Entrance',
          poleId: 'AS-101',
          type: 'possible_scream',
          displayType: 'Possible Distress Sound',
          priority: 'needs_review',
          status: 'open',
          reason: `LIVE INPUT: ${inf.plain_reason}`,
          sourceMode: 'live',
          score: inf.distress_score,
          cameraContext:
            'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
          sensorBasis: `Live Browser Microphone (16kHz WAV): ${topSummary}`,
          activityTrail: [
            {
              time: now,
              action: `Live microphone audio classified by YAMNet (${Math.round(inf.distress_score * 100)}% distress)`,
              actor: 'YAMNet Audio Classifier (Live Input)',
            },
          ],
        };

        upsertSensorIncident(newIncident);

        addEvent(
          'Possible Distress Sound — Live Microphone',
          `LIVE INPUT: ${inf.plain_reason}`,
          'warning',
          'AS-101',
          {
            sourceDevice: 'Live Browser Microphone (16kHz PCM WAV)',
            sensorBasis: `Top AudioSet classes: ${topSummary}`,
            lightingAction: 'Normal pathway lighting maintained',
            cameraAvailability:
              'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
          },
        );
      } else {
        addEvent(
          `${inf.plain_label} — Live Microphone`,
          `LIVE INPUT: ${inf.plain_reason}`,
          'info',
          'AS-101',
          {
            sourceDevice: 'Live Browser Microphone (16kHz PCM WAV)',
            sensorBasis: `Top AudioSet classes: ${topSummary}`,
            lightingAction: 'Normal baseline maintained',
            cameraAvailability:
              'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.',
          },
        );
      }

      return inf;
    },
    [addEvent, upsertSensorIncident],
  );

  // 5. Benign Rain Visual Toggle
  const triggerBenignRain = useCallback(() => {
    setIsRaining((prev) => !prev);
    addEvent(
      'Benign Acoustic Event — Ambient Rain',
      'SIMULATED: Ambient rain particles toggled. Benign weather acoustics do not generate emergency alerts.',
      'info',
      'AS-102',
    );
  }, [addEvent]);

  // 6. Dark Pathway (AS-102)
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
      activityTrail: [{ time: now, action: 'Virtual lighting threshold warning triggered', actor: 'System (Simulated)' }],
    };

    upsertSensorIncident(newIncident);
  }, [setPoleLight, upsertSensorIncident]);

  // 7. Unsafe Route / Blocked Path (Central Path)
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
        reason: 'SIMULATED: Path obstruction on Central Path. Route marked closed; no unverified evacuation guidance shown.',
        sourceMode: 'simulated',
        activityTrail: [{ time: now, action: 'Central Path marked blocked in simulation', actor: 'Routing Engine' }],
      };

      upsertSensorIncident(newIncident);

      addEvent(
        'Route Notice — Central Path Blocked',
        'SIMULATED: Central Path closed due to simulated obstruction. Nearby emergency lights will not direct residents through this route.',
        'warning',
        'AS-103',
      );
    } else {
      addEvent('Route Cleared — Central Path', 'Central Path reopened to normal pedestrian flow.', 'success');
    }
  }, [blockedRouteZone, addEvent, upsertSensorIncident]);

  // 8. Sensor Offline (AS-103)
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
      reason: 'SIMULATED: AS-103 missed 3 consecutive heartbeats. Monitoring unavailable in this area.',
      sourceMode: 'simulated',
      activityTrail: [{ time: now, action: 'Sensor heartbeat timeout detected', actor: 'System (Simulated)' }],
    };

    upsertSensorIncident(newIncident);

    addEvent(
      'Sensor Offline — Central Path · AS-103',
      'SIMULATED: AS-103 missed heartbeat. Monitoring may be unavailable in this area.',
      'warning',
      'AS-103',
    );
  }, [addEvent, upsertSensorIncident]);

  // 9. Reset All Scenarios
  const handleReset = useCallback(() => {
    setLighting(initialLighting());
    setLightingNote('');
    setFallPoleId(null);
    setSosPoleId(null);
    setIsLookalikeStop(false);
    setOfflinePoleId(null);
    setAcousticPoleId(null);
    setBlockedRouteZone(null);
    setIsRaining(false);
    setSelectedPoleId('AS-103');
    setResetCounter((c) => c + 1);
    setIncidents([]);
    setSelectedIncidentId(null);
    setGuards(GUARDS);
    setDispatchedGuards([]);
    setLatestAudioInference(null);
    setLatestLidarEval(null);
    addEvent('Demo Reset', 'All simulation events, incidents, lighting boosts, and sensor statuses restored.', 'success');
  }, [addEvent]);

  // SOS Incident Creation
  const addSOSIncident = useCallback(
    (sosData: { zoneId?: string; zoneName?: string; poleId?: string; locationShared: boolean }): string => {
      const incidentId = `SOS-${Date.now().toString().slice(-4)}`;
      const now = new Date().toLocaleTimeString();

      const ZONE_TO_POLE: Record<string, string> = {
        north_entrance: 'AS-101',
        lakeside_path: 'AS-102',
        central_path: 'AS-103',
        west_path: 'AS-104',
        east_exit: 'AS-105',
      };

      const resolvedPoleId =
        (sosData.poleId && POLES.some((p) => p.id === sosData.poleId) ? sosData.poleId : undefined) ||
        (sosData.zoneId ? ZONE_TO_POLE[sosData.zoneId] : undefined) ||
        'AS-103';

      const matchedPole = POLES.find((p) => p.id === resolvedPoleId);
      const resolvedZoneId = sosData.zoneId || matchedPole?.zone || 'central_path';
      const zoneName =
        sosData.zoneName ||
        ZONES.find((z) => z.id === resolvedZoneId)?.name ||
        matchedPole?.name ||
        'Central Path';

      // Trigger 3D SOS visual state and 100% emergency lighting on the target pole
      setSosPoleId(resolvedPoleId);
      setSelectedPoleId(resolvedPoleId);
      setLighting((prev) => ({ ...prev, [resolvedPoleId]: 100 }));
      const lightNote =
        blockedRouteZone === 'central_path'
          ? 'Nearby lights on — route not verified.'
          : `Nearby Lights On — SOS pole ${resolvedPoleId} illuminated to 100%.`;
      setLightingNote(lightNote);

      const newIncident: Incident = {
        id: incidentId,
        createdAt: now,
        zoneId: resolvedZoneId,
        zoneName,
        poleId: resolvedPoleId,
        type: 'resident_sos',
        displayType: 'Resident SOS Call',
        priority: 'urgent',
        status: 'open',
        reason: `SIMULATED: Resident triggered emergency SOS request at ${zoneName} (${resolvedPoleId}) (${
          sosData.locationShared ? 'Location Shared' : 'Zone Selected'
        }).`,
        sourceMode: 'simulated',
        lightingResponseNote: lightNote,
        cameraContext:
          resolvedPoleId === 'AS-101'
            ? 'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected.'
            : resolvedPoleId === 'AS-105'
            ? 'CAM-02 (East Exit CCTV) covers this zone — Inventory marker only; live stream not connected.'
            : 'No camera view available in this zone. Immediate on-site guard response required.',
        sensorBasis: `Direct Resident Web SOS trigger at ${resolvedPoleId} (${zoneName}) — bypasses AI gate`,
        occurrenceCount: 1,
        lastUpdatedEpoch: Date.now(),
        activityTrail: [
          { time: now, action: `Urgent SOS request received from resident at ${zoneName} (${resolvedPoleId})`, actor: 'Resident SOS Portal' },
          { time: now, action: lightNote, actor: 'Safety Lighting Response' },
        ],
      };

      setIncidents((prev) => [newIncident, ...prev]);
      setSelectedIncidentId(incidentId);

      addEvent(
        `🚨 Resident SOS — ${zoneName} · ${resolvedPoleId}`,
        `SIMULATED: Urgent resident help request at ${zoneName} (${resolvedPoleId}). Resident marker highlighted in 3D and local light boosted to 100%.`,
        'urgent',
        resolvedPoleId,
        {
          sourceDevice: `Resident Web SOS Portal · ${resolvedPoleId}`,
          sensorBasis: 'Direct resident emergency trigger (bypasses AI validation gate)',
          lightingAction: lightNote,
          cameraAvailability: newIncident.cameraContext,
        },
      );

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('xsense_state_sync');
        ch.postMessage({ type: 'SOS_CREATED', incident: newIncident });
        ch.close();
      }

      return incidentId;
    },
    [addEvent, blockedRouteZone],
  );

  // Incident Lifecycle Transitions
  const acknowledgeIncident = useCallback((id: string) => {
    const now = new Date().toLocaleTimeString();
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        return {
          ...inc,
          status: inc.status === 'open' ? 'acknowledged' : inc.status,
          activityTrail: [
            ...inc.activityTrail,
            { time: now, action: 'Incident acknowledged by guard console', actor: 'Guard Station' },
          ],
        };
      }),
    );
  }, []);

  const assignGuard = useCallback(
    (id: string, guardId: string): boolean => {
      const now = new Date().toLocaleTimeString();
      const guard = guards.find((g) => g.id === guardId);
      if (!guard || guard.availability === 'busy') return false;

      const targetIncident = incidents.find((i) => i.id === id);
      const targetPole = targetIncident
        ? POLES.find((p) => p.id === targetIncident.poleId)
        : undefined;
      const targetPos: [number, number] = targetPole ? targetPole.position : [0, 0];

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== id) return inc;
          const existingIds = inc.assignedGuardIds ?? (inc.assignedGuardId ? [inc.assignedGuardId] : []);
          const nextIds = existingIds.includes(guardId) ? existingIds : [...existingIds, guardId];
          return {
            ...inc,
            status: inc.status === 'investigating' ? 'investigating' : 'assigned',
            assignedGuardId: inc.assignedGuardId || guardId,
            assignedGuardIds: nextIds,
            activityTrail: [
              ...inc.activityTrail,
              {
                time: now,
                action: `Dispatched ${guard.displayName} (${guard.role})${
                  existingIds.length > 0 ? ' as additional responder' : ''
                }`,
                actor: guard.displayName,
              },
            ],
          };
        }),
      );

      // Keep all existing dispatched guards on the 3D map; only replace if the same guardId was returning
      setDispatchedGuards((prev) => {
        const remaining = prev.filter((dg) => dg.guardId !== guardId);
        return [
          ...remaining,
          {
            guardId,
            guardName: guard.displayName,
            incidentId: id,
            targetPoleId: targetIncident?.poleId || 'AS-103',
            targetPos,
            status: 'traveling',
          },
        ];
      });

      setGuards((prev) =>
        prev.map((g) => (g.id === guardId ? { ...g, availability: 'busy' } : g)),
      );
      return true;
    },
    [guards, incidents],
  );

  const markArrived = useCallback(
    (id: string) => {
      const now = new Date().toLocaleTimeString();
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== id) return inc;
          const ids = inc.assignedGuardIds ?? (inc.assignedGuardId ? [inc.assignedGuardId] : []);
          const names = ids
            .map((gid) => guards.find((g) => g.id === gid)?.displayName)
            .filter(Boolean)
            .join(', ');
          const actorName = names || 'Responding Guard';
          return {
            ...inc,
            status: 'investigating',
            activityTrail: [
              ...inc.activityTrail,
              { time: now, action: `${actorName} arrived on scene — investigating`, actor: actorName },
            ],
          };
        }),
      );

      setDispatchedGuards((prev) =>
        prev.map((dg) => (dg.incidentId === id ? { ...dg, status: 'arrived' } : dg)),
      );
    },
    [guards],
  );

  const sync3DStateWithActiveIncidents = useCallback(
    (updatedIncidents: Incident[], closedIncident?: Incident) => {
      const openList = updatedIncidents.filter(
        (i) => i.status !== 'resolved' && i.status !== 'false_alarm',
      );

      // 1. Fall state (silent_fall or combined_anomaly)
      const openFall = openList.find(
        (i) => i.type === 'silent_fall' || i.type === 'combined_anomaly',
      );
      setFallPoleId(openFall ? openFall.poleId : null);

      // 2. Acoustic state (possible_scream or combined_anomaly)
      const openAcoustic = openList.find(
        (i) => i.type === 'possible_scream' || i.type === 'combined_anomaly',
      );
      setAcousticPoleId(openAcoustic ? openAcoustic.poleId : null);

      // 3. Resident SOS state
      const openSOS = openList.find((i) => i.type === 'resident_sos');
      setSosPoleId(openSOS ? openSOS.poleId : null);

      // 4. Sensor offline state
      const openOffline = openList.find((i) => i.type === 'sensor_offline');
      setOfflinePoleId(openOffline ? openOffline.poleId : null);

      // 5. Blocked route state
      const openBlocked = openList.find((i) => i.type === 'route_blocked');
      setBlockedRouteZone(openBlocked ? openBlocked.zoneId : null);

      // 6. Restore closed pole's virtual lamp to 70% if no open incident remains at that pole
      if (closedIncident && closedIncident.poleId) {
        const stillActiveAtPole = openList.some((i) => i.poleId === closedIncident.poleId);
        if (!stillActiveAtPole) {
          setLighting((prev) => ({ ...prev, [closedIncident.poleId]: 70 }));
        }
      }

      // 7. Update or clear emergency lighting banner
      const openBoosted = openList.find(
        (i) =>
          i.type === 'silent_fall' ||
          i.type === 'combined_anomaly' ||
          i.type === 'resident_sos',
      );
      setLightingNote(openBoosted?.lightingResponseNote || '');
    },
    [],
  );

  const resolveIncident = useCallback(
    (id: string, outcomeNote: string) => {
      const now = new Date().toLocaleTimeString();
      let releasedIds: string[] = [];
      let closedInc: Incident | undefined;

      setIncidents((prev) => {
        const next = prev.map((inc) => {
          if (inc.id !== id) return inc;
          releasedIds = inc.assignedGuardIds ?? (inc.assignedGuardId ? [inc.assignedGuardId] : []);
          closedInc = {
            ...inc,
            status: 'resolved',
            activityTrail: [
              ...inc.activityTrail,
              { time: now, action: `Resolved: ${outcomeNote}`, actor: 'Guard Station' },
            ],
          };
          return closedInc;
        });
        sync3DStateWithActiveIncidents(next, closedInc);
        return next;
      });

      setDispatchedGuards((prev) =>
        prev.map((dg) => (dg.incidentId === id ? { ...dg, status: 'returning' } : dg)),
      );

      if (releasedIds.length > 0) {
        setGuards((prev) =>
          prev.map((g) => (releasedIds.includes(g.id) ? { ...g, availability: 'available' } : g)),
        );
      }

      addEvent('Incident Resolved', `Case ${id} marked resolved: ${outcomeNote}`, 'success');
    },
    [addEvent, sync3DStateWithActiveIncidents],
  );

  const markFalseAlarm = useCallback(
    (id: string, reasonNote: string) => {
      const now = new Date().toLocaleTimeString();
      let releasedIds: string[] = [];
      let closedInc: Incident | undefined;

      setIncidents((prev) => {
        const next = prev.map((inc) => {
          if (inc.id !== id) return inc;
          releasedIds = inc.assignedGuardIds ?? (inc.assignedGuardId ? [inc.assignedGuardId] : []);
          closedInc = {
            ...inc,
            status: 'false_alarm',
            activityTrail: [
              ...inc.activityTrail,
              { time: now, action: `Closed as False Alarm: ${reasonNote}`, actor: 'Guard Station' },
            ],
          };
          return closedInc;
        });
        sync3DStateWithActiveIncidents(next, closedInc);
        return next;
      });

      setDispatchedGuards((prev) =>
        prev.map((dg) => (dg.incidentId === id ? { ...dg, status: 'returning' } : dg)),
      );

      if (releasedIds.length > 0) {
        setGuards((prev) =>
          prev.map((g) => (releasedIds.includes(g.id) ? { ...g, availability: 'available' } : g)),
        );
      }

      addEvent('False Alarm Recorded', `Case ${id} marked false alarm: ${reasonNote}`, 'info');
    },
    [addEvent, sync3DStateWithActiveIncidents],
  );

  const removeDispatchedGuard = useCallback((guardId: string) => {
    setDispatchedGuards((prev) => prev.filter((dg) => dg.guardId !== guardId));
  }, []);

  // Derived Metrics
  const darkAreasCount = useMemo(() => {
    return POLES.filter((p) => p.id !== offlinePoleId && (lighting[p.id] ?? 70) < 30).length;
  }, [lighting, offlinePoleId]);

  const needsAttentionCount = useMemo(() => {
    const activeUrgent = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'false_alarm').length;
    return activeUrgent + darkAreasCount;
  }, [incidents, darkAreasCount]);

  const sensorsOfflineCount = offlinePoleId ? 1 : 0;

  const activeIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status !== 'resolved' && i.status !== 'false_alarm').length;
  }, [incidents]);

  const value: ParkContextType = {
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
    lightingNote,
    nightMode,
    setNightMode,
    showCoverage,
    setShowCoverage,
    paused,
    setPaused,
    fallPoleId,
    sosPoleId,
    isLookalikeStop,
    offlinePoleId,
    acousticPoleId,
    blockedRouteZone,
    isRaining,
    resetCounter,
    resetView,
    latestAudioInference,
    latestLidarEval,
    clearLatestResults,
    events,
    addEvent,
    triggerSilentFall,
    triggerStandingStopLookalike,
    triggerScream,
    triggerCombined,
    triggerUnrelatedSignals,
    triggerRecordedAudio,
    triggerLiveMic,
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
