// Park Overview — default guard console view.
// Desktop layout: 3D viewer (left ~65%) + sidebar (right ~35%).
import { useState, useRef, useEffect } from 'react';
import Scene from '../components/Park3D/Scene';
import StatusLabel from '../components/StatusLabel';
import AlertCard from '../components/AlertCard';
import { POLES } from '../data/parkData';
import { usePark } from '../context/ParkContext';
import { getAudioSampleFileUrl } from '../services/api';
import { recordLiveMicToWavBlob } from '../utils/audioWavEncoder';

const BENCHMARK_SAMPLES = [
  {
    id: 'distress_scream_sample.wav',
    title: 'Vocal Distress / Crying',
    desc: 'Real vocal distress recording (16kHz WAV)',
    badgeClass: 'pill-review',
    badgeText: 'Distress',
  },
  {
    id: 'heavy_rain_thunder.wav',
    title: 'Heavy Rain & Storm',
    desc: 'Environmental storm & rain pattering (16kHz WAV)',
    badgeClass: 'pill-norm',
    badgeText: 'Benign',
  },
  {
    id: 'park_laughter_chatter.wav',
    title: 'Park Laughter & Voices',
    desc: 'Social laughter & voices lookalike (16kHz WAV)',
    badgeClass: 'pill-norm',
    badgeText: 'Benign',
  },
  {
    id: 'ambient_park_quiet.wav',
    title: 'Night Crickets & Wind',
    desc: 'Quiet evening park baseline (16kHz WAV)',
    badgeClass: 'pill-cov',
    badgeText: 'Baseline',
  },
];

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

type SelectionTarget =
  | { type: 'pole'; poleId: string }
  | { type: 'person'; dotIndex: number; approxLocation: string; stationary: boolean }
  | { type: 'guard'; guardId: string };

type DemoTab = 'lidar' | 'sound' | 'env';

