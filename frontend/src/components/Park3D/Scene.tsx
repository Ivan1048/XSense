// Main 3D Canvas scene — assembles park geometry, poles, anonymous dots, and dispatched guards.
// Camera reset is driven by resetCounter prop to avoid forwardRef complexity.
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParkGeometry from './ParkGeometry';
import Pole from './Pole';
import AnonymousDot from './AnonymousDot';
import GuardMarker from './GuardMarker';
import { POLES, PEOPLE_PATHS } from '../../data/parkData';
import type { LightingMap, DispatchedGuardState } from '../../types';

interface SceneProps {
  selectedPoleId:       string;
  onSelectPole:         (id: string) => void;
  lighting:             LightingMap;
  showCoverage:         boolean;
  paused:               boolean;
  nightMode:            boolean;
  fallPoleId:           string | null;
  offlinePoleId:        string | null;
  acousticPoleId?:      string | null;
  blockedRouteZone?:    string | null;
  isRaining?:           boolean;
  dispatchedGuards?:    DispatchedGuardState[];
  onFinishGuardReturn?: (guardId: string) => void;
  resetCounter:         number;
}

interface WorldProps extends Omit<SceneProps, 'resetCounter'> {}

function World({
  selectedPoleId,
  onSelectPole,
  lighting,
  showCoverage,
  paused,
  nightMode,
  fallPoleId,
  offlinePoleId,
  acousticPoleId,
  blockedRouteZone,
  isRaining = false,
  dispatchedGuards = [],
  onFinishGuardReturn,
}: WorldProps) {
  return (
    <>
      {/* Sky */}
      <color attach="background" args={[nightMode ? '#08121e' : '#7baacc']} />

      {/* Ambient */}
      <ambientLight intensity={nightMode ? 0.18 : 1.3} />

      {/* Directional sun */}
      <directionalLight
        position={[12, 25, 10]}
        intensity={nightMode ? 0.22 : 2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Static park with dynamic blocked path & rain */}
      <ParkGeometry blockedRouteZone={blockedRouteZone} isRaining={isRaining} />

      {/* Sensor poles */}
      {POLES.map((pole) => (
        <Pole
          key={pole.id}
          data={pole}
          selected={selectedPoleId === pole.id}
          onSelect={onSelectPole}
          isAlert={fallPoleId === pole.id}
          isOffline={offlinePoleId === pole.id}
          hasAcousticRipple={acousticPoleId === pole.id}
          lightBrightness={
            offlinePoleId === pole.id ? 0 : (lighting[pole.id] ?? 70)
          }
          showCoverage={showCoverage}
        />
      ))}

      {/* Anonymous moving dots — simulated detections, no identity */}
      {PEOPLE_PATHS.map((path, i) => (
        <AnonymousDot
          key={i}
          path={path}
          paused={paused}
          highlight={fallPoleId === 'AS-104' && i === 0}
          stationary={fallPoleId === 'AS-104' && i === 0}
        />
      ))}

      {/* Dispatched Security Guards (correlated with console dispatch roster) */}
      {dispatchedGuards.map((dg) => (
        <GuardMarker
          key={dg.guardId}
          guardName={dg.guardName}
          targetPos={dg.targetPos}
          status={dg.status}
          onFinishedReturn={() => onFinishGuardReturn?.(dg.guardId)}
        />
      ))}
    </>
  );
}

export default function Scene({
  selectedPoleId,
  onSelectPole,
  lighting,
  showCoverage,
  paused,
  nightMode,
  fallPoleId,
  offlinePoleId,
  acousticPoleId,
  blockedRouteZone,
  isRaining = false,
  dispatchedGuards = [],
  onFinishGuardReturn,
  resetCounter,
}: SceneProps) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetCounter > 0 && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetCounter]);

  return (
    <Canvas
      camera={{ position: [0, 26, 32], fov: 46 }}
      shadows
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={8}
        maxDistance={58}
      />
      <World
        selectedPoleId={selectedPoleId}
        onSelectPole={onSelectPole}
        lighting={lighting}
        showCoverage={showCoverage}
        paused={paused}
        nightMode={nightMode}
        fallPoleId={fallPoleId}
        offlinePoleId={offlinePoleId}
        acousticPoleId={acousticPoleId}
        blockedRouteZone={blockedRouteZone}
        isRaining={isRaining}
        dispatchedGuards={dispatchedGuards}
        onFinishGuardReturn={onFinishGuardReturn}
      />
    </Canvas>
  );
}
