import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface GuardMarkerProps {
  guardName: string;
  targetPos: [number, number]; // [x, z] coordinates of the pole
  status: 'traveling' | 'arrived' | 'returning';
  onFinishedReturn?: () => void;
}

const BASE_POS: [number, number] = [0, -18]; // Security Station at North Entrance

export default function GuardMarker({
  guardName,
  targetPos,
  status,
  onFinishedReturn,
}: GuardMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<number>(status === 'arrived' ? 1 : 0);

  // Offset destination slightly so the guard doesn't directly clip inside the pole or fallen dot
  const destX = targetPos[0] + 1.3;
  const destZ = targetPos[1] + 0.9;

  useFrame((state, delta) => {
    // Transit speed: traverses the park pathway over ~4.5 seconds
    const speed = 0.22;

    if (status === 'traveling') {
      progressRef.current = Math.min(1, progressRef.current + delta * speed);
    } else if (status === 'arrived') {
      progressRef.current = 1;
    } else if (status === 'returning') {
      progressRef.current = Math.max(0, progressRef.current - delta * speed);
      if (progressRef.current <= 0 && onFinishedReturn) {
        onFinishedReturn();
      }
    }

    const t = progressRef.current;
    // Smooth cosine ease along path
    const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);

    const currentX = BASE_POS[0] + (destX - BASE_POS[0]) * easeT;
    const currentZ = BASE_POS[1] + (destZ - BASE_POS[1]) * easeT;

    if (groupRef.current) {
      groupRef.current.position.set(currentX, 0.38, currentZ);
    }

    // Gentle pulse animation for the security telemetry halo
    if (ringRef.current) {
      const pulse = 1 + 0.15 * Math.sin(state.clock.getElapsedTime() * 3.5);
      ringRef.current.scale.set(pulse, pulse, 1);
    }
  });

  const statusLabel =
    status === 'arrived'
      ? 'On Scene'
      : status === 'returning'
      ? 'Returning to Post'
      : 'En Route';

  return (
    <group ref={groupRef} position={[BASE_POS[0], 0.38, BASE_POS[1]]}>
      {/* Anonymous LiDAR detection cluster (physical dot detected by LiDAR sensor) */}
      <mesh castShadow>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.3}
          metalness={0.1}
          emissive="#0284c7"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Blue security dispatch telemetry ring on the ground */}
      <mesh
        ref={ringRef}
        position={[0, -0.32, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.55, 0.72, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Professional HTML Dispatch Nameplate (no emojis) */}
      <Html position={[0, 0.95, 0]} center distanceFactor={26}>
        <div className="guard-marker-tag">
          <span className="guard-marker-badge">SECURITY</span>
          <span className="guard-marker-name">{guardName}</span>
          <span className="guard-marker-status">· {statusLabel}</span>
        </div>
      </Html>
    </group>
  );
}
