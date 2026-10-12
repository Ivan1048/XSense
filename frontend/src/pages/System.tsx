// System page — sensor/lighting status, incident history, insights, privacy info, and demo controls.
// Fully implements Section 3.3 of the requirements specification.
import StatusLabel from '../components/StatusLabel';
import { POLES, ZONES } from '../data/parkData';
import { usePark } from '../context/ParkContext';

export default function System() {
  const {
    lighting,
    offlinePoleId,
    fallPoleId,
    acousticPoleId,
    blockedRouteZone,
    incidents,
    handleReset,
    triggerSilentFall,
    triggerDark,
    triggerOffline,
  } = usePark();

  // Derived counts for Simple Insights
  const activeCount = incidents.filter(i => i.status !== 'resolved' && i.status !== 'false_alarm').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;
  const falseAlarmCount = incidents.filter(i => i.status === 'false_alarm').length;
  const totalCount = incidents.length;

  return (
    <div className="system-page">
      <h1>System</h1>

      <div className="system-grid">

        {/* 1. Sensor Status per Section 3.3 */}
        <div className="system-section">
          <h2>Sensor Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {POLES.map(pole => {
              const isOffline = offlinePoleId === pole.id;
              const hasAlert = fallPoleId === pole.id || acousticPoleId === pole.id || incidents.some(
                i => i.poleId === pole.id && i.status !== 'resolved' && i.status !== 'false_alarm'
              );

              const statusLevel = isOffline ? 'offline' : hasAlert ? 'needs_attention' : 'online';
              const activeInc = incidents.find(
                i => i.poleId === pole.id && i.status !== 'resolved' && i.status !== 'false_alarm'
              );

              return (
                <div key={pole.id} className="metric-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {pole.id} · {pole.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {hasAlert && activeInc
                        ? `⚠ ${activeInc.displayType} (${activeInc.createdAt})`
                        : isOffline
                        ? '⚠ Telemetry heartbeat lost'
                        : 'Normal simulated telemetry'}
                    </div>
                  </div>
                  <StatusLabel level={statusLevel} />
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Updates in real-time when incidents or anomalies occur.
          </p>
        </div>

        {/* 2. Lighting & Route Status */}
        <div className="system-section">
          <h2>Lighting &amp; Pathway Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {POLES.map(pole => {
              const isOffline = offlinePoleId === pole.id;
              const brightness = lighting[pole.id] ?? 70;
              const isLow = !isOffline && brightness < 30;
              return (
                <div key={pole.id} className="metric-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {pole.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {pole.id} · {isOffline ? 'Lamp Offline' : `Virtual ${brightness}%`}
                    </div>
                  </div>
                  <span className={`metric-value ${isOffline || isLow ? 'warn' : 'ok'}`} style={{ fontSize: '12px' }}>
                    {isOffline ? 'Offline' : isLow ? 'Review needed' : 'Normal (demo)'}
                  </span>
                </div>
              );
            })}

            {/* Pathway Route Status */}
            <div className="metric-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  Central Path Route
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {blockedRouteZone === 'central_path' ? 'Hazard obstruction active' : 'Pedestrian path clear'}
                </div>
              </div>
              <span className={`metric-value ${blockedRouteZone === 'central_path' ? 'warn' : 'ok'}`} style={{ fontSize: '12px' }}>
                {blockedRouteZone === 'central_path' ? 'Route Closed' : 'Open'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Simple Insights & Metrics per Section 3.3 */}
        <div className="system-section" style={{ gridColumn: '1 / -1' }}>
          <h2>Incident Insights &amp; Analytics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Cases</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: activeCount > 0 ? 'var(--urgent)' : 'var(--text-primary)', marginTop: '4px' }}>
                {activeCount}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolved Cases</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ok)', marginTop: '4px' }}>
                {resolvedCount}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Alarms</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                {falseAlarmCount}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Logged</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                {totalCount}
              </div>
            </div>
          </div>

          {/* Recent Incident Log Table */}
          <div style={{ marginTop: '10px' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Recent Case History &amp; Guard Feedback
            </h3>
            {incidents.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No incidents recorded yet. Trigger a demo scenario from Park Overview to generate cases.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incidents.slice(0, 5).map(inc => (
                  <div
                    key={inc.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--r)',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {inc.displayType} — {inc.zoneName} ({inc.poleId})
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Logged at {inc.createdAt} · {inc.reason}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusLabel level={inc.priority} />
                      <StatusLabel level={inc.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. About & Privacy per Section 3.3 — full width */}
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

        {/* 5. Demo Controls */}
        <div className="system-section" style={{ gridColumn: '1 / -1' }}>
          <h2>Demo Controls &amp; Settings</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
            All simulation states synchronize live across <strong>Park Overview</strong>, <strong>Incidents</strong>, and <strong>System</strong>.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={triggerSilentFall}>
              Simulate Silent Fall (AS-104)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={triggerDark}>
              Simulate Dark Path (AS-102)
            </button>
            <button className="btn btn-secondary btn-sm" onClick={triggerOffline}>
              Simulate Sensor Offline (AS-103)
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleReset}>
              ↺ Reset All Simulation Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
