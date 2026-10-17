// Main 3D Canvas scene — assembles park geometry, poles, CCTV inventory, coverage gaps, anonymous LiDAR dots, and security guard markers.
import { useEffect, useRef, useCallback } from 'react';
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
import type { LightingMap, DispatchedGuardState, CameraPose } from '../../types';
import { DEFAULT_CAMERA_POSE } from '../../types';

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
  cameraPose?: CameraPose;
  onCameraChange?: (pose: CameraPose) => void;
}

interface WorldProps extends Omit<SceneProps, 'resetCounter' | 'cameraPose' | 'onCameraChange'> {}

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

interface CameraManagerProps {
  cameraPose: CameraPose;
  onCameraChange?: (pose: CameraPose) => void;
  resetCounter: number;
}

function CameraManager({
  cameraPose,
  onCameraChange,
  resetCounter,
}: CameraManagerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const lastHandledResetRef = useRef(resetCounter);
  const latestPoseRef = useRef<CameraPose>(cameraPose);

  // Keep internal ref aligned if external cameraPose updates
  useEffect(() => {
    latestPoseRef.current = cameraPose;
  }, [cameraPose]);

  // Restore camera position and OrbitControls target on initial mount
  useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2]);
      controlsRef.current.target.set(cameraPose.target[0], cameraPose.target[1], cameraPose.target[2]);
      controlsRef.current.update();
    }
  }, []);

  // Handle explicit Reset View clicks; skips on initial mount since lastHandledResetRef starts at resetCounter
  useEffect(() => {
    if (resetCounter !== lastHandledResetRef.current) {
      lastHandledResetRef.current = resetCounter;
      if (controlsRef.current) {
        camera.position.set(
          DEFAULT_CAMERA_POSE.position[0],
          DEFAULT_CAMERA_POSE.position[1],
          DEFAULT_CAMERA_POSE.position[2]
        );
        controlsRef.current.target.set(
          DEFAULT_CAMERA_POSE.target[0],
          DEFAULT_CAMERA_POSE.target[1],
          DEFAULT_CAMERA_POSE.target[2]
        );
        controlsRef.current.update();
        latestPoseRef.current = DEFAULT_CAMERA_POSE;
        onCameraChange?.(DEFAULT_CAMERA_POSE);
      }
    }
  }, [resetCounter, onCameraChange, camera]);

  const saveCurrentPose = useCallback(() => {
    if (!controlsRef.current) return;
    const pos = camera.position;
    const tgt = controlsRef.current.target;
    const newPose: CameraPose = {
      position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
      target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
    };
    latestPoseRef.current = newPose;
    onCameraChange?.(newPose);
  }, [camera, onCameraChange]);

  // Ensure camera pose is saved upon unmount (e.g. internal route navigation)
  useEffect(() => {
    return () => {
      if (controlsRef.current) {
        const pos = camera.position;
        const tgt = controlsRef.current.target;
        onCameraChange?.({
          position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
          target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
        });
      }
    };
  }, [camera, onCameraChange]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleChange = () => {
      const pos = camera.position;
      const tgt = controls.target;
      latestPoseRef.current = {
        position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
        target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
      };

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onCameraChange?.(latestPoseRef.current);
      }, 300);
    };

    const handleEnd = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      saveCurrentPose();
    };

    controls.addEventListener('change', handleChange);
    controls.addEventListener('end', handleEnd);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      controls.removeEventListener('change', handleChange);
      controls.removeEventListener('end', handleEnd);
    };
  }, [camera, onCameraChange, saveCurrentPose]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      zoomSpeed={0.45}
      maxPolarAngle={Math.PI / 2.15}
      minDistance={8}
      maxDistance={180}
    />
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
  cameraPose = DEFAULT_CAMERA_POSE,
  onCameraChange,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: cameraPose.position, fov: 44 }}
      shadows
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ResponsiveFraming />
      <CameraManager
        cameraPose={cameraPose}
        onCameraChange={onCameraChange}
        resetCounter={resetCounter}
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
