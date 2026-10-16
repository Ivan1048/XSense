// Main 3D Canvas scene — assembles park geometry, poles, CCTV inventory, coverage gaps, anonymous LiDAR dots, and security guard markers.
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParkGeometry from './ParkGeometry';
import Pole from './Pole';
import AnonymousDot from './AnonymousDot';
import GuardMarker from './GuardMarker';
import CameraAndGapOverlay from './CameraAndGapOverlay';
import { POLES, PEOPLE_PATHS } from '../../data/parkData';
import type { LightingMap, DispatchedGuardState } from '../../types';

interface SceneProps {
  selectedPoleId: string;
  onSelectPole: (id: string) => void;
  onSelectAnonymousDot?: (dotIndex: number) => void;
  onSelectGuard?: (guardId: string) => void;
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
  lighting: LightingMap;
  lightingNote?: string;
  showCoverage: boolean;
  showCCTV?: boolean;
  showGaps?: boolean;
  paused: boolean;
  nightMode: boolean;
  fallPoleId: string | null;
  sosPoleId?: string | null;
  isLookalikeStop?: boolean;
  offlinePoleId: string | null;
  acousticPoleId?: string | null;
  blockedRouteZone?: string | null;
  isRaining?: boolean;
  dispatchedGuards?: DispatchedGuardState[];
  onFinishGuardReturn?: (guardId: string) => void;
  resetCounter: number;
}

interface WorldProps extends Omit<SceneProps, 'resetCounter'> {}

function World({
  selectedPoleId,
  onSelectPole,
  onSelectAnonymousDot,
  onSelectGuard,
  selectedCameraId = null,
  onSelectCamera,
  lighting,
  showCoverage,
  showCCTV = true,
  showGaps = false,
  paused,
  nightMode,
  fallPoleId,
  sosPoleId = null,
  isLookalikeStop = false,
  offlinePoleId,
  acousticPoleId,
  blockedRouteZone,
  isRaining = false,
  dispatchedGuards = [],
  onFinishGuardReturn,
}: WorldProps) {
  const sosPole = sosPoleId ? POLES.find((p) => p.id === sosPoleId) : undefined;

  return (
    <>
      <color attach="background" args={[nightMode ? '#0a1526' : '#7baacc']} />
      <ambientLight intensity={nightMode ? 0.65 : 1.35} />
      <directionalLight
        position={[14, 28, 12]}
        intensity={nightMode ? 0.85 : 2.2}
        color={nightMode ? '#c7d2fe' : '#fffdf5'}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight
        args={[
          nightMode ? '#38bdf8' : '#dbeafe',
          nightMode ? '#0f172a' : '#334155',
          nightMode ? 0.45 : 0.45,
        ]}
      />

      <ParkGeometry blockedRouteZone={blockedRouteZone} isRaining={isRaining} nightMode={nightMode} />

      {/* Independent CCTV Camera Inventory & Coverage Gap Overlay */}
      <CameraAndGapOverlay
        showCCTV={showCCTV}
        showGaps={showGaps}
        selectedCameraId={selectedCameraId}
        onSelectCamera={onSelectCamera}
      />

      {POLES.map((pole) => (
        <Pole
          key={pole.id}
          data={pole}
          selected={selectedPoleId === pole.id && !selectedCameraId}
          onSelect={onSelectPole}
          isAlert={fallPoleId === pole.id || sosPoleId === pole.id}
          isOffline={offlinePoleId === pole.id}
          hasAcousticRipple={acousticPoleId === pole.id}
          lightBrightness={offlinePoleId === pole.id ? 0 : (lighting[pole.id] ?? 70)}
          showCoverage={showCoverage}
        />
      ))}

      {PEOPLE_PATHS.map((path, i) => (
        <AnonymousDot
          key={i}
          path={path}
          paused={paused}
          highlight={fallPoleId === 'AS-104' && i === 0}
          stationary={fallPoleId === 'AS-104' && i === 0}
          isCollapsed={fallPoleId === 'AS-104' && i === 0}
          isLookalikeStop={isLookalikeStop && i === 0}
          isSOS={Boolean(sosPole) && i === 1}
          sosTargetPos={sosPole ? sosPole.position : null}
          onSelect={() => onSelectAnonymousDot?.(i)}
        />
      ))}

      {dispatchedGuards.map((dg) => (
        <GuardMarker
          key={dg.guardId}
          guardId={dg.guardId}
          guardName={dg.guardName}
          targetPos={dg.targetPos}
          status={dg.status}
          onSelect={() => onSelectGuard?.(dg.guardId)}
          onFinishedReturn={() => onFinishGuardReturn?.(dg.guardId)}
        />
      ))}
    </>
  );
}

export default function Scene({
  selectedPoleId,
  onSelectPole,
  onSelectAnonymousDot,
  onSelectGuard,
  selectedCameraId = null,
  onSelectCamera,
  lighting,
  lightingNote,
  showCoverage,
  showCCTV = true,
  showGaps = false,
  paused,
  nightMode,
  fallPoleId,
  sosPoleId = null,
  isLookalikeStop = false,
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
      camera={{ position: [0, 21, 23], fov: 44 }}
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
        onSelectAnonymousDot={onSelectAnonymousDot}
        onSelectGuard={onSelectGuard}
        selectedCameraId={selectedCameraId}
        onSelectCamera={onSelectCamera}
        lighting={lighting}
        lightingNote={lightingNote}
        showCoverage={showCoverage}
        showCCTV={showCCTV}
        showGaps={showGaps}
        paused={paused}
        nightMode={nightMode}
        fallPoleId={fallPoleId}
        sosPoleId={sosPoleId}
        isLookalikeStop={isLookalikeStop}
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
