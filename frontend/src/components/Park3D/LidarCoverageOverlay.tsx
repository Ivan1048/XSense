// ── 3D LiDAR Operational Coverage Overlay ──────────────────────────────────
// Visualizes the authoritative detection geometry of active operational LiDAR sensors.
// Shows field of view boundaries, nominal range arcs, and obstacle shadow wedges.
// Explicitly dims or hides offline sensors to maintain truth in presentation.

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { OPERATIONAL_LIDARS, PARK_OBSTACLES, type LidarSensorDefinition } from '../../data/lidarData';
import { generateLidarCoveragePolygonPoints } from '../../utils/lidarGeometry';

interface LidarCoverageOverlayProps {
  showCoverage: boolean;
  showLabels?: boolean;
  offlinePoleId?: string | null;
  blockedRouteZone?: string | null;
  selectedSensorId?: string | null;
  onSelectSensor?: (sensorId: string) => void;
}

function SingleLidarMesh({
  sensor,
  isOffline,
  blockedRouteZone,
  showLabels,
  isSelected,
  onSelect,
}: {
  sensor: LidarSensorDefinition;
  isOffline: boolean;
  blockedRouteZone?: string | null;
  showLabels: boolean;
  isSelected: boolean;
  onSelect?: () => void;
}) {
  const [sx, sz] = sensor.position;

  // Active obstacles: dynamically include central path barrier when route is blocked
  const activeObstacles = useMemo(() => {
    return PARK_OBSTACLES.filter((obs) => {
      if (obs.id === 'dynamic_route_barrier') {
        return blockedRouteZone === 'central_path';
      }
      return true;
    });
  }, [blockedRouteZone]);

  // Compute boundary polygon points using authoritative ray-marched geometry
  const polygonPoints = useMemo(() => {
    return generateLidarCoveragePolygonPoints(sensor, activeObstacles, isOffline, 90);
  }, [sensor, activeObstacles, isOffline]);

  // Build triangulated fan geometry from origin [sx, sz]
  const geometry = useMemo(() => {
    if (polygonPoints.length < 3 || isOffline) return null;

    const vertices: number[] = [];
    const indices: number[] = [];

    // Vertex 0: Sensor Origin at y = 0.065
    vertices.push(sx, 0.065, sz);

    // Peripheral boundary vertices
    polygonPoints.forEach(([px, pz]) => {
      vertices.push(px, 0.065, pz);
    });

    // Triangulate fan: (0, i, i + 1)
    for (let i = 1; i < polygonPoints.length; i++) {
      indices.push(0, i, i + 1);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [polygonPoints, sx, sz, isOffline]);

  // Boundary perimeter line for clean contrast
  const lineGeometry = useMemo(() => {
    if (polygonPoints.length < 2 || isOffline) return null;
    const pts = [
      new THREE.Vector3(sx, 0.068, sz),
      ...polygonPoints.map(([px, pz]) => new THREE.Vector3(px, 0.068, pz)),
      new THREE.Vector3(sx, 0.068, sz),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [polygonPoints, sx, sz, isOffline]);

  return (
    <group>
      {/* 1. Translucent ground coverage sector with obstacle shadow cutouts */}
      {geometry && (
        <mesh
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
        >
          <meshBasicMaterial
            color={isSelected ? '#38bdf8' : '#06b6d4'}
            transparent
            opacity={isSelected ? 0.28 : 0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 2. Crisp boundary contour highlighting FOV limits and shadow edges */}
      {lineGeometry && (
        <lineLoop geometry={lineGeometry}>
          <lineBasicMaterial
            color={isSelected ? '#7dd3fc' : '#22d3ee'}
            transparent
            opacity={isSelected ? 0.85 : 0.45}
            depthWrite={false}
          />
        </lineLoop>
      )}

      {/* 3. Offline Sensor Indicator (Dashed ring showing offline blind state) */}
      {isOffline && (
        <mesh position={[sx, 0.065, sz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[sensor.nominalRangeM - 0.15, sensor.nominalRangeM, 48]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}

      {/* 4. Sensor Informational Badge */}
      {showLabels && (
        <Html position={[sx, 4.4, sz]} center>
          <button
            type="button"
            className={`pole-tag${isSelected ? ' selected' : ''}`}
            style={{
              background: isOffline ? 'rgba(79, 70, 229, 0.1)' : isSelected ? 'rgba(8, 145, 178, 0.94)' : 'rgba(15, 23, 42, 0.88)',
              borderColor: isOffline ? '#ef4444' : isSelected ? '#38bdf8' : 'rgba(6, 182, 212, 0.55)',
              color: isOffline ? '#fca5a5' : '#cffafe',
              fontSize: '11px',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            title={`${sensor.name}: ${sensor.nominalRangeM}m range, ${sensor.fovDeg}° FOV (aimed ${sensor.headingDeg}°)`}
          >
            📡 {sensor.id} {isOffline ? '· Offline ⚠' : `· ${sensor.nominalRangeM}m (${sensor.fovDeg}°)`}
          </button>
        </Html>
      )}
    </group>
  );
}

export default function LidarCoverageOverlay({
  showCoverage,
  showLabels = true,
  offlinePoleId,
  blockedRouteZone,
  selectedSensorId,
  onSelectSensor,
}: LidarCoverageOverlayProps) {
  if (!showCoverage) return null;

  return (
    <group>
      {OPERATIONAL_LIDARS.map((sensor) => {
        const isOffline = sensor.mountPoleId === offlinePoleId;
        const isSelected = selectedSensorId === sensor.id;

        return (
          <SingleLidarMesh
            key={sensor.id}
            sensor={sensor}
            isOffline={isOffline}
            blockedRouteZone={blockedRouteZone}
            showLabels={showLabels}
            isSelected={isSelected}
            onSelect={() => onSelectSensor?.(sensor.id)}
          />
        );
      })}
    </group>
  );
}
