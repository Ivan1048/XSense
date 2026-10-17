import { Html } from '@react-three/drei';
import { PLANNED_LIDARS } from '../../data/lidarPlan';

interface Props {
  showPosts?: boolean;
  showRanges?: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function LidarPlan({ showPosts = false, showRanges = false, selectedId, onSelect }: Props) {
  // Proposed post markers and range rings are visible only when showPosts is explicitly true
  if (!showPosts) {
    return null;
  }

  return (
    <group>
      {PLANNED_LIDARS.map((sensor) => {
        const selected = selectedId === sensor.id;
        return (
          <group key={sensor.id} position={[sensor.position[0], 0, sensor.position[1]]}>
            <group
              onClick={(e) => {
                e.stopPropagation();
                onSelect(sensor.id);
              }}
            >
              {/* Planning marker: smaller profile and amber finish distinct from active cyan smart poles */}
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.30, 0.36, 0.16, 8]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[0, 1.3, 0]}>
                <cylinderGeometry args={[0.07, 0.09, 2.4, 8]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              <mesh position={[0, 2.6, 0]}>
                <cylinderGeometry args={[0.22, 0.22, 0.36, 12]} />
                <meshStandardMaterial
                  color={selected ? '#fde68a' : '#d97706'}
                  emissive="#b45309"
                  emissiveIntensity={selected ? 0.45 : 0.18}
                />
              </mesh>
            </group>

            {/* Estimated planning range rings: visible only when both showPosts and showRanges are true */}
            {showRanges && (
              <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[sensor.range - 0.06, sensor.range, 64]} />
                <meshBasicMaterial
                  color={selected ? '#fef08a' : '#f59e0b'}
                  transparent
                  opacity={selected ? 0.8 : 0.28}
                  depthWrite={false}
                />
              </mesh>
            )}

            {selected && (
              <Html center position={[0, 3.4, 0]}>
                <div
                  className="pole-tag"
                  style={{
                    color: '#fef3c7',
                    background: 'rgba(26, 18, 7, 0.92)',
                    borderColor: '#f59e0b',
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {sensor.id} · Proposed Study
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
