import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { PoleData } from '../../types';

interface PoleProps {
  data: PoleData;
  selected: boolean;
  onSelect: (id: string) => void;
  isAlert: boolean;
  isOffline: boolean;
  hasAcousticRipple?: boolean;
  lightBrightness: number;
  showCoverage: boolean;
}

function AcousticRipples({ color = '#f97316' }: { color?: string }) {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ring1.current) {
      const s1 = 1 + ((t * 2.2) % 5);
      ring1.current.scale.set(s1, s1, 1);
      const mat = ring1.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - s1 / 5);
    }
    if (ring2.current) {
      const s2 = 1 + (((t * 2.2) + 2.5) % 5);
      ring2.current.scale.set(s2, s2, 1);
      const mat = ring2.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - s2 / 5);
    }
  });

  return (
    <group position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ring1}>
        <ringGeometry args={[0.8, 1.05, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2}>
        <ringGeometry args={[0.8, 1.05, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function Pole({
  data,
  selected,
  onSelect,
  isAlert,
  isOffline,
  hasAcousticRipple = false,
  lightBrightness,
  showCoverage,
}: PoleProps) {
  const [x, z] = data.position;

  const isEmergencyBoosted = !isOffline && lightBrightness >= 95 && (isAlert || hasAcousticRipple);
  const poleColor = isOffline ? '#2e3b4e' : isAlert ? '#c85040' : hasAcousticRipple ? '#d97706' : '#b8cdd6';
  const lampColor = isOffline || lightBrightness === 0 ? '#303c4a' : isEmergencyBoosted ? '#fffbeb' : '#f1cf8d';
  const lampEmissive = isOffline || lightBrightness === 0 ? '#000000' : isEmergencyBoosted ? '#fde047' : '#f4ba6b';
  const lampEI = isOffline ? 0 : isEmergencyBoosted ? 1.15 : (lightBrightness / 100) * 0.55;

  let tagClass = 'pole-tag';
  if (selected) tagClass += ' selected';
  if (isAlert) tagClass += ' alert';
  if (isOffline) tagClass += ' offline';
  if (hasAcousticRipple) tagClass += ' alert';

  const coverageColor = isOffline ? '#ef4444' : hasAcousticRipple ? '#f59e0b' : '#55bac9';

  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 2, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(data.id);
        }}
      >
        <cylinderGeometry args={[0.15, 0.21, 4, 10]} />
        <meshStandardMaterial color={poleColor} />
      </mesh>

      <mesh
        position={[0, 4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(data.id);
        }}
      >
        <boxGeometry args={[0.8, 0.3, 0.7]} />
        <meshStandardMaterial color={lampColor} emissive={lampEmissive} emissiveIntensity={lampEI} />
      </mesh>

      <mesh position={[0, 3.55, 0.22]}>
        <boxGeometry args={[0.48, 0.3, 0.22]} />
        <meshStandardMaterial color="#112233" />
      </mesh>

      {lightBrightness > 0 && !isOffline && (
        <pointLight
          position={[0, 3.7, 0]}
          intensity={isEmergencyBoosted ? 9.5 : (lightBrightness / 100) * 5}
          distance={isEmergencyBoosted ? 14 : 9}
          decay={2}
          color={isEmergencyBoosted ? '#fef08a' : '#ffd59b'}
        />
      )}

      {lightBrightness > 0 && !isOffline && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[isEmergencyBoosted ? 5.2 : 3.4, 36]} />
          <meshBasicMaterial
            color={isEmergencyBoosted ? '#fde047' : '#fcd34d'}
            transparent
            opacity={isEmergencyBoosted ? 0.22 : (lightBrightness / 100) * 0.09}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {hasAcousticRipple && <AcousticRipples color="#ea580c" />}

      {showCoverage && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7, 48]} />
          <meshBasicMaterial
            color={coverageColor}
            transparent
            opacity={0.09}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <Html position={[0, 4.9, 0]} center distanceFactor={25}>
        <button className={tagClass} onClick={() => onSelect(data.id)}>
          {data.id}
          {isOffline ? ' · Offline ⚠' : ''}
          {hasAcousticRipple ? ' · 🔊' : ''}
          {isEmergencyBoosted ? ' · 💡100%' : ''}
        </button>
      </Html>
    </group>
  );
}
