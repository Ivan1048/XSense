// Static low-poly park geometry — terrain, paths, lake, trees, benches, sign.
// This is a 3D visual only; it does not represent real sensor coverage or safety.
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

const TREE_POSITIONS: [number, number][] = [
  [-19, -18], [19, -18], [-19, 18], [19, 18],
  [-18, -7],  [18, -7],  [-18, 5],  [18, 5],
  [-7,  18],  [7,  18],  [-9, -17], [9, -17],
  [-6,  13],  [11, -2],  [-15, 15],
];

const BENCH_POSITIONS: [number, number][] = [
  [-8, 2], [-8, 5], [7, 6],
];

export default function ParkGeometry() {
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

      {/* Park name label */}
      <Text
        position={[-14, 0.06, -20]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.4}
        color="#b8d4e8"
        anchorX="center"
      >
        XSENSE PARK
      </Text>
    </group>
  );
}