export default function ParkOverview() {
  const {
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
    guards,
    dispatchedGuards,
    removeDispatchedGuard,
    needsAttentionCount,
    darkAreasCount,
    sensorsOfflineCount,
  } = usePark();

  const [selection, setSelection] = useState<SelectionTarget>({
    type: 'pole',
    poleId: selectedPoleId,
  });

  const [activeTab, setActiveTab] = useState<DemoTab>('lidar');
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [analyzingSampleId, setAnalyzingSampleId] = useState<string | null>(null);
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [micCountdown, setMicCountdown] = useState<number>(3);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Play real .wav recording inline from backend
  const handleTogglePlaySample = (sampleId: string) => {
    setErrorBanner(null);
    if (playingSampleId === sampleId && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setPlayingSampleId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const url = getAudioSampleFileUrl(sampleId);
    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    setPlayingSampleId(sampleId);

    audio.onended = () => {
      setPlayingSampleId(null);
      audioPlayerRef.current = null;
    };
    audio.onerror = () => {
      setPlayingSampleId(null);
      audioPlayerRef.current = null;
      setErrorBanner('Could not play audio file. Ensure FastAPI backend is running on port 8000.');
    };

    audio.play().catch((err: unknown) => {
      setPlayingSampleId(null);
      const msg = err instanceof Error ? err.message : 'Playback failed';
      setErrorBanner(`Audio playback error: ${msg}`);
    });
  };

  // Run YAMNet on recorded .wav file (and play audio simultaneously so judge hears it)
  const handleRunRecordedSample = async (sampleId: string) => {
    setErrorBanner(null);
    setAnalyzingSampleId(sampleId);
    handleTogglePlaySample(sampleId);
    try {
      const inf = await triggerRecordedAudio(sampleId);
      const distressPct = Math.round((inf.distress_score ?? 0) * 100);
      const benignPct = Math.round((inf.benign_score ?? 0) * 100);
      setStatusBanner(
        `RECORDED SAMPLE (${inf.sample_id}): ${inf.plain_label} — Distress: ${distressPct}%, Benign: ${benignPct}%`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend connection error';
      setErrorBanner(`YAMNet analysis error: ${msg}`);
    } finally {
      setAnalyzingSampleId(null);
    }
  };

  // Capture 3 seconds of live microphone audio as 16kHz PCM WAV and send to YAMNet
  const handleRecordLiveMic = async () => {
    setErrorBanner(null);
    setIsRecordingMic(true);
    setMicCountdown(3);
    try {
      const wavBlob = await recordLiveMicToWavBlob(3, (secLeft) => {
        setMicCountdown(secLeft);
      });
      setIsRecordingMic(false);
      setAnalyzingSampleId('live_mic');
      const inf = await triggerLiveMic(wavBlob);
      const distressPct = Math.round((inf.distress_score ?? 0) * 100);
      const benignPct = Math.round((inf.benign_score ?? 0) * 100);
      setStatusBanner(
        `LIVE MIC INPUT: ${inf.plain_label} — Distress: ${distressPct}%, Benign: ${benignPct}%`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone capture failed';
      setErrorBanner(`Live Mic Error: ${msg}`);
    } finally {
      setIsRecordingMic(false);
      setAnalyzingSampleId(null);
    }
  };

  const handleSelectPole = (id: string) => {
    setSelectedPoleId(id);
    setSelection({ type: 'pole', poleId: id });
  };

  const handleSelectAnonymousDot = (dotIndex: number) => {
    const locations = [
      'West Loop · Near Pole AS-104',
      'Central Path · Near Pole AS-103',
      'East Exit · Near Pole AS-105',
      'West Loop Pathways',
      'North Entrance · Near Pole AS-101',
    ];
    setSelection({
      type: 'person',
      dotIndex,
      approxLocation: locations[dotIndex] || 'Park Pathway',
      stationary: fallPoleId === 'AS-104' && dotIndex === 0,
    });
  };

  const handleSelectGuard = (guardId: string) => {
    setSelection({
      type: 'guard',
      guardId,
    });
  };

  const selectedPole = POLES.find((p) => p.id === selectedPoleId);
  const selectedBrightness = lighting[selectedPoleId] ?? 70;
  const isSelectedOffline = offlinePoleId === selectedPoleId;
  const isSelectedAlert = fallPoleId === selectedPoleId || acousticPoleId === selectedPoleId;
  const isDark = !isSelectedOffline && selectedBrightness < 30;

  return (
    <div className="park-overview">
      {/* Top bar */}
      <div className="overview-top">
        <div className="overview-heading">
          <h1>Park Overview</h1>
          <p>See park activity, lighting and alerts.</p>
        </div>
        <SummaryStats
          needsAttention={needsAttentionCount}
          darkAreas={darkAreasCount}
          sensorsOffline={sensorsOfflineCount}
        />
      </div>

      {/* Main workspace */}
      <div className="workspace">
        {/* ── 3D Viewer ── */}
        <div className="viewer">
          {/* Controls overlay (top-left) */}
          <div className="viewer-controls" role="group" aria-label="3D viewer controls">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={nightMode}
                onChange={(e) => setNightMode(e.target.checked)}
                id="night-mode-toggle"
              />
              Night mode
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showCoverage}
                onChange={(e) => setShowCoverage(e.target.checked)}
                id="coverage-toggle"
              />
              Show coverage&nbsp;
              <span style={{ fontSize: '11px', opacity: 0.65 }}>(illustrative)</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={paused}
                onChange={(e) => setPaused(e.target.checked)}
                id="pause-toggle"
              />
              Pause motion
            </label>
          </div>

          {/* Reset View (top-right) */}
          <div className="viewer-controls-right">
            <button id="reset-view-btn" className="btn btn-ghost btn-sm" onClick={resetView}>
              ↺ Reset View
            </button>
          </div>

          {/* Compact Floating 3D Status & Lighting Pills */}
          {(lightingNote || statusBanner) && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                width: 'max-content',
                maxWidth: 'calc(100% - 32px)',
                pointerEvents: 'none',
              }}
            >
              {lightingNote && (
                <div
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(15, 23, 42, 0.90)',
                    border: '1px solid rgba(251, 191, 36, 0.55)',
                    borderRadius: '999px',
                    fontSize: '12px',
                    color: '#fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(6px)',
                    pointerEvents: 'auto',
                  }}
                >
                  <span>💡</span>
                  <span>
                    <strong>Safety Lighting:</strong> {lightingNote}
                  </span>
                </div>
              )}

              {statusBanner && (
                <div
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(45, 184, 176, 0.55)',
                    borderRadius: '999px',
                    fontSize: '12px',
                    color: '#5eead4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(6px)',
                    pointerEvents: 'auto',
                  }}
                >
                  <span>{statusBanner}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0 5px', fontSize: '11px', minHeight: 'unset', lineHeight: 1 }}
                    onClick={() => setStatusBanner(null)}
                    aria-label="Dismiss status notice"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Canvas */}
          <div className="canvas-wrap">
            <Scene
              selectedPoleId={selectedPoleId}
              onSelectPole={handleSelectPole}
              onSelectAnonymousDot={handleSelectAnonymousDot}
              onSelectGuard={handleSelectGuard}
              lighting={lighting}
              lightingNote={lightingNote}
              showCoverage={showCoverage}
              paused={paused}
              nightMode={nightMode}
              fallPoleId={fallPoleId}
              isLookalikeStop={isLookalikeStop}
              offlinePoleId={offlinePoleId}
              acousticPoleId={acousticPoleId}
              blockedRouteZone={blockedRouteZone}
              isRaining={isRaining}
              dispatchedGuards={dispatchedGuards}
              onFinishGuardReturn={removeDispatchedGuard}
              resetCounter={resetCounter}
            />
            <span className="canvas-stamp" aria-hidden="true">
              All positions and lighting values are simulated — not real sensor data
            </span>
          </div>

          {/* Legend */}
          <div className="viewer-legend" role="list" aria-label="Map legend">
            <div className="legend-item" role="listitem">
              <span className="legend-dot teal" aria-hidden="true" />
              Person Detected (LiDAR)
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-shield-icon" aria-hidden="true">
                <svg
                  width="13"
                  height="15"
                  viewBox="0 0 24 28"
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                >
                  <path d="M12 1L3 5V13C3 19.5 7.5 25.5 12 27C16.5 25.5 21 19.5 21 13V5L12 1Z" />
                </svg>
              </span>
              Security Guard (Reported Location)
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot amber" aria-hidden="true" />
              Possible Emergency
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot red" aria-hidden="true" />
              Sensor Offline
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <aside
          className="sidebar"
          aria-label="Park details panel"
          style={{
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 130px)',
            minHeight: 0,
            paddingRight: '4px',
          }}
        >
          {/* 1. Selected Area Panel */}
          <div className="panel">
            <h2 className="panel-title">Selected Area</h2>

            <div className="entity-switch-row" role="tablist" aria-label="Selection entity">
              <button
                className={`entity-switch-btn ${selection.type === 'pole' ? 'active' : ''}`}
                onClick={() => setSelection({ type: 'pole', poleId: selectedPoleId })}
                role="tab"
                aria-selected={selection.type === 'pole'}
              >
                Pole ({selectedPoleId})
              </button>
              <button
                className={`entity-switch-btn ${selection.type === 'person' ? 'active' : ''}`}
                onClick={() => handleSelectAnonymousDot(0)}
                role="tab"
                aria-selected={selection.type === 'person'}
              >
                Person (LiDAR)
              </button>
              {dispatchedGuards.length > 0 && (
                <button
                  className={`entity-switch-btn ${selection.type === 'guard' ? 'active' : ''}`}
                  onClick={() => handleSelectGuard(dispatchedGuards[0].guardId)}
                  role="tab"
                  aria-selected={selection.type === 'guard'}
                >
                  Guard Location
                </button>
              )}
            </div>

            {selection.type === 'pole' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Smart Infrastructure</span>
                  <span className="badge badge-simulated" style={{ fontSize: '10px' }}>
                    Simulated Telemetry
                  </span>
                </div>

                <div className="form-group mb-2">
                  <label className="form-label" htmlFor="pole-select">
                    Select Sensor Pole
                  </label>
                  <select
                    id="pole-select"
                    className="form-control"
                    value={selectedPoleId}
                    onChange={(e) => handleSelectPole(e.target.value)}
                  >
                    {POLES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} · {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPole && (
                  <>
                    <div className="metric-row">
                      <span className="metric-label">Area Zone</span>
                      <span className="metric-value">{selectedPole.name}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Sensor Status</span>
                      <StatusLabel level={isSelectedOffline ? 'offline' : 'online'} />
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Virtual Lamp</span>
                      <span className={`metric-value ${isDark ? 'warn' : isSelectedOffline ? 'muted' : 'ok'}`}>
                        {isSelectedOffline ? '— (offline)' : `${selectedBrightness}%`}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Lighting</span>
                      <span className={`metric-value ${isDark || isSelectedOffline ? 'warn' : 'ok'}`}>
                        {isSelectedOffline
                          ? 'Offline'
                          : isDark
                          ? 'Low Lighting Warning'
                          : selectedBrightness >= 95 && isSelectedAlert
                          ? 'Nearby Lights On (100%)'
                          : 'Normal (demo)'}
                      </span>
                    </div>
                    {isSelectedAlert && (
                      <div className="metric-row">
                        <span className="metric-label">Active Alert</span>
                        <StatusLabel level="needs_review" />
                      </div>
                    )}

                    {!isSelectedOffline && (
                      <div className="form-group mt-2">
                        <label className="form-label" htmlFor="light-slider">
                          Adjust virtual lamp — {selectedBrightness}%
                        </label>
                        <input
                          id="light-slider"
                          type="range"
                          min={0}
                          max={100}
                          value={selectedBrightness}
                          onChange={(e) => setPoleLight(selectedPoleId, Number(e.target.value))}
                          aria-label="Virtual light brightness"
                        />
                      </div>
                    )}

                    {isDark && (
                      <div className="notice notice-warning mt-2">
                        Low-light warning — virtual setting only. This is not a measured lux value.
                      </div>
                    )}
                    {isSelectedOffline && (
                      <div className="notice notice-warning mt-2">
                        Sensor offline — monitoring may be unavailable in this area.
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {selection.type === 'person' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                    Person Detected
                  </h3>
                  <span className="badge badge-teal" style={{ fontSize: '10px' }}>
                    Simulated LiDAR
                  </span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Detection Type</span>
                  <span className="metric-value">Anonymous 3D Point Cluster</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Approx. Location</span>
                  <span className="metric-value">{selection.approxLocation}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">3D Cluster Height</span>
                  <span className={`metric-value ${fallPoleId === 'AS-104' ? 'warn' : 'ok'}`}>
                    {fallPoleId === 'AS-104'
                      ? '0.34m (Collapsed to Ground)'
                      : '1.72m (Standing Upright)'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Motion Status</span>
                  <span className={`metric-value ${fallPoleId === 'AS-104' ? 'warn' : 'ok'}`}>
                    {fallPoleId === 'AS-104'
                      ? 'Unusual Movement (Motionless 45s)'
                      : isLookalikeStop
                      ? 'Stopped Upright (No Alert)'
                      : 'Walking along pathway'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Identity Data</span>
                  <span className="metric-value" style={{ color: 'var(--text-muted)' }}>
                    None (Protected by design)
                  </span>
                </div>

                <div className="notice notice-info mt-2" style={{ fontSize: '12px' }}>
                  <strong>LiDAR Privacy Safeguard:</strong> Anonymous 3D bounding-box geometry only. No facial recognition, identity, or continuous movement history is stored.
                </div>
              </>
            )}

            {selection.type === 'guard' && (
              <>
                {(() => {
                  const activeDispatched = dispatchedGuards.find((g) => g.guardId === selection.guardId);
                  const guardInfo = guards.find((g) => g.id === selection.guardId);
                  const officerName = activeDispatched?.guardName || guardInfo?.displayName || 'Officer';
                  const officerRole = guardInfo?.role || 'Security Guard';
                  const statusText = activeDispatched
                    ? activeDispatched.status === 'arrived'
                      ? `On Scene at ${activeDispatched.targetPoleId}`
                      : activeDispatched.status === 'returning'
                      ? 'Returning to Security Post'
                      : `En Route to ${activeDispatched.targetPoleId}`
                    : 'On Standby / Station';

                  return (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px',
                        }}
                      >
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                          Security Guard
                        </h3>
                        <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                          Guard Location (Simulated)
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Officer</span>
                        <span className="metric-value" style={{ color: '#38bdf8', fontWeight: 700 }}>
                          {officerName}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Role</span>
                        <span className="metric-value">{officerRole}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Patrol Status</span>
                        <span className="metric-value ok">{statusText}</span>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* 2. Guided 3-Tab Demo Controls Panel */}
          <div className="panel">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <h2 className="panel-title" style={{ margin: 0 }}>
                Interactive Demo Controls
              </h2>
              <button
                id="demo-reset-btn"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px', minHeight: '28px' }}
                onClick={() => {
                  handleReset();
                  clearLatestResults();
                  setStatusBanner(null);
                  setErrorBanner(null);
                }}
              >
                ↺ Reset All
              </button>
            </div>

            {/* 3-Tab Switcher */}
            <div
              className="entity-switch-row"
              role="tablist"
              aria-label="Demo scenario categories"
              style={{ marginBottom: '10px' }}
            >
              <button
                type="button"
                className={`entity-switch-btn ${activeTab === 'lidar' ? 'active' : ''}`}
                onClick={() => setActiveTab('lidar')}
                role="tab"
                aria-selected={activeTab === 'lidar'}
              >
                🧍 1. LiDAR Fall AI
              </button>
              <button
                type="button"
                className={`entity-switch-btn ${activeTab === 'sound' ? 'active' : ''}`}
                onClick={() => setActiveTab('sound')}
                role="tab"
                aria-selected={activeTab === 'sound'}
              >
                🔊 2. Sound AI
              </button>
              <button
                type="button"
                className={`entity-switch-btn ${activeTab === 'env' ? 'active' : ''}`}
                onClick={() => setActiveTab('env')}
                role="tab"
                aria-selected={activeTab === 'env'}
              >
                🌲 3. Park &amp; Lights
              </button>
            </div>

            {errorBanner && (
              <div
                className="notice notice-warning"
                style={{ marginBottom: '10px', fontSize: '12px', color: '#fca5a5', borderColor: '#ef4444' }}
              >
                {errorBanner}
              </div>
            )}

            {/* ── TAB 1: LiDAR Fall vs. Lookalike Immunity ── */}
            {activeTab === 'lidar' && (
              <div className="scenario-section">
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                  Compare a person stopping upright on West Loop (<strong>AS-104</strong>) vs. collapsing to the ground.
                </p>

                <button
                  id="demo-standing-stop-btn"
                  className="scenario-btn"
                  onClick={async () => {
                    const res = await triggerStandingStopLookalike();
                    setSelection({
                      type: 'person',
                      dotIndex: 0,
                      approxLocation: 'West Loop · Near Pole AS-104',
                      stationary: false,
                    });
                    setStatusBanner(`LiDAR Lookalike Test: ${res.plain_label} — Height stays 1.72m upright.`);
                  }}
                >
                  <span>1. Person Stops Upright (AS-104)</span>
                  <span className="scenario-pill pill-norm">No Alert</span>
                </button>

                <button
                  id="demo-silent-fall-btn"
                  className="scenario-btn"
                  onClick={async () => {
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
                  }}
                >
                  <span>2. Silent Fall Collapse (AS-104 + 100% Light)</span>
                  <span className="scenario-pill pill-review">Needs Review</span>
                </button>

                <button
                  id="demo-combined-btn"
                  className="scenario-btn"
                  onClick={async () => {
                    await triggerCombined();
                    setStatusBanner(
                      'Signals Agree (Urgent): Distress sound + LiDAR fall in West Loop within 15s window.',
                    );
                  }}
                >
                  <span>3. Signals Agree: Fall + Scream (Same Zone)</span>
                  <span className="scenario-pill pill-urgent">Urgent</span>
                </button>

                <button
                  id="demo-unrelated-signals-btn"
                  className="scenario-btn"
                  onClick={async () => {
                    await triggerUnrelatedSignals();
                    setStatusBanner(
                      'Different Zones: Scream at North Entrance (AS-101) + Fall at West Loop (AS-104) kept as 2 separate cases.',
                    );
                  }}
                >
                  <span>4. Separate Zones Test (AS-101 vs AS-104)</span>
                  <span className="scenario-pill pill-cov">2 Separate Cases</span>
                </button>

                {/* Live LiDAR Kinematic Readout Card */}
                {latestLidarEval && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <strong style={{ color: 'var(--text-primary)' }}>LiDAR 3D Cluster Readout</strong>
                      <span className="badge badge-simulated" style={{ fontSize: '9px' }}>
                        SIMULATED
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Result</span>
                      <span
                        className={`metric-value ${
                          latestLidarEval.trigger_incident ? 'warn' : 'ok'
                        }`}
                      >
                        {latestLidarEval.plain_label}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Height Change</span>
                      <span className="metric-value">
                        {latestLidarEval.kinematics.initial_height_m}m →{' '}
                        {latestLidarEval.kinematics.final_height_m}m
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Vertical Drop Speed</span>
                      <span className="metric-value">
                        {latestLidarEval.kinematics.drop_speed_mps} m/s
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Lighting Action</span>
                      <span className="metric-value" style={{ fontSize: '11px' }}>
                        {latestLidarEval.lighting_note}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: Sound AI (YAMNet Recorded WAV & Live Mic) ── */}
            {activeTab === 'sound' && (
              <div className="scenario-section">
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                  Click <strong>▶ Listen</strong> to hear the real WAV clip, or <strong>Analyze</strong> to run YAMNet.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {BENCHMARK_SAMPLES.map((sample) => {
                    const isPlaying = playingSampleId === sample.id;
                    const isAnalyzing = analyzingSampleId === sample.id;
                    return (
                      <div
                        key={sample.id}
                        style={{
                          padding: '8px 10px',
                          background: 'var(--bg-elevated)',
                          borderRadius: '8px',
                          border: '1px solid rgba(148, 163, 184, 0.14)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                          }}
                        >
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {sample.title}
                          </strong>
                          <span className={`scenario-pill ${sample.badgeClass}`}>
                            {sample.badgeText}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginBottom: '6px',
                          }}
                        >
                          {sample.desc}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '11px', padding: '4px 10px', minHeight: '30px' }}
                            onClick={() => handleTogglePlaySample(sample.id)}
                          >
                            {isPlaying ? '⏹ Stop' : '▶ Listen'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              minHeight: '30px',
                              flex: 1,
                            }}
                            onClick={() => handleRunRecordedSample(sample.id)}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? 'Analyzing WAV…' : '⚡ Analyze with YAMNet'}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 3-Second Live Microphone Recording Button */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-full"
                    style={{
                      marginTop: '2px',
                      minHeight: '38px',
                      fontWeight: 600,
                      borderColor: isRecordingMic ? 'var(--urgent)' : 'var(--accent)',
                      color: isRecordingMic ? '#fca5a5' : 'var(--text-primary)',
                    }}
                    onClick={handleRecordLiveMic}
                    disabled={isRecordingMic || analyzingSampleId === 'live_mic'}
                  >
                    {isRecordingMic
                      ? `🔴 Recording Microphone (${micCountdown}s)… Speak or Scream!`
                      : analyzingSampleId === 'live_mic'
                      ? 'Processing 16kHz WAV in YAMNet…'
                      : '🎤 Test Live Microphone (3s Recording)'}
                  </button>
                </div>

                {/* YAMNet Audio Assessment Result Box */}
                {latestAudioInference && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: 'rgba(15, 23, 42, 0.72)',
                      border: '1px solid rgba(45, 184, 176, 0.4)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <strong style={{ color: 'var(--text-primary)' }}>YAMNet Audio Result</strong>
                      <span
                        className={
                          latestAudioInference.source_mode === 'live'
                            ? 'badge badge-live'
                            : 'badge badge-recorded'
                        }
                        style={{ fontSize: '9px' }}
                      >
                        {latestAudioInference.source_mode === 'live'
                          ? 'LIVE INPUT'
                          : 'RECORDED SAMPLE'}
                      </span>
                    </div>

                    <div className="metric-row">
                      <span className="metric-label">Classification</span>
                      <span
                        className={`metric-value ${
                          latestAudioInference.event_type === 'possible_scream' ? 'warn' : 'ok'
                        }`}
                      >
                        {latestAudioInference.plain_label}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Distress Score</span>
                      <span className="metric-value" style={{ fontWeight: 700 }}>
                        {Math.round((latestAudioInference.distress_score ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Benign Score</span>
                      <span className="metric-value">
                        {Math.round((latestAudioInference.benign_score ?? 0) * 100)}%
                      </span>
                    </div>

                    {latestAudioInference.top_classes && latestAudioInference.top_classes.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <strong>Top AudioSet Classes:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {latestAudioInference.top_classes.map((c, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.07)',
                                fontSize: '11px',
                              }}
                            >
                              {c.class_name}: {Math.round((c.score ?? 0) * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: Park Environment & Lighting ── */}
            {activeTab === 'env' && (
              <div className="scenario-section">
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                  Simulate low pathway lighting, offline sensor heartbeats, and blocked routes.
                </p>

                <button
                  id="demo-dark-btn"
                  className="scenario-btn"
                  onClick={() => {
                    triggerDark();
                    setStatusBanner('Low Lighting Warning: Lakeside Path (AS-102) virtual brightness dropped to 0%.');
                  }}
                  disabled={(lighting['AS-102'] ?? 70) < 30}
                >
                  <span>Dark Pathway (AS-102 · 0% Light)</span>
                  <span className="scenario-pill pill-warn">Low Light</span>
                </button>

                <button
                  id="demo-offline-btn"
                  className="scenario-btn"
                  onClick={() => {
                    triggerOffline();
                    setStatusBanner('Coverage Warning: AS-103 missed 3 heartbeats. Area monitoring unavailable.');
                  }}
                  disabled={offlinePoleId === 'AS-103'}
                >
                  <span>Sensor Offline (AS-103 Heartbeat Lost)</span>
                  <span className="scenario-pill pill-cov">Offline</span>
                </button>

                <button
                  id="demo-unsafe-route-btn"
                  className="scenario-btn"
                  onClick={() => {
                    triggerUnsafeRoute();
                    setStatusBanner(
                      blockedRouteZone === 'central_path'
                        ? 'Central Path reopened.'
                        : 'Central Path Blocked: Emergency lighting will display "route not verified".',
                    );
                  }}
                >
                  <span>
                    {blockedRouteZone === 'central_path'
                      ? 'Reopen Central Path'
                      : 'Block Central Path (Obstruction)'}
                  </span>
                  <span className="scenario-pill pill-cov">
                    {blockedRouteZone === 'central_path' ? 'Open' : 'Blocked'}
                  </span>
                </button>

                <button
                  id="demo-rain-btn"
                  className="scenario-btn"
                  onClick={triggerBenignRain}
                >
                  <span>{isRaining ? 'Stop Rain Visuals' : 'Toggle Rain Visuals (Benign)'}</span>
                  <span className="scenario-pill pill-norm">{isRaining ? 'Active' : 'Normal'}</span>
                </button>

                <button
                  id="demo-scream-btn"
                  className="scenario-btn"
                  onClick={() => {
                    triggerScream();
                    setStatusBanner('Simulated Scream (AS-101): Synthetic alert injected (labeled SIMULATED).');
                  }}
                >
                  <span>Quick Simulated Scream (AS-101)</span>
                  <span className="scenario-pill pill-review">Simulated</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Recent Alerts Feed */}
          <div className="panel">
            <h2 className="panel-title">Recent Alerts</h2>
            <div className="feed" role="list" aria-live="polite" aria-label="Recent alerts">
              {events.map((e) => (
                <AlertCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
