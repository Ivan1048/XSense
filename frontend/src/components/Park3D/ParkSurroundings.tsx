// Elmina-inspired scenery, deliberately schematic rather than a surveyed replica.
import { useMemo, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

function Tree({ x, z, scale = 1, y = 0 }: { x: number; z: number; scale?: number; y?: number }) {
  return <group position={[x,y,z]} scale={scale}>
    <mesh position={[0,1.3,0]}><cylinderGeometry args={[0.2,0.35,2.6,6]} /><meshStandardMaterial color="#72533d" /></mesh>
    <mesh position={[0,3.2,0]} scale={[1.2,1,1]}><icosahedronGeometry args={[1.7,1]} /><meshStandardMaterial color="#3c7553" flatShading /></mesh>
    <mesh position={[0.7,3.6,0.2]}><icosahedronGeometry args={[1.1,0]} /><meshStandardMaterial color="#609463" flatShading /></mesh>
  </group>;
}
function Rock({x,z,scale=1}: {x:number;z:number;scale?:number}) {
  return <mesh position={[x,scale*0.35,z]} rotation={[0.1,x,0.2]} scale={[scale,scale*0.7,scale*0.85]}>
    <dodecahedronGeometry args={[1,0]} /><meshStandardMaterial color="#8b9487" roughness={1} flatShading />
  </mesh>;
}
function Trail({ points, width=2.2, color='#d6cbb6' }: {points:[number,number][];width?:number;color?:string}) {
  const geometry=useMemo(()=>{
    const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0.065,z)),false,'centripetal');
    const vertices:number[]=[]; const indices:number[]=[];
    for(let i=0;i<=120;i++){
      const p=curve.getPoint(i/120); const t=curve.getTangent(i/120);
      vertices.push(p.x-t.z*width/2,p.y,p.z+t.x*width/2,p.x+t.z*width/2,p.y,p.z-t.x*width/2);
      if(i<120){const b=i*2;indices.push(b,b+2,b+1,b+1,b+2,b+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[points,width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} side={THREE.DoubleSide} /></mesh>;
}
function House({x,z,nightMode}: {x:number;z:number;nightMode:boolean}) {
  return <group position={[x,0,z]}>
    <mesh position={[0,0.08,0]}><boxGeometry args={[6.2,0.16,7]} /><meshStandardMaterial color="#b4b5a6" /></mesh>
    <mesh position={[0,2.1,0]}><boxGeometry args={[4.5,4.2,4.8]} /><meshStandardMaterial color="#ddd7c8" /></mesh>
    <mesh position={[0,4.7,0]} rotation={[0,Math.PI/4,0]} scale={[1,0.38,1]}><coneGeometry args={[3.8,3,4]} /><meshStandardMaterial color="#53646a" /></mesh>
    {[1.3,3.1].map(y=><group key={y}>
      <mesh position={[-2.26,y,0]}><boxGeometry args={[0.04,0.85,2.6]} /><meshStandardMaterial color={nightMode?'#ffe0a0':'#719ba6'} emissive={nightMode?'#b98c4b':'#000000'} emissiveIntensity={0.35} /></mesh>
      <mesh position={[0,y,2.41]}><boxGeometry args={[2.8,0.85,0.04]} /><meshStandardMaterial color="#719ba6" /></mesh>
    </group>)}
    <mesh position={[-2.28,0.9,-1.7]}><boxGeometry args={[0.06,1.8,0.7]} /><meshStandardMaterial color="#786550" /></mesh>
    <mesh position={[-3.6,0.07,0]}><boxGeometry args={[2.5,0.14,2]} /><meshStandardMaterial color="#d8d3c6" /></mesh>
  </group>;
}
function Playground() {
  return <group position={[-29,0,7]}>
    <mesh position={[0,0.06,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[6.3,48]} /><meshStandardMaterial color="#c68a68" /></mesh>
    <mesh position={[0,0.075,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[5.3,48]} /><meshStandardMaterial color="#e1bd7d" /></mesh>
    {/* Low play tower and slide, clear of the surrounding walkway. */}
    <group position={[-2,0,0]}>
      {[-0.8,0.8].flatMap(x=>[-0.8,0.8].map(z=><mesh key={`${x}-${z}`} position={[x,1.1,z]}><cylinderGeometry args={[0.1,0.1,2.2,6]} /><meshStandardMaterial color="#3c8d9c" /></mesh>))}
      <mesh position={[0,1.5,0]}><boxGeometry args={[2,0.2,2]} /><meshStandardMaterial color="#e1b758" /></mesh>
      <mesh position={[0,2.8,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[1.6,1,4]} /><meshStandardMaterial color="#cf6650" /></mesh>
      <mesh position={[0,0.85,2]} rotation={[-0.48,0,0]}><boxGeometry args={[1.1,0.12,3]} /><meshStandardMaterial color="#5caac0" /></mesh>
    </group>
    <group position={[2.4,0,-1]}>
      {[-1.3,1.3].map(x=><mesh key={x} position={[x,1.5,0]}><cylinderGeometry args={[0.1,0.1,3,6]} /><meshStandardMaterial color="#df9b48" /></mesh>)}
      <mesh position={[0,3,0]}><boxGeometry args={[3,0.15,0.15]} /><meshStandardMaterial color="#df9b48" /></mesh>
      {[-0.45,0.45].map(x=><mesh key={x} position={[x,1.9,0]}><cylinderGeometry args={[0.025,0.025,2,5]} /><meshStandardMaterial color="#657078" /></mesh>)}
      <mesh position={[0,0.9,0]}><boxGeometry args={[1.2,0.14,0.5]} /><meshStandardMaterial color="#428789" /></mesh>
    </group>
  </group>;
}
const promenade:[number,number][]=[[-16.5,-15.5],[-24,-19],[-33,-16],[-38,-5],[-37,8],[-34,18],[-25,25],[-9,26],[8,25],[20,19],[16.5,12.5]];
const playAccess:[number,number][]=[[-12,10],[-19,15],[-27,16],[-34,18]];
const hills = [[-25,-35,13,9],[-8,-37,15,13],[11,-36,12,9]];
function hillHeight(x:number,z:number) {
  return Math.max(0, ...hills.map(([cx,cz,r,h]) => {
    const distance = ((x-cx)/r)**2 + ((z-cz)/(r*0.8))**2;
    return distance < 1 ? h*Math.sqrt(1-distance)-0.5 : 0;
  }));
}
const woodlandTrees=Array.from({length:28},(_,i)=>({x:-36+(i%14)*4.8,z:-26-Math.floor(i/14)*6,scale:0.7+(i%4)*0.12}));
const streetTrees=Array.from({length:9},(_,i)=>({x:22,z:-21+i*5.5,scale:0.65}));

export default function ParkSurroundings({nightMode}:{nightMode:boolean}) {
  return <group>
    {/* Sculpted hills sit behind the public park, not on its paths. */}
    {hills.map(([x,z,r,h],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,-0.5,0]} scale={[1,h/r,0.8]}><sphereGeometry args={[r,12,6,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial color={['#527c59','#62886a','#547763'][i]} flatShading /></mesh>
      <mesh position={[1,h-0.5,-1]} scale={[3,2,2.8]}><dodecahedronGeometry args={[1,0]} /><meshStandardMaterial color="#8b9989" flatShading /></mesh>
    </group>)}
    <Trail points={promenade} />
    <Trail points={playAccess} />
    <Trail points={[[-29,13],[-29,16]]} width={2} />
    <Trail points={[[8.2,-11.8],[14,-20],[22,-23],[26,-23]]} />
    {/* Residential street and southern arrival boulevard. */}
    <Trail points={[[27,-27],[27,-10],[27,11],[25,28],[10,32],[-15,32],[-31,28]]} width={4.5} color="#59636a" />
    {[-23,-14,-5,4,13,22].map(z=><House key={z} x={35} z={z} nightMode={nightMode} />)}
    {[-22,-13,-4,5,14].map(z=><mesh key={z} position={[27,0.075,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[0.12,2]} /><meshBasicMaterial color="#dad6bd" /></mesh>)}
    <Playground />
    {woodlandTrees.map((t,i)=><Tree key={`forest-${i}`} {...t} y={hillHeight(t.x,t.z)} />)}
    {streetTrees.map((t,i)=><Tree key={`street-${i}`} {...t} />)}
    {[[-38,-13],[-36,0],[-37,16],[-23,20],[-21,5],[-26,-8],[-30,-10],[-14,23],[5,28],[17,23]].map(([x,z],i)=><Tree key={`garden-${i}`} x={x} z={z} scale={0.8+(i%3)*0.15} />)}
    {[[-34,-22],[-30,-23],[-22,-25],[-18,-25],[0,-27],[17,-28],[-38,3],[-37,12],[-23,19],[-20,21],[17,22],[18,24]].map(([x,z],i)=><Rock key={i} x={x} z={z} scale={0.65+(i%3)*0.4} />)}
    {/* Additional walkway lights are scenery, independent of sensors. */}
    {[[-26,-20],[-35,-14],[-39,-5],[-38,7],[-35,18],[-26,26],[-16,27],[-5,27],[8,26],[19,21],[-23,16],[-20,12],[15,-21]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,1.65,0]}><cylinderGeometry args={[0.075,0.12,3.3,6]} /><meshStandardMaterial color="#718188" /></mesh>
      <mesh position={[0,3.3,0]}><boxGeometry args={[0.5,0.16,0.5]} /><meshStandardMaterial color="#fff0c4" emissive="#ffdf99" emissiveIntensity={nightMode?1:0.1} /></mesh>
    </group>)}
    {[
      {p:[-12,0.1,-24],label:'WOODLAND RIDGE'},
      {p:[-28,0.1,20],label:'PLAY GARDEN'},
      {p:[35,0.2,29],label:'RESIDENCES'},
    ].map(({p,label})=><Text key={label} position={p as [number,number,number]} rotation={[-Math.PI/2,0,0]} fontSize={1} color={nightMode?'#c8ded2':'#33534a'}>{label}</Text>)}
  </group>;
}
