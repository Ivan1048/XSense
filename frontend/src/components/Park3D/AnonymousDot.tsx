// Anonymous moving dot — represents an anonymous geometric detection from simulated LiDAR.
// Critical Privacy Rule: LiDAR cannot identify individuals or distinguish guards from residents.
// No personal identities, names, faces, or permanent tracking IDs are assigned.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DotPath {
  x:      number;
  z:      number;
  radius: number;
  speed:  number;
  offset: number;
}

interface AnonymousDotProps {
  path:       DotPath;
  paused:     boolean;  // Pause Motion toggle
  highlight:  boolean;  // Visually mark dot during possible emergency (e.g. stationary fall)
  stationary: boolean;  // Dot stops moving (fall simulation)
  onSelect?:  () => void;
}

export default function AnonymousDot({
  path,
  paused,
  highlight,
  stationary,
  onSelect,
}: AnonymousDotProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || paused || stationary) return;
    const t = (clock.getElapsedTime() * path.speed + path.offset) % (Math.PI * 2);
    ref.current.position.x = path.x + Math.cos(t) * path.radius;
    ref.current.position.z = path.z + Math.sin(t) * path.radius * 0.65;
  });

  // Color semantics:
  // Cyan (#5ee6da) = Person Detected (LiDAR)
  // Orange (#ffb759) = Possible Emergency (stationary/fall anomaly)
  const color    = highlight ? '#ffb759' : '#5ee6da';
  const emissive = highlight ? '#ea580c' : '#0e7490';
  const size     = highlight ? 0.44 : 0.34;

  return (
    <mesh
      ref={ref}
      position={[path.x, 0.35, path.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <sphereGeometry args={[size, 18, 14]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.42}
        roughness={0.25}
      />
    </mesh>
  );
}
