import CaptureStatus from '../components/System/CaptureStatus';
// Park Overview — default guard console view.
// Desktop layout: 3D viewer (left ~65%) + sidebar (right ~35%).
import { useState, useRef, useEffect, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Scene from '../components/Park3D/Scene';
import { CCTV_CAMERAS } from '../components/Park3D/CameraAndGapOverlay';
import StatusLabel from '../components/StatusLabel';
import { PLANNED_LIDARS, LIDAR_PLAN_NOTE } from '../data/lidarPlan';
import { POLES } from '../data/parkData';
import { OPERATIONAL_LIDARS } from '../data/lidarData';
import { PERSONA_DEFINITIONS } from '../data/personaData';
import { getGlobalPersonaStates, usePersonaStateMachine } from '../hooks/usePersonaStateMachine';
import type { PersonaActionType } from '../types/persona';
import { usePark } from '../context/ParkContext';
import type { ResidentialBlindSpotResult } from '../context/ParkContext';
import { NO_CAMERA_VIEW_MESSAGE } from '../utils/cameraCoverage';
import { alertFocusKey, nextFocusAlert } from '../utils/alertFocus';
import { formatPersonaState } from '../utils/personaStateLabels';
import PersonDetailsCard, {
  type VisitorDetectionRecord,
} from '../components/Sidebar/PersonDetailsCard';

const QUICK_ACTION_LABELS: Record<string, string> = {
  pause_tree: 'Stop upright',
  crouch: 'Crouch',
  collapse: 'Collapse selected visitor here',
  call_help: 'Call for Help',
};

const QUICK_ACTION_IDS = ['pause_tree', 'crouch', 'collapse', 'call_help'];

function SummaryStats({
  needsAttention,
  darkAreas,
  sensorsOffline,
}: {
  needsAttention: number;
  darkAreas: number;
  sensorsOffline: number;
}) {
  return (
    <div className="summary-stats">
      <div
        className={`stat-card ${needsAttention > 0 ? 'urgent' : 'ok'}`}
        aria-label={`${needsAttention} items need attention`}
      >
        <span className="stat-value">{needsAttention}</span>
        <span className="stat-label">Needs Attention</span>
      </div>
      <div
        className={`stat-card ${darkAreas > 0 ? 'warning' : 'ok'}`}
        aria-label={`${darkAreas} dark areas`}
      >
        <span className="stat-value">{darkAreas}</span>
        <span className="stat-label">Dark Areas</span>
      </div>
      <div
        className={`stat-card ${sensorsOffline > 0 ? 'offline' : 'ok'}`}
        aria-label={`${sensorsOffline} sensors offline`}
      >
        <span className="stat-value">{sensorsOffline}</span>
        <span className="stat-label">Sensors Offline</span>
      </div>
    </div>
  );
}

import type { SelectionTarget, CameraViewMode } from '../types';
import type { SectorId } from '../data/sectors';
import { SECTOR_BOUNDS, SECTOR_LIST } from '../data/sectors';

function sectorForAlert(poleId: string) {
  const configured = SECTOR_LIST.find((sector) => sector.operationalDevices.includes(poleId));
  if (configured) return configured;
  const pole = POLES.find((item) => item.id === poleId);
  if (!pole) return undefined;
  return SECTOR_LIST.find((sector) => {
    const bounds = SECTOR_BOUNDS[sector.id];
    const [x, z] = pole.position;
    return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  });
}

type SidebarTab = 'details' | 'demo';

export default function ParkOverview() {
  const location = useLocation();
  const [locatedIncidentId, setLocatedIncidentId] = useState<string | null>(
    () => location.state?.locatedIncidentId ?? null,
  );
  const {
    selectedPoleId,
    setSelectedPoleId,
    lighting,
    setPoleLight,
    lightingNote,
    nightMode,
    setNightMode,
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
    observationsByCluster,
    selectedPlannedLidar,
    setSelectedPlannedLidar,
    cameraPose,
    perspPose,
    radarPose,
    setCameraPose,
    cameraView,
    setCameraView,
    selectedSectorId,
    setSelectedSectorId,
    overviewSelection: selection,
    setOverviewSelection: setSelection,
    clearLatestResults,
    incidents,
    setSelectedIncidentId,
    triggerSilentFall,
    triggerResidentialBlindSpotFall,
    triggerStandingStopLookalike,
    triggerScream,
    triggerCombined,
    triggerUnrelatedSignals,
    triggerBenignRain,
    triggerDark,
    triggerUnsafeRoute,
    triggerOffline,
    handleReset,
    guards,
    dispatchedGuards,
    removeDispatchedGuard,
    needsAttentionCount,
    darkAreasCount,
    sensorsOfflineCount,
    activeIncidentsCount,
  } = usePark();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('details');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [blindSpotResult, setBlindSpotResult] = useState<ResidentialBlindSpotResult | null>(null);
  const [sectorFlyTrigger, setSectorFlyTrigger] = useState<number>(0);
  const [autoFocusAlert, setAutoFocusAlert] = useState(false);
  const previousAlertsRef = useRef(new Map<string, string>());

  // 4 Hz throttled runtime position reader for selected persona (zero overhead on 60 FPS Three.js loop)
  const [uiRuntimePos, setUiRuntimePos] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    if (selection.type !== 'person') return;
    const personaIdx = selection.dotIndex;
    const timer = setInterval(() => {
      const states = getGlobalPersonaStates();
      const p = states[personaIdx];
      if (p) {
        setUiRuntimePos(p.worldPosition);
      }
    }, 250);

    const states = getGlobalPersonaStates();
    if (states[personaIdx]) {
      setUiRuntimePos(states[personaIdx].worldPosition);
    }
    return () => clearInterval(timer);
  }, [selection]);

  const {
    states: personaStates,
    backgroundActivityEnabled,
    dispatchAction: dispatchPersonaAction,
    recoverPersona,
    toggleBackgroundActivity,
  } = usePersonaStateMachine();

  const [lastDetectionByPersonaId, setLastDetectionByPersonaId] = useState<Record<string, VisitorDetectionRecord | undefined>>({});
  const [lastFeedbackMessage, setLastFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setLastDetectionByPersonaId((prev) => {
      let changed = false;
      const next = { ...prev };
      PERSONA_DEFINITIONS.forEach((def, idx) => {
        const clusterId = `LIDAR-P-0${idx + 1}`;
        const obs = observationsByCluster[clusterId];
        if (obs) {
          next[def.id] = {
            personaId: def.id,
            clusterId,
            verdict: obs.detected
              ? `Fall Detected (${obs.primarySensorId || 'LiDAR'})`
              : `Coverage Gap (${obs.reason || 'Not detected'})`,
            sensorId: obs.primarySensorId ?? null,
            poleId: obs.nearestPoleId ?? null,
            distanceM: obs.distanceToNearestSensorM ?? null,
            timestampIso: obs.timeStr,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [observationsByCluster]);

  const selectedPersonaId =
    selection.type === 'person'
      ? PERSONA_DEFINITIONS[selection.dotIndex]?.id || PERSONA_DEFINITIONS[0].id
      : PERSONA_DEFINITIONS[0].id;

  const operationalLidarNodes = useMemo(() => {
    return OPERATIONAL_LIDARS.map((s) => ({
      id: s.id,
      poleId: s.mountPoleId,
      position: [s.position[0], s.mountHeightM, s.position[1]] as [number, number, number],
      status: (s.mountPoleId === offlinePoleId ? 'offline' : 'online') as 'online' | 'offline',
      minRangeM: s.minRangeM,
      maxRangeM: s.nominalRangeM,
    }));
  }, [offlinePoleId]);

  const personasForControlCenter = useMemo(() => {
    const ACTION_LABELS: Record<string, { label: string; icon: string; variant?: 'default' | 'warning' | 'danger' }> = {
      walk: { label: 'Walk', icon: '🚶' },
      jog: { label: 'Jog', icon: '🏃' },
      sprint: { label: 'Sprint', icon: '⚡' },
      crouch: { label: 'Crouch', icon: '🧘' },
      tie_shoelaces: { label: 'Tie Shoelaces', icon: '👟' },
      sit: { label: 'Sit (Ground)', icon: '🧎' },
      bench_rest: { label: 'Rest on Bench', icon: '🪑' },
      check_phone: { label: 'Check Phone', icon: '📱' },
      pause_tree: { label: 'Pause near Tree', icon: '🌳' },
      yoga: { label: 'Yoga (Tree Pose)', icon: '🤸' },
      jumping_jacks: { label: 'Jumping Jacks', icon: '⭐' },
      talking: { label: 'Talking', icon: '💬' },
      laughing: { label: 'Laughing', icon: '😄' },
      whistling: { label: 'Whistling', icon: '🎵' },
      child_crying: { label: 'Child Crying', icon: '😢' },
      collapse: { label: 'Collapse (Fall)', icon: '⚠️', variant: 'danger' },
      call_help: { label: 'Call for Help', icon: '🆘', variant: 'danger' },
    };

    const sectorLabels = [
      'West Loop (Sector A)',
      'Lake Loop & Bridge (Sector B)',
      'East Promenade (Sector C)',
      'North Entrance (Sector A)',
      'South Perimeter (Sector C)',
    ];

    return PERSONA_DEFINITIONS.map((def, idx) => {
      const runtime = personaStates[idx] || {
        worldPosition: [0, 0, 0] as [number, number, number],
        fsmState: 'autonomous_moving',
        currentAction: 'walk',
        stationaryDurationSec: 0,
      };
      const isCollapsed = runtime.fsmState === 'collapsed';
      const isSelected = selection.type === 'person' && selection.dotIndex === idx;
      const pos = isSelected ? uiRuntimePos : runtime.worldPosition;
      const actionLabel =
        ACTION_LABELS[runtime.currentAction || 'walk']?.label || runtime.currentAction || 'Walking';

      return {
        id: def.id,
        number: idx + 1,
        name: def.label,
        roleLabel: def.label,
        clusterId: `LIDAR-P-0${idx + 1}`,
        sectorLabel: sectorLabels[idx] || 'Park Grounds',
        state: runtime.fsmState,
        activeAction: actionLabel,
        position: pos,
        heightM: isCollapsed ? 0.34 : 1.72,
        motionStatus: isCollapsed
          ? `Motionless (${runtime.stationaryDurationSec || 0}s)`
          : `Active (${actionLabel})`,
        supportedActions: def.supportedActions.map((act) => ({
          id: act,
          label: ACTION_LABELS[act]?.label || act,
          icon: ACTION_LABELS[act]?.icon,
          variant: ACTION_LABELS[act]?.variant || (act === 'collapse' || act === 'call_help' ? 'danger' : 'default'),
        })),
      };
    });
  }, [personaStates, selection, uiRuntimePos]);

  useEffect(() => {
    const locatedIncidents = incidents.filter((incident) => sectorForAlert(incident.poleId));
    const alert = autoFocusAlert ? nextFocusAlert(locatedIncidents, previousAlertsRef.current) : undefined;
    previousAlertsRef.current = new Map(incidents.map((incident) => [incident.id, alertFocusKey(incident)]));
    if (!alert) return;

    // Incident pole is the available location reference in the current data model.
    // Unknown locations must not send the camera to an unrelated default sector.
    const sector = sectorForAlert(alert.poleId);
    if (!sector) return;
    setSelectedSectorId(sector.id);
    setSelectedPoleId(alert.poleId);
    setSelection({ type: 'pole', poleId: alert.poleId });
    setSectorFlyTrigger((count) => count + 1);
  }, [autoFocusAlert, incidents, setSelectedSectorId, setSelectedPoleId, setSelection]);

  const handleSelectSector = (sectorId: SectorId) => {
    setSelectedSectorId(sectorId);
    setSectorFlyTrigger((c) => c + 1);

    const primaryPoleMap: Record<SectorId, string> = {
      A: 'AS-101',
      B: 'AS-102',
      C: 'AS-104',
      D: 'AS-105',
    };
    const poleId = primaryPoleMap[sectorId];
    if (poleId) {
      setSelectedPoleId(poleId);
      setSelection({ type: 'pole', poleId });
    }
  };

  const handleSwitchCameraView = (view: CameraViewMode) => {
    setCameraView(view);
    setSectorFlyTrigger((c) => c + 1);
  };

  const handleSelectPole = (id: string) => {
    setSelectedPoleId(id);
    setSelection({ type: 'pole', poleId: id });
    setSidebarTab('details');
  };

  const handleSelectCamera = (cameraId: string) => {
    setSelection({ type: 'camera', cameraId });
    setSidebarTab('details');
  };

  const handleSelectAnonymousDot = (dotIndex: number, openDetails = true) => {
    const locations = [
      'West Loop · Near Pole AS-104',
      'Lake Loop & Footbridge · Near Pole AS-102',
      'East Exit Promenade · Near Pole AS-105',
      'North Entrance Connector · Near Pole AS-101',
      'Southern Arc Pathway · Near Pole AS-103',
    ];
    const states = getGlobalPersonaStates();
    const p = states[dotIndex];
    setSelection({
      type: 'person',
      dotIndex,
      approxLocation: locations[dotIndex] || 'Park Pathway',
      stationary: p?.fsmState === 'collapsed',
    });
    if (openDetails) setSidebarTab('details');
  };

  const handleSelectGuard = (guardId: string) => {
    setSelection({
      type: 'guard',
      guardId,
    });
    setSidebarTab('details');
  };

  const handleTriggerPersonaAction = (personaId: string, actionId: string) => {
    const idx = PERSONA_DEFINITIONS.findIndex((p) => p.id === personaId);
    if (idx < 0) return;
    const res = dispatchPersonaAction(idx, actionId as PersonaActionType);
    if (!res.success) {
      setLastFeedbackMessage(res.reason);
      return;
    }

    const actionLabel = QUICK_ACTION_LABELS[actionId] || actionId.replace(/_/g, ' ');
    const feedbackByAction: Record<string, string> = {
      pause_tree: `Visitor #${idx + 1} stopped upright — no fall alert (simulated).`,
      crouch: `Visitor #${idx + 1} crouched at the current position (simulated).`,
      collapse: `Visitor #${idx + 1} collapsed at the current map position (simulated).`,
      call_help: `Visitor #${idx + 1} is calling for help (simulated).`,
    };
    setLastFeedbackMessage(feedbackByAction[actionId] || `${actionLabel} applied to Visitor #${idx + 1}`);
    if (res.observation) {
      const obs = res.observation;
      setLastDetectionByPersonaId((prev) => ({
        ...prev,
        [personaId]: {
          personaId,
          clusterId: `LIDAR-P-0${idx + 1}`,
          verdict: obs.detected ? 'Fall Detected (Alert Triggered)' : 'Coverage Gap (Out of Range / Occluded)',
          sensorId: null,
          poleId: null,
          distanceM: null,
          timestampIso: new Date().toLocaleTimeString(),
        },
      }));
    }
  };

  const handleRecoverPersona = (personaId: string) => {
    const idx = PERSONA_DEFINITIONS.findIndex((p) => p.id === personaId);
    if (idx < 0) return;
    recoverPersona(idx);
    setLastFeedbackMessage(`Visitor #${idx + 1} recovered to normal patrol loop`);
  };

  const runSilentFallScenario = async () => {
    const res = await triggerSilentFall();
    setSelection({
      type: 'person',
      dotIndex: 0,
      approxLocation: 'West Loop · Near Pole AS-104',
      stationary: true,
    });
    setStatusBanner(
      `Silent Fall Detected: Height dropped 1.72m → 0.34m. AS-104 light boosted to 100% (${res.plain_label}).`,
    );
  };

  const runCombinedScenario = async () => {
    await triggerCombined();
    setSelection({
      type: 'person',
      dotIndex: 0,
      approxLocation: 'West Loop · Near Pole AS-104',
      stationary: true,
    });
    setStatusBanner(
      'Signals Agree (Urgent): Distress sound + LiDAR fall in West Loop within 15s window.',
    );
  };

  const runResidentialBlindSpotScenario = () => {
    const res = triggerResidentialBlindSpotFall();
    setBlindSpotResult(res);
    setSelection({
      type: 'person',
      dotIndex: 2,
      approxLocation: 'Sector D · East Lake Bank (Residential Route)',
      stationary: true,
    });
    const sensor = res.lidar.primarySensor;
    setStatusBanner(
      res.detected && sensor
        ? `CCTV Blind Spot: ${sensor.sensorId} detected the fall at ${sensor.distanceM}m. ${
            res.camera.covered
              ? `Estimated CCTV coverage from ${res.camera.coveredByCameraId}; no feed connected.`
              : `Estimated CCTV coverage: none — nearest ${res.camera.nearestCameraId} is ${res.camera.nearestDistanceM}m away and ${res.camera.nearestOffAxisDeg}° off its aim line. ${NO_CAMERA_VIEW_MESSAGE}`
          }`
        : `Fall not detected by operational LiDAR — ${res.reason}`,
    );
  };

  const runStandingStopScenario = async () => {
    const res = await triggerStandingStopLookalike();
    setSelection({
      type: 'person',
      dotIndex: 0,
      approxLocation: 'West Loop · Near Pole AS-104',
      stationary: false,
    });
    setStatusBanner(`LiDAR Lookalike Test: ${res.plain_label} — Height stays 1.72m upright.`);
  };

  const runUnrelatedSignalsScenario = async () => {
    await triggerUnrelatedSignals();
    setStatusBanner(
      'Different Zones: Scream at North Entrance (AS-101) + Fall at West Loop (AS-104) kept as 2 separate cases.',
    );
  };

  const handleResetViewAndVisitors = () => {
    setLocatedIncidentId(null);
    resetView();
    setStatusBanner('View and simulated visitor positions reset. Saved cases were not changed.');
  };

  const handleResetDemoSession = () => {
    handleReset();
    clearLatestResults();
    setBlindSpotResult(null);
    setLastFeedbackMessage(null);
    setStatusBanner(null);
  };

  const selectedPole = POLES.find((p) => p.id === selectedPoleId);
  const selectedCamera =
    selection.type === 'camera'
      ? CCTV_CAMERAS.find((c) => c.id === selection.cameraId) || CCTV_CAMERAS[0]
      : CCTV_CAMERAS[0];
  const selectedBrightness = lighting[selectedPoleId] ?? 70;
  const isSelectedOffline = offlinePoleId === selectedPoleId;
  const isSelectedAlert = fallPoleId === selectedPoleId || acousticPoleId === selectedPoleId || sosPoleId === selectedPoleId;
  const isDark = !isSelectedOffline && selectedBrightness < 30;
  const selectedPlannedSensor = PLANNED_LIDARS.find((p) => p.id === selectedPlannedLidar);
  const selectedPoleLidars = OPERATIONAL_LIDARS.filter((sensor) => sensor.mountPoleId === selectedPoleId);
  const activeCases = useMemo(
    () => incidents.filter((incident) => incident.status !== 'resolved' && incident.status !== 'false_alarm'),
    [incidents],
  );
  const selectedPersona =
    personasForControlCenter.find((persona) => persona.id === selectedPersonaId) || personasForControlCenter[0];

  const selectedPoleCctvText =
    selectedPole?.id === 'AS-101'
      ? 'CAM-01 nearby · View unverified'
      : selectedPole?.id === 'AS-105'
      ? 'CAM-02 nearby · View unverified'
      : selectedPole?.id === 'AS-102'
      ? 'CAM-05 proposed · View unverified'
      : selectedPole?.id === 'AS-104'
      ? 'CAM-04 proposed · View unverified'
      : 'No verified camera view';

  const handleSidebarTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextTab: SidebarTab = sidebarTab === 'details' ? 'demo' : 'details';
    setSidebarTab(nextTab);
    document.getElementById(`sidebar-${nextTab}-tab`)?.focus();
  };

  return (
    <div className="park-overview">
      {/* Top bar */}
      <div className="overview-top">
        <div className="overview-heading">
          <h1>Park Overview</h1>
          <p>
            {mapMode === 'blueprint'
              ? 'City of Elmina · GIS Tactical Blueprint (Digital Twin)'
              : 'City of Elmina · 3D Physical Park Assets & Surroundings'}
          </p>
        </div>
        <SummaryStats
          needsAttention={needsAttentionCount}
          darkAreas={darkAreasCount}
          sensorsOffline={sensorsOfflineCount}
        />
      </div>

      <CaptureStatus />
      {/* Main workspace */}
      <div className="workspace">
        {/* ── 3D Viewer ── */}
        <div className="viewer">
          {/* ── Compact Tactical HUD: Row 1 (Env & Layers ~44px) + Row 2 (Sectors & Camera ~42px) ── */}
          <div className="tactical-hud" role="toolbar" aria-label="Tactical map controls and navigation">
            {/* Row 1: Environment and layer controls */}
            <div className="hud-row hud-row-env">
              <div className="hud-group-left">
                <div className="map-mode-segmented" role="tablist" aria-label="Map Mode">
                  <button
                    type="button"
                    role="tab"
                    id="mode-blueprint-btn"
                    aria-selected={mapMode === 'blueprint'}
                    className={`mode-tab-btn ${mapMode === 'blueprint' ? 'active' : ''}`}
                    onClick={() => setMapMode('blueprint')}
                    title="GIS Tactical Blueprint (Operational digital twin with coordinate grid and contours)"
                  >
                    🗺️ GIS Blueprint
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="mode-assets-btn"
                    aria-selected={mapMode === 'assets'}
                    className={`mode-tab-btn ${mapMode === 'assets' ? 'active' : ''}`}
                    onClick={() => setMapMode('assets')}
                    title="3D Park Assets (Physical surroundings, trees, and buildings)"
                  >
                    🌳 3D Park Assets
                  </button>
                </div>
              </div>

              <div className="hud-group-middle">
                <label className="toggle-label" htmlFor="night-mode-toggle">
                  <input
                    type="checkbox"
                    checked={nightMode}
                    onChange={(e) => setNightMode(e.target.checked)}
                    id="night-mode-toggle"
                  />
                  Night mode
                </label>
                <label className="toggle-label" htmlFor="cctv-layer-toggle" title="Show estimated CCTV camera viewing cones">
                  <input
                    type="checkbox"
                    checked={showCCTV}
                    onChange={(e) => setShowCCTV(e.target.checked)}
                    id="cctv-layer-toggle"
                  />
                  CCTV areas
                </label>
                <label className="toggle-label" htmlFor="audio-coverage-toggle" title="Illustrative 12 m audio areas at AUD-001 and AUD-002">
                  <input
                    type="checkbox"
                    checked={showAudioCoverage}
                    onChange={(e) => setShowAudioCoverage(e.target.checked)}
                    id="audio-coverage-toggle"
                  />
                  Audio sensing
                </label>
                <label className="toggle-label" htmlFor="operational-lidar-toggle" title="Simulated LiDAR range, field of view and obstacle shadows">
                  <input type="checkbox" checked={showLidarCoverage}
                    onChange={(e) => setShowLidarCoverage(e.target.checked)}
                    id="operational-lidar-toggle" />
                  LiDAR areas
                </label>
                <label className="toggle-label" htmlFor="pause-toggle">
                  <input
                    type="checkbox"
                    checked={paused}
                    onChange={(e) => setPaused(e.target.checked)}
                    id="pause-toggle"
                  />
                  Pause motion
                </label>
                <label className="toggle-label" htmlFor="labels-toggle">
                  <input
                    type="checkbox"
                    checked={showDeviceLabels}
                    onChange={(e) => setShowDeviceLabels(e.target.checked)}
                    id="labels-toggle"
                  />
                  Labels
                </label>
              </div>

              <div className="hud-group-right">
                <button
                  id="reset-view-btn"
                  className="btn btn-sm btn-hud-reset"
                  onClick={handleResetViewAndVisitors}
                  title="Reset the camera and simulated visitor actions. Saved cases stay open."
                >
                  ↺ Reset view &amp; visitors
                </button>
              </div>
            </div>

            {/* Row 2: Tactical navigation */}
            <div className="hud-row hud-row-nav">
              <label className="toggle-label auto-focus-alert-toggle" htmlFor="auto-focus-alert-toggle" title="Move the map camera to new SOS, fall or distress alerts. Enabling also focuses an existing active alert.">
                <input
                  id="auto-focus-alert-toggle"
                  type="checkbox"
                  checked={autoFocusAlert}
                  onChange={(event) => {
                    if (event.target.checked) previousAlertsRef.current.clear();
                    setAutoFocusAlert(event.target.checked);
                  }}
                />
                Auto-Focus on Alert
              </label>
              <div className="hud-group-left sector-nav-scroll" role="tablist" aria-label="Tactical security sectors">
                <span className="tactical-bar-label">SECTORS:</span>
                {SECTOR_LIST.map((sector) => {
                  const isActive = selectedSectorId === sector.id;
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      role="tab"
                      id={`sector-${sector.id.toLowerCase()}-btn`}
                      className={`sector-nav-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectSector(sector.id)}
                      title={`${sector.name} — ${sector.title} (${sector.subtitle})`}
                      aria-selected={isActive}
                    >
                      <span className="sector-badge">{sector.id}</span>
                      <span className="sector-title">{sector.name} · {sector.title}</span>
                    </button>
                  );
                })}
              </div>

              <div className="hud-group-right" role="tablist" aria-label="Camera projection modes">
                <div className="projection-switch-group">
                  <button
                    type="button"
                    role="tab"
                    id="camera-radar-btn"
                    className={`camera-view-btn ${cameraView === 'radar' ? 'active' : ''}`}
                    onClick={() => handleSwitchCameraView('radar')}
                    title="2D Top-Down Radar: Planimetric orthographic overhead tactical view (North oriented upwards)"
                    aria-selected={cameraView === 'radar'}
                  >
                    <svg className="view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                    <span>2D Radar</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="camera-3d-btn"
                    className={`camera-view-btn ${cameraView === '3d' ? 'active' : ''}`}
                    onClick={() => handleSwitchCameraView('3d')}
                    title="3D Overview: Tactical angled perspective camera with full orbital control"
                    aria-selected={cameraView === '3d'}
                  >
                    <svg className="view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span>3D Overview</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="canvas-wrap">
            {/* Non-layout-shifting floating notification anchored to top-right of map container */}
            {(lightingNote || statusBanner || activeIncidentsCount > 0) && (
              <div className="canvas-floating-alert-badge" role="status" aria-live="polite">
                <div className="alert-badge-summary">
                  {activeIncidentsCount > 0 ? (
                    <span className="badge-pill urgent">
                      ⚠️ {activeIncidentsCount} Active Alert{activeIncidentsCount > 1 ? 's' : ''}
                      {needsAttentionCount > 0 ? ` · ${needsAttentionCount} Urgent` : ''}
                    </span>
                  ) : lightingNote ? (
                    <span className="badge-pill warn">💡 Safety Lighting Active</span>
                  ) : (
                    <span className="badge-pill info">ℹ️ System Notice</span>
                  )}
                  {statusBanner && (
                    <span className="badge-msg-preview" title={statusBanner}>
                      {statusBanner}
                    </span>
                  )}
                  {lightingNote && !statusBanner && (
                    <span className="badge-msg-preview" title={lightingNote}>
                      {lightingNote}
                    </span>
                  )}
                  {statusBanner && (
                    <button
                      className="badge-dismiss-btn"
                      onClick={() => setStatusBanner(null)}
                      aria-label="Dismiss banner"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            <Scene
              locatedIncident={incidents.find((incident) => incident.id === locatedIncidentId && incident.status !== 'resolved' && incident.status !== 'false_alarm')}
              mapMode={mapMode}
              cameraView={cameraView}
              selectedSectorId={selectedSectorId}
              sectorFlyTrigger={sectorFlyTrigger}
              showDeviceLabels={showDeviceLabels}
              showStudyPosts={showStudyPosts}
              showLidarRanges={showLidarRanges}
              showLidarCoverage={showLidarCoverage}
              selectedLidarId={selectedLidarId}
              onSelectLidar={setSelectedLidarId}
              selectedPlannedLidar={selectedPlannedLidar}
              onSelectPlannedLidar={setSelectedPlannedLidar}
              selectedPoleId={selectedPoleId}
              onSelectPole={handleSelectPole}
              onSelectAnonymousDot={handleSelectAnonymousDot}
              selectedDotIndex={selection.type === 'person' ? selection.dotIndex : null}
              onSelectGuard={handleSelectGuard}
              selectedCameraId={selection.type === 'camera' ? selection.cameraId : null}
              onSelectCamera={handleSelectCamera}
              lighting={lighting}
              lightingNote={lightingNote}
              showAudioCoverage={showAudioCoverage}
              showCCTV={showCCTV}
              paused={paused}
              nightMode={nightMode}
              fallPoleId={fallPoleId}
              sosPoleId={sosPoleId}
              isLookalikeStop={isLookalikeStop}
              offlinePoleId={offlinePoleId}
              acousticPoleId={acousticPoleId}
              blockedRouteZone={blockedRouteZone}
              isRaining={isRaining}
              dispatchedGuards={dispatchedGuards}
              onFinishGuardReturn={removeDispatchedGuard}
              resetCounter={resetCounter}
              cameraPose={cameraPose}
              perspPose={perspPose}
              radarPose={radarPose}
              onCameraChange={setCameraPose}
            />
            <span className="canvas-stamp" aria-hidden="true">
              {mapMode === 'blueprint'
                ? 'City of Elmina schematic GIS blueprint — coordinate grid & elevation model for tactical demonstration'
                : 'All positions, viewing cones, and lighting values are simulated/estimated — not real sensor streams'}
            </span>
          </div>

          {/* Legend */}
          <div className="viewer-legend" role="list" aria-label="Map legend">
            <div className="legend-item" role="listitem">
              <span className="legend-dot teal" aria-hidden="true" />
              Person (LiDAR)
            </div>
            <div className="legend-item" role="listitem">
              <span
                className="legend-dot"
                style={{ background: '#38bdf8' }}
                aria-hidden="true"
              />
              📹 CCTV Cone (Estimated)
            </div>
            {showStudyPosts && (
              <div className="legend-item" role="listitem">
                <span className="legend-dot amber" aria-hidden="true" />
                Proposed LiDAR (Study)
              </div>
            )}
            <div className="legend-item" role="listitem">
              <span className="legend-dot amber" style={{ background: '#f59e0b' }} aria-hidden="true" />
              Possible Emergency
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot red" aria-hidden="true" />
              Sensor Offline
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="sidebar" aria-label="Park details panel">
          {/* Active Cases stays above both tabs and excludes closed cases. */}
          <section className="sidebar-cases" aria-labelledby="active-cases-heading">
            <div className="sidebar-cases-header">
              <h2 id="active-cases-heading">Active Cases ({activeCases.length})</h2>
              <Link to="/incidents" className="sidebar-text-link">
                Case history ↗
              </Link>
            </div>
            {activeCases.length === 0 ? (
              <p className="sidebar-cases-empty">
                No open cases. Resolved and false-alarm cases remain available in{' '}
                <Link to="/incidents">Incidents</Link>.
              </p>
            ) : (
              <div className="active-case-list">
                {activeCases.map((incident) => (
                  <article key={incident.id} className={`active-case-item ${incident.priority}`}>
                    <div className="active-case-top">
                      <span className="active-case-type">{incident.displayType}</span>
                      <StatusLabel level={incident.priority} />
                    </div>
                    <span className="active-case-location">
                      {incident.zoneName} · {incident.poleId}
                    </span>
                    <div className="active-case-footer">
                      <span className="active-case-time">{incident.createdAt}</span>
                      <Link
                        to="/incidents"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedIncidentId(incident.id)}
                      >
                        Open case
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Details | Demo tabs */}
          <div
            className="sidebar-tabs"
            role="tablist"
            aria-label="Park sidebar sections"
            onKeyDown={handleSidebarTabKeyDown}
          >
            <button
              type="button"
              role="tab"
              id="sidebar-details-tab"
              aria-selected={sidebarTab === 'details'}
              aria-controls="sidebar-details-panel"
              tabIndex={sidebarTab === 'details' ? 0 : -1}
              className={`sidebar-tab ${sidebarTab === 'details' ? 'active' : ''}`}
              onClick={() => setSidebarTab('details')}
            >
              Details
            </button>
            <button
              type="button"
              role="tab"
              id="sidebar-demo-tab"
              aria-selected={sidebarTab === 'demo'}
              aria-controls="sidebar-demo-panel"
              tabIndex={sidebarTab === 'demo' ? 0 : -1}
              className={`sidebar-tab ${sidebarTab === 'demo' ? 'active' : ''}`}
              onClick={() => setSidebarTab('demo')}
            >
              Demo
            </button>
          </div>

          <div
            id="sidebar-details-panel"
            role="tabpanel"
            aria-labelledby="sidebar-details-tab"
            className="sidebar-tab-panel"
            hidden={sidebarTab !== 'details'}
          >
            {selection.type === 'pole' && selectedPole && (
              <div className="details-card">
                <div className="details-card-header">
                  <div>
                    <div className="details-eyebrow">Smart pole · Simulated telemetry</div>
                    <h2 className="details-title">
                      {selectedPole.id} · {selectedPole.name}
                    </h2>
                  </div>
                  <StatusLabel level={isSelectedOffline ? 'offline' : 'online'} />
                </div>
                <p className="details-subtitle">
                  Device position and sensor values are simulated. CCTV markers show estimated coverage,
                  not a connected feed.
                </p>

                <div className="details-grid">
                  <div className="details-field">
                    <span className="details-label">Device ID</span>
                    <span className="details-value">{selectedPole.id}</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Location</span>
                    <span className="details-value">{selectedPole.name}</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Status</span>
                    <span className={`details-value ${isSelectedOffline ? 'danger' : 'ok'}`}>
                      {isSelectedOffline ? 'Offline in simulation' : 'Online in simulation'}
                    </span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Estimated LiDAR coverage</span>
                    <span className="details-value">
                      {selectedPoleLidars.length > 0
                        ? selectedPoleLidars
                            .map(
                              (sensor) =>
                                `${sensor.id} · ${sensor.nominalRangeM}m · ${sensor.fovDeg}° field of view`,
                            )
                            .join(' · ')
                        : 'No LiDAR mounted on this pole'}
                    </span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">CCTV context</span>
                    <span className="details-value">{selectedPoleCctvText}</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Lighting</span>
                    <span
                      className={`details-value ${
                        isSelectedOffline || isDark ? 'warn' : 'ok'
                      }`}
                    >
                      {isSelectedOffline
                        ? 'Offline'
                        : isDark
                        ? 'Low Lighting Warning'
                        : selectedBrightness >= 95 && isSelectedAlert
                        ? 'Emergency lighting (100%)'
                        : `Normal (${selectedBrightness}%)`}
                    </span>
                  </div>
                </div>

                <details className="sidebar-details">
                  <summary>More details</summary>
                  <div className="sidebar-details-body">
                    <label className="form-group" htmlFor="pole-select">
                      <span className="form-label">Choose a device</span>
                      <select
                        id="pole-select"
                        className="form-control"
                        value={selectedPoleId}
                        onChange={(event) => handleSelectPole(event.target.value)}
                      >
                        {POLES.map((pole) => (
                          <option key={pole.id} value={pole.id}>
                            {pole.id} · {pole.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="metric-row">
                      <span className="metric-label">World coordinates (X / Z)</span>
                      <code className="metric-value">
                        [{selectedPole.position[0]}, {selectedPole.position[1]}]
                      </code>
                    </div>
                    {selectedPoleLidars.map((sensor) => (
                      <div className="metric-row" key={sensor.id}>
                        <span className="metric-label">{sensor.id} sensing basis</span>
                        <span className="metric-value">
                          {sensor.nominalRangeM}m nominal range · {sensor.fovDeg}° field of view ·{' '}
                          {sensor.headingDeg}° direction ·{' '}
                          {isSelectedOffline ? 'offline in simulation' : 'estimated, simulated'}
                        </span>
                      </div>
                    ))}
                    <div className="metric-row">
                      <span className="metric-label">CCTV view basis</span>
                      <span className="metric-value">
                        Estimated footprint only · No live feed connected
                      </span>
                    </div>

                    {!isSelectedOffline && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="light-slider">
                          Adjust virtual lamp — {selectedBrightness}%
                        </label>
                        <input
                          id="light-slider"
                          type="range"
                          min={0}
                          max={100}
                          value={selectedBrightness}
                          onChange={(event) => setPoleLight(selectedPoleId, Number(event.target.value))}
                          aria-label="Virtual light brightness"
                        />
                      </div>
                    )}

                    <h3 className="sidebar-subheading">Resident SOS QR code</h3>
                    <div className="qr-code-row">
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 21 21"
                        className="qr-code-svg"
                        aria-label={`QR Code for pole ${selectedPole.id}`}
                      >
                        <path
                          fill="#0a101d"
                          d="M0,0 h7 v7 h-7 z M1,1 v5 h5 v-5 z M2,2 h3 v3 h-3 z M14,0 h7 v7 h-7 z M15,1 v5 h5 v-5 z M16,2 h3 v3 h-3 z M0,14 h7 v7 h-7 z M1,15 v5 h5 v-5 z M2,16 h3 v3 h-3 z M8,1 h2 v2 h-2 z M11,2 h2 v3 h-2 z M8,5 h3 v2 h-3 z M1,8 h3 v2 h-3 z M5,9 h4 v2 h-4 z M10,8 h3 v3 h-3 z M14,9 h3 v2 h-3 z M18,8 h2 v4 h-2 z M8,12 h2 v3 h-2 z M11,13 h4 v2 h-4 z M16,12 h3 v2 h-3 z M9,16 h3 v2 h-3 z M13,17 h3 v3 h-3 z M17,15 h3 v3 h-3 z M8,19 h4 v2 h-4 z"
                        />
                      </svg>
                      <div className="qr-code-copy">
                        <div className="details-value">Pole {selectedPole.id} QR entry</div>
                        <div className="details-note">
                          /sos?pole={selectedPole.id}&amp;zone={selectedPole.zone}
                        </div>
                        <Link
                          to={`/sos?pole=${selectedPole.id}&zone=${selectedPole.zone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          Open SOS in new tab ↗
                        </Link>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {selection.type === 'camera' && (
              <div className="details-card">
                <div className="details-card-header">
                  <div>
                    <div className="details-eyebrow">CCTV inventory · Estimated coverage</div>
                    <h2 className="details-title">
                      {selectedCamera.id} · {selectedCamera.name}
                    </h2>
                  </div>
                  <span className="badge badge-simulated">Inventory only</span>
                </div>
                <p className="details-subtitle">
                  Camera markers show location, viewing direction, and an estimated footprint. No live
                  video, footage retrieval, or AI CCTV analytics is connected.
                </p>

                <div className="details-grid">
                  <div className="details-field">
                    <span className="details-label">Camera ID</span>
                    <span className="details-value">{selectedCamera.id}</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Location</span>
                    <span className="details-value">{selectedCamera.zoneName}</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Status</span>
                    <span className="details-value warn">Map inventory only · No live feed</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Estimated coverage</span>
                    <span className="details-value">{selectedCamera.coverageNote}</span>
                  </div>
                  <div className="details-field">
                    <span className="details-label">Integration</span>
                    <span className="details-value">Not connected</span>
                  </div>
                </div>

                <div className="notice notice-warning">
                  No camera view available. On-site check required.
                </div>

                <details className="sidebar-details">
                  <summary>More details</summary>
                  <div className="sidebar-details-body">
                    <label className="form-group" htmlFor="camera-select">
                      <span className="form-label">Choose a camera</span>
                      <select
                        id="camera-select"
                        className="form-control"
                        value={selectedCamera.id}
                        onChange={(event) => handleSelectCamera(event.target.value)}
                      >
                        {CCTV_CAMERAS.map((camera) => (
                          <option key={camera.id} value={camera.id}>
                            {camera.id} · {camera.name} ({camera.zoneName})
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="metric-row">
                      <span className="metric-label">World coordinates (X / Z)</span>
                      <code className="metric-value">
                        [{selectedCamera.position[0]}, {selectedCamera.position[1]}]
                      </code>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Estimated footprint</span>
                      <span className="metric-value">
                        {selectedCamera.footprint.mountHeightM}m mount ·{' '}
                        {selectedCamera.footprint.estimatedRangeM}m usable range ·{' '}
                        {selectedCamera.footprint.horizontalFovDeg}° field of view
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Viewing basis</span>
                      <span className="metric-value">
                        Estimated from mount and aim — not a site survey
                      </span>
                    </div>
                    <p className="details-note">{selectedCamera.limitations}</p>
                  </div>
                </details>
              </div>
            )}

            {selection.type === 'person' && (
              <PersonDetailsCard
                personas={personasForControlCenter}
                selectedPersonaId={selectedPersonaId}
                approxLocation={selection.approxLocation}
                operationalLidarNodes={operationalLidarNodes}
                lastDetectionByPersonaId={lastDetectionByPersonaId}
                onOpenDemo={() => setSidebarTab('demo')}
              />
            )}

            {selection.type === 'guard' &&
              (() => {
                const activeDispatched = dispatchedGuards.find(
                  (guard) => guard.guardId === selection.guardId,
                );
                const guardInfo = guards.find((guard) => guard.id === selection.guardId);
                const officerName =
                  activeDispatched?.guardName || guardInfo?.displayName || 'Officer';
                const officerRole = guardInfo?.role || 'Security Guard';
                const responseStatus = activeDispatched
                  ? activeDispatched.status === 'arrived'
                    ? `On scene at ${activeDispatched.targetPoleId}`
                    : activeDispatched.status === 'returning'
                    ? 'Returning to security post'
                    : `En route to ${activeDispatched.targetPoleId}`
                  : 'On standby at security post';

                return (
                  <div className="details-card">
                    <div className="details-card-header">
                      <div>
                        <div className="details-eyebrow">Separate guard tracking · Simulated</div>
                        <h2 className="details-title">{officerName}</h2>
                      </div>
                      <span className="badge badge-blue">Guard location (simulated)</span>
                    </div>
                    <p className="details-subtitle">
                      Guard positions come from a separate simulation. They are not identified through
                      LiDAR and are not merged with anonymous person clusters.
                    </p>

                    <div className="details-grid">
                      <div className="details-field">
                        <span className="details-label">Guard ID</span>
                        <span className="details-value">{selection.guardId}</span>
                      </div>
                      <div className="details-field">
                        <span className="details-label">Role</span>
                        <span className="details-value">{officerRole}</span>
                      </div>
                      <div className="details-field">
                        <span className="details-label">Assignment</span>
                        <span className="details-value">
                          {activeDispatched
                            ? `Case ${activeDispatched.incidentId} · ${activeDispatched.targetPoleId}`
                            : 'No active assignment'}
                        </span>
                      </div>
                      <div className="details-field">
                        <span className="details-label">Response status</span>
                        <span className="details-value ok">{responseStatus}</span>
                      </div>
                    </div>

                    <details className="sidebar-details">
                      <summary>More details</summary>
                      <div className="sidebar-details-body">
                        {dispatchedGuards.length > 1 && (
                          <label className="form-group" htmlFor="dispatched-guard-select">
                            <span className="form-label">Choose a dispatched officer</span>
                            <select
                              id="dispatched-guard-select"
                              className="form-control"
                              value={selection.guardId}
                              onChange={(event) => handleSelectGuard(event.target.value)}
                            >
                              {dispatchedGuards.map((guard) => (
                                <option key={guard.guardId} value={guard.guardId}>
                                  {guard.guardName} ({guard.status})
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {activeDispatched && (
                          <>
                            <div className="metric-row">
                              <span className="metric-label">Target coordinates (X / Z)</span>
                              <code className="metric-value">
                                [{activeDispatched.targetPos[0]}, {activeDispatched.targetPos[1]}]
                              </code>
                            </div>
                            <div className="metric-row">
                              <span className="metric-label">Linked case</span>
                              <span className="metric-value">
                                <Link
                                  to="/incidents"
                                  onClick={() => setSelectedIncidentId(activeDispatched.incidentId)}
                                >
                                  Open {activeDispatched.incidentId} ↗
                                </Link>
                              </span>
                            </div>
                          </>
                        )}
                        <p className="details-note">
                          Status reflects saved demo assignment data, not a real dispatch or arrival.
                          No guard acknowledgement is inferred from a timer.
                        </p>
                      </div>
                    </details>
                  </div>
                );
              })()}

            <div className="sidebar-link-row">
              <Link to="/incidents" className="btn btn-secondary btn-sm">
                Case history ↗
              </Link>
              <Link to="/system" className="btn btn-secondary btn-sm">
                System graphs &amp; diagnostics ↗
              </Link>
            </div>
            <p className="details-note">
              Recent alerts and detailed diagnostics have moved to Incidents and System so this panel
              stays focused on the selected entity.
            </p>
          </div>
          <div
            id="sidebar-demo-panel"
            role="tabpanel"
            aria-labelledby="sidebar-demo-tab"
            className="sidebar-tab-panel"
            hidden={sidebarTab !== 'demo'}
          >
            <section className="demo-section" aria-labelledby="demo-visitor-heading">
              <h2 id="demo-visitor-heading" className="demo-section-title">
                Simulated visitor
              </h2>
              <p className="scenario-copy">
                This is the same visitor selection used by the map. Choosing a visitor does not move the
                camera or run a scenario.
              </p>
              <label className="visitor-selector" htmlFor="demo-visitor-select">
                <span className="details-label">Visitor</span>
                <select
                  id="demo-visitor-select"
                  className="form-control"
                  value={selectedPersona?.id ?? ''}
                  onChange={(event) => {
                    const nextIndex = PERSONA_DEFINITIONS.findIndex(
                      (persona) => persona.id === event.target.value,
                    );
                    if (nextIndex >= 0) handleSelectAnonymousDot(nextIndex, false);
                  }}
                >
                  {personasForControlCenter.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      #{persona.number} · {persona.name} · {persona.clusterId}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPersona && (
                <div className="visitor-status-row">
                  <span>{selectedPersona.roleLabel}</span>
                  <span>
                    {selectedPersona.activeAction} ({formatPersonaState(selectedPersona.state)})
                  </span>
                </div>
              )}
            </section>

            {lastFeedbackMessage && (
              <div className="demo-feedback" role="status">
                {lastFeedbackMessage}
              </div>
            )}

            <section className="demo-section" aria-labelledby="demo-quick-actions-heading">
              <h2 id="demo-quick-actions-heading" className="demo-section-title">
                Quick actions
              </h2>
              <p className="scenario-copy">
                These affect the selected visitor only. A collapsed visitor accepts Call for Help,
                Collapse, or Recover.
              </p>
              <div className="quick-actions">
                {QUICK_ACTION_IDS.map((actionId) => {
                  const action = selectedPersona?.supportedActions.find(
                    (item) => item.id === actionId,
                  );
                  const isCollapsed = selectedPersona?.state === 'collapsed';
                  const isLocked =
                    isCollapsed && actionId !== 'call_help' && actionId !== 'collapse';
                  const isDanger = actionId === 'collapse' || actionId === 'call_help';
                  return (
                    <button
                      key={actionId}
                      type="button"
                      id={`quick-action-${actionId}`}
                      className={`quick-action-btn ${isDanger ? 'danger' : ''}`}
                      disabled={!selectedPersona || !action || isLocked}
                      onClick={() =>
                        selectedPersona && handleTriggerPersonaAction(selectedPersona.id, actionId)
                      }
                    >
                      <span>{QUICK_ACTION_LABELS[actionId] || action?.label || actionId}</span>
                      <small>
                        {!action
                          ? 'Not supported by this visitor'
                          : isLocked
                          ? 'Recover the visitor to use this action'
                          : actionId === 'pause_tree'
                          ? 'Existing pause action; stays upright'
                          : actionId === 'collapse'
                          ? 'At the current map position'
                          : actionId === 'call_help'
                          ? 'Signals distress while staying in place'
                          : action.label}
                      </small>
                    </button>
                  );
                })}
                <button
                  type="button"
                  id="quick-action-recover"
                  className="quick-action-btn"
                  disabled={!selectedPersona}
                  onClick={() => selectedPersona && handleRecoverPersona(selectedPersona.id)}
                >
                  <span>Recover visitor</span>
                  <small>Restore only this simulated visitor</small>
                </button>
              </div>
            </section>

            <details className="sidebar-details">
              <summary>More actions</summary>
              <div className="sidebar-details-body">
                <p className="scenario-copy">
                  Other actions supported by this simulated visitor.
                </p>
                <div className="more-actions-grid">
                  {selectedPersona?.supportedActions
                    .filter((action) => !QUICK_ACTION_IDS.includes(action.id))
                    .map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className="more-action-btn"
                        disabled={selectedPersona.state === 'collapsed'}
                        onClick={() => handleTriggerPersonaAction(selectedPersona.id, action.id)}
                      >
                        {action.icon ? `${action.icon} ` : ''}
                        {action.label}
                      </button>
                    ))}
                </div>
                {selectedPersona?.state === 'collapsed' && (
                  <p className="details-note">
                    Actions are locked while collapsed. Use Call for Help or Recover visitor.
                  </p>
                )}
              </div>
            </details>

            <section className="demo-section" aria-labelledby="demo-scenarios-heading">
              <h2 id="demo-scenarios-heading" className="demo-section-title">
                Guided scenarios
              </h2>
              <p className="scenario-copy">
                <strong>Collapse selected visitor here</strong> is a quick action at the visitor's
                current position. The scripted fall below always runs the documented AS-104
                demonstration.
              </p>
              <div className="demo-scenario-list">
                <button
                  type="button"
                  id="demo-silent-fall-btn"
                  className="scenario-btn"
                  onClick={runSilentFallScenario}
                >
                  <span>Run scripted fall at AS-104</span>
                  <span className="scenario-pill pill-review">Needs Review</span>
                </button>
                <button
                  type="button"
                  id="demo-combined-btn"
                  className="scenario-btn"
                  onClick={runCombinedScenario}
                >
                  <span>Sound + movement in the same zone</span>
                  <span className="scenario-pill pill-urgent">Urgent</span>
                </button>
                <button
                  type="button"
                  id="demo-cctv-blind-spot-btn"
                  className="scenario-btn"
                  onClick={runResidentialBlindSpotScenario}
                >
                  <span>CCTV blind-spot demonstration</span>
                  <span className="scenario-pill pill-review">LiDAR only</span>
                </button>
              </div>

              {blindSpotResult && (
                <div className="blindspot-summary">
                  <div className="blindspot-summary-header">
                    <strong>CCTV blind spot · East Lake Bank</strong>
                    <span className="badge badge-simulated">Simulated</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Operational LiDAR</span>
                    <span className="metric-value ok">
                      {blindSpotResult.detected && blindSpotResult.lidar.primarySensor
                        ? `Detected by ${blindSpotResult.lidar.primarySensor.sensorId} at ${blindSpotResult.lidar.primarySensor.distanceM}m`
                        : 'Not detected'}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Estimated CCTV coverage</span>
                    <span
                      className={`metric-value ${
                        blindSpotResult.camera.covered ? 'ok' : 'warn'
                      }`}
                    >
                      {blindSpotResult.camera.covered
                        ? `Yes — ${blindSpotResult.camera.coveredByCameraId} (estimate)`
                        : 'None'}
                    </span>
                  </div>
                  {!blindSpotResult.camera.covered && blindSpotResult.camera.nearestCameraId && (
                    <div className="metric-row">
                      <span className="metric-label">Nearest camera</span>
                      <span className="metric-value">
                        {blindSpotResult.camera.nearestCameraId} ·{' '}
                        {blindSpotResult.camera.nearestDistanceM}m away ·{' '}
                        {blindSpotResult.camera.nearestOffAxisDeg}° off its aim line
                      </span>
                    </div>
                  )}
                  <div
                    className={`blindspot-verdict ${
                      blindSpotResult.camera.covered ? 'covered' : 'gap'
                    }`}
                  >
                    {blindSpotResult.camera.covered
                      ? blindSpotResult.camera.cameraContext
                      : NO_CAMERA_VIEW_MESSAGE}
                  </div>
                  <p className="details-note">
                    {blindSpotResult.camera.explanation} Footprints are mapped estimates — not a site
                    survey, live feed, or evidence that a person can be identified.
                  </p>
                </div>
              )}
            </section>

            <details className="sidebar-details">
              <summary>More scenarios</summary>
              <div className="sidebar-details-body">
                <div className="demo-scenario-list">
                  <button
                    type="button"
                    id="demo-standing-stop-btn"
                    className="scenario-btn"
                    onClick={runStandingStopScenario}
                  >
                    <span>Person stops upright (AS-104)</span>
                    <span className="scenario-pill pill-norm">No alert</span>
                  </button>
                  <button
                    type="button"
                    id="demo-unrelated-signals-btn"
                    className="scenario-btn"
                    onClick={runUnrelatedSignalsScenario}
                  >
                    <span>Separate zones (AS-101 vs AS-104)</span>
                    <span className="scenario-pill pill-cov">2 cases</span>
                  </button>
                  <button
                    type="button"
                    id="demo-scream-btn"
                    className="scenario-btn"
                    onClick={() => {
                      triggerScream();
                      setStatusBanner(
                        'Simulated Scream (AS-101): Synthetic alert injected (labeled SIMULATED).',
                      );
                    }}
                  >
                    <span>Quick simulated scream (AS-101)</span>
                    <span className="scenario-pill pill-review">Simulated</span>
                  </button>
                  <button
                    type="button"
                    id="demo-rain-btn"
                    className="scenario-btn"
                    onClick={triggerBenignRain}
                  >
                    <span>{isRaining ? 'Stop rain visuals' : 'Toggle rain visuals (benign)'}</span>
                    <span className="scenario-pill pill-norm">{isRaining ? 'Active' : 'Normal'}</span>
                  </button>
                </div>
              </div>
            </details>

            <details className="sidebar-details">
              <summary>Advanced controls</summary>
              <div className="sidebar-details-body">
                <h3 className="sidebar-subheading">Lighting &amp; offline tests</h3>
                <div className="demo-scenario-list">
                  <button
                    type="button"
                    id="demo-dark-btn"
                    className="scenario-btn"
                    onClick={() => {
                      triggerDark();
                      setStatusBanner(
                        'Low Lighting Warning: Lakeside Path (AS-102) virtual brightness dropped to 0%.',
                      );
                    }}
                    disabled={(lighting['AS-102'] ?? 70) < 30}
                  >
                    <span>Dark pathway (AS-102 · 0% light)</span>
                    <span className="scenario-pill pill-warn">Low light</span>
                  </button>
                  <button
                    type="button"
                    id="demo-offline-btn"
                    className="scenario-btn"
                    onClick={() => {
                      triggerOffline();
                      setStatusBanner(
                        'Coverage Warning: AS-103 missed 3 heartbeats. Area monitoring unavailable.',
                      );
                    }}
                    disabled={offlinePoleId === 'AS-103'}
                  >
                    <span>Sensor offline (AS-103 heartbeat lost)</span>
                    <span className="scenario-pill pill-cov">Offline</span>
                  </button>
                  <button
                    type="button"
                    id="demo-unsafe-route-btn"
                    className="scenario-btn"
                    onClick={() => {
                      triggerUnsafeRoute();
                      setStatusBanner(
                        blockedRouteZone === 'central_path'
                          ? 'Central Path reopened.'
                          : 'Central Path blocked: Emergency lighting will display "route not verified".',
                      );
                    }}
                  >
                    <span>
                      {blockedRouteZone === 'central_path'
                        ? 'Reopen Central Path'
                        : 'Block Central Path (obstruction)'}
                    </span>
                    <span className="scenario-pill pill-cov">
                      {blockedRouteZone === 'central_path' ? 'Open' : 'Blocked'}
                    </span>
                  </button>
                </div>

                <h3 className="sidebar-subheading">Background visitor activity</h3>
                <div className="background-activity-row">
                  <div>
                    <div className="details-value">Benign idle actions only</div>
                    <p className="details-note">
                      Default OFF. Never triggers emergencies or incident status changes.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-pressed={backgroundActivityEnabled}
                    onClick={() => toggleBackgroundActivity(!backgroundActivityEnabled)}
                  >
                    {backgroundActivityEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                <h3 className="sidebar-subheading">Audio &amp; evidence</h3>
                <p className="details-note">
                  Recorded sample analysis and live microphone tests stay in the System Detection
                  Inspector. This sidebar no longer runs duplicate audio analysis.
                </p>
                <Link to="/system" className="btn btn-secondary btn-sm">
                  Open audio tests in System ↗
                </Link>

                <h3 className="sidebar-subheading">Reset controls</h3>
                <p className="details-note">
                  <strong>Reset view &amp; visitors</strong> restores the camera and simulated visitor
                  positions. Saved cases stay open.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleResetViewAndVisitors}
                >
                  Reset view &amp; visitors
                </button>
                <p className="details-note">
                  <strong>Reset demo session</strong> clears the full demo, including saved demo cases.
                </p>
                <button
                  type="button"
                  id="demo-reset-btn"
                  className="btn btn-ghost btn-full"
                  onClick={handleResetDemoSession}
                >
                  Reset demo session
                </button>
              </div>
            </details>

            <details className="sidebar-details">
              <summary>LiDAR placement study (planned sensors)</summary>
              <div className="sidebar-details-body">
                <p className="details-note">{LIDAR_PLAN_NOTE}</p>
                <div className="placement-toggles">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      id="study-posts-toggle"
                      checked={showStudyPosts}
                      onChange={(event) => setShowStudyPosts(event.target.checked)}
                    />
                    Show proposed posts on map
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      id="lidar-ranges-toggle"
                      checked={showLidarRanges}
                      disabled={!showStudyPosts}
                      onChange={(event) => setShowLidarRanges(event.target.checked)}
                    />
                    Estimated range rings (13m)
                  </label>
                </div>
                <label className="form-group" htmlFor="planned-lidar-select">
                  <span className="form-label">Inspect proposed sensor</span>
                  <select
                    id="planned-lidar-select"
                    className="form-control"
                    value={selectedPlannedLidar}
                    onChange={(event) => setSelectedPlannedLidar(event.target.value)}
                  >
                    <option value="">Choose a proposed sensor (PLAN-L01 to PLAN-L16)</option>
                    {PLANNED_LIDARS.map((sensor) => (
                      <option key={sensor.id} value={sensor.id}>
                        {sensor.id} · {sensor.area}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedPlannedSensor && (
                  <div className="placement-summary">
                    <div className="blindspot-summary-header">
                      <strong>{selectedPlannedSensor.id} · Proposed LiDAR</strong>
                      <span className="badge badge-simulated">Non-operational</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Planned zone</span>
                      <span className="metric-value">{selectedPlannedSensor.area}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Nominal range</span>
                      <span className="metric-value">
                        {selectedPlannedSensor.range}m (illustrative assumption)
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Operational detection</span>
                      <span className="metric-value muted">Inactive (planning layer only)</span>
                    </div>
                    {!showStudyPosts && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowStudyPosts(true)}
                      >
                        Show on map
                      </button>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>
        </aside>
      </div>
    </div>
  );
}
