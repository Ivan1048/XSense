import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PersonaActionType } from '../../types/persona';

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

/**
 * ChildCompanion — Low-poly anonymous child figure (0.95m tall)
 * Walks in tandem beside Parent (Persona 3).
 * Supports playful gait and child crying procedural animation.
 */
export function ChildCompanion({
  parentGroupRef,
  currentAction,
  isCollapsed,
  paused,
}: {
  parentGroupRef: React.RefObject<THREE.Group | null>;
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

  useFrame((_, delta) => {
    if (!groupRef.current || !parentGroupRef.current) return;

    // Follow parent with natural lateral offset [0.55m to the right, slightly behind]
    const parentPos = parentGroupRef.current.position;
    const parentRotY = parentGroupRef.current.rotation.y;

    // Calculate lateral offset rotated by parent's yaw
    const offsetX = Math.cos(parentRotY) * 0.55 + Math.sin(parentRotY) * 0.15;
    const offsetZ = -Math.sin(parentRotY) * 0.55 + Math.cos(parentRotY) * 0.15;

    groupRef.current.position.x = THREE.MathUtils.damp(
      groupRef.current.position.x,
      parentPos.x + offsetX,
      10.0,
      delta,
    );
    groupRef.current.position.z = THREE.MathUtils.damp(
      groupRef.current.position.z,
      parentPos.z + offsetZ,
      10.0,
      delta,
    );
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      parentRotY,
      10.0,
      delta,
    );

    // Height tracking (0.48m waist height for 0.95m child)
    const targetY = isCollapsed ? 0.15 : parentPos.y * 0.55;
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 6.0, delta);

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
    <group ref={groupRef} position={[0, 0.48, 0]}>
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
  currentAction,
  isCollapsed,
  paused,
}: {
  walkerGroupRef: React.RefObject<THREE.Group | null>;
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

  useFrame((_, delta) => {
    if (!groupRef.current || !walkerGroupRef.current) return;

    const walkerPos = walkerGroupRef.current.position;
    const walkerRotY = walkerGroupRef.current.rotation.y;

    // Canine position: 0.85m to the right, slightly ahead of the dog walker
    const offsetX = Math.cos(walkerRotY) * 0.85 + Math.sin(walkerRotY) * 0.40;
    const offsetZ = -Math.sin(walkerRotY) * 0.85 + Math.cos(walkerRotY) * 0.40;

    groupRef.current.position.x = THREE.MathUtils.damp(
      groupRef.current.position.x,
      walkerPos.x + offsetX,
      8.0,
      delta,
    );
    groupRef.current.position.z = THREE.MathUtils.damp(
      groupRef.current.position.z,
      walkerPos.z + offsetZ,
      8.0,
      delta,
    );
    groupRef.current.position.y = 0.22; // Ground height
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      walkerRotY,
      8.0,
      delta,
    );

    // Update dynamic leash line between walker's hand and canine collar
    if (lineGeoRef.current) {
      const walkerHandWorld = new THREE.Vector3(0.24, 0.45, 0.1)
        .applyEuler(walkerGroupRef.current.rotation)
        .add(walkerGroupRef.current.position);

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
      <group ref={groupRef} position={[0, 0.22, 0]}>
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
