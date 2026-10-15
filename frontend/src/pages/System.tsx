// System page — sensor/lighting status, hybrid device inventory, incident history, insights, and privacy boundaries.
import StatusLabel from '../components/StatusLabel';
import { POLES } from '../data/parkData';
import { usePark } from '../context/ParkContext';

const HYBRID_DEVICE_INVENTORY = [
  {
    id: 'CAM-01',
    kind: 'CCTV Camera',
    zone: 'North Entrance',
    mount: 'Gate Archway (Independent)',
    coverageBasis: 'Estimated viewing cone (Inventory only — no live stream connected)',
  },
  {
    id: 'AUD-001',
    kind: 'Audio Node (YAMNet)',
    zone: 'North Entrance',
    mount: 'Pole AS-101',
    coverageBasis: 'Approximate acoustic radius (~12m)',
  },
  {
    id: 'LID-001',
    kind: '3D LiDAR Node',
    zone: 'Central Path',
    mount: 'Pole AS-103',
    coverageBasis: 'Estimated 3D point-cluster envelope (Blocked by opaque obstacles)',
  },
  {
    id: 'LID-002',
    kind: '3D LiDAR Node',
    zone: 'West Loop (High-Risk Gap)',
    mount: 'Pole AS-104',
    coverageBasis: 'Targeted unmonitored curve · Evaluates height drop & prolonged immobility',
  },
  {
    id: 'AUD-002',
    kind: 'Audio Node (YAMNet)',
    zone: 'West Loop (High-Risk Gap)',
    mount: 'Pole AS-104',
    coverageBasis: 'Co-located with LID-002 for 15s spatio-temporal corroboration',
  },
  {
    id: 'CAM-02',
    kind: 'CCTV Camera',
    zone: 'East Exit',
    mount: 'Perimeter Post (Independent)',
    coverageBasis: 'Estimated viewing cone (Inventory only — no live stream connected)',
  },
];

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

  const activeCount = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'false_alarm',
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;
  const falseAlarmCount = incidents.filter((i) => i.status === 'false_alarm').length;
  const totalCount = incidents.length;

  return (
    <div className="system-page">
      <div className="system-header-row">
        <div>
          <h1 style={{ marginBottom: '4px' }}>System Health &amp; Hybrid Coverage</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            Live sensor heartbeats, virtual pathway lighting, independent CCTV/LiDAR/Audio inventory, and privacy boundaries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={triggerSilentFall}>
            Simulate Fall (AS-104)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={triggerDark}>
            Simulate Dark Path (AS-102)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={triggerOffline}>
            Simulate Offline (AS-103)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            ↺ Reset All
          </button>
        </div>
      </div>

      {/* Full-Width 3-Column Top Bento Grid */}
      <div className="system-bento-top">
        {/* Card 1: Pole & Sensor Heartbeat Status */}
        <section className="system-section">
          <h2>Pole &amp; Sensor Heartbeats</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {POLES.map((pole) => {
              const isOffline = offlinePoleId === pole.id;
              const hasAlert =
                fallPoleId === pole.id ||
                acousticPoleId === pole.id ||
                incidents.some(
                  (i) =>
                    i.poleId === pole.id &&
                    i.status !== 'resolved' &&
                    i.status !== 'false_alarm',
                );

              const statusLevel = isOffline
                ? 'offline'
                : hasAlert
                ? 'needs_attention'
                : 'online';
              const activeInc = incidents.find(
                (i) =>
                  i.poleId === pole.id &&
                  i.status !== 'resolved' &&
                  i.status !== 'false_alarm',
              );

              return (
                <div key={pole.id} className="metric-row" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {pole.id} · {pole.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {hasAlert && activeInc
                        ? `⚠ ${activeInc.displayType} (${activeInc.createdAt})`
                        : isOffline
                        ? '⚠ Missed 3 heartbeats — monitoring unavailable'
                        : 'Heartbeat healthy (simulated)'}
                    </div>
                  </div>
                  <StatusLabel level={statusLevel} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Card 2: Virtual Lighting & Pathway Status */}
        <section className="system-section">
          <h2>Lighting &amp; Pathway Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {POLES.map((pole) => {
              const isOffline = offlinePoleId === pole.id;
              const brightness = lighting[pole.id] ?? 70;
              const isLow = !isOffline && brightness < 30;
              const isBoosted = !isOffline && brightness >= 95;
              return (
                <div key={pole.id} className="metric-row" style={{ alignItems: 'center' }}>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {pole.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {pole.id} · {isOffline ? 'Lamp Offline' : `Virtual ${brightness}%`}
                    </div>
                  </div>
                  <span
                    className={`metric-value ${isOffline || isLow ? 'warn' : 'ok'}`}
                    style={{ fontSize: '12px', fontWeight: 600 }}
                  >
                    {isOffline
                      ? 'Offline'
                      : isLow
                      ? 'Low Lighting Warning'
                      : isBoosted
                      ? '💡 Emergency 100%'
                      : 'Normal (70%)'}
                  </span>
                </div>
              );
            })}

            <div
              className="metric-row"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
                marginTop: '4px',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Central Path Route
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {blockedRouteZone === 'central_path'
                    ? 'Obstruction barrier active — unverified route'
                    : 'Pedestrian pathway open'}
                </div>
              </div>
              <span
                className={`metric-value ${blockedRouteZone === 'central_path' ? 'warn' : 'ok'}`}
                style={{ fontSize: '12px', fontWeight: 600 }}
              >
                {blockedRouteZone === 'central_path' ? '⛔ Route Closed' : 'Open'}
              </span>
            </div>
          </div>
        </section>

        {/* Card 3: Hybrid Sensor & CCTV Inventory (Decoupled from Lamps) */}
        <section className="system-section">
          <h2>Hybrid Device Inventory</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '10px' }}>
            CCTV, LiDAR, and Audio devices carry independent IDs and coverage limits; poles are optional mounts.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {HYBRID_DEVICE_INVENTORY.map((dev) => {
              const isOffline =
                offlinePoleId === 'AS-103' && dev.id === 'LID-001';
              return (
                <div
                  key={dev.id}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {dev.id} · {dev.kind}
                    </strong>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isOffline ? 'var(--urgent)' : 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      {dev.zone}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Mount: {dev.mount} · {dev.coverageBasis}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Full-Width 2-Column Bottom Bento Grid */}
      <div className="system-bento-bottom">
        {/* Card 4: Incident Insights & Case History */}
        <section className="system-section">
          <h2>Incident Insights &amp; Case History</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '12px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Active Cases
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: activeCount > 0 ? 'var(--urgent)' : 'var(--text-primary)',
                  marginTop: '4px',
                }}
              >
                {activeCount}
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '12px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Resolved
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ok)', marginTop: '4px' }}>
                {resolvedCount}
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '12px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                False Alarms
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                }}
              >
                {falseAlarmCount}
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '12px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Logged
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                {totalCount}
              </div>
            </div>
          </div>

          <h3
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Recent Case History &amp; Guard Feedback
          </h3>
          {incidents.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              No incidents recorded yet. Trigger a scenario from Park Overview to see history here.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {incidents.slice(0, 5).map((inc) => (
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
                  <div style={{ flex: 1, minWidth: '220px' }}>
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
                    <StatusLabel level={inc.sourceMode} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Card 5: Operational Safeguards, Honest Limitations & Privacy */}
        <section className="system-section">
          <h2>Privacy &amp; Operational Boundaries</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>1. Anonymous LiDAR &amp; Separate Guard Tracking:</strong>{' '}
              LiDAR detections appear strictly as anonymous cyan 3D bounding clusters. Security guards appear via separate reported radio/GPS telemetry and are never identified through LiDAR.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>2. Zero Raw Recording Retention:</strong>{' '}
              Recorded audio benchmarks and live microphone tests are classified in-memory by YAMNet. No raw audio waveforms, camera streams, or continuous resident trajectories are stored.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>3. Honest Sensor Limitations:</strong>{' '}
              Darkness alone does not justify LiDAR; neither CCTV nor LiDAR sees through opaque obstacles. Model scores are uncalibrated estimates, not emergency probabilities. Silent unreported events outside sensor coverage may still be missed.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>4. Human-in-the-Loop Response:</strong>{' '}
              SOS requests bypass AI gates immediately. No autonomous 999 dispatch or fabricated guard acknowledgement timers are used.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
