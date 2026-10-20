/**
 * useBackendHealth — polls GET http://localhost:8000/health every 15 s.
 *
 * Returns:
 *   status  "checking" | "connected" | "offline"
 */
import { useState, useEffect, useCallback } from 'react';

export type BackendStatus = 'checking' | 'connected' | 'offline';

const HEALTH_URL = 'http://localhost:8000/health';
const POLL_INTERVAL_MS = 15_000;

export function useBackendHealth(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');

  const check = useCallback(async () => {
    try {
      const res = await fetch(HEALTH_URL, {
        // Short timeout so a dead server doesn't block the UI for 30 s.
        signal: AbortSignal.timeout(4_000),
      });
      setStatus(res.ok ? 'connected' : 'offline');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    // Fire immediately on mount, then repeat on the interval.
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  return status;
}
