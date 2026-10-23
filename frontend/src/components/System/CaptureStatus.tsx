import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { finishCapture, getEvidenceSnapshot, subscribeEvidence } from '../../utils/detectionEvidence';

export default function CaptureStatus() {
  const snapshot = useSyncExternalStore(subscribeEvidence, getEvidenceSnapshot);
  const lifecycle = useRef(0);
  useEffect(() => {
    const generation = ++lifecycle.current;
    // React StrictMode replays effect setup/cleanup. Only stop after a real exit.
    return () => queueMicrotask(() => {
      if (lifecycle.current === generation) finishCapture();
    });
  }, []);
  const entry = snapshot.entries.find(item => item.id === (snapshot.capture?.id ?? snapshot.selectedId));
  if (entry?.kind !== 'capture') return null;
  return <div className="capture-status">
    <span>{snapshot.capture ? 'Recording' : 'Capture stopped'} · Visitor #{entry.visitorIndex + 1} · {entry.samples.length} samples · Simulation only</span>
    {snapshot.capture && <button className="btn btn-secondary btn-sm" onClick={() => finishCapture()}>Stop capture</button>}
    <Link to="/system" className="btn btn-secondary btn-sm">Inspect captured samples</Link>
  </div>;
}
