import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PersonaActionType } from '../../types/persona';
import { POLES } from '../../data/parkData';

const POLE_POSITIONS: Array<[number, number]> = POLES.map((p) => [p.position[0], p.position[1]]);

// ── Shared Materials for Companions ─────────────────────────────────────────
const companionMaterial = new THREE.MeshStandardMaterial({
  color: '#5ee6da',
  emissive: '#0e7490',
  emissiveIntensity: 0.45,
  roughness: 0.4,
});

const leashMaterial = new THREE.LineBasicMaterial({
  color: '#94a3b8',
  transparent: true,
  opacity: 0.65,
});

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export interface CompanionFollowConfig {
  companionType: 'child' | 'dog';
  localOffset: [number, number, number]; // e.g. child: [0.55, 0, -0.15], dog: [0.65, 0, 0.45]
  maxPermissibleErrorM: number;         // child: 0.25m, dog: 0.50m
  snapDiscontinuityThresholdM: number;  // e.g. 2.0m (remount / teleport / instant relocation)
  followLambda: number;                 // frame-rate independent exponential decay speed (child: 18, dog: 10)
}

export const COMPANION_CONFIGS: Record<'child' | 'dog', CompanionFollowConfig> = {
  child: {
    companionType: 'child',
    localOffset: [0.55, 0, -0.15],
    maxPermissibleErrorM: 0.25,
    snapDiscontinuityThresholdM: 2.0,
    followLambda: 18.0,
  },
  dog: {
    companionType: 'dog',
    localOffset: [0.65, 0, 0.45],
    maxPermissibleErrorM: 0.50,
    snapDiscontinuityThresholdM: 2.2,
    followLambda: 10.0,
  },
};

export type CompanionTargetVector = THREE.Vector3 & [number, number, number];

export function calculateCompanionTarget(
  parentWorldPos: [number, number, number] | THREE.Vector3,
  parentYawRad: number,
  localOffset: [number, number, number],
  polePositions?: Array<[number, number]>
): CompanionTargetVector {
  const pPos: [number, number, number] = Array.isArray(parentWorldPos)
    ? parentWorldPos
    : [parentWorldPos.x, parentWorldPos.y, parentWorldPos.z];

  const cosY = Math.cos(parentYawRad);
  const sinY = Math.sin(parentYawRad);
  const [lx, ly, lz] = localOffset;

  // Rotate local offset by parent's current heading
  let tx = pPos[0] + (lx * cosY + lz * sinY);
  const ty = pPos[1] + ly;
  let tz = pPos[2] + (-lx * sinY + lz * cosY);

  // Respect pole shaft collision avoidance (min 0.65m clearance from pole center)
  const poles = polePositions || POLE_POSITIONS;
  if (poles && poles.length > 0) {
    for (const [px, pz] of poles) {
      const dx = tx - px;
      const dz = tz - pz;
      const dist = Math.hypot(dx, dz);
      const minClearance = 0.65;
      if (dist < minClearance) {
        const nx = dist > 1e-4 ? dx / dist : 1;
        const nz = dist > 1e-4 ? dz / dist : 0;
        tx = px + nx * minClearance;
        tz = pz + nz * minClearance;
      }
    }
  }

  const vec = new THREE.Vector3(tx, ty, tz);
  Object.defineProperties(vec, {
    0: { get() { return this.x; }, set(val: number) { this.x = val; }, enumerable: true },
    1: { get() { return this.y; }, set(val: number) { this.y = val; }, enumerable: true },
    2: { get() { return this.z; }, set(val: number) { this.z = val; }, enumerable: true },
  });

  return vec as unknown as CompanionTargetVector;
}

