import { Html } from '@react-three/drei';
import { PLANNED_LIDARS } from '../../data/lidarPlan';

interface Props {
  showRanges: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function LidarPlan({ showRanges, selectedId, onSelect }: Props) {
  return <group>
    {PLANNED_LIDARS.map(sensor => {
      const selected = selectedId === sensor.id;
      return <group key={sensor.id} position={[sensor.position[0], 0, sensor.position[1]]}>
        <group onClick={e => { e.stopPropagation(); onSelect(sensor.id); }}>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.42, 0.5, 0.2, 8]} /><meshStandardMaterial color="#576779" /></mesh>
          <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.10, 0.14, 3, 8]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          <mesh position={[0, 3.2, 0]}><cylinderGeometry args={[0.32, 0.32, 0.5, 12]} /><meshStandardMaterial color={selected ? '#fff4b0' : '#f4bf62'} emissive="#a36b15" emissiveIntensity={0.25} /></mesh>
        </group>
        {showRanges && <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[sensor.range - 0.07, sensor.range, 80]} />
          <meshBasicMaterial color={selected ? '#fff0b8' : '#f6c86c'} transparent opacity={selected ? 0.9 : 0.32} depthWrite={false} />
        </mesh>}
        {selected && <Html center position={[0, 4.5, 0]}>
          <div className="pole-tag" style={{color:'#ffe3a4', borderColor:'#f6c86c'}}>{sensor.id} · Proposed</div>
        </Html>}
      </group>;
    })}
  </group>;
}
