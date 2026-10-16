// Hybrid 3D Map Overlay: Independent CCTV Camera Inventory, Estimated Viewing Cones, and Coverage Gaps.
// Per product rules: Camera markers represent inventory and estimated viewing direction only — no live stream or AI CCTV analytics implied.
import * as THREE from 'three';
import { Html, Edges } from '@react-three/drei';

export interface CameraInventoryItem {
  id: string;
  name: string;
  zoneName: string;
  position: [number, number]; // [x, z]
  rotationY: number;          // yaw direction in radians
  status: 'inventory_only';
  coverageNote: string;
  limitations: string;
}

export const CCTV_CAMERAS: CameraInventoryItem[] = [
  {
    id: 'CAM-01',
    name: 'North Gate CCTV',
    zoneName: 'North Entrance',
    position: [-17.5, -14.5],
    rotationY: Math.PI * 0.28,
    status: 'inventory_only',
    coverageNote: 'Estimated 65° viewing cone covering North Gate entry path.',
    limitations: 'Inventory marker only — no live video feed connected. Faces away from West Loop.',
  },
  {
    id: 'CAM-02',
    name: 'East Exit CCTV',
    zoneName: 'East Exit',
    position: [16.2, 12.5],
    rotationY: -Math.PI * 0.72,
    status: 'inventory_only',
    coverageNote: 'Estimated 65° viewing cone covering East Exit perimeter.',
    limitations: 'Inventory marker only — no live video feed connected. Tree canopy blocks Central Path.',
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
      {/* 1. CCTV Camera Fixtures & Estimated Directional Viewing Cones */}
      {CCTV_CAMERAS.map((cam) => {
        const [x, z] = cam.position;
        const isSelected = selectedCameraId === cam.id;

        return (
          <group key={cam.id} position={[x, 0, z]}>
            {/* Independent Camera Mount Post */}
            <mesh
              position={[0, 2.2, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCamera?.(cam.id);
              }}
            >
              <cylinderGeometry args={[0.1, 0.14, 4.4, 8]} />
              <meshStandardMaterial color={isSelected ? '#38bdf8' : '#64748b'} />
            </mesh>

            {/* Directional Camera Housing */}
            <group position={[0, 4.35, 0]} rotation={[0, cam.rotationY, 0]}>
              <mesh
                rotation={[0.25, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCamera?.(cam.id);
                }}
              >
                <boxGeometry args={[0.38, 0.28, 0.65]} />
                <meshStandardMaterial color={isSelected ? '#38bdf8' : '#e2e8f0'} />
              </mesh>

              {/* Estimated 3D Viewing Cone & Ground Wedge (Toggled via showCCTV) */}
              {showCCTV && (
                <>
                  {/* 3D Frustum Cone */}
                  <mesh position={[0, -1.6, 4.2]} rotation={[Math.PI / 2 + 0.22, 0, 0]}>
                    <coneGeometry args={[3.6, 8.2, 24, 1, true]} />
                    <meshBasicMaterial
                      color="#38bdf8"
                      transparent
                      opacity={0.11}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                    />
                  </mesh>

                  {/* Ground Viewing Sector */}
                  <mesh position={[0, -4.28, 4.5]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
                    <circleGeometry args={[6.2, 28, 0, Math.PI / 2]} />
                    <meshBasicMaterial
                      color="#38bdf8"
                      transparent
                      opacity={0.16}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                    />
                  </mesh>
                </>
              )}
            </group>

            {/* Camera HTML Badge */}
            <Html position={[0, 5.15, 0]} center distanceFactor={25}>
              <button
                type="button"
                className={`pole-tag${isSelected ? ' selected' : ''}`}
                style={{
                  borderColor: isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.45)',
                  color: '#e0f2fe',
                  background: isSelected ? 'rgba(2, 132, 199, 0.92)' : 'rgba(15, 23, 42, 0.88)',
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
            <planeGeometry args={[8.5, 6.5]} />
            <meshBasicMaterial
              color="#a78bfa"
              transparent
              opacity={0.14}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
            <Edges threshold={15} color="#a78bfa" lineWidth={1.8} />
          </mesh>

          <Html position={[0, 0.9, 0]} center distanceFactor={26}>
            <div
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                background: 'rgba(46, 16, 101, 0.90)',
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
