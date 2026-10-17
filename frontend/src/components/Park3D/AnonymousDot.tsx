import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';

export interface DotPath {
  x: number;
  z: number;
  radius: number;
  speed: number;
  offset: number;
  waypoints?: [number, number][];
}

interface AnonymousDotProps {
  path: DotPath;
  paused: boolean;
  highlight: boolean;
  stationary: boolean;
  isLookalikeStop?: boolean;
  isCollapsed?: boolean;
  isSOS?: boolean;
  sosTargetPos?: [number, number] | null;
  onSelect?: () => void;
}

export default function AnonymousDot({
  path,
  paused,
  highlight,
  stationary,
  isLookalikeStop = false,
  isCollapsed = false,
  isSOS = false,
  sosTargetPos = null,
  onSelect,
}: AnonymousDotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sosRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const isEmergency = highlight || isCollapsed || isSOS;
  const showPostureBox = hovered || isLookalikeStop || isCollapsed || isSOS;

  const currentY = useRef(0.86);

  // Smooth CatmullRom spline following the curved pathway waypoints
  const curve = useMemo(() => {
    if (!path.waypoints || path.waypoints.length < 3) return null;
    const pts = path.waypoints.map(([wx, wz]) => new THREE.Vector3(wx, 0.86, wz));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.25);
  }, [path.waypoints]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    const curX = groupRef.current.position.x;
    const curZ = groupRef.current.position.z;
    // Footbridge deck elevation curve when crossing bridge at x: 1.3..5.9, z: -4.8
    const isOnBridge = curX >= 1.3 && curX <= 5.9 && Math.abs(curZ - (-4.8)) < 1.3;
    const bridgeElev = isOnBridge ? Math.sin(((curX - 1.3) / 4.6) * Math.PI) * 0.24 : 0;
    const targetY = isCollapsed ? 0.20 : 0.86 + bridgeElev;

    currentY.current = THREE.MathUtils.damp(currentY.current, targetY, 6.0, delta);
    groupRef.current.position.y = currentY.current;

    if (isSOS && sosRingRef.current) {
      const pulse = 1 + ((clock.getElapsedTime() * 2.4) % 2.2);
      sosRingRef.current.scale.set(pulse, pulse, 1);
      const mat = sosRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.75 - (pulse - 1) / 2.2);
    }

    // If this dot is representing an active Resident SOS caller, position it right beside the SOS pole
    if (isSOS && sosTargetPos) {
      groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x,
        sosTargetPos[0] + 1.5,
        4.5,
        delta,
      );
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        sosTargetPos[1] + 1.2,
        4.5,
        delta,
      );
      return;
    }

    // Standing stop or fall test at West Loop (AS-104)
    if (isLookalikeStop || isCollapsed || stationary) {
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, -10.2, 4.0, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, 9.2, 4.0, delta);
      return;
    }

    if (paused) return;

    if (curve) {
      // Smooth movement along the curved walkway spline
      const loopTime = (clock.getElapsedTime() * path.speed * 0.08 + path.offset) % 1;
      const t = loopTime < 0 ? loopTime + 1 : loopTime;
      const pt = curve.getPointAt(t);
      groupRef.current.position.x = pt.x;
      groupRef.current.position.z = pt.z;
    } else {
      const t = (clock.getElapsedTime() * path.speed + path.offset) % (Math.PI * 2);
      groupRef.current.position.x = path.x + Math.cos(t) * path.radius;
      groupRef.current.position.z = path.z + Math.sin(t) * path.radius * 0.65;
    }
  });

  const color = isSOS ? '#ef4444' : isEmergency ? '#ffb759' : '#5ee6da';
  const emissive = isSOS ? '#dc2626' : isEmergency ? '#ea580c' : '#0e7490';
  const wireColor = isSOS ? '#ef4444' : isEmergency ? '#f59e0b' : '#38bdf8';
  const sphereSize = isEmergency ? 0.38 : 0.32;

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
          emissiveIntensity={isEmergency ? 0.8 : 0.4}
          roughness={0.25}
        />
      </mesh>

      {showPostureBox && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={boxDim} />
          <meshBasicMaterial transparent opacity={0.12} color={wireColor} />
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

      {isSOS && (
        <mesh ref={sosRingRef} position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 1.1, 32]} />
          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {showPostureBox && (
        <Html
          position={isCollapsed ? [0, -0.35, 1.35] : [0, htmlYOffset, 0]}
          center

        >
          <div
            style={{
              padding: '4px 9px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              background: isSOS
                ? 'rgba(185, 28, 28, 0.95)'
                : isCollapsed
                ? 'rgba(180, 83, 9, 0.94)'
                : isLookalikeStop
                ? 'rgba(15, 23, 42, 0.92)'
                : 'rgba(14, 116, 144, 0.90)',
              color: '#ffffff',
              border: `1px solid ${wireColor}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {isSOS
              ? '🆘 Resident SOS · Help Requested Here'
              : isCollapsed
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
