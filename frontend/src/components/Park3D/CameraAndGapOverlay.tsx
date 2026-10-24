// Hybrid 3D Map Overlay: Independent CCTV Camera Inventory, estimated footprints only.
// Per product rules: camera markers represent inventory, aim direction and an
// *estimated* ground footprint. No live stream, footage retrieval, identification
// or AI CCTV analytics is implied, and the footprint is not a site survey.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

import { CCTV_CAMERAS } from '../../data/cameraData';
import { cameraFootprintSectorPoints } from '../../utils/cameraCoverage';
export { CCTV_CAMERAS } from '../../data/cameraData';
export type { CameraInventoryItem } from '../../data/cameraData';

interface CameraAndGapOverlayProps {
  showDeviceLabels?: boolean;
  showCCTV: boolean;
  selectedCameraId?: string | null;
  onSelectCamera?: (cameraId: string) => void;
}

export default function CameraAndGapOverlay({
  showDeviceLabels = true,
  showCCTV,
  selectedCameraId,
  onSelectCamera,
}: CameraAndGapOverlayProps) {
  // Footprints come from the same estimate the coverage evaluator uses, so the
  // map cannot promise coverage the incident logic does not agree with.
  const footprints = useMemo(
    () =>
      CCTV_CAMERAS.map((cam) => {
        const points = cameraFootprintSectorPoints(cam);
        // The mesh is rendered inside a group translated to the camera mount, so
        // convert the helper's world-space points into camera-local X/Z first.
        const [cameraX, cameraZ] = cam.position;
        const shape = new THREE.Shape();
        shape.moveTo(points[0][0] - cameraX, -(points[0][1] - cameraZ));
        for (let i = 1; i < points.length; i++) {
          shape.lineTo(points[i][0] - cameraX, -(points[i][1] - cameraZ));
        }
        const geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);
        return { id: cam.id, geometry };
      }),
    [],
  );

  useEffect(() => () => footprints.forEach((footprint) => footprint.geometry.dispose()), [footprints]);

  return (
    <group>
      {/* 1. CCTV Camera Fixtures & Estimated Ground Footprints */}
      {CCTV_CAMERAS.map((cam, index) => {
        const [x, z] = cam.position;
        const [tx, tz] = cam.targetPoint;
        const dx = tx - x;
        const dz = tz - z;
        const yaw = Math.atan2(dx, dz);
        const isSelected = selectedCameraId === cam.id;

        return (
          <group key={cam.id} position={[x, 0, z]}>
            {/* Estimated footprint only — not a verified field of view. */}
            {showCCTV && (
              <mesh geometry={footprints[index].geometry} position={[0, 0.07, 0]}>
                <meshBasicMaterial
                  color="#38bdf8"
                  transparent
                  opacity={isSelected ? 0.24 : 0.13}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}

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
            </group>

            {/* Camera HTML Badge */}
            {(showDeviceLabels || isSelected) && <Html position={[0, 7.8, 0]} center>
              <button
                type="button"
                className={`pole-tag${isSelected ? ' selected' : ''}`}
                style={{
                  transform: cam.id === 'CAM-02' ? 'translate(32px, -34px)' : undefined,
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
                {showCCTV && (
                  <span style={{ display: 'block', fontSize: 9, fontWeight: 500, opacity: 0.85 }}>
                    Estimated coverage · not verified
                  </span>
                )}
              </button>
            </Html>}
          </group>
        );
      })}

    </group>
  );
}
