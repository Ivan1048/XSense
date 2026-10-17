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
import AnonymousDot from './AnonymousDot';
import GuardMarker from './GuardMarker';
import CameraAndGapOverlay from './CameraAndGapOverlay';
import { POLES, PEOPLE_PATHS } from '../../data/parkData';
import type { LightingMap, DispatchedGuardState, CameraPose, CameraViewMode } from '../../types';
import { DEFAULT_CAMERA_POSE } from '../../types';
import type { SectorId } from '../../data/sectors';
import { SECTORS, OVERVIEW_PERSPECTIVE_POSE, OVERVIEW_RADAR_POSE, OVERVIEW_RADAR_ZOOM } from '../../data/sectors';

interface SceneProps {
  mapMode?: 'blueprint' | 'assets';
  cameraView?: CameraViewMode;
  selectedSectorId?: SectorId | null;
  sectorFlyTrigger?: number;
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

interface WorldProps extends Omit<SceneProps, 'resetCounter' | 'cameraPose' | 'onCameraChange' | 'cameraView' | 'selectedSectorId' | 'sectorFlyTrigger'> {}

// Preserve horizontal framing across Perspective and Orthographic cameras when viewer aspect ratio changes
function ResponsiveFraming({ cameraView }: { cameraView: CameraViewMode }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    if (camera instanceof PerspectiveCamera) {
      camera.aspect = aspect;
      camera.fov = 2 * Math.atan(Math.tan(22 * Math.PI / 180) * Math.max(1, 1.35 / aspect)) * 180 / Math.PI;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      const frustumH = 70;
      const frustumW = frustumH * aspect;
      camera.left = -frustumW / 2;
      camera.right = frustumW / 2;
      camera.top = frustumH / 2;
      camera.bottom = -frustumH / 2;
      camera.updateProjectionMatrix();
    }
  }, [camera, cameraView, size.width, size.height]);
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

interface CameraRigProps {
  cameraView: CameraViewMode;
  selectedSectorId: SectorId | null;
  sectorFlyTrigger?: number;
  cameraPose: CameraPose;
  onCameraChange?: (pose: CameraPose) => void;
  resetCounter: number;
}

