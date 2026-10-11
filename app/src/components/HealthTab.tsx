import React, { useState } from 'react';
import {
  AlertTriangle,
  Radio,
  Search,
  Wrench,
  Compass,
  Volume2,
  Footprints,
  Lightbulb,
} from 'lucide-react';
import type { Pole } from '../types';

interface HealthTabProps {
  poles: Pole[];
  onSelectPole: (poleId: string) => void;
  onNavigateToMap: (poleId: string) => void;
}

export const HealthTab: React.FC<HealthTabProps> = ({
  poles,
  onSelectPole,
  onNavigateToMap,
}) => {
  const [filter, setFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const degradedCount = poles.filter((p) => p.status === 'Degraded').length;
  const offlineCount = poles.filter((p) => p.status === 'Offline').length;
  const normalCount = poles.filter((p) => p.status === 'Normal').length;

  const filteredPoles = poles.filter((p) => {
    const matchesFilter =
      filter === 'All' ? true : p.status === filter;
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.zone.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRecommendedAction = (pole: Pole) => {
    if (pole.status === 'Offline') {
      return {
        action: 'Schedule Immediate Site Inspection',
        detail: 'Heartbeat timeout. Inspect LoRa gateway transceiver & solar battery.',
        badge: 'action-critical',
      };
    }
    if (pole.status === 'Degraded') {
      return {
        action: 'Run Remote Diagnostic Routine',
        detail: 'Acoustic micro-packet loss detected under dense foliage. Calibrate sensitivity.',
        badge: 'action-warning',
      };
    }
    return {
      action: 'Routine Telemetry Heartbeat OK',
      detail: 'Sensors operating normally within simulated parameters.',
      badge: 'action-normal',
    };
  };

  return (
    <div className="health-page-wrapper">
      {/* Prominent Coverage Warning if offline or degraded */}
      {(offlineCount > 0 || degradedCount > 0) && (
        <div className="coverage-warning-banner" role="alert">
          <div className="warning-content">
            <AlertTriangle size={22} className="warning-icon" />
            <div>
              <strong>Coverage degraded — do not assume the area is monitored.</strong>
              <p>
                {offlineCount} pole(s) offline ({poles.filter((p) => p.status === 'Offline').map((p) => p.id).join(', ')}), {degradedCount} degraded ({poles.filter((p) => p.status === 'Degraded').map((p) => p.id).join(', ')}). A sensor-health failure must not silently appear as "all clear".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Health Overview Metric Cards */}
      <div className="health-kpi-row">
        <div className="health-stat-card">
          <span className="stat-label">Total Pole Nodes</span>
          <strong className="stat-value">{poles.length}</strong>
          <span className="stat-sub">100% Simulated Mesh</span>
        </div>
        <div className="health-stat-card normal">
          <span className="stat-label">Fully Operational</span>
          <strong className="stat-value">{normalCount}</strong>
          <span className="stat-sub">{Math.round((normalCount / poles.length) * 100)}% Availability</span>
        </div>
        <div className="health-stat-card degraded">
          <span className="stat-label">Degraded Coverage</span>
          <strong className="stat-value">{degradedCount}</strong>
          <span className="stat-sub">Partial Sensor Dropout</span>
        </div>
        <div className="health-stat-card offline">
          <span className="stat-label">Offline (No Ping)</span>
          <strong className="stat-value">{offlineCount}</strong>
          <span className="stat-sub">Urgent Field Check</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="health-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search pole ID, name, or zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-field"
          />
        </div>

        <div className="filter-chip-group">
          {['All', 'Normal', 'Degraded', 'Offline'].map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-chip ${filter === st ? 'active' : ''}`}
              onClick={() => setFilter(st)}
            >
              {st} ({st === 'All' ? poles.length : poles.filter((p) => p.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Telemetry Table */}
      <div className="desktop-table-container">
        <table className="telemetry-table" aria-label="Pole hardware diagnostics table">
          <thead>
            <tr>
              <th>Pole & Zone</th>
              <th>Status</th>
              <th>Last Heartbeat</th>
              <th>Acoustic Array</th>
              <th>3D LiDAR Module</th>
              <th>Luminaire Mode</th>
              <th>LoRa Link</th>
              <th>Recommended Maintenance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPoles.map((pole) => {
              const rec = getRecommendedAction(pole);
              return (
                <tr key={pole.id} className={`row-status-${pole.status.toLowerCase()}`}>
                  <td>
                    <div className="cell-pole-info">
                      <strong className="mono-id">{pole.id}</strong>
                      <span className="cell-pole-name">{pole.name}</span>
                      <span className="cell-pole-zone">{pole.zone}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${pole.status.toLowerCase()}`}>
                      {pole.status}
                    </span>
                  </td>
                  <td>
                    <span className="mono-time">{pole.lastHeartbeat}</span>
                  </td>
                  <td>
                    <span className={`health-pill ${pole.acousticStatus.toLowerCase()}`}>
                      <Volume2 size={12} />
                      <span>{pole.acousticStatus}</span>
                    </span>
                  </td>
                  <td>
                    <span className={`health-pill ${pole.lidarStatus.toLowerCase()}`}>
                      <Footprints size={12} />
                      <span>{pole.lidarStatus}</span>
                    </span>
                  </td>
                  <td>
                    <span className="lighting-pill">
                      <Lightbulb size={12} />
                      <span>{pole.lightingStatus}</span>
                    </span>
                  </td>
                  <td>
                    <span className={`link-pill ${pole.connectivityStatus.toLowerCase()}`}>
                      <Radio size={12} />
                      <span>{pole.connectivityStatus}</span>
                    </span>
                  </td>
                  <td>
                    <div className="rec-action-cell">
                      <strong className={rec.badge}>{rec.action}</strong>
                      <span className="rec-detail">{rec.detail}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-table-action"
                      onClick={() => {
                        onSelectPole(pole.id);
                        onNavigateToMap(pole.id);
                      }}
                      title="View pole location on map"
                    >
                      <Compass size={14} />
                      <span>Map</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Telemetry Card Grid (For Phones / Tablets) */}
      <div className="mobile-health-card-grid">
        {filteredPoles.map((pole) => {
          const rec = getRecommendedAction(pole);
          return (
            <div key={pole.id} className={`mobile-health-card status-${pole.status.toLowerCase()}`}>
              <div className="mhc-header">
                <div>
                  <strong className="mono-id">{pole.id}</strong>
                  <h4 className="mhc-name">{pole.name}</h4>
                  <span className="mhc-zone">{pole.zone}</span>
                </div>
                <span className={`status-badge ${pole.status.toLowerCase()}`}>
                  {pole.status}
                </span>
              </div>

              <div className="mhc-module-row">
                <div className="mhc-mod-chip">
                  <span>Acoustic:</span>
                  <strong className={pole.acousticStatus.toLowerCase()}>{pole.acousticStatus}</strong>
                </div>
                <div className="mhc-mod-chip">
                  <span>LiDAR:</span>
                  <strong className={pole.lidarStatus.toLowerCase()}>{pole.lidarStatus}</strong>
                </div>
                <div className="mhc-mod-chip">
                  <span>LoRa:</span>
                  <strong className={pole.connectivityStatus.toLowerCase()}>{pole.connectivityStatus}</strong>
                </div>
              </div>

              <div className="mhc-meta">
                <span>Heartbeat: {pole.lastHeartbeat}</span>
                <span>Power: {pole.batteryLevel || '95%'}</span>
              </div>

              <div className="mhc-rec-box">
                <Wrench size={14} />
                <div>
                  <strong>{rec.action}</strong>
                  <p>{rec.detail}</p>
                </div>
              </div>

              <div className="mhc-actions">
                <button
                  type="button"
                  className="btn-case-action secondary full-width"
                  onClick={() => {
                    onSelectPole(pole.id);
                    onNavigateToMap(pole.id);
                  }}
                >
                  <Compass size={14} />
                  <span>Locate Pole on Interactive Map</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
