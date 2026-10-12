// System page — sensor/lighting status, privacy info, demo controls placeholder.
import StatusLabel from '../components/StatusLabel';
import { POLES } from '../data/parkData';

export default function System() {
  return (
    <div className="system-page">
      <h1>System</h1>

      <div className="system-grid">

        {/* Sensor Status */}
        <div className="system-section">
          <h2>Sensor Status</h2>
          {POLES.map(pole => (
            <div key={pole.id} className="metric-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {pole.id}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{pole.name}</div>
              </div>
              <StatusLabel level="online" />
            </div>
          ))}
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px' }}>
            Simulated status — no real hardware connected.
          </p>
        </div>

        {/* Lighting Status */}
        <div className="system-section">
          <h2>Lighting Status</h2>
          {POLES.map(pole => (
            <div key={pole.id} className="metric-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {pole.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{pole.id}</div>
              </div>
              <span className="metric-value ok" style={{ fontSize: '13px' }}>Normal (demo)</span>
            </div>
          ))}
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px' }}>
            Virtual brightness only. Not a measured lux value.
          </p>
        </div>

        {/* About & Privacy — full width */}
        <div className="system-section" style={{ gridColumn: '1 / -1' }}>
          <h2>About &amp; Privacy</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '12px' }}>
            XSense is a <strong>software prototype</strong> built for park safety demonstration.
            All sensor readings, resident dot positions and lighting values are <strong>simulated</strong>.
            No real LiDAR, cameras, sound sensors or environmental hardware is connected.
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '12px' }}>
            <strong>What is not collected or stored:</strong> No camera footage, no facial recognition,
            no permanent tracking IDs, no personal profiles and no raw audio recordings are used
            in this prototype.
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            <strong>Resident SOS:</strong> Location data is only collected if the resident explicitly
            chooses to share it. No account is required.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '14px' }}>
            XSense Proof of Concept · Demo Mode · No emergency services connected.
          </p>
        </div>

        {/* Demo Controls placeholder */}
        <div className="system-section" style={{ gridColumn: '1 / -1' }}>
          <h2>Demo Controls</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Use the <strong>Park Overview</strong> page to trigger demo scenarios (possible fall,
            dark pathway, sensor offline). A full scenario management panel with save/reload
            will be added in a later phase.
          </p>
        </div>

      </div>
    </div>
  );
}
