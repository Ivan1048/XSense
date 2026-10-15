// Security guard marker — represents a reported location from a separate guard tracking system.
// Completely distinct from anonymous LiDAR detections: uses a floating blue shield icon, not a circular dot.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface GuardMarkerProps {
  guardId?: string;
  guardName: string;
  targetPos: [number, number]; // [x, z] coordinates of the pole
  status: 'traveling' | 'arrived' | 'returning';
  onSelect?: () => void;
  onFinishedReturn?: () => void;
}

const BASE_POS: [number, number] = [0, -18]; // Security Station at North Entrance

export default function GuardMarker({
  guardId,
  guardName,
  targetPos,
  status,
  onSelect,
  onFinishedReturn,
}: GuardMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const diamondRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef<number>(status === 'arrived' ? 1 : 0);

  // Offset destination so the guard stands beside the pole and clear of any fallen person
  const destX = targetPos[0] - 1.8;
  const destZ = targetPos[1] - 1.4;

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
      groupRef.current.position.set(currentX, 0, currentZ);
    }

    // Subtle gentle rotation of the ground locator diamond
    if (diamondRef.current) {
      diamondRef.current.rotation.y = state.clock.getElapsedTime() * 1.2;
    }
  });

  const statusLabel =
    status === 'arrived'
      ? 'On Scene'
      : status === 'returning'
      ? 'Returning to Post'
      : 'En Route';

  return (
    <group ref={groupRef} position={[BASE_POS[0], 0, BASE_POS[1]]}>
      {/* Ground GPS waypoint indicator (tactical diamond, not a round LiDAR sphere) */}
      <mesh
        ref={diamondRef}
        position={[0, 0.08, 0]}
        rotation={[0, Math.PI / 4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        <boxGeometry args={[0.32, 0.06, 0.32]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#38bdf8"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Slender vertical telemetry stem linking ground coordinate to the floating shield */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2.2, 8]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
      </mesh>

      {/* Floating Blue Shield Icon — clearly distinct from LiDAR dots */}
      <Html position={[0, 2.7, 0]} center distanceFactor={26}>
        <button
          className="guard-shield-btn"
          style={{ padding: '3px 8px', gap: '6px' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          title={`${guardName} — Guard Location (Simulated)`}
        >
          <div className="guard-shield-icon-wrap" aria-hidden="true">
            <svg
              width="22"
              height="26"
              viewBox="0 0 24 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 1L3 5V13C3 19.5 7.5 25.5 12 27C16.5 25.5 21 19.5 21 13V5L12 1Z"
                fill="#0284c7"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M12 7V17M7 12H17"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="guard-shield-text">
            <span className="guard-shield-name" style={{ fontSize: '11px', lineHeight: 1.15 }}>
              {guardName}
            </span>
            <span className="guard-shield-badge" style={{ fontSize: '9px' }}>
              GUARD · {statusLabel}
            </span>
          </div>
        </button>
      </Html>
    </group>
  );
}
