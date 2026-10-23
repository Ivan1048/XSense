// Main 3D Canvas scene — assembles park geometry, poles, CCTV inventory, coverage gaps, anonymous LiDAR dots, and security guard markers.
import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { PerspectiveCamera } from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParkGeometry from './ParkGeometry';
import Pole from './Pole';
import ParkSurroundings from './ParkSurroundings';
import TacticalBlueprint from './TacticalBlueprint';
import LidarPlan from './LidarPlan';
import AudioCoverage from './AudioCoverage';
import LidarCoverageOverlay from './LidarCoverageOverlay';
import AnonymousHumanoid from './AnonymousHumanoid';
import GuardMarker from './GuardMarker';
import PersonaCommandHUD from '../HUD/PersonaCommandHUD';
import CameraAndGapOverlay from './CameraAndGapOverlay';
import { POLES, PEOPLE_PATHS } from '../../data/parkData';
import type { LightingMap, DispatchedGuardState, CameraPose, CameraViewMode } from '../../types';
import { DEFAULT_CAMERA_POSE } from '../../types';
import type { SectorId } from '../../data/sectors';
import {
  SECTORS,
  SECTOR_BOUNDS,
  PARK_BOUNDS,
  calculateOrthographicFrustum,
  OVERVIEW_PERSPECTIVE_POSE,
  OVERVIEW_RADAR_POSE,
  OVERVIEW_RADAR_ZOOM,
} from '../../data/sectors';

interface SceneProps {
  mapMode?: 'blueprint' | 'assets';
  cameraView?: CameraViewMode;
  selectedSectorId?: SectorId | null;
  sectorFlyTrigger?: number;
  showDeviceLabels: boolean;
  showStudyPosts?: boolean;
  showLidarRanges?: boolean;
  showLidarCoverage?: boolean;
  selectedLidarId?: string | null;
  onSelectLidar?: (id: string) => void;
  showLidarPlan?: boolean;
  selectedPlannedLidar: string;
  onSelectPlannedLidar: (id: string) => void;
  selectedPoleId: string;
  onSelectPole: (id: string) => void;
  onSelectAnonymousDot?: (dotIndex: number) => void;
  selectedDotIndex?: number | null;
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
  perspPose?: CameraPose;
  radarPose?: CameraPose;
  onCameraChange?: (pose: CameraPose) => void;
}

interface WorldProps extends Omit<SceneProps, 'resetCounter' | 'cameraPose' | 'perspPose' | 'radarPose' | 'onCameraChange' | 'cameraView' | 'selectedSectorId' | 'sectorFlyTrigger'> {}

// Preserve horizontal framing across Perspective and Orthographic cameras when viewer aspect ratio changes
function ResponsiveFraming({
  cameraView,
  selectedSectorId,
}: {
  cameraView: CameraViewMode;
  selectedSectorId?: SectorId | null;
}) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    if (camera instanceof PerspectiveCamera) {
      camera.aspect = aspect;
      camera.fov = 2 * Math.atan(Math.tan(22 * Math.PI / 180) * Math.max(1, 1.35 / aspect)) * 180 / Math.PI;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      const bounds = selectedSectorId && SECTOR_BOUNDS[selectedSectorId]
        ? SECTOR_BOUNDS[selectedSectorId]
        : PARK_BOUNDS;
      const frustum = calculateOrthographicFrustum(bounds, aspect, 1.12);
      camera.left = frustum.left;
      camera.right = frustum.right;
      camera.top = frustum.top;
      camera.bottom = frustum.bottom;
      camera.near = 0.1;
      camera.far = 500;
      camera.updateProjectionMatrix();
    }
  }, [camera, cameraView, selectedSectorId, size.width, size.height]);
  return null;
}

