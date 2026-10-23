import { useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePark } from '../../context/ParkContext';
import StatusLabel from '../StatusLabel';
import EvidenceChart from './EvidenceChart';
import {
  clearDetectionEvidence, getEvidenceSnapshot, selectEvidence, startCapture,
  subscribeEvidence, type Evidence,
} from '../../utils/detectionEvidence';

function CaptureDetails({ entry }: { entry: Extract<Evidence, { kind: 'capture' }> }) {
  const [sampleIndex, setSampleIndex] = useState(Math.max(0, entry.samples.length - 1));
  const sample = entry.samples[Math.min(sampleIndex, entry.samples.length - 1)];
  const [sensorId, setSensorId] = useState('LID-001');
  const sensor = sample?.coverage.find(item => item.sensorId === sensorId);
  return <>
    <p className="notice notice-info">Simulator ground truth · Temporary samples of bounding-box height and movement. These are not physical LiDAR measurements or proof of an emergency.</p>
    <p>{entry.finished ? 'Capture stopped' : 'Capture ready / recording in Park Overview'} · {entry.samples.length} samples · {entry.samples[entry.samples.length - 1]?.seconds.toFixed(1) ?? '0.0'} seconds</p>
    {entry.samples.length === 0 ? <p className="system-explanation">No frames captured. Start a new capture, stay in Park Overview, and perform an action before returning here.</p> : <>
      <div className="evidence-chart-grid">
        <EvidenceChart title="Simulated cluster height" unit="m" minimumMax={2} points={entry.samples.map(item => ({ seconds: item.seconds, value: item.heightM, label: item.action }))} />
        <EvidenceChart title="Simulated horizontal speed" unit="m/s" points={entry.samples.map(item => ({ seconds: item.seconds, value: item.speedMps, label: item.action }))} />
      </div>
      <p className="system-explanation">Lines connect captured samples only; dashed markers show action changes. A speed gap means initial measurement, a pause, or scripted relocation. No samples are generated while the map is closed.</p>
      <div className="evidence-controls">
        <label>Inspect sample: {sample?.seconds.toFixed(1)} s
          <input type="range" min="0" max={entry.samples.length - 1} value={Math.min(sampleIndex, entry.samples.length - 1)} onChange={event => setSampleIndex(Number(event.target.value))} />
        </label>
        <label>Coverage device
          <select aria-label="Coverage device" value={sensorId} onChange={event => setSensorId(event.target.value)}>
            {sample?.coverage.map(item => <option key={item.sensorId} value={item.sensorId}>{item.sensorId} · {item.poleId}</option>)}
          </select>
        </label>
      </div>
      {sensor && <section className="evidence-checks" aria-label="Sample coverage checks">
        <h3>{sensor.sensorId} · Geometry check at {sample.seconds.toFixed(1)} s</h3>
        <p>{sensor.detected ? 'Inside simulated geometric coverage' : sensor.failureReason ?? 'Outside simulated geometric coverage'}</p>
        <dl className="evidence-metrics">
          <div><dt>Device state</dt><dd>{sensor.checks.sensorStatus.passed ? 'Online in simulation' : 'Unavailable in simulation'}</dd></div>
          <div><dt>Range check</dt><dd>{sensor.checks.range.passed ? 'Pass' : 'Fail'} · {sensor.distanceM.toFixed(2)} m / {sensor.checks.range.maxRangeM} m maximum</dd></div>
          <div><dt>Field of view</dt><dd>{sensor.checks.fieldOfView.passed ? 'Pass' : 'Fail'} · {sensor.checks.fieldOfView.fovDeg}° span</dd></div>
          <div><dt>Obstacle check</dt><dd>{!sensor.checks.range.passed || !sensor.checks.fieldOfView.passed ? 'Not evaluated outside range / field of view' : sensor.checks.lineOfSight.passed ? 'Clear in modeled scene' : `Blocked by ${sensor.checks.lineOfSight.occludingObstacle ?? 'modeled obstacle'}`}</dd></div>
        </dl>
        <p className="system-explanation">Coverage is evaluated for a possible low-height target (0.34 m). Passing geometry checks alone does not confirm a fall.</p>
      </section>}
      <details className="evidence-sample-data"><summary>Captured sample values</summary><div className="evidence-table-scroll"><table><thead><tr><th>Elapsed (s)</th><th>Height (m)</th><th>Speed (m/s)</th><th>Simulated action</th></tr></thead><tbody>{entry.samples.map(item => <tr key={item.seconds}><td>{item.seconds.toFixed(1)}</td><td>{item.heightM.toFixed(2)}</td><td>{item.speedMps?.toFixed(2) ?? 'Not available'}</td><td>{item.action.replace(/_/g, ' ')}</td></tr>)}</tbody></table></div></details>
    </>}
  </>;
}

