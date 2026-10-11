import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Footprints,
  Volume2,
  AlertTriangle,
  Lightbulb,
  Radio,
  MapPin,
  Compass,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import type { Pole, ScenarioPreset } from '../types';

interface MapTabProps {
  poles: Pole[];
  selectedPoleId: string;
  onSelectPole: (id: string) => void;
  lightingCorridor: string[];
  onResetCorridor: () => void;
  onTriggerPresetForPole: (preset: ScenarioPreset, poleId: string) => void;
  activeAlertPoleId?: string;
}

export const MapTab: React.FC<MapTabProps> = ({
  poles,
  selectedPoleId,
  onSelectPole,
  lightingCorridor,
  onResetCorridor,
  onTriggerPresetForPole,
  activeAlertPoleId,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  const selectedPole = poles.find((p) => p.id === selectedPoleId) || poles[0];

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // Status color mappings
  const getStatusClass = (status: Pole['status']) => {
    switch (status) {
      case 'Alert':
        return 'status-alert';
      case 'Degraded':
        return 'status-degraded';
      case 'Offline':
        return 'status-offline';
      default:
        return 'status-normal';
    }
  };

  return (
    <div className="map-view-layout">
      {/* Top Map Control Bar */}
      <div className="map-control-strip">
        <div className="map-strip-left">
          <div className="map-title-badge">
            <Compass size={16} className="text-teal" />
            <strong>Township Park Schematic</strong>
            <span className="demo-chip">Illustrative Geometry • Non-GPS</span>
          </div>

          {/* Quick Mobile / Desktop Pole Selector */}
          <div className="quick-pole-selector-wrap">
            <label htmlFor="pole-quick-select" className="quick-select-label">
              <MapPin size={14} /> Focus Pole:
            </label>
            <select
              id="pole-quick-select"
              value={selectedPoleId}
              onChange={(e) => onSelectPole(e.target.value)}
              className="pole-select-dropdown"
            >
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} [{p.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="map-strip-right">
          {lightingCorridor.length > 0 && (
            <div className="corridor-active-pill">
              <Lightbulb size={14} className="text-amber" />
              <span>
                Lighting Corridor Active: {lightingCorridor.join(' → ')}
              </span>
              <button
                type="button"
                className="btn-clear-corridor"
                onClick={onResetCorridor}
                title="Reset lighting response"
              >
                Clear
              </button>
            </div>
          )}

          <div className="map-zoom-buttons">
            <button
              type="button"
              className="map-btn"
              onClick={handleZoomIn}
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="map-btn"
              onClick={handleZoomOut}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="map-btn"
              onClick={handleResetZoom}
              title="Reset Zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className={`map-btn ${showLegend ? 'active' : ''}`}
              onClick={() => setShowLegend(!showLegend)}
              title="Toggle Legend"
              aria-label="Toggle map legend"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Map + Side Panel Grid */}
      <div className="map-interactive-grid">
        {/* Schematic SVG Map */}
        <div className="map-canvas-container">
          <div
            className="map-zoom-wrapper"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.25s ease' }}
          >
            <svg
              className="township-svg-map"
              viewBox="0 0 720 450"
              role="img"
              aria-label="AuraSense township park safety network interactive map"
            >
              <defs>
                {/* Radial gradient for retention lake */}
                <radialGradient id="lakeWater" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#0369a1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#082f49" stopOpacity="0.25" />
                </radialGradient>

                {/* Linear gradient for lit corridor */}
                <linearGradient id="corridorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                </linearGradient>

                {/* Filter for pulsing glow */}
                <filter id="glowEffect" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Park Background Landscape Elements */}
              <rect width="720" height="450" className="map-bg-fill" rx="14" />

              {/* Park Lawn Zones */}
              <path
                d="M 40 40 Q 150 20 280 40 Q 320 180 200 240 Q 80 220 40 40 Z"
                className="zone-lawn"
              />
              <path
                d="M 380 40 Q 640 30 680 180 Q 560 250 420 200 Q 380 100 380 40 Z"
                className="zone-lawn"
              />
              <path
                d="M 120 250 Q 320 240 340 410 Q 140 420 120 250 Z"
                className="zone-lawn"
              />

              {/* Lake / Retention Basin */}
              <ellipse cx="230" cy="135" rx="75" ry="42" fill="url(#lakeWater)" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="200" y="140" className="map-landmark-text water">Retention Lake</text>

              {/* Central Plaza Fountain */}
              <circle cx="495" cy="220" r="32" className="landmark-plaza" />
              <circle cx="495" cy="220" r="12" className="landmark-fountain" />
              <text x="460" y="224" className="map-landmark-text">Central Plaza</text>

              {/* Children Playground Area */}
              <rect x="260" y="195" width="60" height="44" rx="8" className="landmark-playground" />
              <text x="268" y="218" className="map-landmark-text sub">Playground</text>

              {/* Main Exit & Gatehouse */}
              <g className="landmark-gatehouse">
                <rect x="295" y="360" width="70" height="34" rx="6" className="gatehouse-box" />
                <text x="304" y="380" className="gatehouse-text">MAIN EXIT</text>
                <text x="312" y="392" className="gatehouse-sub">Gate 1</text>
              </g>

              {/* Safe Assembly Point */}
              <g className="landmark-assembly">
                <circle cx="585" cy="190" r="30" className="assembly-circle" />
                <text x="562" y="188" className="assembly-text">ASSEMBLY</text>
                <text x="568" y="200" className="assembly-sub">Safe Muster</text>
              </g>

              {/* Pedestrian Park Pathways */}
              <path
                d="M 120 95 L 235 135 L 290 220 L 175 285 L 325 350 L 450 350 L 610 310"
                className="park-trail trail-primary"
              />
              <path
                d="M 120 95 L 440 110 L 495 220 L 585 190 L 610 310"
                className="park-trail trail-secondary"
              />
              <path
                d="M 235 135 L 440 110"
                className="park-trail trail-connector"
              />
              <path
                d="M 290 220 L 495 220"
                className="park-trail trail-connector"
              />
              <path
                d="M 175 285 L 325 350"
                className="park-trail trail-connector"
              />
              <path
                d="M 495 220 L 450 350"
                className="park-trail trail-connector"
              />

              {/* Highlighted Safe Exit Corridor Route (When Alert Active) */}
              {lightingCorridor.length > 1 && (
                <g className="corridor-path-group">
                  {lightingCorridor.map((poleId, idx) => {
                    if (idx === lightingCorridor.length - 1) return null;
                    const p1 = poles.find((p) => p.id === poleId);
                    const p2 = poles.find((p) => p.id === lightingCorridor[idx + 1]);
                    if (!p1 || !p2) return null;
                    return (
                      <g key={`corridor-seg-${p1.id}-${p2.id}`}>
                        {/* Outer Glow Halo */}
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke="#fbbf24"
                          strokeWidth="12"
                          strokeOpacity="0.3"
                          strokeLinecap="round"
                          filter="url(#glowEffect)"
                        />
                        {/* Inner High Illuminance Beam */}
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke="url(#corridorGlow)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          className="animated-corridor-beam"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Lighting Halo Rings around Corridored Poles */}
              {lightingCorridor.map((poleId, index) => {
                const pole = poles.find((p) => p.id === poleId);
                if (!pole) return null;
                return (
                  <g key={`halo-${pole.id}`}>
                    <circle
                      cx={pole.x}
                      cy={pole.y}
                      r={24 + index * 4}
                      className="lighting-halo-ring"
                    />
                    <circle
                      cx={pole.x}
                      cy={pole.y}
                      r={36 + index * 4}
                      className="lighting-halo-ring outer"
                    />
                  </g>
                );
              })}

              {/* Sensor Poles Interactive Nodes */}
              {poles.map((pole) => {
                const isSelected = selectedPoleId === pole.id;
                const isCorridored = lightingCorridor.includes(pole.id);
                const isAlerting = activeAlertPoleId === pole.id || pole.status === 'Alert';
                const statusClass = getStatusClass(pole.status);

                return (
                  <g
                    key={pole.id}
                    className={`pole-group ${statusClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectPole(pole.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Sensor pole ${pole.id}, Status ${pole.status}`}
                  >
                    {/* Enlarged Transparent Touch Hit Target for mobile */}
                    <circle
                      cx={pole.x}
                      cy={pole.y}
                      r="28"
                      className="pole-touch-target"
                    />

                    {/* Alert Pulse Wave if Alerting */}
                    {isAlerting && (
                      <circle
                        cx={pole.x}
                        cy={pole.y}
                        r="32"
                        className="pulse-alert-ring"
                      />
                    )}

                    {/* Selected Ring */}
                    {isSelected && (
                      <circle
                        cx={pole.x}
                        cy={pole.y}
                        r="22"
                        className="selection-indicator-ring"
                      />
                    )}

                    {/* Light Halo if in lighting corridor */}
                    {isCorridored && (
                      <circle
                        cx={pole.x}
                        cy={pole.y}
                        r="18"
                        className="pole-corridor-aura"
                      />
                    )}

                    {/* Main Pole Node Circle */}
                    <circle
                      cx={pole.x}
                      cy={pole.y}
                      r={isSelected ? 14 : 11}
                      className="pole-core-node"
                    />

                    {/* Inner Center Dot */}
                    <circle
                      cx={pole.x}
                      cy={pole.y}
                      r="4"
                      className="pole-center-dot"
                    />

                    {/* Pole ID Label Badge */}
                    <rect
                      x={pole.x + 14}
                      y={pole.y - 10}
                      width="52"
                      height="18"
                      rx="4"
                      className="pole-label-bg"
                    />
                    <text
                      x={pole.x + 19}
                      y={pole.y + 3}
                      className="pole-label-text"
                    >
                      {pole.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Collapsible Floating Map Legend */}
          {showLegend && (
            <div className="map-floating-legend">
              <div className="legend-header">
                <strong>Map Legend</strong>
                <button
                  type="button"
                  className="btn-close-legend"
                  onClick={() => setShowLegend(false)}
                >
                  ✕
                </button>
              </div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-dot normal" />
                  <span>Normal Pole (Standby Dimmed)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot alert" />
                  <span>Alert Pole (Active Review)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot degraded" />
                  <span>Degraded Sensor (Reduced Coverage)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot offline" />
                  <span>Offline Pole (Telemetry Lost)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-line corridor" />
                  <span>Safe Exit Lighting Corridor</span>
                </div>
                <div className="legend-item">
                  <span className="legend-box exit" />
                  <span>Main Gatehouse / Safe Assembly</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Pole Detail Panel / Drawer */}
        <aside className="pole-detail-panel">
          <div className="detail-panel-header">
            <div>
              <div className="detail-tag-row">
                <span className={`status-badge ${getStatusClass(selectedPole.status)}`}>
                  {selectedPole.status}
                </span>
                <span className="mono-zone-tag">{selectedPole.zone}</span>
              </div>
              <h3 className="detail-pole-title">
                {selectedPole.id} — {selectedPole.name}
              </h3>
            </div>
          </div>

          <div className="detail-panel-body">
            <p className="detail-description">{selectedPole.description}</p>

            <div className="detail-spec-grid">
              <div className="spec-card">
                <span className="spec-label">Coordinates</span>
                <strong className="spec-value mono-val">{selectedPole.coordinates}</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">Last Heartbeat</span>
                <strong className="spec-value">{selectedPole.lastHeartbeat}</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">Power & Storage</span>
                <strong className="spec-value">{selectedPole.batteryLevel || '95% Solar'}</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">Lighting Mode</span>
                <strong className="spec-value">{selectedPole.lightingStatus}</strong>
              </div>
            </div>

            {/* Simulated Edge Sensor Module Diagnostics */}
            <div className="module-health-section">
              <h4>Simulated Edge Hardware Health</h4>
              <div className="module-health-list">
                <div className="module-item">
                  <div className="module-label-wrap">
                    <Volume2 size={16} />
                    <span>Acoustic Classifier (Edge)</span>
                  </div>
                  <span className={`module-chip ${selectedPole.acousticStatus.toLowerCase()}`}>
                    {selectedPole.acousticStatus}
                  </span>
                </div>

                <div className="module-item">
                  <div className="module-label-wrap">
                    <Footprints size={16} />
                    <span>3D LiDAR Volumetric (Edge)</span>
                  </div>
                  <span className={`module-chip ${selectedPole.lidarStatus.toLowerCase()}`}>
                    {selectedPole.lidarStatus}
                  </span>
                </div>

                <div className="module-item">
                  <div className="module-label-wrap">
                    <Radio size={16} />
                    <span>LoRaWAN Mesh Telemetry</span>
                  </div>
                  <span className={`module-chip ${selectedPole.connectivityStatus.toLowerCase()}`}>
                    {selectedPole.connectivityStatus}
                  </span>
                </div>

                <div className="module-item">
                  <div className="module-label-wrap">
                    <Lightbulb size={16} />
                    <span>Smart Luminaire Controller</span>
                  </div>
                  <span className="module-chip online">Responsive</span>
                </div>
              </div>
            </div>

            {/* Quick Trigger Actions for Selected Pole */}
            <div className="detail-actions-section">
              <h4>Simulate Trigger at this Pole</h4>
              <div className="detail-btn-row">
                <button
                  type="button"
                  className="btn-trigger-action fall"
                  onClick={() => onTriggerPresetForPole('fall', selectedPole.id)}
                >
                  <Footprints size={14} />
                  <span>Simulate Fall</span>
                </button>
                <button
                  type="button"
                  className="btn-trigger-action distress"
                  onClick={() => onTriggerPresetForPole('distress', selectedPole.id)}
                >
                  <Volume2 size={14} />
                  <span>Simulate Distress</span>
                </button>
                <button
                  type="button"
                  className="btn-trigger-action outage"
                  onClick={() => onTriggerPresetForPole('offline', selectedPole.id)}
                >
                  <AlertTriangle size={14} />
                  <span>Simulate Outage</span>
                </button>
              </div>
            </div>

            <div className="simulation-notice-card">
              <CheckCircle2 size={15} className="text-teal" />
              <span>
                Lighting response is simulated; no physical lights were controlled.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
