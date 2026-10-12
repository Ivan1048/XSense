// Park Overview — default guard page.
// Desktop layout: 3D viewer (left ~65%) + sidebar (right ~35%).
// All sensor readings shown here are simulated.
import { useState, useCallback } from 'react';
import Scene from '../components/Park3D/Scene';
import StatusLabel from '../components/StatusLabel';
import AlertCard from '../components/AlertCard';
import { POLES, ZONES } from '../data/parkData';
import { createInitialEvent } from '../data/mockData';
import type { AlertEvent, LightingMap } from '../types';

function initialLighting(): LightingMap {
  return Object.fromEntries(POLES.map(p => [p.id, 70]));
}

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

export default function ParkOverview() {
  const [selectedPoleId, setSelectedPoleId] = useState<string>('AS-103');
  const [lighting, setLighting]             = useState<LightingMap>(initialLighting);
  const [nightMode, setNightMode]           = useState(true);
  const [showCoverage, setShowCoverage]     = useState(false);
  const [paused, setPaused]                 = useState(false);
  const [fallPoleId, setFallPoleId]         = useState<string | null>(null);
  const [offlinePoleId, setOfflinePoleId]   = useState<string | null>(null);
  const [resetCounter, setResetCounter]     = useState(0);
  const [events, setEvents]                 = useState<AlertEvent[]>([createInitialEvent()]);

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
    setEvents(prev => [entry, ...prev].slice(0, 15));
  }, []);

  // Derived summary counts
  const darkAreas = POLES.filter(
    p => p.id !== offlinePoleId && (lighting[p.id] ?? 70) < 30
  ).length;
  const needsAttention = (fallPoleId ? 1 : 0) + darkAreas;
  const sensorsOffline = offlinePoleId ? 1 : 0;

  const setPoleLight = (id: string, value: number) => {
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
  };

  // ── Demo scenario triggers ──────────────────────────────────────────
  const triggerFall = () => {
    setFallPoleId('AS-104');
    setSelectedPoleId('AS-104');
    addEvent(
      'Possible Fall — West Loop · AS-104',
      'SIMULATED: Unusual movement detected. A dot stopping does not prove a fall. Guard review required.',
      'urgent',
      'AS-104',
    );
  };

  const triggerDark = () => {
    setPoleLight('AS-102', 0);
    setSelectedPoleId('AS-102');
  };

  const triggerOffline = () => {
    setOfflinePoleId('AS-103');
    setSelectedPoleId('AS-103');
    addEvent(
      'Sensor Offline — Central Path · AS-103',
      'SIMULATED: AS-103 missed heartbeat. Monitoring may be unavailable in this area. Coverage Warning.',
      'warning',
      'AS-103',
    );
  };

  const handleReset = () => {
    setLighting(initialLighting());
    setFallPoleId(null);
    setOfflinePoleId(null);
    setSelectedPoleId('AS-103');
    setResetCounter(c => c + 1);
    addEvent('Demo Reset', 'All simulation events cleared. Lighting and sensors restored to default.', 'success');
  };

  // ── Selected pole info ──────────────────────────────────────────────
  const selectedPole       = POLES.find(p => p.id === selectedPoleId);
  const selectedBrightness = lighting[selectedPoleId] ?? 70;
  const isSelectedOffline  = offlinePoleId === selectedPoleId;
  const isSelectedAlert    = fallPoleId === selectedPoleId;
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
          needsAttention={needsAttention}
          darkAreas={darkAreas}
          sensorsOffline={sensorsOffline}
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
              onClick={() => setResetCounter(c => c + 1)}
            >
              ↺ Reset View
            </button>
          </div>

          {/* Canvas */}
          <div className="canvas-wrap">
            <Scene
              selectedPoleId={selectedPoleId}
              onSelectPole={setSelectedPoleId}
              lighting={lighting}
              showCoverage={showCoverage}
              paused={paused}
              nightMode={nightMode}
              fallPoleId={fallPoleId}
              offlinePoleId={offlinePoleId}
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
              Anonymous moving dot
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot amber" aria-hidden="true" />
              Possible incident
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot orange" aria-hidden="true" />
              Low lighting
            </div>
            <div className="legend-item" role="listitem">
              <span className="legend-dot purple" aria-hidden="true" />
              Sensor offline
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="sidebar" aria-label="Park details panel">

          {/* Selected area */}
          <div className="panel">
            <h2 className="panel-title">Selected Area</h2>

            <div className="form-group mb-2">
              <label className="form-label" htmlFor="pole-select">Sensor pole</label>
              <select
                id="pole-select"
                className="form-control"
                value={selectedPoleId}
                onChange={e => setSelectedPoleId(e.target.value)}
              >
                {POLES.map(p => (
                  <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
                ))}
              </select>
            </div>

            {selectedPole && (
              <>
                <div className="metric-row">
                  <span className="metric-label">Area</span>
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
          </div>

          {/* Demo scenarios */}
          <div className="panel">
            <h2 className="panel-title">Demo Scenarios</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              All scenarios are clearly labeled simulated. No real sensors are triggered.
            </p>
            <div className="action-group">
              <button
                id="demo-fall-btn"
                className="btn btn-danger btn-sm btn-full"
                onClick={triggerFall}
                disabled={!!fallPoleId}
              >
                Simulate Possible Fall
              </button>
              <button
                id="demo-dark-btn"
                className="btn btn-warning btn-sm btn-full"
                onClick={triggerDark}
                disabled={(lighting['AS-102'] ?? 70) < 30}
              >
                Simulate Dark Pathway
              </button>
              <button
                id="demo-offline-btn"
                className="btn btn-secondary btn-sm btn-full"
                onClick={triggerOffline}
                disabled={!!offlinePoleId}
              >
                Simulate Sensor Offline
              </button>
              <button
                id="demo-reset-btn"
                className="btn btn-ghost btn-sm btn-full"
                onClick={handleReset}
              >
                ↺ Demo Reset
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