export default function DetectionInspector() {
  const snapshot = useSyncExternalStore(subscribeEvidence, getEvidenceSnapshot);
  const { triggerRecordedAudio, simulationDiagnostics } = usePark();
  const navigate = useNavigate();
  const [visitorIndex, setVisitorIndex] = useState(0);
  const [sampleId, setSampleId] = useState('distress_scream_sample.wav');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = snapshot.entries.find(entry => entry.id === snapshot.selectedId) ?? snapshot.entries[0];
  const analyze = async () => {
    setBusy(true); setError('');
    try { await triggerRecordedAudio(sampleId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Audio analysis unavailable.'); }
    finally { setBusy(false); }
  };
  return <section className="system-section detection-inspector" aria-labelledby="detection-inspector-heading">
    <div className="system-header-row"><div><h2 id="detection-inspector-heading">Detection Inspector</h2><p className="system-explanation">Inspect test evidence without changing detection settings. Up to 12 results are kept in memory; refresh, Clear evidence, or Reset All removes them.</p></div><button className="btn btn-secondary" onClick={clearDetectionEvidence} disabled={snapshot.entries.length === 0}>Clear evidence</button></div>
    <div className="evidence-tools">
      <div><h3>Capture LiDAR simulation</h3><p className="system-explanation">Choose a demo visitor, capture up to 30 seconds in Park Overview, then return here. Try stopping, crouching, or collapsing. Capture stops when you leave the map.</p>
        <div className="evidence-controls"><label>Simulated visitor<select aria-label="Simulated visitor" value={visitorIndex} onChange={event => setVisitorIndex(Number(event.target.value))}>{[0,1,2,3,4].map(index => <option key={index} value={index}>Visitor #{index + 1}</option>)}</select></label><button className="btn btn-secondary" onClick={() => { startCapture(visitorIndex); navigate('/'); }}>Start capture in park</button></div>
      </div>
      <div><h3>Analyze a recorded audio clip</h3><p className="system-explanation">Uses the existing YAMNet test flow. A distress result may create a demo incident; benign sounds may produce none.</p>
        <div className="evidence-controls"><label>Recorded sample<select aria-label="Recorded sample" value={sampleId} onChange={event => setSampleId(event.target.value)}>
          <option value="distress_scream_sample.wav">Vocal distress / crying</option><option value="heavy_rain_thunder.wav">Heavy rain &amp; storm</option><option value="park_laughter_chatter.wav">Laughter &amp; voices</option><option value="ambient_park_quiet.wav">Night crickets &amp; wind</option>
        </select></label><button className="btn btn-secondary" disabled={busy} onClick={analyze}>{busy ? 'Analyzing…' : 'Analyze recorded clip'}</button></div>
        {error && <p role="alert" className="notice notice-warning">Audio analysis failed: {error}. Previous evidence remains available.</p>}
      </div>
    </div>
    <label className="evidence-result-select">Test result<select aria-label="Test result" value={selected?.id ?? ''} onChange={event => selectEvidence(event.target.value)} disabled={!selected}>
      {!selected && <option value="">No test results yet</option>}
      {snapshot.entries.map(entry => <option key={entry.id} value={entry.id}>{entry.createdAt} · {entry.kind === 'capture' ? 'Simulation capture' : entry.kind === 'audio' ? 'Audio' : 'LiDAR summary'} · {entry.label}</option>)}
    </select></label>
    {!selected && <div className="notice notice-info">Start a simulation capture or analyze a recording. Existing LiDAR and audio tests from Park Overview also appear here; summary-only results have no invented timeline.</div>}
    {selected?.kind === 'audio' && <div className="evidence-result">
      <h3>{selected.result.plain_label}</h3><StatusLabel level={selected.result.source_mode} />
      <p>{selected.result.sample_id} · {selected.result.duration_sec.toFixed(1)} seconds · {selected.result.source_mode === 'live' ? 'Browser microphone test' : selected.result.source_mode === 'recorded' ? 'Recorded test input; no physical audio node verified' : 'Simulated audio result'}</p>
      <p>{selected.result.plain_reason}</p>
      <h3>Top sound classifications</h3><p className="system-explanation">Uncalibrated model scores. These are not emergency probabilities and do not necessarily add up to 100%.</p>
      {selected.result.top_classes.length === 0 && <p>No class scores returned for this result.</p>}
      <ul className="audio-score-list">{[...selected.result.top_classes].sort((a,b) => b.score - a.score).slice(0, 8).map((item,index) => {
        const score = Number.isFinite(item.score) ? Math.max(0, Math.min(1, item.score)) : null;
        return <li key={`${item.class_name}-${index}`}><div><span>{item.class_name}</span><strong>{score === null ? 'Not available' : `${(score * 100).toFixed(1)}%`}</strong></div><div className="audio-score-track" aria-hidden="true"><span style={{width: `${(score ?? 0) * 100}%`}} /></div></li>;
      })}</ul>
    </div>}
    {selected?.kind === 'lidar' && <div className="evidence-result">
      <h3>{selected.result.plain_label}</h3><StatusLabel level={selected.result.source_mode} />
      <p>{selected.result.device_id} · {selected.result.zone_id} · {selected.result.pole_id}</p><p>{selected.result.plain_reason}</p>
      <dl className="evidence-metrics"><div><dt>Height summary</dt><dd>{selected.result.kinematics.initial_height_m} m → {selected.result.kinematics.final_height_m} m</dd></div><div><dt>Vertical speed summary</dt><dd>{selected.result.kinematics.drop_speed_mps} m/s</dd></div><div><dt>Low movement duration (scenario)</dt><dd>{selected.result.kinematics.stationary_seconds} s</dd></div><div><dt>Evaluator outcome</dt><dd>{selected.result.detected ? 'Possible anomaly detected' : 'No anomaly detected'} · {selected.result.trigger_incident ? 'Incident trigger returned' : 'No incident trigger returned'}</dd></div></dl>
      <p className="notice notice-info">This result contains summary values only. No measured timeline was returned. Start a simulation capture to inspect sampled changes.</p>
    </div>}
    {selected?.kind === 'capture' && <CaptureDetails key={selected.id} entry={selected} />}
    <details className="evidence-diagnostics"><summary>Recent simulation detection checks ({Math.min(5, simulationDiagnostics.length)})</summary><p className="system-explanation">Event snapshots from the existing simulator. These are separate from the selected recording or capture.</p>{simulationDiagnostics.slice(0,5).map(item => <div key={item.id} className="evidence-checks"><strong>{item.timestamp} · {item.title}</strong><p>{item.details}</p><p>{item.failureReason || 'Geometry checks passed for this simulated observation.'}</p></div>)}{simulationDiagnostics.length === 0 && <p>No geometric event checks recorded yet. <Link to="/">Run a scenario in Park Overview.</Link></p>}</details>
  </section>;
}
