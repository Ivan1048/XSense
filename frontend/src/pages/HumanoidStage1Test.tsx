import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import AnonymousHumanoid from '../components/Park3D/AnonymousHumanoid';
import AnonymousDot from '../components/Park3D/AnonymousDot';
import { PEOPLE_PATHS } from '../data/parkData';

interface Metrics {
  drawCalls: number;
  triangles: number;
  geometries: number;
  fps: number;
  teleportDetected: boolean;
  maxFrameDeltaPos: number;
  visitor0Pos: [number, number, number];
  visitor1Pos: [number, number, number];
}

function DiagnosticsCollector({
  onMetricsUpdate,
  isPaused,
  isCollapsed,
  isStationary,
}: {
  onMetricsUpdate: (m: Metrics) => void;
  isPaused: boolean;
  isCollapsed: boolean;
  isStationary: boolean;
}) {
  const { gl, scene } = useThree();
  const lastTime = useRef(performance.now());
  const frameCount = useRef(0);
  const currentFps = useRef(60);

  const prevV0Pos = useRef<THREE.Vector3 | null>(null);
  const maxDeltaRef = useRef(0);
  const teleportRef = useRef(false);

  useFrame(() => {
    // 1. Calculate FPS
    frameCount.current++;
    const now = performance.now();
    if (now - lastTime.current >= 500) {
      currentFps.current = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      frameCount.current = 0;
      lastTime.current = now;
    }

    // 2. Measure actual Three.js render metrics
    const drawCalls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    const geometries = gl.info.memory.geometries;

    // 3. Track visitor 0 and visitor 1 positions to verify continuity
    // Find the humanoid/dot groups in scene
    let v0Pos: [number, number, number] = [0, 0, 0];
    let v1Pos: [number, number, number] = [0, 0, 0];

    const personGroups: THREE.Group[] = [];
    scene.traverse((obj) => {
      // Humanoid/dot groups are direct children of the scene with position.y around 0.20-1.10
      if (obj instanceof THREE.Group && obj.parent === scene && Math.abs(obj.position.y - 0.86) < 0.8) {
        personGroups.push(obj);
      }
    });

    if (personGroups[0]) {
      v0Pos = [
        Number(personGroups[0].position.x.toFixed(3)),
        Number(personGroups[0].position.y.toFixed(3)),
        Number(personGroups[0].position.z.toFixed(3)),
      ];

      // Detect discontinuous jumps (teleportation)
      if (prevV0Pos.current) {
        const deltaDist = prevV0Pos.current.distanceTo(personGroups[0].position);
        if (deltaDist > maxDeltaRef.current) {
          maxDeltaRef.current = Number(deltaDist.toFixed(4));
        }
        // Normal speed is ~0.3-0.5 m/s. At 60fps, distance per frame is ~0.008m.
        // A jump > 0.45m in a single frame constitutes an unnatural teleportation glitch.
        if (deltaDist > 0.45) {
          teleportRef.current = true;
        }
      }
      prevV0Pos.current = personGroups[0].position.clone();
    }

    if (personGroups[1]) {
      v1Pos = [
        Number(personGroups[1].position.x.toFixed(3)),
        Number(personGroups[1].position.y.toFixed(3)),
        Number(personGroups[1].position.z.toFixed(3)),
      ];
    }

    onMetricsUpdate({
      drawCalls,
      triangles,
      geometries,
      fps: currentFps.current,
      teleportDetected: teleportRef.current,
      maxFrameDeltaPos: maxDeltaRef.current,
      visitor0Pos: v0Pos,
      visitor1Pos: v1Pos,
    });
  });

  return null;
}

