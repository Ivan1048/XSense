// Main 3D Canvas scene — assembles park geometry, poles, and anonymous dots.
// Camera reset is driven by resetCounter prop to avoid forwardRef complexity.
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParkGeometry from './ParkGeometry';
import Pole from './Pole';
import AnonymousDot from './AnonymousDot';
import { POLES, PEOPLE_PATHS } from '../../data/parkData';
import type { LightingMap } from '../../types';

interface SceneProps {
  selectedPoleId: string;
  onSelectPole:   (id: string) => void;
  lighting:       LightingMap;
  showCoverage:   boolean;
  paused:         boolean;
  nightMode:      boolean;
  fallPoleId:     string | null;
  offlinePoleId:  string | null;
  resetCounter:   number;
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

      {/* Static park */}
      <ParkGeometry />

      {/* Sensor poles */}
      {POLES.map((pole) => (
        <Pole
          key={pole.id}
          data={pole}
          selected={selectedPoleId === pole.id}
          onSelect={onSelectPole}
          isAlert={fallPoleId === pole.id}
          isOffline={offlinePoleId === pole.id}
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
  resetCounter,
}: SceneProps) {
  // any-typed ref to OrbitControls — types vary across drei versions
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetCounter > 0 && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetCounter]);

  return (
    <Canvas
      shadows
      camera={{ position: [30, 35, 39], fov: 48, near: 0.1, far: 250 }}
      style={{ width: '100%', height: '100%' }}
    >
      <World
        selectedPoleId={selectedPoleId}
        onSelectPole={onSelectPole}
        lighting={lighting}
        showCoverage={showCoverage}
        paused={paused}
        nightMode={nightMode}
        fallPoleId={fallPoleId}
        offlinePoleId={offlinePoleId}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={12}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
