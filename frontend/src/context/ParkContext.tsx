import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  AlertEvent,
  AudioInferenceResult,
  CameraPose,
  CameraViewMode,
  DispatchedGuardState,
  Guard,
  Incident,
  LidarEvaluationResult,
  LightingMap,
  SelectionTarget,
  SimulationDiagnosticEntry,
} from '../types';
import { DEFAULT_CAMERA_POSE } from '../types';
import type { SectorId } from '../data/sectors';
import { OVERVIEW_PERSPECTIVE_POSE, OVERVIEW_RADAR_POSE } from '../data/sectors';
import { POLES, ZONES, GUARDS } from '../data/parkData';
import { createInitialEvent } from '../data/mockData';
import {
  analyzeAudioSample,
  analyzeLiveAudio,
  evaluateLidarScenario,
  evaluateSensorFusion,
} from '../services/api';
import { stageDemoCollapse, subscribePersonaObservations, usePersonaStateMachine } from '../hooks/usePersonaStateMachine';
import { evaluateCollapseAgainstAllLidars } from '../utils/lidarGeometry';

export interface PersonaObservationRecord<T = LidarEvaluationResult> {
  clusterId: string;
  personaIndex: number;
  timestampMs: number;
  timeStr: string;
  detected: boolean;
  scenarioKind: string;
  primarySensorId?: string;
  nearestPoleId?: string;
  distanceToNearestSensorM: number;
  reason: string;
  result?: T;
}

export type ObservationByCluster<T = LidarEvaluationResult> =
  Record<string, PersonaObservationRecord<T> | undefined>;

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

  // Persisted Map View & Inspection State across Route Navigations
  mapMode: 'blueprint' | 'assets';
  setMapMode: React.Dispatch<React.SetStateAction<'blueprint' | 'assets'>>;
  showCCTV: boolean;
  setShowCCTV: React.Dispatch<React.SetStateAction<boolean>>;
  showAudioCoverage: boolean;
  setShowAudioCoverage: React.Dispatch<React.SetStateAction<boolean>>;
  showDeviceLabels: boolean;
  setShowDeviceLabels: React.Dispatch<React.SetStateAction<boolean>>;
  showStudyPosts: boolean;
  setShowStudyPosts: React.Dispatch<React.SetStateAction<boolean>>;
  showLidarRanges: boolean;
  setShowLidarRanges: React.Dispatch<React.SetStateAction<boolean>>;
  showLidarCoverage: boolean;
  setShowLidarCoverage: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLidarId: string | null;
  setSelectedLidarId: React.Dispatch<React.SetStateAction<string | null>>;
  simulationDiagnostics: SimulationDiagnosticEntry[];
  clearSimulationDiagnostics: () => void;
  observationsByCluster: ObservationByCluster;
  clearObservationsByCluster: () => void;
  showLidarPlan: boolean;
  setShowLidarPlan: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPlannedLidar: string;
  setSelectedPlannedLidar: React.Dispatch<React.SetStateAction<string>>;
  cameraPose: CameraPose;
  setCameraPose: React.Dispatch<React.SetStateAction<CameraPose>>;
  perspPose: CameraPose;
  setPerspPose: React.Dispatch<React.SetStateAction<CameraPose>>;
  radarPose: CameraPose;
  setRadarPose: React.Dispatch<React.SetStateAction<CameraPose>>;
  cameraView: CameraViewMode;
  setCameraView: React.Dispatch<React.SetStateAction<CameraViewMode>>;
  selectedSectorId: SectorId | null;
  setSelectedSectorId: React.Dispatch<React.SetStateAction<SectorId | null>>;
  overviewSelection: SelectionTarget;
  setOverviewSelection: React.Dispatch<React.SetStateAction<SelectionTarget>>;

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

  // Persona Incident Integration
  reportPersonaObservation: (obs: {
    type: 'fall' | 'audio_distress';
    personaIndex: number;
    worldPos: [number, number];
    action: string;
  }) => { detected: boolean; reason: string; incidentId?: string };
}

const ParkContext = createContext<ParkContextType | undefined>(undefined);

function initialLighting(): LightingMap {
  return Object.fromEntries(POLES.map((p) => [p.id, 70]));
}

const STORAGE_KEY = 'xsense_shared_session_v1';