export default function HumanoidStage1Test() {
  const [renderMode, setRenderMode] = useState<'humanoid' | 'dot'>('humanoid');
  const [paused, setPaused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLookalikeStop, setIsLookalikeStop] = useState(false);
  const [stationary, setStationary] = useState(false);
  const [isSOS, setIsSOS] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [metrics, setMetrics] = useState<Metrics>({
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    fps: 60,
    teleportDetected: false,
    maxFrameDeltaPos: 0,
    visitor0Pos: [0, 0, 0],
    visitor1Pos: [0, 0, 0],
  });

  const [historyLog, setHistoryLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setHistoryLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((v) => {
      const next = !v;
      addLog(`Toggled isCollapsed: ${next ? 'TRUE (Collapse at current pos)' : 'FALSE (Recover & resume)'}`);
      return next;
    });
  };

  const handleTogglePause = () => {
    setPaused((v) => {
      const next = !v;
      addLog(`Toggled paused: ${next ? 'PAUSED' : 'RESUMED'}`);
      return next;
    });
  };

  const handleToggleSOS = () => {
    setIsSOS((v) => {
      const next = !v;
      addLog(`Toggled isSOS: ${next ? 'SOS ACTIVE on Visitor 1' : 'SOS CLEARED'}`);
      return next;
    });
  };

  const handleToggleLookalike = () => {
    setIsLookalikeStop((v) => {
      const next = !v;
      addLog(`Toggled isLookalikeStop: ${next ? 'LOOKALIKE STOPPED' : 'RESUMED'}`);
      return next;
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#0b1120', color: '#f8fafc', fontFamily: 'monospace' }}>
      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas camera={{ position: [0, 20, 28], fov: 45 }}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[15, 25, 10]} intensity={1.2} castShadow />

          {/* Simple Ground Grid Reference */}
          <gridHelper args={[60, 60, '#334155', '#1e293b']} position={[0, 0, 0]} />

          {/* Render 5 visitors using either AnonymousHumanoid or legacy AnonymousDot */}
          {PEOPLE_PATHS.map((path, i) =>
            renderMode === 'humanoid' ? (
              <AnonymousHumanoid
                key={`h-${i}`}
                path={path}
                personaIndex={i}
                paused={paused}
                highlight={isCollapsed && i === 0}
                stationary={stationary || (isCollapsed && i === 0)}
                isCollapsed={isCollapsed && i === 0}
                isLookalikeStop={isLookalikeStop && i === 0}
                isSOS={isSOS && i === 1}
                sosTargetPos={[-12, 10]}
                onSelect={() => {
                  setSelectedIndex(i);
                  addLog(`Selected Humanoid Visitor #${i}`);
                }}
              />
            ) : (
              <AnonymousDot
                key={`d-${i}`}
                path={path}
                paused={paused}
                highlight={isCollapsed && i === 0}
                stationary={stationary || (isCollapsed && i === 0)}
                isCollapsed={isCollapsed && i === 0}
                isLookalikeStop={isLookalikeStop && i === 0}
                isSOS={isSOS && i === 1}
                sosTargetPos={[-12, 10]}
                onSelect={() => {
                  setSelectedIndex(i);
                  addLog(`Selected Legacy Dot #${i}`);
                }}
              />
            ),
          )}

          <OrbitControls makeDefault />
          <DiagnosticsCollector
            onMetricsUpdate={setMetrics}
            isPaused={paused}
            isCollapsed={isCollapsed}
            isStationary={stationary}
          />
        </Canvas>

        {/* Viewport Overlay Info */}
        <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(15,23,42,0.85)', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155' }}>
          <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 'bold' }}>
            Stage 1 Isolated Test Harness · {renderMode.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Click & drag to orbit · Scroll to zoom · Click humanoids to inspect
          </div>
        </div>
      </div>

      {/* Control & Diagnostics Sidebar */}
      <div style={{ width: 420, background: '#0f172a', borderLeft: '1px solid #1e293b', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: '0 0 4px 0', color: '#f8fafc' }}>Stage 1 Empirical Verification</h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>Humanoid Locomotion, Kinematics & Performance</span>
        </div>

        {/* Component Selector */}
        <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 'bold' }}>COMPONENT SELECTION</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setRenderMode('humanoid');
                addLog('Switched to AnonymousHumanoid (10-mesh procedural primitives)');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #38bdf8',
                background: renderMode === 'humanoid' ? '#0284c7' : '#0f172a',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: renderMode === 'humanoid' ? 'bold' : 'normal',
              }}
            >
              AnonymousHumanoid
            </button>
            <button
              onClick={() => {
                setRenderMode('dot');
                addLog('Switched to AnonymousDot (Legacy single sphere)');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 4,
                border: '1px solid #64748b',
                background: renderMode === 'dot' ? '#475569' : '#0f172a',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: renderMode === 'dot' ? 'bold' : 'normal',
              }}
            >
              AnonymousDot
            </button>
          </div>
        </div>

        {/* State Toggle Buttons */}
        <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 'bold' }}>MOTION & INCIDENT SCENARIOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={handleTogglePause}
              style={{
                padding: 8,
                borderRadius: 4,
                border: '1px solid #475569',
                background: paused ? '#b45309' : '#0f172a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={handleToggleCollapse}
              style={{
                padding: 8,
                borderRadius: 4,
                border: '1px solid #f59e0b',
                background: isCollapsed ? '#d97706' : '#0f172a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {isCollapsed ? 'Recover Fall' : '⚠️ Fall (AS-104)'}
            </button>
            <button
              onClick={handleToggleLookalike}
              style={{
                padding: 8,
                borderRadius: 4,
                border: '1px solid #475569',
                background: isLookalikeStop ? '#0284c7' : '#0f172a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {isLookalikeStop ? 'Clear Lookalike' : '🧍 Lookalike Stop'}
            </button>
            <button
              onClick={handleToggleSOS}
              style={{
                padding: 8,
                borderRadius: 4,
                border: '1px solid #ef4444',
                background: isSOS ? '#dc2626' : '#0f172a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {isSOS ? 'Clear SOS' : '🆘 Resident SOS'}
            </button>
          </div>
        </div>

        {/* Real-time Render Metrics Readout */}
        <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 'bold' }}>
            EMPIRICAL THREE.JS METRICS (MEASURED)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div style={{ background: '#0f172a', padding: 8, borderRadius: 4 }}>
              <div style={{ color: '#64748b' }}>Draw Calls</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#38bdf8' }}>{metrics.drawCalls}</div>
            </div>
            <div style={{ background: '#0f172a', padding: 8, borderRadius: 4 }}>
              <div style={{ color: '#64748b' }}>Triangles</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#a855f7' }}>{metrics.triangles}</div>
            </div>
            <div style={{ background: '#0f172a', padding: 8, borderRadius: 4 }}>
              <div style={{ color: '#64748b' }}>VRAM Geometries</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#34d399' }}>{metrics.geometries}</div>
            </div>
            <div style={{ background: '#0f172a', padding: 8, borderRadius: 4 }}>
              <div style={{ color: '#64748b' }}>Render FPS</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: metrics.fps >= 50 ? '#22c55e' : '#f59e0b' }}>
                {metrics.fps}
              </div>
            </div>
          </div>
        </div>

        {/* Teleportation & Continuity Monitor */}
        <div style={{ background: '#1e293b', padding: 12, borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 'bold' }}>
            CONTINUITY & IN-PLACE POSITION VERIFICATION
          </div>
          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Teleport Glitch Detected:</span>
              <span style={{ color: metrics.teleportDetected ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                {metrics.teleportDetected ? '⚠️ TELEPORTATION DETECTED' : '✓ CONTINUOUS (NO TELEPORT)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Max Single-Frame Delta:</span>
              <span style={{ color: metrics.maxFrameDeltaPos > 0.45 ? '#ef4444' : '#38bdf8' }}>
                {metrics.maxFrameDeltaPos} m
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Visitor #0 (Collapse Target):</span>
              <span style={{ color: '#f8fafc' }}>
                [{metrics.visitor0Pos.join(', ')}]
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Visitor #1 (SOS Target):</span>
              <span style={{ color: '#f8fafc' }}>
                [{metrics.visitor1Pos.join(', ')}]
              </span>
            </div>
          </div>
        </div>

        {/* Transition Log */}
        <div style={{ background: '#1e293b', padding: 12, borderRadius: 6, flex: 1, minHeight: 120 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 'bold' }}>TRANSITION LOG</div>
          <div style={{ fontSize: 11, color: '#cbd5e1', maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {historyLog.length === 0 ? <span style={{ color: '#64748b' }}>No transitions recorded yet.</span> : historyLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
