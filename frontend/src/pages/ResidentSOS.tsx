// Resident SOS page — mobile-first, no account required.
// Access via QR code at park entrance. Location is opt-in only.
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ZONES, POLES } from '../data/parkData';

type FlowState = 'idle' | 'sending' | 'received' | 'acknowledged' | 'error';
type GPSState  = 'idle' | 'acquiring' | 'granted' | 'denied';

export default function ResidentSOS() {
  const [searchParams] = useSearchParams();

  const [flowState, setFlowState]         = useState<FlowState>('idle');
  const [gpsState, setGpsState]           = useState<GPSState>('idle');
  const [locationChoice, setLocationChoice] = useState<'gps' | 'zone' | 'none'>('none');
  const [selectedZone, setSelectedZone]   = useState('');
  const [requestRef, setRequestRef]       = useState('');

  // Prefill from QR code query params
  const qrPoleId = searchParams.get('pole') || '';
  const qrZoneId = searchParams.get('zone') || '';

  useEffect(() => {
    if (qrZoneId) {
      setSelectedZone(qrZoneId);
      setLocationChoice('zone');
    }
  }, [qrZoneId]);

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setGpsState('denied');
      return;
    }
    setGpsState('acquiring');
    navigator.geolocation.getCurrentPosition(
      () => { setGpsState('granted'); setLocationChoice('gps'); },
      () => { setGpsState('denied'); setLocationChoice('none'); },
      { timeout: 8000 },
    );
  };

  const submitSOS = async () => {
    setFlowState('sending');
    try {
      // Phase 1: mock submission. Phase 3 will POST to /api/sos.
      await new Promise<void>(resolve => setTimeout(resolve, 1400));
      const ref = 'SOS-' + Date.now().toString(36).toUpperCase().slice(-6);
      setRequestRef(ref);
      setFlowState('received');

      // Simulate guard acknowledgement after ~8 s
      setTimeout(() => setFlowState('acknowledged'), 8000);
    } catch {
      setFlowState('error');
    }
  };

  const locationSummary = qrPoleId
    ? `Near pole ${qrPoleId}`
    : qrZoneId
    ? ZONES.find(z => z.id === qrZoneId)?.name
    : selectedZone
    ? ZONES.find(z => z.id === selectedZone)?.name
    : gpsState === 'granted'
    ? 'GPS location shared'
    : null;

  return (
    <div className="sos-page">
      <div className="sos-card">
        {/* Brand */}
        <p className="sos-brand">XSense Park Safety</p>

        {/* Heading */}
        <h1 className="sos-heading">Need Help?</h1>
        <p className="sos-sub">Send a request to park security.</p>

        {/* QR location prefill notice */}
        {(qrPoleId || qrZoneId) && (
          <div className="notice notice-info mb-3" style={{ textAlign: 'left' }}>
            <strong>📍 Location from QR code:</strong>{' '}
            {qrPoleId
              ? `Pole ${qrPoleId} · ${POLES.find(p => p.id === qrPoleId)?.name || ''}`
              : ZONES.find(z => z.id === qrZoneId)?.name}
          </div>
        )}

        {/* Status messages */}
        {flowState === 'received' && (
          <div className="sos-status sos-status-received mb-2" role="status">
            <div className="sos-status-heading">✓ Request received by XSense</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your request has been logged. A guard will be notified.
            </p>
            <div className="sos-status-ref">Ref: {requestRef}</div>
          </div>
        )}

        {flowState === 'acknowledged' && (
          <div className="sos-status sos-status-acknowledged mb-2" role="status">
            <div className="sos-status-heading">✦ Guard Acknowledged</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              A guard has seen your request. Help is being arranged.
            </p>
            <div className="sos-status-ref">Ref: {requestRef}</div>
          </div>
        )}

        {flowState === 'error' && (
          <div className="sos-status sos-status-error mb-2" role="alert">
            <div className="sos-status-heading">Unable to send your request</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Could not reach XSense. Call 999 or seek nearby assistance.
            </p>
          </div>
        )}

        {/* Primary SOS button — always visible, central action */}
        {flowState !== 'received' && flowState !== 'acknowledged' && (
          <button
            id="sos-request-btn"
            className="sos-btn"
            onClick={submitSOS}
            disabled={flowState !== 'idle'}
            aria-label="Request help from park security"
          >
            {flowState === 'sending' ? 'Sending request…' : '🆘 Request Help'}
          </button>
        )}

        {/* Location options — only in idle state */}
        {flowState === 'idle' && (
          <div className="sos-location-group">
            {/* GPS */}
            <button
              id="use-my-location-btn"
              className={`btn btn-sm btn-full ${gpsState === 'granted' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={requestGPS}
              disabled={gpsState === 'granted'}
            >
              {gpsState === 'acquiring' ? '🔄 Acquiring location…'
               : gpsState === 'granted'  ? '✓ Using my location'
               : gpsState === 'denied'   ? '✗ Location unavailable'
               : '📍 Use My Location'}
            </button>

            {/* Zone selector — show if GPS not granted */}
            {gpsState !== 'granted' && (
              <>
                <div className="sos-divider">or</div>
                <div className="form-group">
                  <label className="form-label" htmlFor="zone-select">Choose my area</label>
                  <select
                    id="zone-select"
                    className="form-control"
                    value={selectedZone}
                    onChange={e => {
                      setSelectedZone(e.target.value);
                      if (e.target.value) setLocationChoice('zone');
                    }}
                  >
                    <option value="">— Select park area —</option>
                    {ZONES.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                    {POLES.map(p => (
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
          Your location is shared only if you choose to.
          {'\u00A0'} No account required.
        </p>

        {/* No-internet notice (shown if error) */}
        {flowState === 'error' && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', lineHeight: 1.55 }}>
            QR codes do not transmit messages by themselves. You need an internet connection to
            send a request. If unavailable, call 999 or seek nearby assistance.
          </p>
        )}
      </div>
    </div>
  );
}