export function stepCompanionTransform(
  currentCompanionPos: [number, number, number] | THREE.Vector3 | null,
  parentWorldPos: [number, number, number] | THREE.Vector3,
  parentYawRad: number,
  config: CompanionFollowConfig,
  deltaSec: number,
  forceImmediateSnap: boolean = false,
  polePositions?: Array<[number, number]>
): { position: [number, number, number]; yaw: number; didSnap: boolean } {
  const desired = calculateCompanionTarget(
    parentWorldPos,
    parentYawRad,
    config.localOffset,
    polePositions
  );

  const curPos: [number, number, number] | null = currentCompanionPos
    ? Array.isArray(currentCompanionPos)
      ? currentCompanionPos
      : [currentCompanionPos.x, currentCompanionPos.y, currentCompanionPos.z]
    : null;

  // 1. Scene remount, uninitialized state, or explicit relocation -> snap immediately
  if (!curPos || forceImmediateSnap) {
    return { position: [desired[0], desired[1], desired[2]], yaw: parentYawRad, didSnap: true };
  }

  const dx = desired[0] - curPos[0];
  const dz = desired[2] - curPos[2];
  const errorDist = Math.hypot(dx, dz);

  // 2. Discontinuity / large separation -> snap immediately beside parent (never chase across park)
  if (errorDist >= config.snapDiscontinuityThresholdM) {
    return { position: [desired[0], desired[1], desired[2]], yaw: parentYawRad, didSnap: true };
  }

  // 3. Frame-rate independent exponential smoothing: alpha = 1 - exp(-lambda * dt)
  const clampedDt = Math.min(Math.max(deltaSec, 0.001), 0.1);
  const alpha = 1 - Math.exp(-config.followLambda * clampedDt);

  let nextX = curPos[0] + dx * alpha;
  let nextZ = curPos[2] + dz * alpha;

  // 4. Hard bounded separation enforcement: never exceed maxPermissibleErrorM from desired target
  const remDx = nextX - desired[0];
  const remDz = nextZ - desired[2];
  const remDist = Math.hypot(remDx, remDz);
  if (remDist > config.maxPermissibleErrorM && remDist > 1e-5) {
    const scale = config.maxPermissibleErrorM / remDist;
    nextX = desired[0] + remDx * scale;
    nextZ = desired[2] + remDz * scale;
  }

  return {
    position: [nextX, desired[1], nextZ],
    yaw: parentYawRad,
    didSnap: false,
  };
}

/**
 * ChildCompanion — Low-poly anonymous child figure (0.95m tall)
 * Walks in tandem beside Parent (Persona 3).
 * Supports playful gait and child crying procedural animation.
 */
