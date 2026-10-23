import { Html } from '@react-three/drei';
import { POLES } from '../../data/parkData';

import { AUDIO_COVERAGE } from '../../data/audioData';
export { AUDIO_COVERAGE } from '../../data/audioData';

export default function AudioCoverage({ showLabels }: { showLabels: boolean }) {
  return <group>
    {AUDIO_COVERAGE.map(sensor => {
      const pole = POLES.find(p => p.id === sensor.poleId);
      if (!pole) return null;
      return <group key={sensor.id} position={[pole.position[0], 0, pole.position[1]]}>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[sensor.radius - 0.12, sensor.radius, 80]} />
          <meshBasicMaterial color="#c4a5ff" transparent opacity={0.65} depthWrite={false} />
        </mesh>
        {showLabels && <Html position={[0, 2.6, 0]} center>
          <span className="pole-tag" style={{color:'#e4d5ff',background:'#392952'}}>{sensor.id} · Audio demo</span>
        </Html>}
      </group>;
    })}
  </group>;
}