function CameraRig({
  cameraView,
  selectedSectorId,
  sectorFlyTrigger = 0,
  cameraPose,
  onCameraChange,
  resetCounter,
}: CameraRigProps) {
  const { size, set, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const latestPoseRef = useRef<CameraPose>(cameraPose);
  const lastHandledResetRef = useRef(resetCounter);
  const lastSectorRef = useRef<SectorId | null>(selectedSectorId);
  const lastViewRef = useRef<CameraViewMode>(cameraView);
  const lastTriggerRef = useRef<number>(sectorFlyTrigger);
  const isMountedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const perspCamera = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const cam = new THREE.PerspectiveCamera(44, aspect, 0.5, 500);
    cam.position.set(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2]);
    cam.up.set(0, 1, 0);
    return cam;
  }, []);

  const orthoCamera = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    const frustumH = 70;
    const frustumW = frustumH * aspect;
    const cam = new THREE.OrthographicCamera(
      -frustumW / 2,
      frustumW / 2,
      frustumH / 2,
      -frustumH / 2,
      0.1,
      500
    );
    cam.up.set(0, 0, -1); // North is -Z in world space
    cam.position.set(cameraPose.position[0], 80, cameraPose.position[2]);
    cam.zoom = cameraPose.zoom ?? 1.0;
    return cam;
  }, []);

  const activeCamera = cameraView === 'radar' ? orthoCamera : perspCamera;

  // Sync active camera with R3F store and OrbitControls
  useEffect(() => {
    set({ camera: activeCamera });
    const controls = controlsRef.current;
    if (controls) {
      controls.object = activeCamera;
      if (cameraView === 'radar') {
        controls.enableRotate = false;
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        };
        controls.minZoom = 0.4;
        controls.maxZoom = 4.5;
      } else {
        controls.enableRotate = true;
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        };
        controls.minDistance = 8;
        controls.maxDistance = 180;
      }
      controls.update();
    }
  }, [cameraView, activeCamera, set]);

  // Restore camera position and OrbitControls target on initial mount
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls) {
      if (cameraView === 'radar') {
        orthoCamera.position.set(cameraPose.position[0], 80, cameraPose.position[2]);
        orthoCamera.up.set(0, 0, -1);
        controls.target.set(cameraPose.target[0], 0, cameraPose.target[2]);
        orthoCamera.zoom = cameraPose.zoom ?? 1.0;
        orthoCamera.updateProjectionMatrix();
      } else {
        perspCamera.position.set(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2]);
        perspCamera.up.set(0, 1, 0);
        controls.target.set(cameraPose.target[0], cameraPose.target[1], cameraPose.target[2]);
      }
      controls.update();
    }
    isMountedRef.current = true;
  }, []);

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

    animRef.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration: durationMs,
      startPos: activeCamera.position.clone(),
      targetPos: new THREE.Vector3(...destPos),
      startTarget: controls.target.clone(),
      targetTarget: new THREE.Vector3(...destTarget),
      startZoom: cameraView === 'radar' ? (activeCamera as THREE.OrthographicCamera).zoom : undefined,
      targetZoom: destZoom,
    };
  }, [activeCamera, cameraView]);

  // Cancel fly-to animation immediately on user interaction
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleInteractionStart = () => {
      if (animRef.current.isAnimating) {
        animRef.current.isAnimating = false;
      }
    };

    controls.addEventListener('start', handleInteractionStart);

    const dom = gl.domElement;
    const onWheel = () => {
      if (animRef.current.isAnimating) {
        animRef.current.isAnimating = false;
      }
    };
    dom.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      controls.removeEventListener('start', handleInteractionStart);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl.domElement]);

  // React to sector changes or manual sector fly triggers
  useEffect(() => {
    if (!isMountedRef.current) return;
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
    } else if (!selectedSectorId && (lastSectorRef.current !== null || isTriggered)) {
      if (cameraView === 'radar') {
        flyTo(OVERVIEW_RADAR_POSE.position, OVERVIEW_RADAR_POSE.target, OVERVIEW_RADAR_ZOOM);
      } else {
        flyTo(OVERVIEW_PERSPECTIVE_POSE.position, OVERVIEW_PERSPECTIVE_POSE.target);
      }
    }
  }, [selectedSectorId, cameraView, sectorFlyTrigger, flyTo]);

  // React to projection mode changes (3D <-> Radar)
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (cameraView === lastViewRef.current) return;
    lastViewRef.current = cameraView;

    if (selectedSectorId && SECTORS[selectedSectorId]) {
      const sec = SECTORS[selectedSectorId];
      if (cameraView === 'radar') {
        flyTo(sec.radarPosition, sec.target, sec.radarZoom);
      } else {
        flyTo(sec.perspectivePosition, sec.target);
      }
    } else {
      if (cameraView === 'radar') {
        flyTo(OVERVIEW_RADAR_POSE.position, OVERVIEW_RADAR_POSE.target, OVERVIEW_RADAR_ZOOM);
      } else {
        flyTo(OVERVIEW_PERSPECTIVE_POSE.position, OVERVIEW_PERSPECTIVE_POSE.target);
      }
    }
  }, [cameraView, selectedSectorId, flyTo]);

  // React to Reset View button clicks
  useEffect(() => {
    if (resetCounter !== lastHandledResetRef.current) {
      lastHandledResetRef.current = resetCounter;
      lastSectorRef.current = null;
      lastViewRef.current = '3d';
      flyTo(OVERVIEW_PERSPECTIVE_POSE.position, OVERVIEW_PERSPECTIVE_POSE.target);
    }
  }, [resetCounter, flyTo]);

  const saveCurrentPose = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const pos = activeCamera.position;
    const tgt = controls.target;
    const zoom = cameraView === 'radar' ? (activeCamera as THREE.OrthographicCamera).zoom : undefined;

    const newPose: CameraPose = {
      position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
      target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
      zoom: zoom !== undefined ? Number(zoom.toFixed(2)) : undefined,
    };
    latestPoseRef.current = newPose;
    onCameraChange?.(newPose);
  }, [activeCamera, cameraView, onCameraChange]);

  // Save latest pose on unmount
  useEffect(() => {
    return () => {
      const controls = controlsRef.current;
      if (controls) {
        const pos = activeCamera.position;
        const tgt = controls.target;
        const zoom = cameraView === 'radar' ? (activeCamera as THREE.OrthographicCamera).zoom : undefined;
        onCameraChange?.({
          position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
          target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
          zoom: zoom !== undefined ? Number(zoom.toFixed(2)) : undefined,
        });
      }
    };
  }, [activeCamera, cameraView, onCameraChange]);

  // Controls change and end listeners
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleChange = () => {
      if (animRef.current.isAnimating) return;

      const pos = activeCamera.position;
      const tgt = controls.target;
      const zoom = cameraView === 'radar' ? (activeCamera as THREE.OrthographicCamera).zoom : undefined;

      latestPoseRef.current = {
        position: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
        target: [Number(tgt.x.toFixed(2)), Number(tgt.y.toFixed(2)), Number(tgt.z.toFixed(2))],
        zoom: zoom !== undefined ? Number(zoom.toFixed(2)) : undefined,
      };

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onCameraChange?.(latestPoseRef.current);
      }, 300);
    };

    const handleEnd = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (!animRef.current.isAnimating) {
        saveCurrentPose();
      }
    };

    controls.addEventListener('change', handleChange);
    controls.addEventListener('end', handleEnd);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      controls.removeEventListener('change', handleChange);
      controls.removeEventListener('end', handleEnd);
    };
  }, [activeCamera, cameraView, onCameraChange, saveCurrentPose]);

  // Render loop animation update
  useFrame(() => {
    const anim = animRef.current;
    if (!anim.isAnimating) return;

    const controls = controlsRef.current;
    if (!controls) return;

    const elapsed = (performance.now() - anim.startTime) / anim.duration;

    if (elapsed >= 1) {
      anim.isAnimating = false;
      activeCamera.position.copy(anim.targetPos);
      controls.target.copy(anim.targetTarget);
      if (cameraView === 'radar' && anim.targetZoom !== undefined) {
        (activeCamera as THREE.OrthographicCamera).zoom = anim.targetZoom;
        activeCamera.updateProjectionMatrix();
      }
      controls.update();
      saveCurrentPose();
    } else {
      const t = elapsed < 0.5
        ? 4 * elapsed * elapsed * elapsed
        : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;

      activeCamera.position.lerpVectors(anim.startPos, anim.targetPos, t);
      controls.target.lerpVectors(anim.startTarget, anim.targetTarget, t);

      if (cameraView === 'radar' && anim.startZoom !== undefined && anim.targetZoom !== undefined) {
        (activeCamera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
          anim.startZoom,
          anim.targetZoom,
          t
        );
        activeCamera.updateProjectionMatrix();
      }
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      zoomSpeed={0.45}
      maxPolarAngle={cameraView === 'radar' ? 0 : Math.PI / 2.15}
      minDistance={8}
      maxDistance={180}
    />
  );
}

export default function Scene({
  mapMode = 'blueprint',
  cameraView = '3d',
  selectedSectorId = null,
  sectorFlyTrigger = 0,
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
      <ResponsiveFraming cameraView={cameraView} />
      <CameraRig
        cameraView={cameraView}
        selectedSectorId={selectedSectorId}
        sectorFlyTrigger={sectorFlyTrigger}
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
