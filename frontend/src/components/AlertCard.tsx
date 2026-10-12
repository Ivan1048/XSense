import type { AlertEvent } from '../types';

interface AlertCardProps {
  event: AlertEvent;
}

export default function AlertCard({ event }: AlertCardProps) {
  return (
    <article className={`event-item ${event.kind}`} role="listitem">
      <div className="event-header">
        <span className="event-title">{event.title}</span>
        <span className="event-time" aria-label={`At ${event.at}`}>{event.at}</span>
      </div>
      <p className="event-message">{event.message}</p>
    </article>
  );
}
