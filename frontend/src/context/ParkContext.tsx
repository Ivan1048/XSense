import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
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
        camera_context: 'No camera view available. On-site check required.',
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
        camera_context: 'No camera view available. On-site check required.',
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
      cameraContext: 'No camera view available. On-site check required.',
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
        cameraAvailability: 'No camera view available. On-site check required.',
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
      cameraContext: 'No camera view available. On-site check required.',
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
        cameraAvailability: 'No camera view available. On-site check required.',
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
      cameraContext: 'No camera view available. On-site check required.',
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
      cameraContext: 'No camera view available. On-site check required.',
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
        cameraAvailability: 'No camera view available. On-site check required.',
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
          cameraContext: 'No camera view available. On-site check required.',
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
            cameraAvailability: 'No camera view available. On-site check required.',
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
            cameraAvailability: 'No camera view available. On-site check required.',
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
          cameraContext: 'No camera view available. On-site check required.',
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
            cameraAvailability: 'No camera view available. On-site check required.',
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
            cameraAvailability: 'No camera view available. On-site check required.',
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
      const zoneName =
        sosData.zoneName ||
        (sosData.zoneId ? ZONES.find((z) => z.id === sosData.zoneId)?.name : 'General Park Area') ||
        'Unknown Location';

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
        activityTrail: [{ time: now, action: `SOS request received from resident (${zoneName})`, actor: 'Resident Portal' }],
      };

      setIncidents((prev) => [newIncident, ...prev]);
      setSelectedIncidentId(incidentId);

      addEvent(
        `🚨 Resident SOS — ${zoneName}`,
        `SIMULATED: Emergency assistance requested at ${zoneName}. Guard response needed immediately.`,
        'urgent',
        sosData.poleId,
      );

      return incidentId;
    },
    [addEvent],
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
      const targetPole = targetIncident ? POLES.find((p) => p.id === targetIncident.poleId) : undefined;
      const targetPos: [number, number] = targetPole ? targetPole.position : [0, 0];

      setIncidents((prev) =>
        prev.map((inc) => {
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
        }),
      );

      setDispatchedGuards((prev) => {
        const remaining = prev.filter((dg) => dg.incidentId !== id && dg.guardId !== guardId);
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

      setGuards((prev) => prev.map((g) => (g.id === guardId ? { ...g, availability: 'busy' } : g)));
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
          const guard = guards.find((g) => g.id === inc.assignedGuardId);
          const actorName = guard?.displayName || 'Responding Guard';
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

  const resolveIncident = useCallback(
    (id: string, outcomeNote: string) => {
      const now = new Date().toLocaleTimeString();
      let assignedId: string | undefined;

      setIncidents((prev) =>
        prev.map((inc) => {
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
        }),
      );

      setDispatchedGuards((prev) =>
        prev.map((dg) => (dg.incidentId === id ? { ...dg, status: 'returning' } : dg)),
      );

      if (assignedId) {
        setGuards((prev) => prev.map((g) => (g.id === assignedId ? { ...g, availability: 'available' } : g)));
      }

      addEvent('Incident Resolved', `Case ${id} marked resolved: ${outcomeNote}`, 'success');
    },
    [addEvent],
  );

  const markFalseAlarm = useCallback(
    (id: string, reasonNote: string) => {
      const now = new Date().toLocaleTimeString();
      let assignedId: string | undefined;

      setIncidents((prev) =>
        prev.map((inc) => {
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
        }),
      );

      setDispatchedGuards((prev) =>
        prev.map((dg) => (dg.incidentId === id ? { ...dg, status: 'returning' } : dg)),
      );

      if (assignedId) {
        setGuards((prev) => prev.map((g) => (g.id === assignedId ? { ...g, availability: 'available' } : g)));
      }

      addEvent('False Alarm Recorded', `Case ${id} marked false alarm: ${reasonNote}`, 'info');
    },
    [addEvent],
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