export function ChildCompanion({
  parentGroupRef,
  initialParentPos,
  initialParentYaw,
  currentAction,
  isCollapsed,
  paused,
}: {
  parentGroupRef: React.RefObject<THREE.Group | null>;
  initialParentPos?: [number, number, number];
  initialParentYaw?: number;
  currentAction: PersonaActionType;
  isCollapsed: boolean;
  paused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const childTorsoRef = useRef<THREE.Group>(null);

  const gaitPhaseRef = useRef(0);
  const cryingPhaseRef = useRef(0);

  // Compute initial target position to snap immediately upon mounting (eliminates 1-frame flash)
  const initialTarget = useMemo(() => {
    const parentPos = initialParentPos
      ? new THREE.Vector3(...initialParentPos)
      : parentGroupRef.current?.position.clone() ?? new THREE.Vector3(0, 0.86, 0);
    const yaw = initialParentYaw ?? parentGroupRef.current?.rotation.y ?? 0;
    const tgt = calculateCompanionTarget(parentPos, yaw, [0.55, 0, 0.15]);
    tgt.y = isCollapsed ? 0.15 : parentPos.y * 0.55;
    return tgt;
  }, []);

  const initializedRef = useRef(false);

  // Synchronously ensure transform is placed at target before the first WebGL frame
  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(initialTarget);
      if (initialParentYaw !== undefined) {
        groupRef.current.rotation.y = initialParentYaw;
      }
    }
  }, [initialTarget, initialParentYaw]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const parentGroup = parentGroupRef.current;
    const parentPos = parentGroup?.position ?? (initialParentPos ? new THREE.Vector3(...initialParentPos) : null);
    const parentRotY = parentGroup?.rotation.y ?? initialParentYaw ?? 0;

    if (!parentPos) return;

    const currentPos: [number, number, number] = [
      groupRef.current.position.x,
      groupRef.current.position.y,
      groupRef.current.position.z,
    ];

    const step = stepCompanionTransform(
      initializedRef.current ? currentPos : null,
      parentPos,
      parentRotY,
      COMPANION_CONFIGS.child,
      delta,
      !initializedRef.current,
      POLE_POSITIONS
    );

    groupRef.current.position.x = step.position[0];
    const targetY = isCollapsed ? 0.15 : parentPos.y * 0.55;
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 6.0, delta);
    groupRef.current.position.z = step.position[2];
    groupRef.current.rotation.y = step.yaw;
    initializedRef.current = true;

    if (paused) return;

    if (currentAction === 'child_crying') {
      // Crying posture: arms rubbed against face, sobbing rhythmic bobbing
      cryingPhaseRef.current += delta * 15.0;
      const bob = Math.sin(cryingPhaseRef.current) * 0.08;

      if (childTorsoRef.current) {
        childTorsoRef.current.rotation.x = 0.25 + bob * 0.5;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -1.6;
        leftArmRef.current.rotation.z = 0.4 + bob;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -1.6;
        rightArmRef.current.rotation.z = -0.4 - bob;
      }
    } else if (!isCollapsed && currentAction === 'walk') {
      // Natural child cadence (slightly faster frequency than adult)
      gaitPhaseRef.current += delta * 9.5;
      const swing = Math.sin(gaitPhaseRef.current) * 0.45;

      if (childTorsoRef.current) childTorsoRef.current.rotation.x = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -swing * 0.8;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = swing * 0.8;
        rightArmRef.current.rotation.z = 0;
      }
    } else {
      // Neutral rest stance
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[initialTarget.x, initialTarget.y, initialTarget.z]}
      rotation={[0, initialParentYaw ?? 0, 0]}
    >
      <group ref={childTorsoRef}>
        {/* Head (0.12m sphere at Y=0.36m) */}
        <mesh position={[0, 0.36, 0]} material={companionMaterial}>
          <sphereGeometry args={[0.11, 10, 8]} />
        </mesh>

        {/* Torso (0.10m radius, 0.28m height centered at Y=0.14m) */}
        <mesh position={[0, 0.14, 0]} material={companionMaterial}>
          <cylinderGeometry args={[0.10, 0.09, 0.28, 8]} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[0.13, 0.24, 0]}>
          <mesh position={[0, -0.10, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.03, 0.025, 0.20, 6]} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[-0.13, 0.24, 0]}>
          <mesh position={[0, -0.10, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.03, 0.025, 0.20, 6]} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group ref={leftLegRef} position={[0.06, -0.02, 0]}>
          <mesh position={[0, -0.12, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.04, 0.032, 0.24, 6]} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef} position={[-0.06, -0.02, 0]}>
          <mesh position={[0, -0.12, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.04, 0.032, 0.24, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * CanineCompanion — Low-poly anonymous pet canine (0.45m tall) with leash
 * Trots alongside Dog Walker (Persona 4) with dynamic leash line.
 */
export function CanineCompanion({
  walkerGroupRef,
  initialParentPos,
  initialParentYaw,
  currentAction,
  isCollapsed,
  paused,
}: {
  walkerGroupRef: React.RefObject<THREE.Group | null>;
  initialParentPos?: [number, number, number];
  initialParentYaw?: number;
  currentAction: PersonaActionType;
  isCollapsed: boolean;
  paused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const frontLeftLegRef = useRef<THREE.Group>(null);
  const frontRightLegRef = useRef<THREE.Group>(null);
  const backLeftLegRef = useRef<THREE.Group>(null);
  const backRightLegRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);

  const trotPhaseRef = useRef(0);
  const lineGeoRef = useRef<THREE.BufferGeometry>(null);

  // Compute initial target position to snap immediately upon mounting (eliminates 1-frame flash)
  const initialTarget = useMemo(() => {
    const walkerPos = initialParentPos
      ? new THREE.Vector3(...initialParentPos)
      : walkerGroupRef.current?.position.clone() ?? new THREE.Vector3(0, 0.86, 0);
    const yaw = initialParentYaw ?? walkerGroupRef.current?.rotation.y ?? 0;
    const tgt = calculateCompanionTarget(walkerPos, yaw, [0.85, 0, 0.40]);
    tgt.y = 0.22;
    return tgt;
  }, []);

  const initializedRef = useRef(false);

  // Synchronously ensure transform & leash are placed at target before the first WebGL frame
  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(initialTarget);
      if (initialParentYaw !== undefined) {
        groupRef.current.rotation.y = initialParentYaw;
      }
    }
    if (lineGeoRef.current && initialParentPos) {
      const walkerPos = new THREE.Vector3(...initialParentPos);
      const walkerRot = new THREE.Euler(0, initialParentYaw ?? 0, 0);
      const walkerHandWorld = new THREE.Vector3(0.24, 0.45, 0.1)
        .applyEuler(walkerRot)
        .add(walkerPos);

      const collarWorld = new THREE.Vector3(0, 0.28, 0.22)
        .applyEuler(new THREE.Euler(0, initialParentYaw ?? 0, 0))
        .add(initialTarget);

      const points = new Float32Array([
        walkerHandWorld.x,
        walkerHandWorld.y,
        walkerHandWorld.z,
        collarWorld.x,
        collarWorld.y,
        collarWorld.z,
      ]);
      lineGeoRef.current.setAttribute('position', new THREE.BufferAttribute(points, 3));
    }
  }, [initialTarget, initialParentPos, initialParentYaw]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const walkerGroup = walkerGroupRef.current;
    const walkerPos = walkerGroup?.position ?? (initialParentPos ? new THREE.Vector3(...initialParentPos) : null);
    const walkerRotY = walkerGroup?.rotation.y ?? initialParentYaw ?? 0;

    if (!walkerPos) return;

    const currentPos: [number, number, number] = [
      groupRef.current.position.x,
      groupRef.current.position.y,
      groupRef.current.position.z,
    ];

    const step = stepCompanionTransform(
      initializedRef.current ? currentPos : null,
      walkerPos,
      walkerRotY,
      COMPANION_CONFIGS.dog,
      delta,
      !initializedRef.current,
      POLE_POSITIONS
    );

    groupRef.current.position.x = step.position[0];
    groupRef.current.position.y = 0.22;
    groupRef.current.position.z = step.position[2];
    groupRef.current.rotation.y = step.yaw;
    initializedRef.current = true;

    // Update dynamic leash line between walker's hand and canine collar
    if (lineGeoRef.current && walkerGroup) {
      const walkerHandWorld = new THREE.Vector3(0.24, 0.45, 0.1)
        .applyEuler(walkerGroup.rotation)
        .add(walkerGroup.position);

      const collarWorld = new THREE.Vector3(0, 0.28, 0.22)
        .applyEuler(groupRef.current.rotation)
        .add(groupRef.current.position);

      const points = new Float32Array([
        walkerHandWorld.x,
        walkerHandWorld.y,
        walkerHandWorld.z,
        collarWorld.x,
        collarWorld.y,
        collarWorld.z,
      ]);
      lineGeoRef.current.setAttribute('position', new THREE.BufferAttribute(points, 3));
    }

    if (paused) return;

    if (!isCollapsed && currentAction === 'walk') {
      // 4-legged diagonal trot gait
      trotPhaseRef.current += delta * 12.0;
      const swing = Math.sin(trotPhaseRef.current) * 0.42;

      if (frontLeftLegRef.current) frontLeftLegRef.current.rotation.x = swing;
      if (frontRightLegRef.current) frontRightLegRef.current.rotation.x = -swing;
      if (backLeftLegRef.current) backLeftLegRef.current.rotation.x = -swing;
      if (backRightLegRef.current) backRightLegRef.current.rotation.x = swing;

      if (tailRef.current) {
        tailRef.current.rotation.y = Math.sin(trotPhaseRef.current * 1.5) * 0.35;
      }
    } else {
      // Stationary rest
      if (frontLeftLegRef.current) frontLeftLegRef.current.rotation.x = 0;
      if (frontRightLegRef.current) frontRightLegRef.current.rotation.x = 0;
      if (backLeftLegRef.current) backLeftLegRef.current.rotation.x = 0;
      if (backRightLegRef.current) backRightLegRef.current.rotation.x = 0;
      if (tailRef.current) tailRef.current.rotation.y = 0.1;
    }
  });

  return (
    <>
      {/* Procedural Leash Line rendered in world coordinates */}
      <line>
        <bufferGeometry ref={lineGeoRef} />
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.65} />
      </line>

      {/* Canine 3D Primitive Model */}
      <group
        ref={groupRef}
        position={[initialTarget.x, initialTarget.y, initialTarget.z]}
        rotation={[0, initialParentYaw ?? 0, 0]}
      >
        {/* Horizontal Torso (Cylinder rotated 90 deg) */}
        <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={companionMaterial} castShadow>
          <cylinderGeometry args={[0.09, 0.10, 0.38, 8]} />
        </mesh>

        {/* Head & Snout (Sphere + small box) */}
        <group position={[0, 0.28, 0.22]}>
          <mesh material={companionMaterial}>
            <sphereGeometry args={[0.08, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.02, 0.08]} material={companionMaterial}>
            <boxGeometry args={[0.06, 0.05, 0.08]} />
          </mesh>
          {/* Ears */}
          <mesh position={[0.05, 0.08, -0.02]} material={companionMaterial}>
            <coneGeometry args={[0.025, 0.06, 4]} />
          </mesh>
          <mesh position={[-0.05, 0.08, -0.02]} material={companionMaterial}>
            <coneGeometry args={[0.025, 0.06, 4]} />
          </mesh>
        </group>

        {/* Front Left Leg */}
        <group ref={frontLeftLegRef} position={[0.07, 0.10, 0.12]}>
          <mesh position={[0, -0.10, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.022, 0.018, 0.20, 6]} />
          </mesh>
        </group>

        {/* Front Right Leg */}
        <group ref={frontRightLegRef} position={[-0.07, 0.10, 0.12]}>
          <mesh position={[0, -0.10, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.022, 0.018, 0.20, 6]} />
          </mesh>
        </group>

        {/* Back Left Leg */}
        <group ref={backLeftLegRef} position={[0.07, 0.10, -0.12]}>
          <mesh position={[0, -0.10, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.025, 0.020, 0.20, 6]} />
          </mesh>
        </group>

        {/* Back Right Leg */}
        <group ref={backRightLegRef} position={[-0.07, 0.10, -0.12]}>
          <mesh position={[0, -0.10, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.025, 0.020, 0.20, 6]} />
          </mesh>
        </group>

        {/* Tail */}
        <group ref={tailRef} position={[0, 0.20, -0.18]}>
          <mesh position={[0, 0.06, -0.06]} rotation={[0.4, 0, 0]} material={companionMaterial}>
            <cylinderGeometry args={[0.018, 0.012, 0.14, 6]} />
          </mesh>
        </group>
      </group>
    </>
  );
}
