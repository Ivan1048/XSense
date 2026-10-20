/**
 * BackendStatusBadge — live health-monitor pill for the top toolbar.
 *
 * States:
 *   checking   → neutral spinner dot (first render only, ~instant)
 *   connected  → green dot  "Backend AI: Connected (YAMNet Ready)"
 *   offline    → yellow dot "Offline Fallback Mode"
 */
import { useBackendHealth } from '../hooks/useBackendHealth';

export default function BackendStatusBadge() {
  const status = useBackendHealth();

  if (status === 'checking') {
    return (
      <span
        className="backend-badge backend-badge--checking"
        role="status"
        aria-label="Checking backend connection…"
      >
        <span className="backend-dot backend-dot--checking" aria-hidden="true" />
        Connecting…
      </span>
    );
  }

  if (status === 'connected') {
    return (
      <span
        className="backend-badge backend-badge--connected"
        role="status"
        aria-label="Backend AI is connected and YAMNet is ready"
      >
        <span className="backend-dot backend-dot--connected" aria-hidden="true" />
        Backend AI: Connected (YAMNet Ready)
      </span>
    );
  }

  // offline
  return (
    <span
      className="backend-badge backend-badge--offline"
      role="status"
      aria-label="Backend server unreachable — running in offline fallback mode"
    >
      <span className="backend-dot backend-dot--offline" aria-hidden="true" />
      Offline Fallback Mode
    </span>
  );
}
