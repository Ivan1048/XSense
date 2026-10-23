import DetectionInspector from '../components/System/DetectionInspector';
// System page — sensor/lighting status, hybrid device inventory, incident history, insights, and privacy boundaries.
import { CCTV_CAMERAS } from '../data/cameraData';
import { AUDIO_COVERAGE } from '../data/audioData';
import { OPERATIONAL_LIDARS } from '../data/lidarData';
import { LIDAR_PLAN_NOTE } from '../data/lidarPlan';
import StatusLabel from '../components/StatusLabel';
import { POLES } from '../data/parkData';
import { usePark } from '../context/ParkContext';

const HYBRID_DEVICE_INVENTORY = [
  ...CCTV_CAMERAS.map(camera => ({
    id: camera.id,
    kind: 'CCTV camera',
    zone: camera.zoneName,
    mountPoleId: null,
    mount: 'Independent camera post',
    position: camera.position,
    coverageBasis: camera.coverageNote,
    integration: 'Inventory only · No camera feed connected',
  })),
  ...OPERATIONAL_LIDARS.map(sensor => ({
    id: sensor.id,
    kind: 'LiDAR sensor',
    zone: sensor.zoneName,
    mountPoleId: sensor.mountPoleId,
    mount: `Pole ${sensor.mountPoleId}`,
    position: sensor.position,
    coverageBasis: `Estimated range ${sensor.nominalRangeM} m · Field of view ${sensor.fovDeg}° · Direction ${sensor.headingDeg}°. Opaque obstacles can block detection.`,
    integration: 'Simulated device · No physical sensor connected',
  })),
  ...AUDIO_COVERAGE.map(sensor => {
    const pole = POLES.find(item => item.id === sensor.poleId);
    return {
      id: sensor.id,
      kind: 'Audio sensor',
      zone: pole?.name ?? 'Not available',
      mountPoleId: sensor.poleId,
      mount: `Pole ${sensor.poleId}`,
      position: pole?.position,
      coverageBasis: `Illustrative radius ${sensor.radius} m · Acoustic reach is not calibrated.`,
      integration: 'Simulated device · Recorded and microphone tests are separate inputs',
    };
  }),
];

export default function System() {
  const {
    lighting,
    offlinePoleId,
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
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Simulated device health, active cases, virtual lighting, and estimated monitoring coverage.
          </p>
        </div>
        <details className="system-demo-controls">
          <summary>Demo Controls</summary>
          <p>Simulation only. Reset All clears the current demo session, including its cases.</p>
          <div className="system-demo-actions">
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
        </details>
      </div>

      <div className="notice notice-info" style={{marginBottom: 20}}>
        <strong>Proposed LiDAR expansion (simulation)</strong><br />{LIDAR_PLAN_NOTE}
      </div>
      <DetectionInspector />
      {/* Full-Width 3-Column Top Bento Grid */}
      <div className="system-bento-top">
        {/* Card 1: Pole & Sensor Heartbeat Status */}
        <section className="system-section">
          <h2>Infrastructure Status</h2>
          <p className="system-explanation">Health reflects the demo pole status. Active cases are shown separately; no physical heartbeat stream is connected.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {POLES.map((pole) => {
              const isOffline = offlinePoleId === pole.id;
              const activeCases = incidents.filter(
                incident => incident.poleId === pole.id &&
                  incident.status !== 'resolved' && incident.status !== 'false_alarm',
              ).length;
              const statusLevel = isOffline ? 'offline' : pole.sensorStatus;

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
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {isOffline ? 'Monitoring unavailable in simulation' : 'Configured status · Simulated'}
                      <br />Last heartbeat: Not available

                    </div>
                  </div>
                  <div className="system-status-stack">
                    <span>Device health <StatusLabel level={statusLevel} /></span>
                    <span className={activeCases > 0 ? 'system-active-cases' : ''}>
                      {activeCases} active {activeCases === 1 ? 'case' : 'cases'}
                    </span>
                  </div>
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
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                      {pole.id} · {isOffline ? 'Unavailable in demo' : `Virtual ${brightness}%`}
                    </div>
                  </div>
                  <span
                    className={`metric-value ${isOffline || isLow ? 'warn' : 'ok'}`}
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}
                  >
                    {isOffline
                      ? 'Offline'
                      : isLow
                      ? 'Low Lighting Warning'
                      : isBoosted
                      ? '💡 Emergency 100%'
                      : `Normal (${brightness}%)`}
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
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  {blockedRouteZone === 'central_path'
                    ? 'Obstruction barrier active — unverified route'
                    : 'Pedestrian pathway open'}
                </div>
              </div>
              <span
                className={`metric-value ${blockedRouteZone === 'central_path' ? 'warn' : 'ok'}`}
                style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}
              >
                {blockedRouteZone === 'central_path' ? '⛔ Route Closed' : 'Open'}
              </span>
            </div>
          </div>
        </section>

        {/* Card 3: Hybrid Sensor & CCTV Inventory (Decoupled from Lamps) */}
        <section className="system-section">
          <h2>Hybrid Device Inventory</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 0, marginBottom: '10px' }}>
            CCTV, LiDAR, and Audio devices carry independent IDs and coverage limits; poles are optional mounts.
          </p>
          <div className="system-device-grid">
            {HYBRID_DEVICE_INVENTORY.map((dev) => {
              const isOffline = dev.mountPoleId !== null && offlinePoleId === dev.mountPoleId;
              const mount = POLES.find(pole => pole.id === dev.mountPoleId);
              const health = isOffline ? 'offline' : mount?.sensorStatus ?? 'Not available';
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
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {dev.id} · {dev.kind}
                    </strong>
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        color: isOffline ? 'var(--urgent)' : 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      {dev.zone}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {dev.zone} · Mount: {dev.mount}
                  </div>
                  <div className="system-device-details">
                    <span>{dev.integration}</span>
                    <span>Device health: {dev.mountPoleId ? <><StatusLabel level={health} /> · Simulated</> : 'Not available · Inventory only'}</span>
                    <span>Last seen: Not available</span>
                    <span>Map position: {dev.position ? `x ${dev.position[0]}, z ${dev.position[1]} m · Simulated layout` : 'Not available'}</span>
                    <span>{dev.coverageBasis}</span>
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
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
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
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>1. Anonymous LiDAR &amp; Separate Guard Tracking:</strong>{' '}
              LiDAR detections appear strictly as anonymous cyan 3D bounding clusters. Guard locations use a separate simulation and are never identified through LiDAR.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>2. Input Sources &amp; Integration:</strong>{' '}
              Audio tests use recorded clips or microphone input. This page does not provide camera feeds or a physical sensor connection; planned capabilities are not live integrations.
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
