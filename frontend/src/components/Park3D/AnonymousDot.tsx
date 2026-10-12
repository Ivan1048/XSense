// Anonymous moving dot — represents a simulated anonymous detection.
// No identity, face, name or permanent tracking ID is displayed.
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
  highlight:  boolean;  // visually mark this dot (possible incident)
  stationary: boolean;  // dot stops moving (fall simulation)
}

export default function AnonymousDot({
  path,
  paused,
  highlight,
  stationary,
}: AnonymousDotProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || paused || stationary) return;
    const t = (clock.getElapsedTime() * path.speed + path.offset) % (Math.PI * 2);
    ref.current.position.x = path.x + Math.cos(t) * path.radius;
    ref.current.position.z = path.z + Math.sin(t) * path.radius * 0.65;
  });

  const color    = highlight ? '#ffb759' : '#5ee6da';
  const emissive = highlight ? '#c07020' : '#0b6870';
  const size     = highlight ? 0.44 : 0.32;

  return (
    <mesh ref={ref} position={[path.x, 0.35, path.z]}>
      <sphereGeometry args={[size, 16, 12]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.38} />
    </mesh>
  );
}
