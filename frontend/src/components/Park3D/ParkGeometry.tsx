// Unified low-poly park geometry with mathematically shared coordinates.
// Features:
// 1. One clearly defined lake with a scenic narrow inlet.
// 2. One connected main walking loop encircling the lake.
// 3. Short connecting paths to AS-101, AS-104, and AS-105.
// 4. A footbridge spanning the inlet with walkable deck elevation.
// 5. Narrower, consistent 2.0m path widths and modest junction discs.
// 6. Tree trunks, lamps, and benches placed with strict clearance outside walking surfaces.
// 7. Grass clearly distinguishable from the background in day and night modes.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// Helper to generate a smooth ribbon mesh along a 2D curve [x, z] with upward normals (+Y)
function createCurvedRibbonGeometry(
  points: [number, number][],
  width: number,
  isClosed = false,
  yElevation = 0.06
): THREE.BufferGeometry {
  const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, yElevation, z));
  const curve = new THREE.CatmullRomCurve3(curvePoints, isClosed, 'catmullrom', 0.25);
  const segments = Math.max(24, points.length * 10);
  const sampled = curve.getPoints(segments);

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const halfWidth = width / 2;

  for (let i = 0; i <= segments; i++) {
    const pt = sampled[i];
    let tangent: THREE.Vector3;
    if (i === 0) {
      tangent = sampled[1].clone().sub(sampled[0]).normalize();
    } else if (i === segments) {
      tangent = sampled[segments].clone().sub(sampled[segments - 1]).normalize();
    } else {
      tangent = sampled[i + 1].clone().sub(sampled[i - 1]).normalize();
    }

    // Normal vector perpendicular to tangent in horizontal plane (X-Z)
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Left and right edge vertices at yElevation
    const leftX = pt.x + normal.x * halfWidth;
    const leftZ = pt.z + normal.z * halfWidth;
    const rightX = pt.x - normal.x * halfWidth;
    const rightZ = pt.z - normal.z * halfWidth;

    vertices.push(leftX, yElevation, leftZ);
    vertices.push(rightX, yElevation, rightZ);

    const v = i / segments;
    uvs.push(0, v, 1, v);

    if (i < segments) {
      const base = i * 2;
      // Winding order: base, base + 2, base + 1 -> Normal points strictly UP (+Y)
      indices.push(base, base + 2, base + 1);
      indices.push(base + 1, base + 2, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Low-poly tropical broadleaf Rain Tree
function RainTree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      {/* Trunk */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.36, 2.2, 7]} />
        <meshStandardMaterial color="#543d2b" roughness={0.9} />
      </mesh>
      {/* Canopy tiers */}
      <mesh position={[0, 2.35, 0]} castShadow>
        <dodecahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#2d6344" roughness={0.8} />
      </mesh>
      <mesh position={[0.4, 3.15, 0.25]} castShadow>
        <dodecahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#377351" roughness={0.75} />
      </mesh>
      <mesh position={[-0.3, 3.45, -0.2]} castShadow>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#3f855d" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Low-poly tropical Royal Palm Tree
function PalmTree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      {/* Slender arched trunk */}
      <mesh position={[0.08, 1.5, 0]} rotation={[0, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.13, 0.22, 3.0, 6]} />
        <meshStandardMaterial color="#6f5844" roughness={0.85} />
      </mesh>
      <mesh position={[0.22, 3.4, 0]} rotation={[0, 0, -0.09]} castShadow>
        <cylinderGeometry args={[0.11, 0.13, 1.4, 6]} />
        <meshStandardMaterial color="#614a37" roughness={0.85} />
      </mesh>
      {/* Crown base */}
      <mesh position={[0.28, 4.05, 0]}>
        <sphereGeometry args={[0.25, 6, 6]} />
        <meshStandardMaterial color="#385e33" />
      </mesh>
      {/* Radiating fronds */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <group key={i} position={[0.28, 4.1, 0]} rotation={[0, rad, 0]}>
            <mesh position={[0.85, -0.22, 0]} rotation={[0, 0, -0.42]} castShadow>
              <boxGeometry args={[1.55, 0.04, 0.34]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#345e3b' : '#417349'} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Low-poly tropical flowering shrub
function TropicalShrub({ x, z, s = 1, flowerColor = '#ea580c' }: { x: number; z: number; s?: number; flowerColor?: string }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#295237" roughness={0.85} />
      </mesh>
      <mesh position={[0.2, 0.42, 0.12]} castShadow>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color="#346645" roughness={0.8} />
      </mesh>
      {/* Blossom buds */}
      <mesh position={[0.08, 0.65, 0.08]}>
        <sphereGeometry args={[0.1, 5, 5]} />
        <meshStandardMaterial color={flowerColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Modern low-poly park bench (positioned with clear clearance outside paths)
function ParkBench({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0.06, z]} rotation={[0, rotY, 0]}>
      {/* Wooden Slats */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.6, 0.08, 0.48]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.7} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.82, -0.2]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[1.6, 0.38, 0.08]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.7} />
      </mesh>
      {/* Metal Legs */}
      <mesh position={[-0.65, 0.28, 0]} castShadow>
        <boxGeometry args={[0.08, 0.52, 0.46]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      <mesh position={[0.65, 0.28, 0]} castShadow>
        <boxGeometry args={[0.08, 0.52, 0.46]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Decorative pathway lamp (Non-smart park fixture — positioned outside path edges)
function PathwayLamp({ x, z, nightMode = false }: { x: number; z: number; nightMode?: boolean }) {
  return (
    <group position={[x, 0.06, z]}>
      {/* Lamp post */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Arm fixture */}
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[0.28, 0.07, 0.14]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Warm lamp luminaire head */}
      <mesh position={[0, 2.36, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fde047"
          emissiveIntensity={nightMode ? 1.5 : 0.6}
        />
      </mesh>
      {/* Gentle pathway illumination circle in night mode */}
      {nightMode && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 16]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// Rain particle system for weather scenario
function RainParticles() {
  const points = useMemo(() => {
    const coords = [];
    for (let i = 0; i < 280; i++) {
      coords.push(
        (Math.random() - 0.5) * 48,
        Math.random() * 16,
        (Math.random() - 0.5) * 48
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

interface ParkGeometryProps {
  blockedRouteZone?: string | null;
  isRaining?: boolean;
  nightMode?: boolean;
}

export default function ParkGeometry({ blockedRouteZone, isRaining = false, nightMode = false }: ParkGeometryProps) {
  // ── 1. Park Ground Surface Geometry ─────────────────────────────────────────
  // Polygon defined in (x, z) space. By mapping (x, -z) into THREE.Shape and rotating
  // by -Math.PI / 2, vertices map exactly to (x, 0, z) with upward normal [0, 1, 0]!
  const parkGroundGeometry = useMemo(() => {
    const boundary: [number, number][] = [
      [-17, -19],
      [-8,  -21],
      [ 6,  -21],
      [16,  -18],
      [22,  -14],
      [24,   -3],
      [23,    8],
      [20,   16],
      [14,   21],
      [ 0,   22],
      [-12,  21],
      [-19,  16],
      [-23,   7],
      [-23,  -6],
      [-20, -15],
    ];

    const shape = new THREE.Shape();
    shape.moveTo(boundary[0][0], -boundary[0][1]);
    for (let i = 1; i < boundary.length; i++) {
      shape.lineTo(boundary[i][0], -boundary[i][1]);
    }

    const geom = new THREE.ShapeGeometry(shape, 24);
    geom.rotateX(-Math.PI / 2);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Perimeter skirt giving the park slab tangible 3D thickness
  const parkSkirtGeometry = useMemo(() => {
    const boundary: [number, number][] = [
      [-17, -19], [-8, -21], [6, -21], [16, -18],
      [22, -14], [24, -3], [23, 8], [20, 16],
      [14, 21], [0, 22], [-12, 21], [-19, 16],
      [-23, 7], [-23, -6], [-20, -15], [-17, -19],
    ];

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < boundary.length - 1; i++) {
      const [x1, z1] = boundary[i];
      const [x2, z2] = boundary[i + 1];

      const base = i * 4;
      vertices.push(
        x1, 0.0, z1,
        x2, 0.0, z2,
        x1, -0.45, z1,
        x2, -0.45, z2,
      );
      indices.push(base, base + 2, base + 1);
      indices.push(base + 1, base + 2, base + 3);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // ── 2. Unified Lake & Shoreline Geometry ───────────────────────────────────
  // Centered in north-central area (x: -2.2 to 8.0, z: -12.5 to -2.6).
  // Has a distinct narrow channel under the bridge from x: 2.0 to 5.2 at z = -4.8.
  const lakeShapeGeometry = useMemo(() => {
    const lakeContour: [number, number][] = [
      [-2.2, -9.0],
      [-1.6, -11.5],
      [ 1.0, -12.4],
      [ 4.5, -12.5],
      [ 7.5, -11.5],
      [ 8.0,  -8.5],
      [ 7.0,  -6.5],
      [ 5.2,  -5.5],
      [ 5.0,  -3.2], // South bay past bridge
      [ 3.6,  -2.6], // Southernmost tip
      [ 2.2,  -3.2],
      [ 2.0,  -5.5], // Inlet west bank
      [ 0.0,  -6.8],
      [-1.8,  -7.5],
    ];

    const shape = new THREE.Shape();
    shape.moveTo(lakeContour[0][0], -lakeContour[0][1]);
    for (let i = 1; i < lakeContour.length; i++) {
      shape.lineTo(lakeContour[i][0], -lakeContour[i][1]);
    }

    const geom = new THREE.ShapeGeometry(shape, 32);
    geom.rotateX(-Math.PI / 2);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Sandy pebble shore buffer around the lake
  const lakeShoreGeometry = useMemo(() => {
    const shoreContour: [number, number][] = [
      [-2.8, -9.0],
      [-2.1, -12.0],
      [ 0.9, -13.0],
      [ 4.7, -13.1],
      [ 8.2, -12.0],
      [ 8.8,  -8.5],
      [ 7.6,  -6.2],
      [ 5.6,  -5.2],
      [ 5.5,  -2.8],
      [ 3.6,  -2.1],
      [ 1.7,  -2.8],
      [ 1.5,  -5.2],
      [-0.4,  -6.6],
      [-2.3,  -7.4],
    ];

    const shape = new THREE.Shape();
    shape.moveTo(shoreContour[0][0], -shoreContour[0][1]);
    for (let i = 1; i < shoreContour.length; i++) {
      shape.lineTo(shoreContour[i][0], -shoreContour[i][1]);
    }

    const geom = new THREE.ShapeGeometry(shape, 32);
    geom.rotateX(-Math.PI / 2);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // ── 3. Connected Walking Network (2.0m Width) ──────────────────────────────
  // Path A: Main Walking Loop around the Lake (crosses the footbridge)
  const lakeWalkingLoop = useMemo(() => {
    const pts: [number, number][] = [
      [ 1.0,   1.0],  // Central Junction
      [ 1.2,  -1.8],
      [ 1.4,  -4.8],  // West Bridgehead
      [ 3.6,  -4.8],  // Footbridge span
      [ 5.8,  -4.8],  // East Bridgehead
      [ 7.8,  -5.5],  // East lake path
      [ 9.2,  -8.5],
      [ 8.2, -11.8],  // North-east curve
      [ 4.8, -13.2],  // North lake path
      [ 1.0, -13.0],
      [-2.5, -11.8],  // North-west curve
      [-3.8,  -9.0],  // AS-102 Lakeside Path
      [-2.6,  -5.5],  // South-west lake path
      [-1.2,  -2.5],
    ];
    return createCurvedRibbonGeometry(pts, 2.0, true, 0.06);
  }, []);

  // Path B: North Entrance Connector (branches from Lakeside loop near AS-102 to AS-101)
  const northConnectorPath = useMemo(() => {
    const pts: [number, number][] = [
      [-3.8,  -9.0],  // Lakeside junction
      [-7.5, -10.5],
      [-11.5, -11.8],
      [-15.0, -13.0], // AS-101 North Entrance
      [-16.5, -15.5], // Gateway
    ];
    return createCurvedRibbonGeometry(pts, 2.0, false, 0.06);
  }, []);

  // Path C: West Walking Loop (branches from Central Junction to AS-104)
  const westWalkingLoop = useMemo(() => {
    const pts: [number, number][] = [
      [  1.0,  1.0],  // Central Junction
      [ -3.5,  2.8],
      [ -7.5,  5.5],
      [-11.0,  8.2],
      [-12.0, 10.0],  // AS-104 West Loop
      [-10.2, 13.0],
      [ -5.5, 14.0],  // South arc
      [  0.0, 12.0],
      [  1.8,  7.0],
    ];
    return createCurvedRibbonGeometry(pts, 2.0, true, 0.06);
  }, []);

  // Path D: East Exit Connector (branches from Central Junction to AS-105)
  const eastConnectorPath = useMemo(() => {
    const pts: [number, number][] = [
      [ 1.0,  1.0],   // Central Junction
      [ 5.0,  3.5],
      [ 9.5,  7.0],
      [14.0, 11.0],   // AS-105 East Exit
      [16.5, 12.5],   // East Exit Gate
    ];
    return createCurvedRibbonGeometry(pts, 2.0, false, 0.06);
  }, []);

  // ── 4. Trees & Palms (Placed in open lawns with >2.5m path clearance) ──────
  const RAIN_TREES: { x: number; z: number; s: number }[] = [
    { x: -19, z: -17, s: 1.15 },
    { x: -20, z:  -6, s: 1.00 },
    { x: -19, z:  16, s: 1.10 },
    { x:  19, z:  16, s: 1.20 },
    { x:  20, z:  -5, s: 1.05 },
    { x:  18, z: -17, s: 1.10 },
    { x:  -8, z:  19, s: 1.05 },
    { x:   8, z:  19, s: 1.15 },
    { x:  12, z:  -2, s: 0.90 },
  ];

  const PALM_TREES: { x: number; z: number; s: number }[] = [
    { x: -17, z: -19, s: 1.05 },
    { x:  -6, z: -16, s: 0.95 },
    { x:  13, z: -16, s: 1.15 },
    { x:  16, z:  -9, s: 0.95 },
    { x: -10, z:  17, s: 1.05 },
    { x:  16, z:  14, s: 1.10 },
    { x: -15, z:   4, s: 0.85 },
  ];

  const TROPICAL_SHRUBS: { x: number; z: number; s: number; color?: string }[] = [
    { x: -13.0, z: -14.5, s: 0.9, color: '#f59e0b' },
    { x:  -7.5, z: -12.5, s: 1.0, color: '#ec4899' },
    { x:   1.0, z: -14.5, s: 0.8, color: '#ea580c' },
    { x:  10.5, z:  -6.5, s: 0.9, color: '#f59e0b' },
    { x:  -9.5, z:   2.5, s: 1.0, color: '#ea580c' },
    { x: -14.5, z:   7.5, s: 1.1, color: '#f59e0b' },
    { x:  -8.5, z:  14.8, s: 0.9, color: '#ec4899' },
    { x:  -2.5, z:  14.2, s: 1.0, color: '#ea580c' },
    { x:   4.5, z:   6.5, s: 0.8, color: '#f59e0b' },
    { x:  12.0, z:   6.5, s: 1.0, color: '#ec4899' },
  ];

  // ── 5. Park Benches (Placed 1.4m outside path edges, facing path/lake) ─────
  const BENCHES: { x: number; z: number; rotY: number }[] = [
    { x: -4.8, z:  -7.0, rotY:  Math.PI / 2 },  // West lake bank, facing east over lake
    { x:  3.5, z: -14.4, rotY:  Math.PI },      // North lake bank, facing south over lake
    { x:  9.8, z:  -8.5, rotY: -Math.PI / 2 },  // East lake bank, facing west over lake
    { x: -8.5, z:   3.8, rotY:  0.7 },          // West Walking Loop, facing gardens
    { x:  3.0, z:   1.8, rotY: -1.2 },          // Central Junction seating
  ];

  // ── 6. Pathway Bollard Lamps (Placed 1.3m outside path edge) ───────────────
  const PATHWAY_LAMPS: [number, number][] = [
    [-12.5, -13.5], // North spur
    [ -7.5, -11.8], // North spur
    [ -5.0,  -7.5], // West lake promenade
    [ -0.8, -13.2], // North lake promenade
    [  6.5, -13.0], // North-east lake promenade
    [  9.5,  -6.5], // East lake promenade
    [ -0.8,  -3.2], // South of bridge
    [ -6.0,   4.0], // West loop
    [-11.5,   8.0], // West loop near AS-104
    [ -4.0,  14.5], // West loop south arc
    [  6.5,   4.5], // East exit spur
    [ 11.5,   8.5], // East exit spur near AS-105
  ];

  return (
    <group>
      {/* ── 1. Park Ground Surface (Visible green lawn, distinct from canvas) */}
      <mesh geometry={parkGroundGeometry} receiveShadow>
        <meshStandardMaterial
          color={nightMode ? '#193c24' : '#386b43'}
          roughness={0.85}
          metalness={0.03}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3D Perimeter Skirt (Solid dark edge to the park slab) */}
      <mesh geometry={parkSkirtGeometry} receiveShadow>
        <meshStandardMaterial color="#1a2e20" roughness={0.9} />
      </mesh>

      {/* ── 2. Irregular Lake & Shoreline ──────────────────────────────────── */}
      {/* Sandy pebble shore buffer at y = 0.02 */}
      <mesh geometry={lakeShoreGeometry} position={[0, 0.02, 0]}>
        <meshStandardMaterial
          color={nightMode ? '#8c7b5c' : '#d4c29c'}
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lake water surface at y = 0.035 */}
      <mesh geometry={lakeShapeGeometry} position={[0, 0.035, 0]}>
        <meshStandardMaterial
          color={nightMode ? '#0284c7' : '#2ca0c9'}
          roughness={0.12}
          metalness={0.28}
          emissive={nightMode ? '#0369a1' : '#000000'}
          emissiveIntensity={nightMode ? 0.35 : 0}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 3. Timber Pedestrian Footbridge across Lake Inlet ───────────────── */}
      {/* Centered at [3.6, -4.8], spanning cleanly across water from x: 1.3 to x: 5.9 */}
      <group position={[3.6, 0.07, -4.8]}>
        {/* Stone Bridge Piers in water */}
        <mesh position={[-1.3, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.32, 0.36, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
        <mesh position={[1.3, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.32, 0.36, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>

        {/* Arched Wooden Deck (y = 0.21 at center) */}
        <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.6, 0.10, 2.0]} />
          <meshStandardMaterial color="#85532f" roughness={0.7} />
        </mesh>

        {/* Bridge Side Handrails */}
        <mesh position={[0, 0.62, 0.95]} castShadow>
          <boxGeometry args={[4.6, 0.07, 0.08]} />
          <meshStandardMaterial color="#54331d" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.62, -0.95]} castShadow>
          <boxGeometry args={[4.6, 0.07, 0.08]} />
          <meshStandardMaterial color="#54331d" roughness={0.75} />
        </mesh>
        {/* Baluster posts */}
        {[-1.8, -0.9, 0, 0.9, 1.8].map((bx, bi) => (
          <group key={bi}>
            <mesh position={[bx, 0.40, 0.95]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.42, 6]} />
              <meshStandardMaterial color="#54331d" />
            </mesh>
            <mesh position={[bx, 0.40, -0.95]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.42, 6]} />
              <meshStandardMaterial color="#54331d" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 4. Connected Walking Network (2.0m Width at y = 0.06) ───────────── */}
      <mesh geometry={lakeWalkingLoop} receiveShadow>
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={northConnectorPath} receiveShadow>
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={westWalkingLoop} receiveShadow>
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={eastConnectorPath} receiveShadow>
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Modest Junction Discs (Radius 1.4m–1.6m at y = 0.061) */}
      {/* Central Junction (AS-103) */}
      <mesh position={[1.0, 0.061, 1.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 24]} />
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Lakeside Junction (near AS-102) */}
      <mesh position={[-3.8, 0.061, -9.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.4, 24]} />
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* North Entrance Plaza (AS-101) */}
      <mesh position={[-15.0, 0.061, -13.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.5, 24]} />
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* West Loop Plaza (AS-104) */}
      <mesh position={[-12.0, 0.061, 10.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.5, 24]} />
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* East Exit Plaza (AS-105) */}
      <mesh position={[14.0, 0.061, 11.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.5, 24]} />
        <meshStandardMaterial
          color={nightMode ? '#ded8cc' : '#ede6db'}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── 5. North Entrance Gateway & Guard Post ─────────────────────────── */}
      <group position={[-16.0, 0, -17.0]}>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <boxGeometry args={[4.8, 0.24, 2.8]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
        <mesh position={[-1.1, 1.25, 0]} castShadow>
          <boxGeometry args={[1.6, 2.1, 1.6]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[-0.26, 1.4, 0]}>
          <boxGeometry args={[0.06, 0.9, 1.0]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} transparent opacity={0.65} />
        </mesh>
        <mesh position={[-0.7, 2.35, 0]} castShadow>
          <boxGeometry args={[3.0, 0.14, 2.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh position={[0.5, 1.15, 0.8]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        <mesh position={[0.5, 1.15, -0.8]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>

      {/* ── 6. Trees & Palms ───────────────────────────────────────────────── */}
      {RAIN_TREES.map((t, i) => (
        <RainTree key={`rt-${i}`} x={t.x} z={t.z} s={t.s} />
      ))}

      {PALM_TREES.map((p, i) => (
        <PalmTree key={`pt-${i}`} x={p.x} z={p.z} s={p.s} />
      ))}

      {TROPICAL_SHRUBS.map((s, i) => (
        <TropicalShrub key={`sh-${i}`} x={s.x} z={s.z} s={s.s} flowerColor={s.color} />
      ))}

      {/* ── 7. Park Benches ────────────────────────────────────────────────── */}
      {BENCHES.map((b, i) => (
        <ParkBench key={`bench-${i}`} x={b.x} z={b.z} rotY={b.rotY} />
      ))}

      {/* ── 8. Pathway Lamps ───────────────────────────────────────────────── */}
      {PATHWAY_LAMPS.map(([lx, lz], i) => (
        <PathwayLamp key={`lamp-${i}`} x={lx} z={lz} nightMode={nightMode} />
      ))}

      {/* ── 9. Blocked Route Barrier Visual ────────────────────────────────── */}
      {blockedRouteZone === 'central_path' && (
        <group position={[1.0, 0.38, 1.0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[2.8, 0.28, 0.2]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[-1.2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
            <meshStandardMaterial color="#78716c" />
          </mesh>
          <mesh position={[1.2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
            <meshStandardMaterial color="#78716c" />
          </mesh>
          <Text
            position={[0, 0.82, 0]}
            fontSize={0.34}
            color="#ef4444"
            anchorX="center"
          >
            ⛔ ROUTE CLOSED
          </Text>
        </group>
      )}

      {/* ── 10. Weather Simulation: Rain ───────────────────────────────────── */}
      {isRaining && <RainParticles />}

      {/* ── 11. Park Identity Label ────────────────────────────────────────── */}
      <Text
        position={[2.0, 0.08, -19.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.2}
        color={nightMode ? '#7dd3fc' : '#0369a1'}
        anchorX="center"
      >
        XSENSE PARK
      </Text>
    </group>
  );
}
