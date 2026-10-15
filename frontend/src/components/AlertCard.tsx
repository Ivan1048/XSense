import type { AlertEvent } from '../types';

interface AlertCardProps {
  event: AlertEvent;
}

export default function AlertCard({ event }: AlertCardProps) {
  return (
    <article className={`event-item ${event.kind}`} role="listitem">
      <div className="event-header">
        <span className="event-title">{event.title}</span>
        <span className="event-time" aria-label={`At ${event.at}`}>
          {event.at}
        </span>
      </div>
      <p className="event-message">{event.message}</p>

      {event.details && (
        <details style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', userSelect: 'none' }}>
            More Details
          </summary>
          <div
            style={{
              marginTop: '6px',
              padding: '8px 10px',
              background: 'rgba(15, 23, 42, 0.55)',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              lineHeight: 1.4,
            }}
          >
            {event.details.sourceDevice && (
              <div>
                <strong>Source:</strong> {event.details.sourceDevice}
              </div>
            )}
            {event.details.sensorBasis && (
              <div>
                <strong>Sensor Basis:</strong> {event.details.sensorBasis}
              </div>
            )}
            {event.details.lightingAction && (
              <div>
                <strong>Lighting Response:</strong> {event.details.lightingAction}
              </div>
            )}
            {event.details.cameraAvailability && (
              <div>
                <strong>Camera View:</strong> {event.details.cameraAvailability}
              </div>
            )}
          </div>
        </details>
      )}
    </article>
  );
}
