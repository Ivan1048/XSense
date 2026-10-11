import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Download,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { AuditEntry } from '../types';

interface PrivacyTabProps {
  auditLog: AuditEntry[];
  onSelectIncident?: (id: string) => void;
}

export const PrivacyTab: React.FC<PrivacyTabProps> = ({
  auditLog,
  onSelectIncident,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAudit = auditLog.filter(
    (entry) =>
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.actorRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.incidentId && entry.incidentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aurasense_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="privacy-page-wrapper">
      {/* Privacy Manifesto Header */}
      <div className="privacy-header-card">
        <div className="manifesto-icon-box">
          <ShieldCheck size={28} className="text-teal" />
        </div>
        <div>
          <span className="privacy-badge">PRIVACY-PRESERVING BY DESIGN</span>
          <h2>Zero Continuous Video. Minimal Metadata Only.</h2>
          <p className="manifesto-text">
            AuraSense solves park safety by rejecting pervasive surveillance cameras. Edge acoustic classification and LiDAR-style human-motion detection operate strictly within pole-mounted micro-controllers. No raw voices, audio recordings, or video feeds ever leave the pole.
          </p>
        </div>
      </div>

      {/* Comparison Grid: What We Process vs What We Reject */}
      <div className="privacy-matrix-grid">
        <div className="matrix-card allowed">
          <div className="matrix-header">
            <CheckCircle2 size={20} className="text-teal" />
            <h3>Transmitted to Command Centre</h3>
          </div>
          <ul className="matrix-list">
            <li>
              <strong>Event Classification Token:</strong> e.g. <code>FALL_DETECTED</code> or <code>ACOUSTIC_DISTRESS</code>.
            </li>
            <li>
              <strong>Timestamp & Pole ID:</strong> e.g. <code>AS-104</code>, <code>2026-10-11T09:06:00</code>.
            </li>
            <li>
              <strong>Confidence Score (Simulated):</strong> e.g. <code>0.88</code>.
            </li>
            <li>
              <strong>Hardware Telemetry:</strong> Battery %, LoRa link status, temperature.
            </li>
          </ul>
        </div>

        <div className="matrix-card rejected">
          <div className="matrix-header">
            <XCircle size={20} className="text-rose" />
            <h3>Explicitly Excluded & Never Stored</h3>
          </div>
          <ul className="matrix-list">
            <li>
              <strong>NO Continuous Audio Streams:</strong> Microphones do not record conversations or stream sound.
            </li>
            <li>
              <strong>NO Video Cameras / CCTV:</strong> Zero optical camera lenses or face-recognition algorithms.
            </li>
            <li>
              <strong>NO Identifiable 3D Point Clouds:</strong> Raw spatial coordinates are discarded immediately after fall inference.
            </li>
            <li>
              <strong>NO Resident Identity Profiling:</strong> System does not track mobile MAC addresses or citizen IDs.
            </li>
          </ul>
        </div>
      </div>

      {/* Honest Limitations & Governance Notice */}
      <section className="governance-section-card">
        <div className="section-title-with-icon">
          <AlertTriangle size={20} className="text-amber" />
          <h3>Honest Governance Caveats & Operational Realities</h3>
        </div>
        <p className="gov-desc">
          To maintain transparency, AuraSense does not claim "zero privacy risk" or flawless autonomous decision-making. A real township deployment must address:
        </p>

        <div className="gov-risks-grid">
          <div className="risk-box">
            <strong>1. Perceived Surveillance Anxiety</strong>
            <p>
              Even without recording, acoustic sensors in public parks can create public apprehension. Mandatory township signage and community educational workshops are legally essential.
            </p>
          </div>
          <div className="risk-box">
            <strong>2. Acoustic False Positives</strong>
            <p>
              Thunder, heavy rain on foliage, skateboards, and barking dogs can mimic distress events. Dynamic threshold calibration and human operator verification are required.
            </p>
          </div>
          <div className="risk-box">
            <strong>3. LiDAR Occlusion Blindspots</strong>
            <p>
              Dense tropical trees, pavilions, and park benches can obstruct volumetric LiDAR beams. A sensor offline event must never silently appear as "all clear".
            </p>
          </div>
          <div className="risk-box">
            <strong>4. Role-Based Access & Data Retention</strong>
            <p>
              Event metadata records should be purged automatically after a statutory retention window (e.g. 30 days) to prevent historical movement correlation.
            </p>
          </div>
        </div>
      </section>

      {/* Audit Log Section */}
      <section className="audit-section-panel">
        <div className="audit-panel-header">
          <div>
            <h3>Immutable System Audit Trail</h3>
            <p className="audit-sub">
              Chronological log of operator acknowledgements, rule triggers, corridor activations, and resolutions.
            </p>
          </div>
          <button
            type="button"
            className="btn-export-audit"
            onClick={handleExportJSON}
            title="Download audit records as JSON file"
          >
            <Download size={15} />
            <span>Export Audit Trail (JSON)</span>
          </button>
        </div>

        <div className="audit-search-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search audit trail by action, actor, or detail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
          <span className="audit-count-chip">{filteredAudit.length} records</span>
        </div>

        <div className="audit-table-wrap">
          <table className="audit-table" aria-label="System audit log table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor / Role</th>
                <th>Action Taken</th>
                <th>Case Ref</th>
                <th>Operation Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="mono-time">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="actor-badge">{entry.actorRole}</span>
                  </td>
                  <td>
                    <strong className="action-title">{entry.action}</strong>
                  </td>
                  <td>
                    {entry.incidentId ? (
                      <span
                        className="mono-case-link"
                        onClick={() => onSelectIncident && entry.incidentId && onSelectIncident(entry.incidentId)}
                        style={{ cursor: onSelectIncident ? 'pointer' : 'default' }}
                      >
                        {entry.incidentId}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <p className="audit-details-text">{entry.details}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