function loadSessionState(): {
  incidents?: Incident[];
  guards?: Guard[];
  dispatchedGuards?: DispatchedGuardState[];
} {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export const ParkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resetAllPersonas } = usePersonaStateMachine(true);
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
  const [guards, setGuards] = useState<Guard[]>(() => loadSessionState().guards ?? GUARDS);
  const [dispatchedGuards, setDispatchedGuards] = useState<DispatchedGuardState[]>(
    () => loadSessionState().dispatchedGuards ?? [],
  );
  const [incidents, setIncidents] = useState<Incident[]>(
    () => loadSessionState().incidents ?? [],
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Persisted Map View & Inspection State across Route Navigations
  const [mapMode, setMapMode] = useState<'blueprint' | 'assets'>('blueprint');
  const [showCCTV, setShowCCTV] = useState<boolean>(true);
  const [showAudioCoverage, setShowAudioCoverage] = useState<boolean>(false);
  const [showDeviceLabels, setShowDeviceLabels] = useState<boolean>(false);
  const [showStudyPosts, setShowStudyPosts] = useState<boolean>(false);
  const [showLidarRanges, setShowLidarRanges] = useState<boolean>(false);
  const [showLidarCoverage, setShowLidarCoverage] = useState<boolean>(true);
  const [selectedLidarId, setSelectedLidarId] = useState<string | null>(null);
  const [simulationDiagnostics, setSimulationDiagnostics] = useState<SimulationDiagnosticEntry[]>([]);

  const clearSimulationDiagnostics = useCallback(() => {
    setSimulationDiagnostics([]);
  }, []);
  const [observationsByCluster, setObservationsByCluster] = useState<ObservationByCluster>({});
  const clearObservationsByCluster = useCallback(() => {
    setObservationsByCluster({});
  }, []);
  const [selectedPlannedLidar, setSelectedPlannedLidar] = useState<string>('');
  const [perspPose, setPerspPose] = useState<CameraPose>(OVERVIEW_PERSPECTIVE_POSE);
  const [radarPose, setRadarPose] = useState<CameraPose>(OVERVIEW_RADAR_POSE);
  const [cameraView, setCameraView] = useState<CameraViewMode>('3d');
  const [selectedSectorId, setSelectedSectorId] = useState<SectorId | null>(null);
  const [overviewSelection, setOverviewSelection] = useState<SelectionTarget>({
    type: 'pole',
    poleId: 'AS-103',
  });

  const showLidarPlan = showStudyPosts;
  const setShowLidarPlan = setShowStudyPosts;

  const cameraPose = cameraView === 'radar' ? radarPose : perspPose;
  const setCameraPose: React.Dispatch<React.SetStateAction<CameraPose>> = useCallback(
    (action) => {
      if (cameraView === 'radar') {
        setRadarPose(action);
      } else {
        setPerspPose(action);
      }
    },
    [cameraView],
  );

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
    let targetSelectedId: string = incoming.id;

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
          targetSelectedId = existing.id;
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
      targetSelectedId = withMeta.id;
      return [withMeta, ...prev];
    });

    setSelectedIncidentId(targetSelectedId);
  }, []);

  // ── Persona Observation Integration Handler ─────────────────────────────
  const reportPersonaObservation = useCallback(
    (obs: {
      type: 'fall' | 'audio_distress';
      personaIndex: number;
      worldPos: [number, number];
      action: string;
    }): { detected: boolean; reason: string; incidentId?: string } => {
      const [x, z] = obs.worldPos;
      const OPERATIONAL_RADIUS_M = 12.0;

      // Find nearest online operational smart pole (AS-101..AS-105)
      let nearestPole: (typeof POLES)[0] | null = null;
      let minDistance = Infinity;

      for (const pole of POLES) {
        if (pole.sensorStatus !== 'online' || pole.id === offlinePoleId) continue;
        const dx = x - pole.position[0];
        const dz = z - pole.position[1];
        const dist = Math.hypot(dx, dz);
        if (dist < minDistance) {
          minDistance = dist;
          nearestPole = pole;
        }
      }

      // Audio simulation retains its legacy pole-radius gate.
      // Fall observations are gated exclusively by the authoritative LiDAR
      // range/FOV/LOS engine below, not by this legacy smart-pole radius.
      if (obs.type === 'audio_distress' && (!nearestPole || minDistance > OPERATIONAL_RADIUS_M)) {
        return {
          detected: false,
          reason: `Coverage Gap: Location [${x.toFixed(1)}, ${z.toFixed(1)}] is outside active sensor radius (${minDistance.toFixed(1)}m > ${OPERATIONAL_RADIUS_M}m to nearest pole ${nearestPole?.id || 'none'}).`,
        };
      }

      // The fall branch determines its own valid LiDAR-mounted pole.
      // Acoustic observations require the checked nearest online pole.
      const pole = nearestPole ?? POLES[0];
      const now = new Date().toLocaleTimeString();
      const nowEpoch = Date.now();
      const suffix = nowEpoch.toString().slice(-4);
      const isRouteBlocked = blockedRouteZone === 'central_path';
      const lightNote = isRouteBlocked
        ? 'Nearby lights on — route not verified.'
        : `Nearby Lights On — Local pole ${pole.id} boosted to 100%.`;

      let newIncident: Incident;

      if (obs.type === 'fall') {
        // Authoritative geometric LiDAR fall evaluation
        const evalResult = evaluateCollapseAgainstAllLidars([x, 0.34, z], offlinePoleId, blockedRouteZone);

        if (!evalResult.detected) {
          // COVERAGE GAP — Fall Not Detected by LiDAR
          // Explicitly do not trigger incident, alert, or lighting response
          setLatestLidarEval({
            scenario_kind: 'silent_fall',
            device_id: evalResult.nearestPoleId === 'AS-103' ? 'LID-001' : 'LID-002',
            zone_id: 'coverage_gap',
            pole_id: evalResult.nearestPoleId || 'none',
            source_mode: 'simulated',
            detected: false,
            trigger_incident: false,
            event_type: 'coverage_gap_missed',
            priority: 'coverage_warning',
            plain_label: 'Coverage Gap — Fall Not Detected by LiDAR',
            plain_reason: evalResult.failureReason,
            kinematics: {
              initial_height_m: 1.72,
              final_height_m: 0.34,
              drop_speed_mps: -1.42,
              horizontal_speed_mps: 0.0,
              aspect_ratio: 0.21,
              stationary_seconds: 45,
              box_dimensions_m: [1.65, 0.34, 0.60],
            },
            lighting_boost_pct: null,
            lighting_note: 'No automatic light boost (Coverage Gap — Fall Not Detected by LiDAR).',
            camera_context: 'No camera view available in unmonitored zone. On-site check required.',
          });

          // Record in simulation diagnostics
          const diagEntry: SimulationDiagnosticEntry = {
            id: `DIAG-${nowEpoch}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            epochMs: nowEpoch,
            eventType: 'coverage_gap_fall',
            title: 'Coverage Gap — Fall Not Detected by LiDAR',
            details: evalResult.diagnosticDetails,
            personaIndex: obs.personaIndex,
            worldPosition: [x, 0.34, z],
            primarySensorId: undefined,
            nearestPoleId: evalResult.nearestPoleId,
            distanceToNearestSensorM: evalResult.distanceToNearestSensorM,
            failureReason: evalResult.failureReason,
            checks: evalResult.allSensorEvaluations.find(s => s.poleId === evalResult.nearestPoleId)?.checks || {
              sensorStatus: { passed: false, note: 'Offline' },
              range: { passed: false, distanceM: minDistance, maxRangeM: 13.0 },
              fieldOfView: { passed: false, angleDeg: 0, fovDeg: 0 },
              lineOfSight: { passed: false },
            },
          };
          setSimulationDiagnostics((prev) => [diagEntry, ...prev.slice(0, 49)]);

          // Key observation record by the specific persona's cluster ID
          const clusterId = `LIDAR-P-0${obs.personaIndex + 1}`;
          const obsRecord: PersonaObservationRecord = {
            clusterId,
            personaIndex: obs.personaIndex,
            timestampMs: nowEpoch,
            timeStr: now,
            detected: false,
            scenarioKind: 'fall',
            primarySensorId: undefined,
            nearestPoleId: evalResult.nearestPoleId,
            distanceToNearestSensorM: evalResult.distanceToNearestSensorM,
            reason: evalResult.failureReason,
          };
          setObservationsByCluster((prev) => ({ ...prev, [clusterId]: obsRecord }));

          return {
            detected: false,
            reason: `Coverage Gap — Fall Not Detected by LiDAR: ${evalResult.failureReason}`,
          };
        }

        // VALID LIDAR FALL DETECTED (All geometric and status conditions passed)
        const primary = evalResult.primarySensor!;
        const pole = POLES.find((p) => p.id === primary.poleId) || nearestPole || POLES[3];
        setFallPoleId(primary.poleId);
        setLighting((prev) => ({ ...prev, [primary.poleId]: 100 }));
        const detectedLightNote = isRouteBlocked
          ? 'Nearby lights on — route not verified.'
          : `Nearby Lights On — Local pole ${primary.poleId} boosted to 100%.`;
        setLightingNote(detectedLightNote);

        const incId = `INC-${suffix}`;
        const sourceDev = evalResult.corroboratingSensors.length > 0
          ? `${primary.sensorId} + ${evalResult.corroboratingSensors.map((c) => c.sensorId).join(', ')} · Mounted on ${primary.poleId}`
          : `${primary.sensorId} · Mounted on ${primary.poleId}`;

        newIncident = {
          id: incId,
          createdAt: now,
          zoneId: primary.zoneId,
          zoneName: primary.zoneName,
          poleId: primary.poleId,
          type: 'silent_fall',
          displayType: 'Unusual Movement (Possible Fall)',
          priority: 'needs_review',
          status: 'open',
          reason: `SIMULATED: 3D cluster height collapsed from 1.72m to 0.34m near ${primary.poleId} (${primary.distanceM}m away). Reviewable without requiring sound.`,
          sourceMode: 'simulated',
          score: 0.86,
          lightingResponseNote: detectedLightNote,
          cameraContext:
            primary.poleId === 'AS-101'
              ? 'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.'
              : primary.poleId === 'AS-105'
              ? 'CAM-02 (East Exit CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.'
              : 'No camera view available in this zone. On-site check required.',
          sensorBasis: `LiDAR cluster height drop: 1.72m → 0.34m | Distance: ${primary.distanceM}m from ${primary.poleId} (${primary.sensorId}) | LOS: Verified Clear`,
          occurrenceCount: 1,
          lastUpdatedEpoch: nowEpoch,
          activityTrail: [
            { time: now, action: `Unusual movement anomaly verified by ${primary.sensorId} near ${primary.poleId}`, actor: 'LiDAR Pipeline' },
            { time: now, action: detectedLightNote, actor: 'Safety Lighting Response' },
          ],
        };

        addEvent(
          `Possible Fall — ${primary.zoneName} · ${primary.poleId}`,
          `SIMULATED: 3D cluster height collapsed to 0.34m observed by ${primary.sensorId}. Light raised to 100%. Guard review needed.`,
          'warning',
          primary.poleId,
          {
            sourceDevice: sourceDev,
            sensorBasis: `Height: 0.34m | Drop speed: -1.42 m/s | Distance: ${primary.distanceM}m from ${primary.poleId}`,
            lightingAction: detectedLightNote,
            cameraAvailability: newIncident.cameraContext,
          },
        );

        upsertSensorIncident(newIncident);
        setSelectedIncidentId(newIncident.id);

        // Record successful detection in simulation diagnostics
        const diagEntry: SimulationDiagnosticEntry = {
          id: `DIAG-${nowEpoch}-${Math.floor(Math.random() * 1000)}`,
          timestamp: now,
          epochMs: nowEpoch,
          eventType: 'detected_fall',
          title: `Fall Detected by LiDAR · ${primary.sensorId}`,
          details: evalResult.diagnosticDetails,
          personaIndex: obs.personaIndex,
          worldPosition: [x, 0.34, z],
          primarySensorId: primary.sensorId,
          nearestPoleId: primary.poleId,
          distanceToNearestSensorM: primary.distanceM,
          failureReason: '',
          checks: primary.checks,
        };
        setSimulationDiagnostics((prev) => [diagEntry, ...prev.slice(0, 49)]);

        // Key observation record by the specific persona's cluster ID
        const clusterId = `LIDAR-P-0${obs.personaIndex + 1}`;
        const obsRecord: PersonaObservationRecord = {
          clusterId,
          personaIndex: obs.personaIndex,
          timestampMs: nowEpoch,
          timeStr: now,
          detected: true,
          scenarioKind: 'fall',
          primarySensorId: primary.sensorId,
          nearestPoleId: primary.poleId,
          distanceToNearestSensorM: primary.distanceM,
          reason: `Detected by ${primary.sensorId} (${primary.distanceM}m away)`,
        };
        setObservationsByCluster((prev) => ({ ...prev, [clusterId]: obsRecord }));

        return {
          detected: true,
          reason: `Operational sensor ${primary.sensorId} detected fall (${primary.distanceM}m away).`,
          incidentId: newIncident.id,
        };
      } else {
        // audio_distress
        setAcousticPoleId(pole.id);
        const incId = `INC-${suffix}`;
        newIncident = {
          id: incId,
          createdAt: now,
          zoneId: pole.zone,
          zoneName: pole.name,
          poleId: pole.id,
          type: 'possible_scream',
          displayType: 'Possible Distress Sound',
          priority: 'needs_review',
          status: 'open',
          reason: `SIMULATED: Vocal distress acoustic cue logged near ${pole.name} (${pole.id}). Verified via acoustic sensor simulation.`,
          sourceMode: 'simulated',
          score: 0.84,
          lightingResponseNote: 'Normal lighting maintained',
          cameraContext:
            pole.id === 'AS-101'
              ? 'CAM-01 (North Gate CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.'
              : pole.id === 'AS-105'
              ? 'CAM-02 (East Exit CCTV) covers this zone — Inventory marker only; live stream not connected. On-site check required.'
              : 'No camera view available in this zone. On-site check required.',
          sensorBasis: `Acoustic distress verification at ${pole.id} (YAMNet vocal distress profile)`,
          occurrenceCount: 1,
          lastUpdatedEpoch: nowEpoch,
          activityTrail: [
            { time: now, action: `Acoustic distress signal detected near ${pole.name} (${pole.id})`, actor: 'Acoustic Pipeline' },
          ],
        };

        addEvent(
          `Distress Sound — ${pole.name} · ${pole.id}`,
          `SIMULATED: Synthetic acoustic distress cue verified near ${pole.name} (${pole.id}). Guard review needed.`,
          'warning',
          pole.id,
          {
            sourceDevice: `AUD-001 · Mounted on ${pole.id}`,
            sensorBasis: `Acoustic distress request verified near ${pole.id}`,
            lightingAction: 'Normal lighting maintained',
            cameraAvailability: newIncident.cameraContext,
          },
        );
      }

      upsertSensorIncident(newIncident);
      setSelectedIncidentId(newIncident.id);

      return {
        detected: true,
        reason: `Operational sensor ${pole.id} detected event (${minDistance.toFixed(1)}m away).`,
        incidentId: newIncident.id,
      };
    },
    [addEvent, blockedRouteZone, offlinePoleId, upsertSensorIncident],
  );

  useEffect(() => subscribePersonaObservations(reportPersonaObservation), [reportPersonaObservation]);

  const resetView = useCallback(() => {
    setSelectedSectorId(null);
    if (cameraView === 'radar') {
      setRadarPose(OVERVIEW_RADAR_POSE);
    } else {
      setPerspPose(OVERVIEW_PERSPECTIVE_POSE);
    }
    setResetCounter((c) => c + 1);
  }, [cameraView]);

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

  // 1b. Silent Possible Fall (AS-104) — Gated by authoritative LiDAR sensing geometry
  const triggerSilentFall = useCallback(async (): Promise<LidarEvaluationResult> => {
    setIsLookalikeStop(false);
    setSelectedPoleId('AS-104');

    const targetPos: [number, number, number] = [-11.0, 0.34, 9.5];
    stageDemoCollapse(0, targetPos);
    const isRouteBlocked = blockedRouteZone === 'central_path';

    // Authoritative geometric evaluation check
    const evalGeo = evaluateCollapseAgainstAllLidars(targetPos, offlinePoleId, blockedRouteZone);

    let evalResult: LidarEvaluationResult;
    try {
      const apiRes = await evaluateLidarScenario(
        'silent_fall',
        'LID-002',
        'west_path',
        'AS-104',
        offlinePoleId === 'AS-104' || !evalGeo.detected,
        isRouteBlocked,
        [-11.0, 9.5],
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
        detected: evalGeo.detected,
        trigger_incident: evalGeo.detected,
        event_type: evalGeo.detected ? 'silent_fall' : 'coverage_gap_missed',
        priority: evalGeo.detected ? 'needs_review' : 'coverage_warning',
        score: 0.86,
        plain_label: evalGeo.detected ? 'Unusual Movement (Possible Fall)' : 'Coverage Gap — Fall Not Detected by LiDAR',
        plain_reason: evalGeo.detected
          ? 'Possible fall followed by prolonged low movement: 3D cluster height dropped from 1.72m to 0.34m (-1.42 m/s) and remained motionless on the ground for 45s. Reviewable without requiring sound.'
          : evalGeo.failureReason,
        kinematics: {
          initial_height_m: 1.72,
          final_height_m: 0.34,
          drop_speed_mps: -1.42,
          horizontal_speed_mps: 0.01,
          aspect_ratio: 0.21,
          stationary_seconds: 45,
          box_dimensions_m: [1.65, 0.34, 0.60],
        },
        lighting_boost_pct: evalGeo.detected ? 100 : null,
        lighting_note: evalGeo.detected ? fallbackLightNote : 'No automatic light boost (Coverage Gap — Fall Not Detected by LiDAR).',
        camera_context: 'No camera view available (outside CAM-01 / CAM-02 coverage). On-site check required.',
      };
    }

    // A backend response must not present a positive detection after the local gate missed.
    if (!evalGeo.detected) {
      evalResult = {
        ...evalResult, detected: false, trigger_incident: false,
        event_type: 'coverage_gap_missed', priority: 'coverage_warning',
        plain_label: evalGeo.diagnosticTitle, plain_reason: evalGeo.failureReason,
        lighting_boost_pct: null,
        lighting_note: 'No automatic light boost (Coverage Gap — Fall Not Detected by LiDAR).',
      };
    }

    const now = new Date().toLocaleTimeString();
    const nowEpoch = Date.now();

    // COVERAGE GAP OR SENSOR FAILURE: Do NOT create an incident or boost lighting
    if (!evalGeo.detected || evalResult.trigger_incident === false) {
      setFallPoleId(null);
      setLatestLidarEval(evalResult);

      const diagEntry: SimulationDiagnosticEntry = {
        id: `DIAG-${nowEpoch}-${Math.floor(Math.random() * 1000)}`,
        timestamp: now,
        epochMs: nowEpoch,
        eventType: 'coverage_gap_fall',
        title: 'Coverage Gap — Fall Not Detected by LiDAR',
        details: evalGeo.diagnosticDetails,
        worldPosition: targetPos,
        nearestPoleId: evalGeo.nearestPoleId,
        distanceToNearestSensorM: evalGeo.distanceToNearestSensorM,
        failureReason: evalGeo.failureReason || evalResult.plain_reason,
        checks: evalGeo.allSensorEvaluations.find(s => s.poleId === evalGeo.nearestPoleId)?.checks || {
          sensorStatus: { passed: false, note: 'Offline' },
          range: { passed: false, distanceM: 0, maxRangeM: 13.0 },
          fieldOfView: { passed: false, angleDeg: 0, fovDeg: 0 },
          lineOfSight: { passed: false },
        },
      };
      setSimulationDiagnostics((prev) => [diagEntry, ...prev.slice(0, 49)]);

      return evalResult;
    }

    // CONDITIONS PASSED: Fall verified by operational LiDAR
    setFallPoleId('AS-104');
    setLatestLidarEval(evalResult);
    setLighting((prev) => ({ ...prev, 'AS-104': 100 }));
    setLightingNote(evalResult.lighting_note);

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
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

    // Record verified detection diagnostic
    const diagEntry: SimulationDiagnosticEntry = {
      id: `DIAG-${nowEpoch}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      epochMs: nowEpoch,
      eventType: 'detected_fall',
      title: 'Fall Detected by LiDAR · LID-002',
      details: evalGeo.diagnosticDetails,
      worldPosition: targetPos,
      primarySensorId: 'LID-002',
      nearestPoleId: 'AS-104',
      distanceToNearestSensorM: evalGeo.distanceToNearestSensorM,
      failureReason: '',
      checks: evalGeo.primarySensor?.checks || {
        sensorStatus: { passed: true, note: 'Online' },
        range: { passed: true, distanceM: 2.1, maxRangeM: 13.0 },
        fieldOfView: { passed: true, angleDeg: 15, fovDeg: 210 },
        lineOfSight: { passed: true },
      },
    };
    setSimulationDiagnostics((prev) => [diagEntry, ...prev.slice(0, 49)]);

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
    setSelectedPoleId('AS-104');

    const targetPos: [number, number, number] = [-11.0, 0.34, 9.5];
    stageDemoCollapse(0, targetPos);
    const isRouteBlocked = blockedRouteZone === 'central_path';

    // Verify LiDAR fall detection geometry before corroborating
    const evalGeo = evaluateCollapseAgainstAllLidars(targetPos, offlinePoleId, blockedRouteZone);
    if (!evalGeo.detected) {
      setAcousticPoleId('AS-104');
      setFallPoleId(null);
      const now = new Date().toLocaleTimeString();
      const nowEpoch = Date.now();
      const diagEntry: SimulationDiagnosticEntry = {
        id: `DIAG-${nowEpoch}-${Math.floor(Math.random() * 1000)}`,
        timestamp: now,
        epochMs: nowEpoch,
        eventType: 'coverage_gap_fall',
        title: 'Coverage Gap — Fall Not Detected by LiDAR',
        details: `Combined signals could not corroborate at West Loop: ${evalGeo.failureReason}. Urgent escalation prevented.`,
        worldPosition: targetPos,
        nearestPoleId: evalGeo.nearestPoleId,
        distanceToNearestSensorM: evalGeo.distanceToNearestSensorM,
        failureReason: evalGeo.failureReason,
        checks: evalGeo.allSensorEvaluations.find(s => s.poleId === evalGeo.nearestPoleId)?.checks || {
          sensorStatus: { passed: false, note: 'Offline' },
          range: { passed: false, distanceM: 0, maxRangeM: 13.0 },
          fieldOfView: { passed: false, angleDeg: 0, fovDeg: 0 },
          lineOfSight: { passed: false },
        },
      };
      setSimulationDiagnostics((prev) => [diagEntry, ...prev.slice(0, 49)]);
      return;
    }

    setFallPoleId('AS-104');
    setAcousticPoleId('AS-104');
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
    resetAllPersonas();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const ch = new BroadcastChannel('xsense_state_sync');
      ch.postMessage({ type: 'RESET_ALL' });
      ch.close();
    }
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
    setPerspPose(OVERVIEW_PERSPECTIVE_POSE);
    setRadarPose(OVERVIEW_RADAR_POSE);
    setCameraView('3d');
    setSelectedSectorId(null);
    setOverviewSelection({ type: 'pole', poleId: 'AS-103' });
    setMapMode('blueprint');
    setShowCCTV(true);
    setShowAudioCoverage(false);
    setShowDeviceLabels(false);
    setShowStudyPosts(false);
    setShowLidarRanges(false);
    setShowLidarCoverage(true);
    setSelectedLidarId(null);
    setSimulationDiagnostics([]);
    setSelectedPlannedLidar('');
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

  const isFirstRenderRef = useRef(true);
  const isRemoteUpdateRef = useRef(false);

  // Always keep 3D emergency states (fallPoleId, sosPoleId, acousticPoleId, etc.) reconciled with open incidents
  useEffect(() => {
    const openList = incidents.filter(
      (i) => i.status !== 'resolved' && i.status !== 'false_alarm',
    );

    const openFall = openList.find(
      (i) => i.type === 'silent_fall' || i.type === 'combined_anomaly',
    );
    setFallPoleId(openFall ? openFall.poleId : null);
    if (openFall) setIsLookalikeStop(false);

    const openAcoustic = openList.find(
      (i) => i.type === 'possible_scream' || i.type === 'combined_anomaly',
    );
    setAcousticPoleId(openAcoustic ? openAcoustic.poleId : null);

    const openSOS = openList.find((i) => i.type === 'resident_sos');
    setSosPoleId(openSOS ? openSOS.poleId : null);

    const openOffline = openList.find((i) => i.type === 'sensor_offline');
    setOfflinePoleId(openOffline ? openOffline.poleId : null);

    const openBlocked = openList.find((i) => i.type === 'route_blocked');
    setBlockedRouteZone(openBlocked ? openBlocked.zoneId : null);

    // Ensure any pole with an active fall/combined/SOS incident is at 100%, and restore resolved 100% poles to 70%
    setLighting((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const pole of POLES) {
        const hasBoostedIncident = openList.some(
          (i) =>
            i.poleId === pole.id &&
            (i.type === 'silent_fall' ||
              i.type === 'combined_anomaly' ||
              i.type === 'resident_sos'),
        );
        const hasDarkIncident = openList.some(
          (i) => i.poleId === pole.id && i.type === 'lighting_warning',
        );
        if (hasBoostedIncident && next[pole.id] !== 100) {
          next[pole.id] = 100;
          changed = true;
        } else if (!hasBoostedIncident && !hasDarkIncident && next[pole.id] === 100) {
          next[pole.id] = 70;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    const openBoosted = openList.find(
      (i) =>
        i.type === 'silent_fall' ||
        i.type === 'combined_anomaly' ||
        i.type === 'resident_sos',
    );
    setLightingNote(openBoosted?.lightingResponseNote || '');
  }, [incidents]);

  // Multi-tab BroadcastChannel listener
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('xsense_state_sync');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'REQUEST_STATE') {
        // Another tab just opened and requested the authoritative state from an active tab
        setIncidents((currentIncidents) => {
          if (currentIncidents.length > 0) {
            channel.postMessage({
              type: 'STATE_SNAPSHOT',
              incidents: currentIncidents,
              guards,
              dispatchedGuards,
            });
          }
          return currentIncidents;
        });
        return;
      }

      if (data.type === 'STATE_SNAPSHOT') {
        isRemoteUpdateRef.current = true;
        if (Array.isArray(data.incidents)) setIncidents(data.incidents);
        if (Array.isArray(data.guards)) setGuards(data.guards);
        if (Array.isArray(data.dispatchedGuards)) setDispatchedGuards(data.dispatchedGuards);
        return;
      }

      if (data.type === 'SOS_CREATED' && data.incident) {
        const inc = data.incident as Incident;
        isRemoteUpdateRef.current = true;
        setIncidents((prev) => {
          if (prev.some((i) => i.id === inc.id)) return prev;
          return [inc, ...prev];
        });
        setSelectedIncidentId(inc.id);
        if (inc.poleId) setSelectedPoleId(inc.poleId);
        return;
      }

      if (data.type === 'RESET_ALL') {
        isRemoteUpdateRef.current = true;
        sessionStorage.removeItem(STORAGE_KEY);
        setIncidents([]);
        setGuards(GUARDS);
        setDispatchedGuards([]);
        setLighting(initialLighting());
        setLightingNote('');
        setIsLookalikeStop(false);
        setIsRaining(false);
      }
    };

    // Ask any existing tab for the latest state on mount
    channel.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      channel.close();
    };
  }, []);

  // Multi-tab BroadcastChannel publisher (NEVER broadcasts on first render or remote updates)
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ incidents, guards, dispatchedGuards }),
      );
    } catch {
      /* ignore storage quota errors */
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('xsense_state_sync');
    channel.postMessage({
      type: 'STATE_SNAPSHOT',
      incidents,
      guards,
      dispatchedGuards,
    });
    channel.close();
  }, [incidents, guards, dispatchedGuards]);

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
    reportPersonaObservation,
    needsAttentionCount,
    darkAreasCount,
    sensorsOfflineCount,
    activeIncidentsCount,
    mapMode,
    setMapMode,
    showCCTV,
    setShowCCTV,
    showAudioCoverage,
    setShowAudioCoverage,
    showDeviceLabels,
    setShowDeviceLabels,
    showStudyPosts,
    setShowStudyPosts,
    showLidarRanges,
    setShowLidarRanges,
    showLidarCoverage,
    setShowLidarCoverage,
    selectedLidarId,
    setSelectedLidarId,
    simulationDiagnostics,
    clearSimulationDiagnostics,
    observationsByCluster,
    clearObservationsByCluster,
    showLidarPlan,
    setShowLidarPlan,
    selectedPlannedLidar,
    setSelectedPlannedLidar,
    cameraPose,
    setCameraPose,
    perspPose,
    setPerspPose,
    radarPose,
    setRadarPose,
    cameraView,
    setCameraView,
    selectedSectorId,
    setSelectedSectorId,
    overviewSelection,
    setOverviewSelection,
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
