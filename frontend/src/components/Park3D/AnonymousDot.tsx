import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';

interface DotPath {
  x: number;
  z: number;
  radius: number;
  speed: number;
  offset: number;
}

interface AnonymousDotProps {
  path: DotPath;
  paused: boolean;
  highlight: boolean;
  stationary: boolean;
  isLookalikeStop?: boolean;
  isCollapsed?: boolean;
  onSelect?: () => void;
}

export default function AnonymousDot({
  path,
  paused,
  highlight,
  stationary,
  isLookalikeStop = false,
  isCollapsed = false,
  onSelect,
}: AnonymousDotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isEmergency = highlight || isCollapsed;
  const showPostureBox = hovered || isLookalikeStop || isCollapsed;

  // Standing centroid y = 0.86m (box height 1.72m); Collapsed fall centroid y = 0.20m (box height 0.34m)
  const targetY = isCollapsed ? 0.20 : 0.86;
  const currentY = useRef(0.86);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    currentY.current = THREE.MathUtils.damp(currentY.current, targetY, 5.0, delta);
    groupRef.current.position.y = currentY.current;

    // When demonstrating Standing Stop or Fall at West Loop (AS-104 is at [-12, 10]),
    // smoothly position the test dot on the pathway right beside AS-104 so it is clearly visible.
    if (isLookalikeStop || isCollapsed || stationary) {
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, -10.2, 4.0, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, 9.2, 4.0, delta);
      return;
    }

    if (paused) return;

    const t = (clock.getElapsedTime() * path.speed + path.offset) % (Math.PI * 2);
    groupRef.current.position.x = path.x + Math.cos(t) * path.radius;
    groupRef.current.position.z = path.z + Math.sin(t) * path.radius * 0.65;
  });

  const color = isEmergency ? '#ffb759' : '#5ee6da';
  const emissive = isEmergency ? '#ea580c' : '#0e7490';
  const wireColor = isEmergency ? '#f59e0b' : '#38bdf8';
  const sphereSize = isEmergency ? 0.36 : 0.32;

  const boxDim: [number, number, number] = isCollapsed
    ? [1.65, 0.34, 0.60]
    : [0.55, 1.72, 0.55];

  const htmlYOffset = boxDim[1] / 2 + 0.45;

  return (
    <group
      ref={groupRef}
      position={[path.x, 0.86, path.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh>
        <sphereGeometry args={[sphereSize, 18, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isEmergency ? 0.7 : 0.4}
          roughness={0.25}
        />
      </mesh>

      {showPostureBox && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={boxDim} />
          <meshBasicMaterial transparent opacity={0.10} color={wireColor} />
          <Edges threshold={15} color={wireColor} lineWidth={2} />
        </mesh>
      )}

      {isCollapsed && (
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1.35, 32]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {showPostureBox && (
        <Html
          position={isCollapsed ? [0, -0.35, 1.35] : [0, htmlYOffset, 0]}
          center
          distanceFactor={24}
        >
          <div
            style={{
              padding: '4px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              background: isCollapsed
                ? 'rgba(180, 83, 9, 0.94)'
                : isLookalikeStop
                ? 'rgba(15, 23, 42, 0.92)'
                : 'rgba(14, 116, 144, 0.90)',
              color: '#ffffff',
              border: `1px solid ${wireColor}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {isCollapsed
              ? 'Unusual Movement · Height Collapsed (1.72m → 0.34m)'
              : isLookalikeStop
              ? 'Standing Upright (1.72m) · Stopped Dot = No Alert'
              : 'Anonymous Person (1.72m Upright)'}
          </div>
        </Html>
      )}
    </group>
  );
}
