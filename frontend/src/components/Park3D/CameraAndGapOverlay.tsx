// Hybrid 3D Map Overlay: Independent CCTV Camera Inventory, Estimated Viewing Cones, and Coverage Gaps.
// Per product rules: Camera markers represent inventory and estimated viewing direction only — no live stream or AI CCTV analytics implied.
import * as THREE from 'three';
import { Html, Edges } from '@react-three/drei';

export interface CameraInventoryItem {
  id: string;
  name: string;
  zoneName: string;
  position: [number, number]; // [x, z]
  targetPoint: [number, number]; // [tx, tz] point on ground path the camera aims at
  status: 'inventory_only';
  coverageNote: string;
  limitations: string;
}

export const CCTV_CAMERAS: CameraInventoryItem[] = [
  {
    id: 'CAM-01',
    name: 'North Gate CCTV',
    zoneName: 'North Entrance',
    position: [-17.5, -14.8],
    targetPoint: [-11.5, -10.5],
    status: 'inventory_only',
    coverageNote: 'Estimated viewing cone covering North Entrance gate and upper path (near AS-101).',
    limitations: 'Inventory marker only — no live video stream integrated. Does not cover West Loop (AS-104).',
  },
  {
    id: 'CAM-02',
    name: 'East Exit CCTV',
    zoneName: 'East Exit',
    position: [16.5, 13.0],
    targetPoint: [10.5, 8.8],
    status: 'inventory_only',
    coverageNote: 'Estimated viewing cone covering East Exit walkway (near AS-105).',
    limitations: 'Inventory marker only — no live video stream integrated. Tree foliage blocks Central Path.',
  },
];

interface CameraAndGapOverlayProps {
  showCCTV: boolean;
  showGaps: boolean;
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
}

export default function CameraAndGapOverlay({
  showCCTV,
  showGaps,
  selectedCameraId,
  onSelectCamera,
}: CameraAndGapOverlayProps) {
  return (
    <group>
      {/* 1. CCTV Camera Fixtures & Downward-Aimed Viewing Cones */}
      {CCTV_CAMERAS.map((cam) => {
        const [x, z] = cam.position;
        const [tx, tz] = cam.targetPoint;
        const dx = tx - x;
        const dz = tz - z;
        const yaw = Math.atan2(dx, dz);
        const isSelected = selectedCameraId === cam.id;

        return (
          <group key={cam.id} position={[x, 0, z]}>
            {/* Independent Camera Mount Post */}
            <mesh
              position={[0, 2.1, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCamera?.(cam.id);
              }}
            >
              <cylinderGeometry args={[0.09, 0.13, 4.2, 8]} />
              <meshStandardMaterial color={isSelected ? '#38bdf8' : '#64748b'} />
            </mesh>

            {/* Camera Head aimed toward targetPoint */}
            <group position={[0, 4.2, 0]} rotation={[0, yaw, 0]}>
              <mesh
                rotation={[0.42, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCamera?.(cam.id);
                }}
              >
                <boxGeometry args={[0.36, 0.26, 0.62]} />
                <meshStandardMaterial color={isSelected ? '#38bdf8' : '#e2e8f0'} />
              </mesh>

              {/* Downward-aimed viewing beam (Apex at lens, wide base on ground) */}
              {showCCTV && (
                <group rotation={[0.48, 0, 0]}>
                  {/* In Three.js coneGeometry, apex is at +Y/2 and base is at -Y/2.
                      Rotating X by -Math.PI/2 places apex at origin [0,0,0] and projects base toward +Z! */}
                  <mesh position={[0, 0, 3.8]} rotation={[-Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[2.4, 7.6, 24, 1, true]} />
                    <meshBasicMaterial
                      color="#38bdf8"
                      transparent
                      opacity={0.13}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                    />
                  </mesh>
                </group>
              )}

              {/* Ground Footprint Sector on the Pathway */}
              {showCCTV && (
                <mesh position={[0, -4.14, 5.2]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[3.2, 32]} />
                  <meshBasicMaterial
                    color="#38bdf8"
                    transparent
                    opacity={0.18}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              )}
            </group>

            {/* Camera HTML Badge */}
            <Html position={[0, 5.05, 0]} center distanceFactor={25}>
              <button
                type="button"
                className={`pole-tag${isSelected ? ' selected' : ''}`}
                style={{
                  borderColor: isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.55)',
                  color: '#e0f2fe',
                  background: isSelected ? 'rgba(2, 132, 199, 0.94)' : 'rgba(15, 23, 42, 0.90)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCamera?.(cam.id);
                }}
              >
                📹 {cam.id}
              </button>
            </Html>
          </group>
        );
      })}

      {/* 2. Explicit Coverage Gap Zone (Unmonitored Blind Spot) */}
      {showGaps && (
        <group position={[10.5, 0.07, -1.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.0, 6.0]} />
            <meshBasicMaterial
              color="#a78bfa"
              transparent
              opacity={0.16}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
            <Edges threshold={15} color="#a78bfa" lineWidth={1.8} />
          </mesh>

          <Html position={[0, 0.85, 0]} center distanceFactor={26}>
            <div
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                background: 'rgba(46, 16, 101, 0.92)',
                color: '#ddd6fe',
                border: '1px solid #a78bfa',
                boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              ⚠️ Coverage Gap (Unmonitored Blind Spot — No CCTV or LiDAR)
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
