// Individual sensor pole — shaft, lamp head, sensor box, point light, coverage ring, HTML label.
// Visual state reflects virtual settings only — not real sensor readings.
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { PoleData } from '../../types';

interface PoleProps {
  data:           PoleData;
  selected:       boolean;
  onSelect:       (id: string) => void;
  isAlert:        boolean;   // fall / urgent event at this pole
  isOffline:      boolean;   // sensor offline simulation
  lightBrightness: number;  // 0-100 virtual lamp setting
  showCoverage:   boolean;
}

export default function Pole({
  data,
  selected,
  onSelect,
  isAlert,
  isOffline,
  lightBrightness,
  showCoverage,
}: PoleProps) {
  const [x, z] = data.position;

  const poleColor   = isOffline ? '#2e3b4e' : isAlert ? '#c85040' : '#b8cdd6';
  const lampColor   = isOffline || lightBrightness === 0 ? '#303c4a' : '#f1cf8d';
  const lampEmissive = isOffline || lightBrightness === 0 ? '#000000' : '#f4ba6b';
  const lampEI       = isOffline ? 0 : (lightBrightness / 100) * 0.55;

  let tagClass = 'pole-tag';
  if (selected)  tagClass += ' selected';
  if (isAlert)   tagClass += ' alert';
  if (isOffline) tagClass += ' offline';

  const coverageColor = isOffline ? '#a78bfa' : '#55bac9';

  return (
    <group position={[x, 0, z]}>
      {/* Pole shaft */}
      <mesh
        position={[0, 2, 0]}
        castShadow
        onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
      >
        <cylinderGeometry args={[0.15, 0.21, 4, 10]} />
        <meshStandardMaterial color={poleColor} />
      </mesh>

      {/* Lamp head */}
      <mesh
        position={[0, 4, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
      >
        <boxGeometry args={[0.8, 0.3, 0.7]} />
        <meshStandardMaterial color={lampColor} emissive={lampEmissive} emissiveIntensity={lampEI} />
      </mesh>

      {/* Sensor box */}
      <mesh position={[0, 3.55, 0.22]}>
        <boxGeometry args={[0.48, 0.3, 0.22]} />
        <meshStandardMaterial color="#112233" />
      </mesh>

      {/* Point light — only when lamp is on */}
      {lightBrightness > 0 && !isOffline && (
        <pointLight
          position={[0, 3.7, 0]}
          intensity={(lightBrightness / 100) * 5}
          distance={9}
          decay={2}
          color="#ffd59b"
        />
      )}

      {/* Sensor coverage ring — labelled illustrative */}
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

      {/* HTML pole label */}
      <Html position={[0, 4.9, 0]} center distanceFactor={25}>
        <button className={tagClass} onClick={() => onSelect(data.id)}>
          {data.id}{isOffline ? ' ⚠' : ''}
        </button>
      </Html>
    </group>
  );
}
