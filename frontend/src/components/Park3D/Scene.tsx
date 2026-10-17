// Main 3D Canvas scene — assembles park geometry, poles, CCTV inventory, coverage gaps, anonymous LiDAR dots, and security guard markers.
import { useEffect, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParkGeometry from './ParkGeometry';
import Pole from './Pole';
import ParkSurroundings from './ParkSurroundings';
import TacticalBlueprint from './TacticalBlueprint';
import LidarPlan from './LidarPlan';
import AudioCoverage from './AudioCoverage';
import AnonymousDot from './AnonymousDot';
import GuardMarker from './GuardMarker';
import CameraAndGapOverlay from './CameraAndGapOverlay';
import { POLES, PEOPLE_PATHS } from '../../data/parkData';
import type { LightingMap, DispatchedGuardState } from '../../types';

interface SceneProps {
  mapMode?: 'blueprint' | 'assets';
  showDeviceLabels: boolean;
  showLidarPlan: boolean;
  selectedPlannedLidar: string;
  onSelectPlannedLidar: (id: string) => void;
  selectedPoleId: string;
  onSelectPole: (id: string) => void;
  onSelectAnonymousDot?: (dotIndex: number) => void;
  onSelectGuard?: (guardId: string) => void;
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
  lighting: LightingMap;
  lightingNote?: string;
  showAudioCoverage: boolean;
  showCCTV?: boolean;
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

// Preserve the park's horizontal framing when the viewer becomes narrow.
function ResponsiveFraming() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    camera.fov = 2 * Math.atan(Math.tan(22 * Math.PI / 180) * Math.max(1, 1.35 / aspect)) * 180 / Math.PI;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function World({
  mapMode = 'blueprint',
  showDeviceLabels,
  showLidarPlan,
  selectedPlannedLidar,
  onSelectPlannedLidar,
  selectedPoleId,
  onSelectPole,
  onSelectAnonymousDot,
  onSelectGuard,
  selectedCameraId = null,
  onSelectCamera,
  lighting,
  showAudioCoverage,
  showCCTV = true,
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
      <color attach="background" args={[mapMode === 'blueprint' ? '#050c18' : (nightMode ? '#132333' : '#d1e0df')]} />
      <ambientLight intensity={mapMode === 'blueprint' ? 1.35 : (nightMode ? 1.15 : 1.35)} />
      <directionalLight
        position={[14, 28, 12]}
        intensity={mapMode === 'blueprint' ? 0.95 : (nightMode ? 0.85 : 2.2)}
        color={mapMode === 'blueprint' ? '#93c5fd' : (nightMode ? '#c7d2fe' : '#fffdf5')}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight
        args={[
          mapMode === 'blueprint' ? '#38bdf8' : (nightMode ? '#cbdce8' : '#dbeafe'),
          mapMode === 'blueprint' ? '#020617' : (nightMode ? '#0f172a' : '#334155'),
          0.45,
        ]}
      />

      {mapMode === 'blueprint' ? (
        <TacticalBlueprint
          blockedRouteZone={blockedRouteZone}
          isRaining={isRaining}
          nightMode={nightMode}
        />
      ) : (
        <>
          <ParkGeometry blockedRouteZone={blockedRouteZone} isRaining={isRaining} nightMode={nightMode} />
          <ParkSurroundings nightMode={nightMode} />
        </>
      )}

      {showAudioCoverage && <AudioCoverage showLabels={showDeviceLabels} />}
      <LidarPlan showRanges={showLidarPlan} selectedId={selectedPlannedLidar} onSelect={onSelectPlannedLidar} />

      {/* Independent CCTV Camera Inventory & Coverage Gap Overlay */}
      <CameraAndGapOverlay
        showDeviceLabels={showDeviceLabels}
        showCCTV={showCCTV}
        selectedCameraId={selectedCameraId}
        onSelectCamera={onSelectCamera}
      />

      {POLES.map((pole) => (
        <Pole
          key={pole.id}
          showLabel={showDeviceLabels}
          data={pole}
          selected={selectedPoleId === pole.id && !selectedCameraId}
          onSelect={onSelectPole}
          isAlert={fallPoleId === pole.id || sosPoleId === pole.id}
          isOffline={offlinePoleId === pole.id}
          hasAcousticRipple={acousticPoleId === pole.id}
          lightBrightness={offlinePoleId === pole.id ? 0 : (lighting[pole.id] ?? 70)}
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
  mapMode = 'blueprint',
  showDeviceLabels,
  showLidarPlan,
  selectedPlannedLidar,
  onSelectPlannedLidar,
  selectedPoleId,
  onSelectPole,
  onSelectAnonymousDot,
  onSelectGuard,
  selectedCameraId = null,
  onSelectCamera,
  lighting,
  lightingNote,
  showAudioCoverage,
  showCCTV = true,
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
      camera={{ position: [36, 70, 77], fov: 44 }}
      shadows
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ResponsiveFraming />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={8}
        maxDistance={180}
      />
      <World
        mapMode={mapMode}
        showLidarPlan={showLidarPlan}
        selectedPlannedLidar={selectedPlannedLidar}
        onSelectPlannedLidar={onSelectPlannedLidar}
        selectedPoleId={selectedPoleId}
        onSelectPole={onSelectPole}
        onSelectAnonymousDot={onSelectAnonymousDot}
        onSelectGuard={onSelectGuard}
        selectedCameraId={selectedCameraId}
        onSelectCamera={onSelectCamera}
        lighting={lighting}
        lightingNote={lightingNote}
        showAudioCoverage={showAudioCoverage}
        showDeviceLabels={showDeviceLabels}
        showCCTV={showCCTV}
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
