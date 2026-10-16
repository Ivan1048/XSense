// Resident SOS page — mobile-first, no account required.
// Access via QR code at park entrance or smart pole. Location is opt-in only.
// Strictly enforces real guard acknowledgement/dispatch states — NEVER uses a timer to fake guard action.
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ZONES, POLES } from '../data/parkData';
import { usePark } from '../context/ParkContext';

type SubmitState = 'idle' | 'sending' | 'submitted' | 'error';
type GPSState = 'idle' | 'acquiring' | 'granted' | 'denied';

export default function ResidentSOS() {
  const [searchParams] = useSearchParams();
  const { addSOSIncident, incidents, guards } = usePark();

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [gpsState, setGpsState] = useState<GPSState>('idle');
  const [locationChoice, setLocationChoice] = useState<'gps' | 'zone' | 'none'>('none');
  const [selectedZone, setSelectedZone] = useState('');
  const [requestRef, setRequestRef] = useState('');

  // Prefill from QR code query params (?pole=AS-104&zone=west_path)
  const qrPoleId = searchParams.get('pole') || '';
  const qrZoneId = searchParams.get('zone') || '';

  useEffect(() => {
    if (qrZoneId) {
      setSelectedZone(qrZoneId);
      setLocationChoice('zone');
    } else if (qrPoleId) {
      const matchedPole = POLES.find((p) => p.id === qrPoleId);
      if (matchedPole) {
        setSelectedZone(matchedPole.zone);
        setLocationChoice('zone');
      }
    }
  }, [qrZoneId, qrPoleId]);

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setGpsState('denied');
      return;
    }
    setGpsState('acquiring');
    navigator.geolocation.getCurrentPosition(
      () => {
        setGpsState('granted');
        setLocationChoice('gps');
      },
      () => {
        setGpsState('denied');
        setLocationChoice('none');
      },
      { timeout: 8000 },
    );
  };

  const submitSOS = async () => {
    setSubmitState('sending');
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      const ref = addSOSIncident({
        zoneId: qrZoneId || selectedZone || undefined,
        poleId: qrPoleId || undefined,
        locationShared: locationChoice !== 'none' || Boolean(qrPoleId || qrZoneId),
      });
      setRequestRef(ref);
      setSubmitState('submitted');
    } catch {
      setSubmitState('error');
    }
  };

  // Look up real-time incident state from ParkContext (synced across tabs via BroadcastChannel)
  const linkedIncident = incidents.find((i) => i.id === requestRef);
  const assignedGuard = guards.find((g) => g.id === linkedIncident?.assignedGuardId);
  const realStatus = linkedIncident?.status || 'open';

  const locationSummary = qrPoleId
    ? `Near pole ${qrPoleId} (${POLES.find((p) => p.id === qrPoleId)?.name || 'Park Pole'})`
    : qrZoneId
    ? ZONES.find((z) => z.id === qrZoneId)?.name
    : selectedZone
    ? ZONES.find((z) => z.id === selectedZone)?.name
    : gpsState === 'granted'
    ? 'GPS location shared'
    : null;

  return (
    <div className="sos-page">
      <div className="sos-card">
        {/* Top Demo Navigation Helper */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          <span className="sos-brand" style={{ margin: 0 }}>
            XSense Park Safety
          </span>
          <Link
            to="/incidents"
            style={{
              fontSize: '12px',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Open Guard Console →
          </Link>
        </div>

        {/* Heading */}
        <h1 className="sos-heading">Need Help?</h1>
        <p className="sos-sub">Send a request to park security.</p>

        {/* QR location prefill notice */}
        {(qrPoleId || qrZoneId) && (
          <div className="notice notice-info mb-3" style={{ textAlign: 'left' }}>
            <strong>📍 Location from QR code:</strong>{' '}
            {qrPoleId
              ? `Pole ${qrPoleId} · ${POLES.find((p) => p.id === qrPoleId)?.name || ''}`
              : ZONES.find((z) => z.id === qrZoneId)?.name}
          </div>
        )}

        {/* Real-Time Server/Guard Confirmed Status Messages (Zero Fake Timers) */}
        {submitState === 'submitted' && realStatus === 'open' && (
          <div className="sos-status sos-status-received mb-2" role="status">
            <div className="sos-status-heading">✓ Request received by XSense</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your request is logged as <strong>Urgent</strong> on the guard console. Waiting for a security guard to acknowledge.
            </p>
            <div className="sos-status-ref">Ref: {requestRef} · Status: Awaiting Guard Action</div>
          </div>
        )}

        {submitState === 'submitted' && realStatus === 'acknowledged' && (
          <div className="sos-status sos-status-acknowledged mb-2" role="status">
            <div className="sos-status-heading">✦ Guard Acknowledged</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              A security guard has confirmed receipt of your request and is arranging dispatch.
            </p>
            <div className="sos-status-ref">Ref: {requestRef} · Status: Guard Acknowledged</div>
          </div>
        )}

        {submitState === 'submitted' &&
          (realStatus === 'assigned' || realStatus === 'investigating') && (
            <div
              className="sos-status sos-status-acknowledged mb-2"
              role="status"
              style={{ borderColor: '#38bdf8', background: 'rgba(2, 132, 199, 0.16)' }}
            >
              <div className="sos-status-heading" style={{ color: '#38bdf8' }}>
                {realStatus === 'investigating'
                  ? '📍 Security Officer On Scene'
                  : '🚓 Help is Being Arranged — Guard Dispatched'}
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {assignedGuard
                  ? `${assignedGuard.displayName} (${assignedGuard.role}) has been assigned to assist you.`
                  : 'A responding security officer has been dispatched to your area.'}
              </p>
              <div className="sos-status-ref">
                Ref: {requestRef} · Status: {realStatus === 'investigating' ? 'Officer Arrived' : 'Officer En Route'}
              </div>
            </div>
          )}

        {submitState === 'submitted' &&
          (realStatus === 'resolved' || realStatus === 'false_alarm') && (
            <div className="sos-status sos-status-acknowledged mb-2" role="status">
              <div className="sos-status-heading">✓ Request Closed</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This SOS case has been marked closed by park security. You may submit a new request below if needed.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-2"
                onClick={() => {
                  setSubmitState('idle');
                  setRequestRef('');
                }}
              >
                Send Another Request
              </button>
            </div>
          )}

        {submitState === 'error' && (
          <div className="sos-status sos-status-error mb-2" role="alert">
            <div className="sos-status-heading">Unable to send your request</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Could not reach XSense. Call 999 or seek nearby assistance.
            </p>
          </div>
        )}

        {/* Primary SOS button — visible before submission */}
        {submitState !== 'submitted' && (
          <button
            id="sos-request-btn"
            className="sos-btn"
            onClick={submitSOS}
            disabled={submitState !== 'idle'}
            aria-label="Request help from park security"
          >
            {submitState === 'sending' ? 'Sending request…' : '🆘 Request Help'}
          </button>
        )}

        {/* Location options — only in idle state */}
        {submitState === 'idle' && (
          <div className="sos-location-group">
            <button
              id="use-my-location-btn"
              className={`btn btn-sm btn-full ${gpsState === 'granted' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={requestGPS}
              disabled={gpsState === 'granted'}
            >
              {gpsState === 'acquiring'
                ? '🔄 Acquiring location…'
                : gpsState === 'granted'
                ? '✓ Using my location'
                : gpsState === 'denied'
                ? '✗ Location unavailable'
                : '📍 Use My Location'}
            </button>

            {gpsState !== 'granted' && (
              <>
                <div className="sos-divider">or</div>
                <div className="form-group">
                  <label className="form-label" htmlFor="zone-select">
                    Choose my area
                  </label>
                  <select
                    id="zone-select"
                    className="form-control"
                    value={selectedZone}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      if (e.target.value) setLocationChoice('zone');
                    }}
                  >
                    <option value="">— Select park area —</option>
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                    {POLES.map((p) => (
                      <option key={`pole-${p.id}`} value={p.zone}>
                        Near pole {p.id} · {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Location summary */}
        {locationSummary && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Location: {locationSummary}
          </p>
        )}

        {/* Call 999 — always visible, never hidden */}
        <a
          href="tel:999"
          className="call-999-btn"
          id="call-999-link"
          aria-label="Call 999 — public emergency services"
        >
          📞 Call 999 — Public Emergency Services
        </a>

        {/* Privacy note */}
        <p className="sos-privacy-note">
          Your location is shared only if you choose to.{'\u00A0'} No account required.
        </p>
      </div>
    </div>
  );
}
