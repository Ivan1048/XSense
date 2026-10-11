import React from 'react';
import {
  RotateCcw,
  Play,
  Sparkles,
  Info,
  Volume2,
  Footprints,
  Layers,
  CloudRain,
} from 'lucide-react';
import type { RuleSettings } from '../types';

interface SettingsTabProps {
  settings: RuleSettings;
  setSettings: React.Dispatch<React.SetStateAction<RuleSettings>>;
  onResetSettings: () => void;
  onResetSimulation: () => void;
  onRunDemoScenario: () => void;
  onOpenScenarioDrawer: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  onResetSettings,
  onResetSimulation,
  onRunDemoScenario,
  onOpenScenarioDrawer,
}) => {
  const updateSetting = (key: keyof RuleSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: Number(value.toFixed(2)) }));
  };

  return (
    <div className="settings-page-wrapper">
      <div className="section-intro-bar">
        <div>
          <h3>Event-Fusion Rule Engine Configuration</h3>
          <p className="intro-sub">
            Calibrate mathematical sensitivity thresholds for township edge event verification. All values are demo parameters, not field-certified ML accuracies.
          </p>
        </div>
        <div className="settings-top-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onResetSettings}
            title="Reset rule thresholds to brief defaults"
          >
            <RotateCcw size={14} />
            <span>Reset Thresholds</span>
          </button>
        </div>
      </div>

      <div className="settings-main-grid">
        {/* Sliders Card */}
        <section className="settings-controls-card">
          <div className="card-header-with-badge">
            <h4>Active Detection Thresholds</h4>
            <span className="mono-badge">Configurable Engine</span>
          </div>

          <div className="sliders-list">
            {/* Acoustic Distress Threshold */}
            <div className="slider-item">
              <div className="slider-label-row">
                <div className="slider-title-group">
                  <Volume2 size={18} className="text-amber" />
                  <div>
                    <strong>Acoustic Distress Trigger Threshold</strong>
                    <p className="slider-desc">
                      Simulated scream / distress frequency match score required to trigger operator alert.
                    </p>
                  </div>
                </div>
                <span className="slider-value-display mono-val">
                  {(settings.acousticThreshold * 100).toFixed(0)}% ({settings.acousticThreshold.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="1.00"
                step="0.01"
                value={settings.acousticThreshold}
                onChange={(e) => updateSetting('acousticThreshold', parseFloat(e.target.value))}
                className="range-input"
              />
              <div className="slider-ticks">
                <span>0.50 (Loose)</span>
                <span>Default: 0.90</span>
                <span>1.00 (Strict)</span>
              </div>
            </div>

            {/* Fall / Stillness Threshold */}
            <div className="slider-item">
              <div className="slider-label-row">
                <div className="slider-title-group">
                  <Footprints size={18} className="text-rose" />
                  <div>
                    <strong>LiDAR Human Fall / Stillness Threshold</strong>
                    <p className="slider-desc">
                      Volumetric point-cloud collapse & stationary duration confidence before creating incident.
                    </p>
                  </div>
                </div>
                <span className="slider-value-display mono-val">
                  {(settings.fallThreshold * 100).toFixed(0)}% ({settings.fallThreshold.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="1.00"
                step="0.01"
                value={settings.fallThreshold}
                onChange={(e) => updateSetting('fallThreshold', parseFloat(e.target.value))}
                className="range-input"
              />
              <div className="slider-ticks">
                <span>0.50 (Loose)</span>
                <span>Default: 0.88</span>
                <span>1.00 (Strict)</span>
              </div>
            </div>

            {/* Combined Dual-Anomaly Fusion */}
            <div className="slider-item">
              <div className="slider-label-row">
                <div className="slider-title-group">
                  <Layers size={18} className="text-purple" />
                  <div>
                    <strong>Combined Dual-Signal Fusion Cutoff</strong>
                    <p className="slider-desc">
                      Threshold when both acoustic and movement signals corroborate simultaneously, raising priority.
                    </p>
                  </div>
                </div>
                <span className="slider-value-display mono-val">
                  {(settings.combinedThreshold * 100).toFixed(0)}% ({settings.combinedThreshold.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.01"
                value={settings.combinedThreshold}
                onChange={(e) => updateSetting('combinedThreshold', parseFloat(e.target.value))}
                className="range-input"
              />
              <div className="slider-ticks">
                <span>0.40 (Sensitive)</span>
                <span>Default: 0.75</span>
                <span>0.95 (High Bar)</span>
              </div>
            </div>

            {/* Benign Filter Cutoff */}
            <div className="slider-item">
              <div className="slider-label-row">
                <div className="slider-title-group">
                  <CloudRain size={18} className="text-sky" />
                  <div>
                    <strong>Benign Environmental Noise Ceiling</strong>
                    <p className="slider-desc">
                      Background rain, wind surge, or fauna noises below this value remain logged as informational only.
                    </p>
                  </div>
                </div>
                <span className="slider-value-display mono-val">
                  {(settings.benignThreshold * 100).toFixed(0)}% ({settings.benignThreshold.toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.85"
                step="0.01"
                value={settings.benignThreshold}
                onChange={(e) => updateSetting('benignThreshold', parseFloat(e.target.value))}
                className="range-input"
              />
              <div className="slider-ticks">
                <span>0.30 (Aggressive Filter)</span>
                <span>Default: 0.70</span>
                <span>0.85 (Permissive)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Evaluation Preview & Actions */}
        <section className="settings-preview-card">
          <div className="card-header-with-badge">
            <h4>Live Engine Evaluation Logic</h4>
            <span className="mono-badge">Deterministic</span>
          </div>

          <div className="rule-explanation-box">
            <div className="rule-rule-item">
              <strong>Rule 1 — Acoustic Distress:</strong>
              <p>
                If acoustic score ≥ <code>{settings.acousticThreshold.toFixed(2)}</code> → Escalates to <strong>"Needs Review"</strong> alert. If lower, categorized as informational metadata.
              </p>
            </div>

            <div className="rule-rule-item">
              <strong>Rule 2 — LiDAR Stillness / Fall:</strong>
              <p>
                If stillness score ≥ <code>{settings.fallThreshold.toFixed(2)}</code> → Escalates to <strong>"Needs Review"</strong> alert and triggers safe exit lighting corridor.
              </p>
            </div>

            <div className="rule-rule-item">
              <strong>Rule 3 — Corroborated Dual-Anomaly:</strong>
              <p>
                If combined dual score ≥ <code>{settings.combinedThreshold.toFixed(2)}</code> → Escalates immediately to <strong>High Priority</strong> review queue.
              </p>
            </div>

            <div className="rule-rule-item">
              <strong>Rule 4 — Sensor Degraded Override:</strong>
              <p>
                If sensor heartbeat times out → Displays <strong>"Coverage degraded — do not assume the area is monitored"</strong>.
              </p>
            </div>
          </div>

          <div className="settings-bottom-actions">
            <button
              type="button"
              className="btn-primary full-width"
              onClick={onOpenScenarioDrawer}
            >
              <Sparkles size={16} />
              <span>Test Rules in Simulator Drawer</span>
            </button>

            <button
              type="button"
              className="btn-scenario full-width"
              onClick={onRunDemoScenario}
            >
              <Play size={16} />
              <span>Run Automated Judge Demo</span>
            </button>

            <button
              type="button"
              className="btn-reset full-width"
              onClick={onResetSimulation}
            >
              <RotateCcw size={16} />
              <span>Reset Full Simulation to Baseline</span>
            </button>
          </div>

          <div className="info-banner-mini">
            <Info size={15} />
            <span>
              All thresholds update in-memory immediately and are applied to all newly triggered simulated events.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
