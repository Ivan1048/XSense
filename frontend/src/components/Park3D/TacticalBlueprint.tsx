// GIS Tactical Blueprint — High-contrast operational digital twin for the City of Elmina demonstration.
// Deliberately schematic: coordinate grid, topographical contours, tactical routes, compass bearings,
// and clean landmark vectors. Shares exact world coordinates with 3D operational markers.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// Helper to generate a curved ribbon geometry along a 2D spline
function createTacticalRibbonGeometry(
  points: [number, number][],
  width: number,
  isClosed = false,
  yElevation = 0.05
): THREE.BufferGeometry {
  const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, yElevation, z));
  const curve = new THREE.CatmullRomCurve3(curvePoints, isClosed, 'centripetal', 0.25);
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

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
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

// Weather: tactical precipitation grid particles
function TacticalRainParticles() {
  const count = 400;
  const ref = useRef<THREE.Points>(null);

  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3 + 0] = (Math.random() - 0.5) * 80;
      p[i * 3 + 1] = Math.random() * 16;
      p[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return p;
  }, []);

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
        <bufferAttribute attach="attributes-position" count={count} array={points} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.16} color="#38bdf8" transparent opacity={0.55} />
    </points>
  );
}

interface TacticalBlueprintProps {
  blockedRouteZone?: string | null;
  isRaining?: boolean;
  nightMode?: boolean;
}

