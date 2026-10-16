// Static low-poly park geometry — terrain, paths, lake, trees, benches, sign.
// This is a 3D visual only; it does not represent real sensor coverage or safety.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface BoxProps {
  position: [number, number, number];
  scale:    [number, number, number];
  color:    string;
  rotation?: [number, number, number];
}

function Box({ position, scale, color, rotation }: BoxProps) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Tree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 6]} />
        <meshStandardMaterial color="#785c43" />
      </mesh>
      <mesh position={[0, 2.45, 0]} castShadow>
        <coneGeometry args={[1.25, 2.8, 7]} />
        <meshStandardMaterial color="#357959" />
      </mesh>
      <mesh position={[0, 3.3, 0]} castShadow>
        <coneGeometry args={[0.95, 2.2, 7]} />
        <meshStandardMaterial color="#4c9168" />
      </mesh>
    </group>
  );
}

function Bench({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[2, 0.2, 0.7]} />
        <meshStandardMaterial color="#957254" />
      </mesh>
      <mesh position={[-0.75, 0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.6]} />
        <meshStandardMaterial color="#5e5550" />
      </mesh>
      <mesh position={[0.75, 0.3, 0]} castShadow>
        <boxGeometry args={[0.15, 0.6, 0.6]} />
        <meshStandardMaterial color="#5e5550" />
      </mesh>
    </group>
  );
}

function RainParticles() {
  const points = useMemo(() => {
    const coords = [];
    for (let i = 0; i < 220; i++) {
      coords.push(
        (Math.random() - 0.5) * 46,
        Math.random() * 16,
        (Math.random() - 0.5) * 46
      );
    }
    return new Float32Array(coords);
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 18;
        if (positions[i] < 0) {
          positions[i] = 16;
        }
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.14} color="#93c5fd" transparent opacity={0.65} />
    </points>
  );
}

const TREE_POSITIONS: [number, number][] = [
  [-19, -18], [19, -18], [-19, 18], [19, 18],
  [-18, -7],  [18, -7],  [-18, 5],  [18, 5],
  [-7,  18],  [7,  18],  [-9, -17], [9, -17],
  [-6,  13],  [11, -2],  [-15, 15],
];

const BENCH_POSITIONS: [number, number][] = [
  [-8, 2], [-8, 5], [7, 6],
];

interface ParkGeometryProps {
  blockedRouteZone?: string | null;
  isRaining?: boolean;
}

export default function ParkGeometry({ blockedRouteZone, isRaining = false }: ParkGeometryProps) {
  return (
    <group>
      {/* Ground */}
      <Box position={[0, -0.22, 0]} scale={[47, 0.4, 47]} color="#3b6345" />

      {/* Main paths */}
      <Box position={[0, 0.015, 0]} scale={[4.5, 0.06, 42]} color="#bebbb2" />
      <Box position={[0, 0.02, 0]}  scale={[40, 0.05, 4.3]} color="#c8c3b8" />
      <Box
        position={[-10, 0.025, -10]}
        scale={[19, 0.05, 3.2]}
        rotation={[0, Math.PI / 4, 0]}
        color="#c8c3b8"
      />
      <Box
        position={[12, 0.025, 11]}
        scale={[20, 0.05, 3.1]}
        rotation={[0, Math.PI / 4, 0]}
        color="#c8c3b8"
      />

      {/* Lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.025, -12]}>
        <circleGeometry args={[5, 40]} />
        <meshStandardMaterial color="#459caa" transparent opacity={0.85} />
      </mesh>

      {/* Trees */}
      {TREE_POSITIONS.map(([x, z], i) => (
        <Tree key={i} x={x} z={z} s={i % 3 === 0 ? 0.85 : 1} />
      ))}

      {/* Benches */}
      {BENCH_POSITIONS.map(([x, z], i) => (
        <Bench key={i} x={x} z={z} />
      ))}

      {/* Blocked route barrier visual */}
      {blockedRouteZone === 'central_path' && (
        <group position={[0, 0.4, 0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[4.6, 0.28, 0.2]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[-2.1, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
            <meshStandardMaterial color="#78716c" />
          </mesh>
          <mesh position={[2.1, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
            <meshStandardMaterial color="#78716c" />
          </mesh>
          <Text
            position={[0, 0.82, 0]}
            fontSize={0.4}
            color="#ef4444"
            anchorX="center"
          >
            ⛔ ROUTE CLOSED
          </Text>
        </group>
      )}

      {/* Rain animation for benign weather scenario */}
      {isRaining && <RainParticles />}

      {/* Park name label */}
      <Text
        position={[2.5, 0.08, -19.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.15}
        color="#b8d4e8"
        anchorX="center"
      >
        XSENSE PARK
      </Text>
    </group>
  );
}
