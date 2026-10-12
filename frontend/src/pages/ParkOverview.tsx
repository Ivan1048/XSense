// Park Overview — default guard page.
// Desktop layout: 3D viewer (left ~65%) + sidebar (right ~35%).
// All sensor readings shown here are simulated.
import { useState } from 'react';
import Scene from '../components/Park3D/Scene';
import StatusLabel from '../components/StatusLabel';
import AlertCard from '../components/AlertCard';
import { POLES } from '../data/parkData';
import { usePark } from '../context/ParkContext';

function SummaryStats({
  needsAttention,
  darkAreas,
  sensorsOffline,
}: {
  needsAttention: number;
  darkAreas:      number;
  sensorsOffline: number;
}) {
  return (
    <div className="summary-stats">
      <div className={`stat-card ${needsAttention > 0 ? 'urgent' : 'ok'}`} aria-label={`${needsAttention} items need attention`}>
        <span className="stat-value">{needsAttention}</span>
        <span className="stat-label">Needs Attention</span>
      </div>
      <div className={`stat-card ${darkAreas > 0 ? 'warning' : 'ok'}`} aria-label={`${darkAreas} dark areas`}>
        <span className="stat-value">{darkAreas}</span>
        <span className="stat-label">Dark Areas</span>
      </div>
      <div className={`stat-card ${sensorsOffline > 0 ? 'offline' : 'ok'}`} aria-label={`${sensorsOffline} sensors offline`}>
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

export default function ParkOverview() {
  const {
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
    triggerSilentFall,
    triggerScream,
    triggerCombined,
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

  // Selected pole info
  const selectedPole       = POLES.find(p => p.id === selectedPoleId);
  const selectedBrightness = lighting[selectedPoleId] ?? 70;
  const isSelectedOffline  = offlinePoleId === selectedPoleId;
  const isSelectedAlert    = fallPoleId === selectedPoleId || acousticPoleId === selectedPoleId;
  const isDark             = !isSelectedOffline && selectedBrightness < 30;

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
                onChange={e => setNightMode(e.target.checked)}
                id="night-mode-toggle"
              />
              Night mode
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showCoverage}
                onChange={e => setShowCoverage(e.target.checked)}
                id="coverage-toggle"
              />
              Show coverage&nbsp;
              <span style={{ fontSize: '11px', opacity: 0.65 }}>(illustrative)</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={paused}
                onChange={e => setPaused(e.target.checked)}
                id="pause-toggle"
              />
              Pause motion
            </label>
          </div>

          {/* Reset View (top-right) */}
          <div className="viewer-controls-right">
            <button
              id="reset-view-btn"
              className="btn btn-ghost btn-sm"
              onClick={resetView}
            >
              ↺ Reset View
            </button>
          </div>

          {/* Canvas */}
          <div className="canvas-wrap">
            <Scene
              selectedPoleId={selectedPoleId}
              onSelectPole={handleSelectPole}
              onSelectAnonymousDot={handleSelectAnonymousDot}
              onSelectGuard={handleSelectGuard}
              lighting={lighting}
              showCoverage={showCoverage}
              paused={paused}
              nightMode={nightMode}
              fallPoleId={fallPoleId}
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

          {/* Legend per requirements */}
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
        <aside className="sidebar" aria-label="Park details panel">

          {/* Selected area with clear provenance */}
          <div className="panel">
            <h2 className="panel-title">Selected Area</h2>

            {/* Quick Entity Switcher */}
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

            {/* ── State 1: Sensor Pole Selected ── */}
            {selection.type === 'pole' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Smart Infrastructure</span>
                  <span className="badge badge-simulated" style={{ fontSize: '10px' }}>Simulated Telemetry</span>
                </div>

                <div className="form-group mb-2">
                  <label className="form-label" htmlFor="pole-select">Select Sensor Pole</label>
                  <select
                    id="pole-select"
                    className="form-control"
                    value={selectedPoleId}
                    onChange={e => handleSelectPole(e.target.value)}
                  >
                    {POLES.map(p => (
                      <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
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
                        {isSelectedOffline ? 'Offline' : isDark ? 'Review needed' : 'Normal (demo)'}
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
                          onChange={e => setPoleLight(selectedPoleId, Number(e.target.value))}
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

            {/* ── State 2: Anonymous Person (LiDAR) Selected ── */}
            {selection.type === 'person' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Person Detected
                  </h3>
                  <span className="badge badge-teal" style={{ fontSize: '10px' }}>Simulated LiDAR</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Detection Type</span>
                  <span className="metric-value">Anonymous Point Cluster</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Approx. Location</span>
                  <span className="metric-value">{selection.approxLocation}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Motion Telemetry</span>
                  <span className={`metric-value ${selection.stationary ? 'warn' : 'ok'}`}>
                    {selection.stationary ? 'Stationary (Possible Fall Anomaly)' : 'Moving along pathway'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Identity Data</span>
                  <span className="metric-value" style={{ color: 'var(--text-muted)' }}>None (Protected by design)</span>
                </div>

                <div className="notice notice-info mt-2" style={{ fontSize: '12px' }}>
                  <strong>LiDAR Privacy Guarantee:</strong> Detected strictly via geometric depth points. LiDAR cannot identify or classify whether this person is a resident or security guard. No facial features, identity, names, or movement histories exist or are stored.
                </div>

                <button
                  className="btn btn-ghost btn-sm btn-full mt-2"
                  onClick={() => setSelection({ type: 'pole', poleId: selectedPoleId })}
                >
                  ← Return to Sensor Pole ({selectedPoleId})
                </button>
              </>
            )}

            {/* ── State 3: Security Guard Selected ── */}
            {selection.type === 'guard' && (
              <>
                {(() => {
                  const activeDispatched = dispatchedGuards.find(g => g.guardId === selection.guardId);
                  const guardInfo = guards.find(g => g.id === selection.guardId);
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          Security Guard
                        </h3>
                        <span className="badge badge-blue" style={{ fontSize: '10px' }}>Guard Location (Simulated)</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Officer</span>
                        <span className="metric-value" style={{ color: '#38bdf8', fontWeight: 700 }}>{officerName}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Guard ID</span>
                        <span className="metric-value">{selection.guardId}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Role</span>
                        <span className="metric-value">{officerRole}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Patrol Status</span>
                        <span className="metric-value ok">{statusText}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Reported Location</span>
                        <span className="metric-value">
                          {activeDispatched?.targetPoleId ? `Near ${activeDispatched.targetPoleId}` : 'Security Station (Entrance)'}
                        </span>
                      </div>

                      <div className="notice notice-info mt-2" style={{ fontSize: '12px', borderLeftColor: '#38bdf8' }}>
                        <strong>Separate Guard Telemetry:</strong> Position reported from the officer's simulated GPS / two-way security radio beacon. This location is independent of anonymous LiDAR detections.
                      </div>

                      <button
                        className="btn btn-ghost btn-sm btn-full mt-2"
                        onClick={() => setSelection({ type: 'pole', poleId: selectedPoleId })}
                      >
                        ← Return to Sensor Pole ({selectedPoleId})
                      </button>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* Demo scenarios — Categorized per Phase 2b */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 className="panel-title" style={{ margin: 0 }}>Demo Scenarios</h2>
              <span className="badge badge-simulated" style={{ fontSize: '10px' }}>Phase 2b</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
              Categorized simulation triggers. All signals labeled simulated/recorded.
            </p>

            <div className="scenario-section">
              {/* 1. Emergency Scenarios */}
              <div className="scenario-category">
                <div className="scenario-category-title">
                  <span>🚨 Emergency Signals</span>
                </div>
                <button
                  id="demo-silent-fall-btn"
                  className="scenario-btn"
                  onClick={triggerSilentFall}
                  disabled={fallPoleId === 'AS-104' && !acousticPoleId}
                >
                  <span>Silent Fall (AS-104)</span>
                  <span className="scenario-pill pill-review">Review</span>
                </button>
                <button
                  id="demo-scream-btn"
                  className="scenario-btn"
                  onClick={triggerScream}
                  disabled={acousticPoleId === 'AS-101'}
                >
                  <span>Distress Scream (AS-101)</span>
                  <span className="scenario-pill pill-review">Review</span>
                </button>
                <button
                  id="demo-combined-btn"
                  className="scenario-btn"
                  onClick={triggerCombined}
                  disabled={fallPoleId === 'AS-104' && acousticPoleId === 'AS-104'}
                >
                  <span>Combined Event (AS-104)</span>
                  <span className="scenario-pill pill-urgent">Urgent</span>
                </button>
              </div>

              {/* 2. Environmental & Infrastructure */}
              <div className="scenario-category">
                <div className="scenario-category-title">
                  <span>⚠️ Environment &amp; Sensors</span>
                </div>
                <button
                  id="demo-dark-btn"
                  className="scenario-btn"
                  onClick={triggerDark}
                  disabled={(lighting['AS-102'] ?? 70) < 30}
                >
                  <span>Dark Pathway (AS-102)</span>
                  <span className="scenario-pill pill-warn">Lighting</span>
                </button>
                <button
                  id="demo-offline-btn"
                  className="scenario-btn"
                  onClick={triggerOffline}
                  disabled={offlinePoleId === 'AS-103'}
                >
                  <span>Sensor Offline (AS-103)</span>
                  <span className="scenario-pill pill-cov">Coverage</span>
                </button>
                <button
                  id="demo-unsafe-route-btn"
                  className="scenario-btn"
                  onClick={triggerUnsafeRoute}
                >
                  <span>{blockedRouteZone === 'central_path' ? 'Reopen Central Path' : 'Block Central Path'}</span>
                  <span className="scenario-pill pill-cov">
                    {blockedRouteZone === 'central_path' ? 'Open' : 'Blocked'}
                  </span>
                </button>
              </div>

              {/* 3. Benign Telemetry */}
              <div className="scenario-category">
                <div className="scenario-category-title">
                  <span>🌿 Benign Telemetry</span>
                </div>
                <button
                  id="demo-rain-btn"
                  className="scenario-btn"
                  onClick={triggerBenignRain}
                >
                  <span>{isRaining ? 'Stop Rain Simulation' : 'Benign Rain Acoustic'}</span>
                  <span className="scenario-pill pill-norm">{isRaining ? 'Active' : 'Normal'}</span>
                </button>
              </div>

              {/* Reset button */}
              <button
                id="demo-reset-btn"
                className="btn btn-ghost btn-sm btn-full"
                onClick={handleReset}
                style={{ marginTop: '4px' }}
              >
                ↺ Reset All Scenarios
              </button>
            </div>
          </div>

          {/* Alert feed */}
          <div className="panel" style={{ flex: 1, overflowY: 'auto' }}>
            <h2 className="panel-title">Recent Alerts</h2>
            <div className="feed" role="list" aria-live="polite" aria-label="Recent alerts">
              {events.map(e => (
                <AlertCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