export default function TacticalBlueprint({
  blockedRouteZone,
  isRaining = false,
}: TacticalBlueprintProps) {
  // ── 1. Coordinate Grid Lines (10m Major Interval) ─────────────────────────
  const gridGeometry = useMemo(() => {
    const vertices: number[] = [];
    const xMin = -50, xMax = 46;
    const zMin = -48, zMax = 38;
    for (let x = xMin; x <= xMax; x += 8) {
      vertices.push(x, 0.02, zMin, x, 0.02, zMax);
    }
    for (let z = zMin; z <= zMax; z += 8) {
      vertices.push(xMin, 0.02, z, xMax, 0.02, z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, []);

  // Major Coordinate Axes (X=0 & Z=0)
  const axesGeometry = useMemo(() => {
    const vertices: number[] = [
      0, 0.025, -48, 0, 0.025, 38,
      -50, 0.025, 0, 46, 0.025, 0,
    ];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, []);

  // ── 2. Topographical Contour Lines (Schematic Elevation Curves) ─────────────
  const contourGeometries = useMemo(() => {
    const loops: [number, number][][] = [
      // Woodland Ridge +10m Base Contour
      [[-40, -25], [-32, -37], [-15, -44], [6, -44], [20, -36], [26, -26], [18, -21], [-2, -20], [-22, -18], [-34, -20]],
      // Woodland Ridge +20m Mid Contour
      [[-34, -28], [-25, -36], [-10, -39], [8, -39], [16, -30], [8, -24], [-6, -23], [-24, -22]],
      // Woodland Ridge +30m Crest Contour
      [[-26, -31], [-16, -35], [-2, -36], [5, -33], [2, -27], [-10, -27], [-20, -26]],
      // Play Garden Knoll +5m Contour
      [[-36, 4], [-35, 14], [-24, 15], [-22, 6], [-28, 2]],
      // Lake Shoreline Buffer (-1m Basin)
      [[-2.8, -8.5], [-2.0, -11.5], [1.3, -12.8], [5.0, -12.8], [7.5, -11.5], [8.2, -8.5], [7.2, -6.5], [5.6, -5.5], [5.5, -2.8], [3.6, -2.0], [1.8, -2.8], [1.6, -5.5], [-0.8, -6.8], [-2.5, -7.5]],
      // Central Park Depression (-3m Inner Basin)
      [[-0.8, -9.2], [0.2, -10.6], [2.0, -11.2], [4.2, -11.2], [5.6, -10.2], [6.2, -8.6], [5.2, -7.4], [4.0, -6.6], [3.8, -4.4], [3.4, -3.8], [2.6, -4.4], [2.4, -6.6], [1.0, -7.8]],
    ];

    return loops.map((pts) => {
      const curvePts = pts.map(([x, z]) => new THREE.Vector3(x, 0.035, z));
      const curve = new THREE.CatmullRomCurve3(curvePts, true, 'centripetal');
      const sampled = curve.getPoints(80);
      const vertices: number[] = [];
      for (const p of sampled) {
        vertices.push(p.x, p.y, p.z);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      return geom;
    });
  }, []);

  // ── 3. Schematic Lake Geometry ──────────────────────────────────────────────
  const lakeShapeGeometry = useMemo(() => {
    const lakeContour: [number, number][] = [
      [-1.4, -9], [-0.8, -11], [1.3, -11.8], [4.4, -11.8], [6.5, -10.8],
      [7, -8.5], [6.3, -7], [4.8, -6], [4.7, -3.5], [3.6, -3], [2.6, -3.5],
      [2.5, -6], [0, -7.4], [-1.3, -8]
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

  const lakeBorderGeometry = useMemo(() => {
    const lakeContour: [number, number][] = [
      [-1.4, -9], [-0.8, -11], [1.3, -11.8], [4.4, -11.8], [6.5, -10.8],
      [7, -8.5], [6.3, -7], [4.8, -6], [4.7, -3.5], [3.6, -3], [2.6, -3.5],
      [2.5, -6], [0, -7.4], [-1.3, -8]
    ];
    const curvePts = lakeContour.map(([x, z]) => new THREE.Vector3(x, 0.045, z));
    const curve = new THREE.CatmullRomCurve3(curvePts, true, 'centripetal');
    const sampled = curve.getPoints(64);
    const vertices: number[] = [];
    for (const p of sampled) {
      vertices.push(p.x, p.y, p.z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, []);

  // ── 4. Tactical Pathways & Walking Corridors ────────────────────────────────
  // Path A: Main Walking Loop around the Lake (crosses footbridge)
  const lakeWalkingLoop = useMemo(() => {
    const pts: [number, number][] = [
      [ 1.0,   1.0],
      [ 1.2,  -1.8],
      [ 1.4,  -4.8],
      [ 3.6,  -4.8],
      [ 5.8,  -4.8],
      [ 7.8,  -5.5],
      [ 9.2,  -8.5],
      [ 8.2, -11.8],
      [ 4.8, -13.2],
      [ 1.0, -13.0],
      [-2.5, -11.8],
      [-3.8,  -9.0],
      [-2.6,  -5.5],
      [-1.2,  -2.5],
    ];
    return createTacticalRibbonGeometry(pts, 2.2, true, 0.05);
  }, []);

  // Path B: North Entrance Connector
  const northConnectorPath = useMemo(() => {
    const pts: [number, number][] = [
      [-3.8,  -9.0],
      [-7.5, -10.5],
      [-11.5, -11.8],
      [-15.0, -13.0],
      [-16.5, -15.5],
    ];
    return createTacticalRibbonGeometry(pts, 2.2, false, 0.05);
  }, []);

  // Path C: West Walking Loop
  const westWalkingLoop = useMemo(() => {
    const pts: [number, number][] = [
      [  1.0,  1.0],
      [ -3.5,  2.8],
      [ -7.5,  5.5],
      [-11.0,  8.2],
      [-12.0, 10.0],
      [-10.2, 13.0],
      [ -5.5, 14.0],
      [  0.0, 12.0],
      [  1.8,  7.0],
    ];
    return createTacticalRibbonGeometry(pts, 2.2, true, 0.05);
  }, []);

  // Path D: East Exit Connector
  const eastConnectorPath = useMemo(() => {
    const pts: [number, number][] = [
      [ 1.0,  1.0],
      [ 5.0,  3.5],
      [ 9.5,  7.0],
      [14.0, 11.0],
      [16.5, 12.5],
    ];
    return createTacticalRibbonGeometry(pts, 2.2, false, 0.05);
  }, []);

  // Outer Promenade
  const outerPromenade = useMemo(() => {
    const pts: [number, number][] = [
      [-16.5, -15.5], [-24, -19], [-33, -16], [-38, -5], [-37, 8],
      [-34, 18], [-25, 25], [-9, 26], [8, 25], [20, 19], [16.5, 12.5]
    ];
    return createTacticalRibbonGeometry(pts, 2.0, false, 0.048);
  }, []);

  // Play Garden Access
  const playAccessPath = useMemo(() => {
    const pts: [number, number][] = [[-12, 10], [-19, 15], [-27, 16], [-34, 18]];
    return createTacticalRibbonGeometry(pts, 1.8, false, 0.048);
  }, []);

  // Southern & Residential Perimeter Arterial
  const arterialRoad = useMemo(() => {
    const pts: [number, number][] = [
      [27, -27], [27, -10], [27, 11], [25, 28], [10, 32], [-15, 32], [-31, 28]
    ];
    return createTacticalRibbonGeometry(pts, 3.8, false, 0.046);
  }, []);

  // Tactical Corridor Centerline Highlights
  const corridorCenterlines = useMemo(() => {
    const paths: [number, number][][] = [
      // Lake loop centerline
      [
        [ 1.0,   1.0], [ 1.2,  -1.8], [ 1.4,  -4.8], [ 3.6,  -4.8], [ 5.8,  -4.8],
        [ 7.8,  -5.5], [ 9.2,  -8.5], [ 8.2, -11.8], [ 4.8, -13.2], [ 1.0, -13.0],
        [-2.5, -11.8], [-3.8,  -9.0], [-2.6,  -5.5], [-1.2,  -2.5], [ 1.0,   1.0]
      ],
      // North spur
      [[-3.8, -9.0], [-7.5, -10.5], [-11.5, -11.8], [-15.0, -13.0], [-16.5, -15.5]],
      // West spur
      [
        [  1.0,  1.0], [ -3.5,  2.8], [ -7.5,  5.5], [-11.0,  8.2], [-12.0, 10.0],
        [-10.2, 13.0], [ -5.5, 14.0], [  0.0, 12.0], [  1.8,  7.0], [  1.0,  1.0]
      ],
      // East spur
      [[ 1.0, 1.0], [ 5.0, 3.5], [ 9.5, 7.0], [14.0, 11.0], [16.5, 12.5]],
    ];

    const vertices: number[] = [];
    for (const p of paths) {
      for (let i = 0; i < p.length - 1; i++) {
        vertices.push(p[i][0], 0.065, p[i][1], p[i+1][0], 0.065, p[i+1][1]);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, []);

  return (
    <group>
      {/* ── Floor Tactical Slab (Deep Military Navy) ───────────────────────── */}
      <mesh position={[-2, -0.06, -5]} receiveShadow>
        <boxGeometry args={[112, 0.12, 98]} />
        <meshStandardMaterial color="#060c18" roughness={0.96} metalness={0.08} />
      </mesh>

      {/* Outer Tactical Framing Border */}
      <mesh position={[-2, 0.015, -5]}>
        <ringGeometry args={[56, 56.4, 64]} />
        <meshBasicMaterial color="#0c324e" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Coordinate Grid (10m Major Interval) ──────────────────────────── */}
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#0c2d47" transparent opacity={0.5} />
      </lineSegments>

      {/* Major Axes Highlight (X=0 & Z=0) */}
      <lineSegments geometry={axesGeometry}>
        <lineBasicMaterial color="#14b8a6" transparent opacity={0.35} />
      </lineSegments>

      {/* Axis Tick Coordinates (Top and Left) */}
      {[-40, -32, -24, -16, -8, 0, 8, 16, 24, 32, 40].map((x) => (
        <Text
          key={`tick-x-${x}`}
          position={[x, 0.035, -46.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.65}
          color="#38bdf8"
          fillOpacity={0.45}
          anchorX="center"
          anchorY="middle"
        >
          {x === 0 ? 'X:0' : `${x > 0 ? '+' : ''}${x}E`}
        </Text>
      ))}
      {[-40, -32, -24, -16, -8, 0, 8, 16, 24, 32].map((z) => (
        <Text
          key={`tick-z-${z}`}
          position={[-48.5, 0.035, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.65}
          color="#38bdf8"
          fillOpacity={0.45}
          anchorX="center"
          anchorY="middle"
        >
          {z === 0 ? 'Z:0' : `${-z > 0 ? '+' : ''}${-z}N`}
        </Text>
      ))}

      {/* ── Topographical Elevation Contours ───────────────────────────────── */}
      {contourGeometries.map((geom, idx) => (
        <lineLoop key={`contour-${idx}`} geometry={geom}>
          <lineBasicMaterial
            color={idx < 3 ? '#164e63' : idx === 3 ? '#1e3a5f' : '#0284c7'}
            transparent
            opacity={0.45}
          />
        </lineLoop>
      ))}

      {/* Elevation Text Markers on Contours */}
      <Text position={[-16, 0.04, -36]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#0e7490" fillOpacity={0.65}>
        ELV +20M · WOODLAND RIDGE
      </Text>
      <Text position={[-30, 0.04, 10]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#0e7490" fillOpacity={0.65}>
        ELV +5M · PLAY GARDEN KNOLL
      </Text>
      <Text position={[3.2, 0.04, -12.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#0284c7" fillOpacity={0.75}>
        BASIN -2M · CENTRAL LAKE
      </Text>

      {/* ── Tactical Lake & Waterway ───────────────────────────────────────── */}
      <mesh geometry={lakeShapeGeometry} position={[0, 0.04, 0]}>
        <meshStandardMaterial
          color="#041628"
          roughness={0.2}
          metalness={0.4}
          emissive="#0284c7"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineLoop geometry={lakeBorderGeometry}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.8} />
      </lineLoop>

      {/* Lake Centerline Label */}
      <Text
        position={[3.0, 0.05, -8.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#38bdf8"
        fillOpacity={0.45}
        anchorX="center"
      >
        LAKE BASIN · RETENTION WATERWAY
      </Text>

      {/* ── Tactical Footbridge Span across Lake Inlet ────────────────────── */}
      <group position={[3.6, 0.07, -4.8]}>
        {/* Bridge deck plate */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[4.6, 0.08, 2.2]} />
          <meshStandardMaterial color="#0c2b48" roughness={0.4} metalness={0.3} emissive="#0284c7" emissiveIntensity={0.15} />
        </mesh>
        {/* Tactical handrail line markers */}
        <mesh position={[0, 0.16, 1.05]}>
          <boxGeometry args={[4.6, 0.04, 0.06]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.16, -1.05]}>
          <boxGeometry args={[4.6, 0.04, 0.06]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.4} />
        </mesh>
        <Text position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.32} color="#7dd3fc" fillOpacity={0.8}>
          PEDESTRIAN FOOTBRIDGE SPAN
        </Text>
      </group>

      {/* ── Tactical Walking Network (High-Contrast Pathways) ──────────────── */}
      <mesh geometry={lakeWalkingLoop} receiveShadow>
        <meshStandardMaterial color="#091b2c" roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={northConnectorPath} receiveShadow>
        <meshStandardMaterial color="#091b2c" roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={westWalkingLoop} receiveShadow>
        <meshStandardMaterial color="#091b2c" roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={eastConnectorPath} receiveShadow>
        <meshStandardMaterial color="#091b2c" roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={outerPromenade} receiveShadow>
        <meshStandardMaterial color="#071726" roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={playAccessPath} receiveShadow>
        <meshStandardMaterial color="#071726" roughness={0.8} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={arterialRoad} receiveShadow>
        <meshStandardMaterial color="#05121e" roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* Glowing Vector Centerlines */}
      <lineSegments geometry={corridorCenterlines}>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.65} />
      </lineSegments>

      {/* ── Tactical Beacon Junction Rings ─────────────────────────────────── */}
      {[
        { id: 'AS-101', pos: [-15.0, -13.0], name: 'NODE AS-101 · NORTH' },
        { id: 'AS-102', pos: [-4.0,  -9.0],  name: 'NODE AS-102 · LAKE' },
        { id: 'AS-103', pos: [1.0,    1.0],  name: 'NODE AS-103 · CENTRAL' },
        { id: 'AS-104', pos: [-12.0, 10.0],  name: 'NODE AS-104 · WEST' },
        { id: 'AS-105', pos: [14.0,  11.0],  name: 'NODE AS-105 · EAST' },
      ].map((n) => (
        <group key={n.id} position={[n.pos[0], 0.055, n.pos[1]]}>
          {/* Base disc */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.7, 24]} />
            <meshStandardMaterial color="#0a263d" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* Tactical perimeter ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.9, 2.05, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.5, 2.58, 32]} />
            <meshBasicMaterial color="#0284c7" transparent opacity={0.25} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 0.02, 2.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#7dd3fc" fillOpacity={0.7} anchorX="center">
            {n.name}
          </Text>
        </group>
      ))}

      {/* ── Tactical Compass Rose (Oriented to True North) ──────────────────── */}
      <group position={[-37, 0.065, -34]}>
        {/* Outer Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.4, 4.55, 48]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        {/* Inner Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.32, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
        {/* North Arrow Pointer (pointing -Z in Three.js world space) */}
        <mesh position={[0, 0.02, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.55, 1.8, 4]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        {/* South Needle */}
        <mesh position={[0, 0.02, 2.4]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 1.4, 4]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
        {/* Cardinal Labels */}
        <Text position={[0, 0.03, -4.0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.9} color="#38bdf8" anchorX="center" anchorY="middle">
          N
        </Text>
        <Text position={[4.0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.75} color="#94a3b8" anchorX="center" anchorY="middle">
          E
        </Text>
        <Text position={[0, 0.03, 4.0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.75} color="#94a3b8" anchorX="center" anchorY="middle">
          S
        </Text>
        <Text position={[-4.0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.75} color="#94a3b8" anchorX="center" anchorY="middle">
          W
        </Text>
        <Text position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.4} color="#38bdf8" fillOpacity={0.75} anchorX="center" anchorY="middle">
          GRID 000°
        </Text>
      </group>

      {/* ── Landmark & Operational Sector Callouts ─────────────────────────── */}
      <group position={[-16, 0.06, -17.5]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#38bdf8" anchorX="left">
          [SEC-01] NORTH GATE & VEHICULAR ACCESS
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#94a3b8" anchorX="left">
          Covered by AS-101 · CAM-01 Viewing Corridor
        </Text>
      </group>

      <group position={[-2, 0.06, -14.5]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#38bdf8" anchorX="left">
          [SEC-02] LAKESIDE PROMENADE & BASIN
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#94a3b8" anchorX="left">
          Covered by AS-102 · AUD-001 Acoustic Sensor
        </Text>
      </group>

      <group position={[3.5, 0.06, 2.5]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#38bdf8" anchorX="left">
          [SEC-03] CENTRAL TRANSIT JUNCTION
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#94a3b8" anchorX="left">
          Covered by AS-103 · Primary Path Intersection
        </Text>
      </group>

      <group position={[-11, 0.06, 15.5]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#38bdf8" anchorX="left">
          [SEC-04] WEST WALKING LOOP PLAZA
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#94a3b8" anchorX="left">
          Covered by AS-104 · LID-002 Fall Detection Benchmark
        </Text>
      </group>

      <group position={[14, 0.06, 15.5]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#38bdf8" anchorX="left">
          [SEC-05] EAST EXIT & NEIGHBOURHOOD LINK
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#94a3b8" anchorX="left">
          Covered by AS-105 · CAM-02 Viewing Corridor
        </Text>
      </group>

      <group position={[-28, 0.06, 21]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.6} color="#94a3b8" anchorX="left">
          PLAY GARDEN RECREATIONAL ZONE
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#64748b" anchorX="left">
          Family recreation & equipment area
        </Text>
      </group>

      <group position={[28, 0.06, 2]}>
        <Text position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.6} color="#94a3b8" anchorX="left">
          RESIDENTIAL PERIMETER ARTERIAL
        </Text>
        <Text position={[0, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#64748b" anchorX="left">
          City of Elmina neighbourhood link road
        </Text>
      </group>

      {/* ── Identity & Tactical Disclaimers ───────────────────────────────── */}
      <Text
        position={[2.0, 0.07, -18.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.1}
        color="#38bdf8"
        anchorX="center"
      >
        XSENSE TACTICAL GIS DIGITAL TWIN
      </Text>
      <Text
        position={[2.0, 0.07, -16.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.45}
        color="#94a3b8"
        anchorX="center"
      >
        CITY OF ELMINA · SCHEMATIC OPERATIONAL BLUEPRINT (NOT A SURVEYED REPLICA)
      </Text>

      {/* ── Blocked Route Barrier (Operational Alert State) ───────────────── */}
      {blockedRouteZone === 'central_path' && (
        <group position={[1.0, 0.38, 1.0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[3.0, 0.32, 0.22]} />
            <meshStandardMaterial color="#dc2626" emissive="#991b1b" emissiveIntensity={0.65} />
          </mesh>
          <mesh position={[-1.3, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[1.3, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <Text position={[0, 0.82, 0]} fontSize={0.35} color="#fca5a5" anchorX="center">
            ⛔ ROUTE CLOSED / TACTICAL DETOUR
          </Text>
        </group>
      )}

      {/* ── Weather Simulation (Tactical Rain) ────────────────────────────── */}
      {isRaining && <TacticalRainParticles />}
    </group>
  );
}
