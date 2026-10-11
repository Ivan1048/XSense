import React, { useState } from 'react';
import {
  X,
  Play,
  Volume2,
  Footprints,
  Layers,
  CloudRain,
  WifiOff,
  Sparkles,
  Info,
  CheckCircle,
} from 'lucide-react';
import type { Pole, ScenarioPreset, RuleSettings } from '../types';

interface ScenarioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerPreset: (scenario: ScenarioPreset) => void;
  onTriggerCustom: (type: string, poleId: string, zone: string, confidence: number) => void;
  onRunDemoScenario: () => void;
  poles: Pole[];
  settings: RuleSettings;
}

export const ScenarioDrawer: React.FC<ScenarioDrawerProps> = ({
  isOpen,
  onClose,
  onTriggerPreset,
  onTriggerCustom,
  onRunDemoScenario,
  poles,
  settings,
}) => {
  const [selectedPoleId, setSelectedPoleId] = useState<string>(poles[3]?.id || 'AS-104');
  const [customType, setCustomType] = useState<string>('Possible human fall / prolonged stillness');
  const [customConfidence, setCustomConfidence] = useState<number>(0.85);

  if (!isOpen) return null;

  const currentPole = poles.find((p) => p.id === selectedPoleId) || poles[0];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerCustom(customType, currentPole.id, currentPole.zone, customConfidence);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="scenario-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <Sparkles size={20} className="text-teal" />
            <div>
              <h3>Sensor Event Simulator</h3>
              <p className="drawer-subtitle">Simulated trigger injection • Hackathon testbed</p>
            </div>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
          <div className="info-banner-mini">
            <Info size={16} />
            <span>
              All events are mathematical simulations evaluating local rules. No live mics or LiDAR are connected.
            </span>
          </div>

          {/* Preset 1-Click Scenarios */}
          <section className="drawer-section">
            <div className="section-header-compact">
              <h4>Standard Evaluation Presets</h4>
              <span className="section-badge">Required Test Scenarios</span>
            </div>

            <div className="preset-card-grid">
              <button
                type="button"
                className="scenario-btn danger-tone"
                onClick={() => onTriggerPreset('fall')}
              >
                <div className="scenario-btn-icon">
                  <Footprints size={20} />
                </div>
                <div className="scenario-btn-text">
                  <strong>Simulated Human Fall / Stillness</strong>
                  <span>LiDAR-style prolonged motionless cluster at AS-104 (0.88 conf)</span>
                </div>
                <span className="action-tag">Triggers Alert</span>
              </button>

              <button
                type="button"
                className="scenario-btn warning-tone"
                onClick={() => onTriggerPreset('distress')}
              >
                <div className="scenario-btn-icon">
                  <Volume2 size={20} />
                </div>
                <div className="scenario-btn-text">
                  <strong>Possible Distress Sound</strong>
                  <span>Simulated acoustic classifier trigger at AS-103 (0.93 conf)</span>
                </div>
                <span className="action-tag">Triggers Alert</span>
              </button>

              <button
                type="button"
                className="scenario-btn purple-tone"
                onClick={() => onTriggerPreset('combined')}
              >
                <div className="scenario-btn-icon">
                  <Layers size={20} />
                </div>
                <div className="scenario-btn-text">
                  <strong>Combined Acoustic + Fall Anomaly</strong>
                  <span>Dual sensor fusion anomaly at AS-106 (0.81 conf)</span>
                </div>
                <span className="action-tag priority-high">High Priority</span>
              </button>

              <button
                type="button"
                className="scenario-btn info-tone"
                onClick={() => onTriggerPreset('benign')}
              >
                <div className="scenario-btn-icon">
                  <CloudRain size={20} />
                </div>
                <div className="scenario-btn-text">
                  <strong>Benign Background Noise</strong>
                  <span>Rain/wildlife acoustic surge at AS-102 (0.67 conf)</span>
                </div>
                <span className="action-tag informational">Informational Only</span>
              </button>

              <button
                type="button"
                className="scenario-btn gray-tone"
                onClick={() => onTriggerPreset('offline')}
              >
                <div className="scenario-btn-icon">
                  <WifiOff size={20} />
                </div>
                <div className="scenario-btn-text">
                  <strong>Sensor Offline / Degraded</strong>
                  <span>Heartbeat timeout at AS-108 with coverage warning</span>
                </div>
                <span className="action-tag degraded">Degraded Warning</span>
              </button>
            </div>
          </section>

          {/* End to End Presentation Flow */}
          <section className="drawer-section highlighted-section">
            <div className="section-header-compact">
              <h4>Full Hackathon Demo Sequence</h4>
              <span className="section-badge teal">Automated</span>
            </div>
            <p className="section-desc">
              Executes the complete 13-step scenario defined in Section 6 of the brief (Benign → Fall alert → Lighting corridor → Patrol assignment).
            </p>
            <button
              type="button"
              className="btn-scenario full-width big"
              onClick={() => {
                onRunDemoScenario();
                onClose();
              }}
            >
              <Play size={18} />
              <span>Launch Automated Presentation Demo</span>
            </button>
          </section>

          {/* Custom Event Injector */}
          <section className="drawer-section">
            <div className="section-header-compact">
              <h4>Custom Event Injector</h4>
              <span className="section-badge">Rule Testing</span>
            </div>

            <form onSubmit={handleCustomSubmit} className="custom-event-form">
              <div className="form-group">
                <label htmlFor="custom-pole-select">Target Pole Location</label>
                <select
                  id="custom-pole-select"
                  value={selectedPoleId}
                  onChange={(e) => setSelectedPoleId(e.target.value)}
                  className="form-control"
                >
                  {poles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} ({p.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="custom-event-type">Simulated Event Classification</label>
                <select
                  id="custom-event-type"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="form-control"
                >
                  <option value="Possible human fall / prolonged stillness">
                    Possible human fall / prolonged stillness
                  </option>
                  <option value="Possible distress sound">Possible distress sound</option>
                  <option value="Combined acoustic + movement anomaly">
                    Combined acoustic + movement anomaly
                  </option>
                  <option value="Benign background event">Benign background event</option>
                  <option value="Sensor offline / degraded">Sensor offline / degraded</option>
                </select>
              </div>

              <div className="form-group">
                <div className="label-with-value">
                  <label htmlFor="custom-confidence-slider">Simulated Confidence Value</label>
                  <span className="mono-val">{(customConfidence * 100).toFixed(0)}% ({customConfidence.toFixed(2)})</span>
                </div>
                <input
                  id="custom-confidence-slider"
                  type="range"
                  min="0.30"
                  max="1.00"
                  step="0.01"
                  value={customConfidence}
                  onChange={(e) => setCustomConfidence(parseFloat(e.target.value))}
                  className="confidence-slider"
                />
                <div className="threshold-indicators">
                  <span className="hint-text">
                    Current active thresholds: Fall ≥ {settings.fallThreshold.toFixed(2)} • Acoustic ≥ {settings.acousticThreshold.toFixed(2)}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn-primary full-width">
                <CheckCircle size={16} />
                <span>Inject Custom Simulated Event</span>
              </button>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
};