function World({
  mapMode = 'blueprint',
  showDeviceLabels,
  showStudyPosts,
  showLidarRanges,
  showLidarPlan,
  selectedPlannedLidar,
  onSelectPlannedLidar,
  selectedPoleId,
  onSelectPole,
  onSelectAnonymousDot,
  selectedDotIndex = null,
  onSelectGuard,
  selectedCameraId = null,
  onSelectCamera,
  lighting,
  lightingNote,
  showAudioCoverage,
  showLidarCoverage = true,
  selectedLidarId = null,
  onSelectLidar,
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
  const showPosts = showStudyPosts ?? showLidarPlan ?? false;
  const showRanges = showPosts && (showLidarRanges ?? false);

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

      {/* Authoritative Operational LiDAR Coverage Overlay (with FOV and shadow cutouts) */}
      <LidarCoverageOverlay
        showCoverage={showLidarCoverage}
        showLabels={showDeviceLabels}
        offlinePoleId={offlinePoleId}
        blockedRouteZone={blockedRouteZone}
        selectedSensorId={selectedLidarId}
        onSelectSensor={onSelectLidar}
      />

      {showAudioCoverage && <AudioCoverage showLabels={showDeviceLabels} />}
      <LidarPlan
        showPosts={showPosts}
        showRanges={showRanges}
        selectedId={selectedPlannedLidar}
        onSelect={onSelectPlannedLidar}
      />

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

      {/* SOS Signal Beacon when Resident Triggers SOS */}
      {sosPole && (
        <mesh position={[sosPole.position[0], 0.05, sosPole.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 4.2, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.65} depthWrite={false} />
        </mesh>
      )}

      {/* Anonymous Movement Simulation (LiDAR Point Cloud Humanoids) */}
      {PEOPLE_PATHS.map((path, i) => (
        <AnonymousHumanoid
          key={i}
          path={path}
          personaIndex={i}
          paused={paused}
          highlight={selectedDotIndex === i}
          stationary={false}
          isLookalikeStop={isLookalikeStop && i === 0}
          isSOS={Boolean(sosPole) && i === 1}
          sosTargetPos={sosPole ? sosPole.position : null}
          onSelect={() => onSelectAnonymousDot?.(i)}
        />
      ))}

      {/* Security Guards — with Non-Overlapping Dispatched Formation */}
      {dispatchedGuards.map((dg) => (
        <GuardMarker
          key={dg.guardId}
          guardId={dg.guardId}
          guardName={dg.guardName}
          targetPos={dg.targetPos}
          targetPoleId={dg.targetPoleId}
          status={dg.status}
          onSelect={() => onSelectGuard?.(dg.guardId)}
          onFinishedReturn={() => onFinishGuardReturn?.(dg.guardId)}
        />
      ))}
    </>
  );
}

interface CameraRigProps {
  cameraView: CameraViewMode;
  selectedSectorId: SectorId | null;
  sectorFlyTrigger?: number;
  cameraPose: CameraPose;
  perspPose?: CameraPose;
  radarPose?: CameraPose;
  onCameraChange?: (pose: CameraPose) => void;
  resetCounter: number;
}

function CameraRig({
  cameraView,
  selectedSectorId,
  sectorFlyTrigger = 0,
  cameraPose,
  perspPose,
  radarPose,
  onCameraChange,
  resetCounter,
}: CameraRigProps) {
  const { size, set, gl } = useThree();
  const controlsRef = useRef<any>(null);

  // Derive initial active pose based on cameraView
  const initialActivePose = cameraView === 'radar'
    ? (radarPose || cameraPose || OVERVIEW_RADAR_POSE)
    : (perspPose || cameraPose || OVERVIEW_PERSPECTIVE_POSE);

  const latestPoseRef = useRef<CameraPose>(initialActivePose);
  const lastCommittedPoseRef = useRef<CameraPose>(initialActivePose);
  const lastHandledResetRef = useRef(resetCounter);
  const lastSectorRef = useRef<SectorId | null>(selectedSectorId);
  const lastViewRef = useRef<CameraViewMode>(cameraView);
  const lastTriggerRef = useRef<number>(sectorFlyTrigger);
  const isMountedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Perspective camera (world ground plane X/Z, elevation Y, target in front)
  const perspCamera = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const pose = perspPose || (cameraView === '3d' ? cameraPose : OVERVIEW_PERSPECTIVE_POSE);
    const cam = new THREE.PerspectiveCamera(44, aspect, 0.5, 500);
    cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    cam.updateProjectionMatrix();
    return cam;
  }, []);

  // Orthographic radar camera (world ground plane X/Z, elevation Y=100, looking -Y, north-up = screen top is -Z)
  const orthoCamera = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const bounds = selectedSectorId && SECTOR_BOUNDS[selectedSectorId]
      ? SECTOR_BOUNDS[selectedSectorId]
      : PARK_BOUNDS;
    const frustum = calculateOrthographicFrustum(bounds, aspect, 1.12);
    const pose = radarPose || (cameraView === 'radar' ? cameraPose : OVERVIEW_RADAR_POSE);
    const cam = new THREE.OrthographicCamera(
      frustum.left,
      frustum.right,
      frustum.top,
      frustum.bottom,
      0.1,
      500
    );
    cam.up.set(0, 0, -1);
    const cx = pose.target ? pose.target[0] : frustum.target[0];
    const cz = pose.target ? pose.target[2] : frustum.target[2];
    cam.position.set(cx, 100, cz);
    cam.lookAt(cx, 0, cz);
    cam.zoom = pose.zoom ?? OVERVIEW_RADAR_ZOOM;
    cam.updateProjectionMatrix();
    return cam;
  }, []);

  const activeCamera = cameraView === 'radar' ? orthoCamera : perspCamera;

  // Sync active camera with R3F store
  useEffect(() => {
    set({ camera: activeCamera });
  }, [activeCamera, set]);

  // Commit pose callback with threshold to avoid redundant context updates
  const commitPose = useCallback((pose: CameraPose) => {
    const last = lastCommittedPoseRef.current;
    const posDiff = Math.hypot(
      pose.position[0] - last.position[0],
      pose.position[1] - last.position[1],
      pose.position[2] - last.position[2]
    );
    const tgtDiff = Math.hypot(
      pose.target[0] - last.target[0],
      pose.target[1] - last.target[1],
      pose.target[2] - last.target[2]
    );
    const zoomDiff = Math.abs((pose.zoom ?? 1) - (last.zoom ?? 1));

    if (posDiff > 0.05 || tgtDiff > 0.05 || zoomDiff > 0.02) {
      lastCommittedPoseRef.current = pose;
      onCameraChange?.(pose);
    }
  }, [onCameraChange]);

  const commitPoseRef = useRef(commitPose);
  useEffect(() => {
    commitPoseRef.current = commitPose;
  }, [commitPose]);

  // Set controls ref and apply initial target and active camera
  const handleControlsRef = useCallback((controls: any) => {
    controlsRef.current = controls;
    if (controls) {
      controls.object = activeCamera;
      const pose = latestPoseRef.current;
      controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
      controls.update();
    }
  }, [activeCamera]);

  // Fly-to animation state
  const animRef = useRef<{
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    targetTarget: THREE.Vector3;
    startZoom?: number;
    targetZoom?: number;
  }>({
    isAnimating: false,
    startTime: 0,
    duration: 950,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    targetTarget: new THREE.Vector3(),
  });

  const flyTo = useCallback((
    destPos: [number, number, number],
    destTarget: [number, number, number],
    destZoom?: number,
    durationMs = 950
  ) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const targetPosVec = cameraView === 'radar'
      ? new THREE.Vector3(destPos[0], 100, destPos[2])
      : new THREE.Vector3(...destPos);
    const targetTgtVec = cameraView === 'radar'
      ? new THREE.Vector3(destTarget[0], 0, destTarget[2])
      : new THREE.Vector3(...destTarget);

    animRef.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration: durationMs,
      startPos: activeCamera.position.clone(),
      targetPos: targetPosVec,
      startTarget: controls.target.clone(),
      targetTarget: targetTgtVec,
      startZoom: cameraView === 'radar' ? (activeCamera as THREE.OrthographicCamera).zoom : undefined,
      targetZoom: destZoom,
    };
  }, [activeCamera, cameraView]);

  // User input handlers hooked directly into OrbitControls
  const handleControlsChange = useCallback(() => {
    if (animRef.current.isAnimating) return;
    const controls = controlsRef.current;
    if (!controls) return;

    if (cameraView === 'radar') {
      activeCamera.position.y = 100;
      activeCamera.up.set(0, 0, -1);
      controls.target.y = 0;
    }

    const pos = activeCamera.position;
    const tgt = controls.target;
    const zoom = cameraView === 'radar' ? (activeCamera as THREE.OrthographicCamera).zoom : undefined;

    const currentPose: CameraPose = {
      position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
      target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
      zoom: zoom !== undefined ? Number(zoom.toFixed(2)) : undefined,
    };
    latestPoseRef.current = currentPose;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      commitPose(latestPoseRef.current);
    }, 250);
  }, [activeCamera, cameraView, commitPose]);

  const handleControlsStart = useCallback(() => {
    if (animRef.current.isAnimating) {
      animRef.current.isAnimating = false;
    }
  }, []);

  const handleControlsEnd = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!animRef.current.isAnimating) {
      commitPose(latestPoseRef.current);
    }
  }, [commitPose]);

  // Cancel fly-to animation on mouse wheel
  useEffect(() => {
    const dom = gl.domElement;
    const onWheel = () => {
      if (animRef.current.isAnimating) {
        animRef.current.isAnimating = false;
      }
    };
    dom.addEventListener('wheel', onWheel, { passive: true });
    return () => dom.removeEventListener('wheel', onWheel);
  }, [gl.domElement]);

  // Save latest camera pose when CameraRig unmounts (e.g. route navigation)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      commitPoseRef.current(latestPoseRef.current);
    };
  }, []);

  // Projection mode change (3D <-> Radar)
  useEffect(() => {
    if (cameraView === lastViewRef.current) return;
    lastViewRef.current = cameraView;

    const targetPose = cameraView === 'radar'
      ? (radarPose || OVERVIEW_RADAR_POSE)
      : (perspPose || OVERVIEW_PERSPECTIVE_POSE);

    const controls = controlsRef.current;
    if (controls) {
      controls.object = activeCamera;
      if (cameraView === 'radar') {
        controls.enableRotate = false;
        controls.maxPolarAngle = Math.PI;
        controls.minPolarAngle = 0;
        orthoCamera.position.set(targetPose.target[0], 100, targetPose.target[2]);
        orthoCamera.up.set(0, 0, -1);
        controls.target.set(targetPose.target[0], 0, targetPose.target[2]);
        orthoCamera.lookAt(targetPose.target[0], 0, targetPose.target[2]);
        orthoCamera.zoom = targetPose.zoom ?? OVERVIEW_RADAR_ZOOM;
        orthoCamera.updateProjectionMatrix();
      } else {
        controls.enableRotate = true;
        controls.maxPolarAngle = Math.PI / 2.15;
        controls.minPolarAngle = 0;
        perspCamera.position.set(targetPose.position[0], targetPose.position[1], targetPose.position[2]);
        perspCamera.up.set(0, 1, 0);
        controls.target.set(targetPose.target[0], targetPose.target[1], targetPose.target[2]);
      }
      controls.update();
      latestPoseRef.current = targetPose;
    }
  }, [cameraView, activeCamera, perspPose, radarPose]);

  // React to explicit sector selection changes or sectorFlyTrigger
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const isTriggered = sectorFlyTrigger !== lastTriggerRef.current;
    lastTriggerRef.current = sectorFlyTrigger;

    if (selectedSectorId === lastSectorRef.current && !isTriggered) return;
    lastSectorRef.current = selectedSectorId;

    if (selectedSectorId && SECTORS[selectedSectorId]) {
      const sec = SECTORS[selectedSectorId];
      if (cameraView === 'radar') {
        flyTo(sec.radarPosition, sec.target, sec.radarZoom);
      } else {
        flyTo(sec.perspectivePosition, sec.target);
      }
    } else if (!selectedSectorId && isTriggered) {
      if (cameraView === 'radar') {
        flyTo(OVERVIEW_RADAR_POSE.position, OVERVIEW_RADAR_POSE.target, OVERVIEW_RADAR_ZOOM);
      } else {
        flyTo(OVERVIEW_PERSPECTIVE_POSE.position, OVERVIEW_PERSPECTIVE_POSE.target);
      }
    }
  }, [selectedSectorId, cameraView, sectorFlyTrigger, flyTo]);

  // React to Reset View button clicks
  useEffect(() => {
    if (resetCounter !== lastHandledResetRef.current) {
      lastHandledResetRef.current = resetCounter;
      lastSectorRef.current = null;
      if (cameraView === 'radar') {
        flyTo(OVERVIEW_RADAR_POSE.position, OVERVIEW_RADAR_POSE.target, OVERVIEW_RADAR_ZOOM);
      } else {
        flyTo(OVERVIEW_PERSPECTIVE_POSE.position, OVERVIEW_PERSPECTIVE_POSE.target);
      }
    }
  }, [resetCounter, cameraView, flyTo]);

  // Render loop animation update
  useFrame(() => {
    const anim = animRef.current;
    if (!anim.isAnimating) return;

    const controls = controlsRef.current;
    if (!controls) return;

    const elapsed = (performance.now() - anim.startTime) / anim.duration;

    if (elapsed >= 1) {
      anim.isAnimating = false;
      if (cameraView === 'radar') {
        activeCamera.position.copy(anim.targetPos);
        activeCamera.position.y = 100;
        activeCamera.up.set(0, 0, -1);
        controls.target.copy(anim.targetTarget);
        controls.target.y = 0;
        activeCamera.lookAt(controls.target);
        if (anim.targetZoom !== undefined) {
          (activeCamera as THREE.OrthographicCamera).zoom = anim.targetZoom;
          activeCamera.updateProjectionMatrix();
        }
      } else {
        activeCamera.position.copy(anim.targetPos);
        activeCamera.up.set(0, 1, 0);
        controls.target.copy(anim.targetTarget);
      }
      controls.update();

      const finalPose: CameraPose = {
        position: [
          Number(activeCamera.position.x.toFixed(2)),
          Number(activeCamera.position.y.toFixed(2)),
          Number(activeCamera.position.z.toFixed(2)),
        ],
        target: [
          Number(controls.target.x.toFixed(2)),
          Number(controls.target.y.toFixed(2)),
          Number(controls.target.z.toFixed(2)),
        ],
        zoom: cameraView === 'radar'
          ? Number((activeCamera as THREE.OrthographicCamera).zoom.toFixed(2))
          : undefined,
      };
      latestPoseRef.current = finalPose;
      commitPose(finalPose);
    } else {
      const t = elapsed < 0.5
        ? 4 * elapsed * elapsed * elapsed
        : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;

      activeCamera.position.lerpVectors(anim.startPos, anim.targetPos, t);
      controls.target.lerpVectors(anim.startTarget, anim.targetTarget, t);

      if (cameraView === 'radar') {
        activeCamera.position.y = 100;
        activeCamera.up.set(0, 0, -1);
        controls.target.y = 0;
        activeCamera.lookAt(controls.target);
        if (anim.startZoom !== undefined && anim.targetZoom !== undefined) {
          (activeCamera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
            anim.startZoom,
            anim.targetZoom,
            t
          );
          activeCamera.updateProjectionMatrix();
        }
      } else {
        activeCamera.up.set(0, 1, 0);
      }
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={handleControlsRef}
      makeDefault
      camera={activeCamera}
      enableDamping
      dampingFactor={cameraView === 'radar' ? 0.06 : 0.08}
      zoomSpeed={cameraView === 'radar' ? 0.4 : 0.45}
      enableRotate={cameraView === '3d'}
      enablePan={true}
      enableZoom={true}
      maxPolarAngle={cameraView === 'radar' ? Math.PI : Math.PI / 2.15}
      minPolarAngle={0}
      minDistance={cameraView === 'radar' ? 0 : 8}
      maxDistance={cameraView === 'radar' ? Infinity : 180}
      onChange={handleControlsChange}
      onStart={handleControlsStart}
      onEnd={handleControlsEnd}
    />
  );
}

export default function Scene({
  mapMode = 'blueprint',
  cameraView = '3d',
  selectedSectorId = null,
  sectorFlyTrigger = 0,
  showDeviceLabels,
  showStudyPosts,
  showLidarRanges,
  showLidarPlan,
  selectedPlannedLidar,
  onSelectPlannedLidar,
  selectedPoleId,
  onSelectPole,
  onSelectAnonymousDot,
  selectedDotIndex = null,
  onSelectGuard,
  selectedCameraId = null,
  onSelectCamera,
  lighting,
  lightingNote,
  showAudioCoverage,
  showLidarCoverage = true,
  selectedLidarId = null,
  onSelectLidar,
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
  perspPose,
  radarPose,
  onCameraChange,
}: SceneProps) {
  const activePose = cameraView === 'radar'
    ? (radarPose || cameraPose || OVERVIEW_RADAR_POSE)
    : (perspPose || cameraPose || OVERVIEW_PERSPECTIVE_POSE);

  return (
    <>
      <Canvas
        camera={{ position: activePose.position, fov: 44 }}
        shadows
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ResponsiveFraming cameraView={cameraView} selectedSectorId={selectedSectorId} />
        <CameraRig
          cameraView={cameraView}
          selectedSectorId={selectedSectorId}
          sectorFlyTrigger={sectorFlyTrigger}
          cameraPose={cameraPose}
          perspPose={perspPose}
          radarPose={radarPose}
          onCameraChange={onCameraChange}
          resetCounter={resetCounter}
        />
        <World
          mapMode={mapMode}
          showStudyPosts={showStudyPosts}
          showLidarRanges={showLidarRanges}
          showLidarCoverage={showLidarCoverage}
          selectedLidarId={selectedLidarId}
          onSelectLidar={onSelectLidar}
          showLidarPlan={showLidarPlan}
          selectedPlannedLidar={selectedPlannedLidar}
          onSelectPlannedLidar={onSelectPlannedLidar}
          selectedPoleId={selectedPoleId}
          onSelectPole={onSelectPole}
          onSelectAnonymousDot={onSelectAnonymousDot}
          selectedDotIndex={selectedDotIndex}
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
      <PersonaCommandHUD selectedIndex={selectedDotIndex} onSelectPersona={onSelectAnonymousDot} />
    </>
  );
}
