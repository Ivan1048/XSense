import React, {useState, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas, useFrame} from '@react-three/fiber';
import {OrbitControls, Text, Html} from '@react-three/drei';
import * as THREE from 'three';
import './style.css';

const POLES = [
  {id:'AS-101', name:'North Entrance', at:[-15,-13]},
  {id:'AS-102', name:'Lakeside', at:[-4,-9]},
  {id:'AS-103', name:'Central Path', at:[1,1]},
  {id:'AS-104', name:'West Loop', at:[-12,10]},
  {id:'AS-105', name:'East Exit', at:[14,11]},
];
const PARK_BOUND=22;
function Box({position,scale,color, ...rest}){return <mesh position={position} scale={scale} castShadow receiveShadow {...rest}><boxGeometry/><meshStandardMaterial color={color}/></mesh>}
function Tree({x,z,s=1}){return <group position={[x,0,z]} scale={s}><mesh position={[0,1,0]} castShadow><cylinderGeometry args={[.2,.3,2,6]}/><meshStandardMaterial color="#785c43"/></mesh><mesh position={[0,2.45,0]} castShadow><coneGeometry args={[1.25,2.8,7]}/><meshStandardMaterial color="#357959"/></mesh><mesh position={[0,3.3,0]} castShadow><coneGeometry args={[.95,2.2,7]}/><meshStandardMaterial color="#4c9168"/></mesh></group>}
const TREES = [[-19,-18],[19,-18],[-19,18],[19,18],[-18,-7],[18,-7],[-18,5],[18,5],[-7,18],[7,18],[-9,-17],[9,-17],[-6,13],[11,-2],[-15,15]];
function Park(){return <group><Box position={[0,-.22,0]} scale={[47,.4,47]} color="#598964"/>
  <Box position={[0,.015,0]} scale={[4.5,.06,42]} color="#bebbb2"/>
  <Box position={[0,.02,0]} scale={[40,.05,4.3]} color="#c8c3b8"/>
  <Box position={[-10,.025,-10]} scale={[19,.05,3.2]} rotation={[0,Math.PI/4,0]} color="#c8c3b8"/>
  <Box position={[12,.025,11]} scale={[20,.05,3.1]} rotation={[0,Math.PI/4,0]} color="#c8c3b8"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[10,.025,-12]}><circleGeometry args={[5,40]}/><meshStandardMaterial color="#459caa" transparent opacity={.85}/></mesh>
  {TREES.map(([x,z],i)=><Tree key={i} x={x} z={z} s={i%3===0?.85:1}/>) }
  {[[-8,2],[-8,5],[7,6]].map(([x,z],i)=><group key={i} position={[x,0,z]}><Box position={[0,.65,0]} scale={[2,.2,.7]} color="#957254"/><Box position={[-.75,.3,0]} scale={[.15,.6,.6]} color="#5e5550"/><Box position={[.75,.3,0]} scale={[.15,.6,.6]} color="#5e5550"/></group>)}
  <Text position={[-14,.06,-20]} rotation={[-Math.PI/2,0,0]} fontSize={1.4} color="#f7fafb" anchorX="center">XSENSE PARK</Text>
  </group>}
function SensorPole({data,selected,onSelect,isAlert,brightness,coverage}){const [x,z]=data.at;return <group position={[x,0,z]}>
  <mesh position={[0,2,0]} castShadow onClick={e=>{e.stopPropagation();onSelect(data.id)}}><cylinderGeometry args={[.15,.21,4,10]}/><meshStandardMaterial color={isAlert?'#f77664':'#c5d5db'}/></mesh>
  <mesh position={[0,4,0]} onClick={e=>{e.stopPropagation();onSelect(data.id)}}><boxGeometry args={[.8,.3,.7]}/><meshStandardMaterial color={brightness===0?'#414853':'#f1cf8d'} emissive={brightness===0?'#000000':'#f4ba6b'} emissiveIntensity={brightness/100*.55}/></mesh>
  <mesh position={[0,3.55,.22]}><boxGeometry args={[.48,.3,.22]}/><meshStandardMaterial color="#142d41"/></mesh>
  {brightness>0&&<pointLight position={[0,3.7,0]} intensity={brightness/100*5} distance={9} decay={2} color="#ffd59b"/>}
  {coverage&&<mesh position={[0,.055,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[7,48]}/><meshBasicMaterial color="#55bac9" transparent opacity={.10} depthWrite={false} side={THREE.DoubleSide}/></mesh>}
  <Html position={[0,4.8,0]} center distanceFactor={25}><button className={'pole-tag '+(selected?'selected':'')+(isAlert?' alert':'')} onClick={()=>onSelect(data.id)}>{data.id}</button></Html>
  </group>}
function MovingDot({path,paused,highlight,onClick}){const ref=useRef();useFrame(({clock})=>{if(!ref.current||paused)return;const t=(clock.getElapsedTime()*path.speed+path.offset)%(Math.PI*2);ref.current.position.x=path.x+Math.cos(t)*path.radius;ref.current.position.z=path.z+Math.sin(t)*path.radius*.65});return <mesh ref={ref} position={[path.x,.35,path.z]} onClick={e=>{e.stopPropagation();onClick()}}><sphereGeometry args={[highlight?.44:.33,16,12]}/><meshStandardMaterial color={highlight?'#ffb759':'#5ee6da'} emissive={highlight?'#d68025':'#0d7077'} emissiveIntensity={.38}/></mesh>}
const PEOPLE=[{x:-11,z:-2,radius:2.5,speed:.34,offset:0},{x:5,z:2,radius:3,speed:.26,offset:1.5},{x:11,z:10,radius:1.3,speed:.48,offset:3},{x:-3,z:8,radius:3,speed:.31,offset:2},{x:0,z:-13,radius:1,speed:.37,offset:4}];
function People({paused,fall}){return <>{PEOPLE.map((p,i)=><MovingDot key={i} path={p} paused={paused || (fall&&i===0)} highlight={fall&&i===0} onClick={()=>{}}/>)}</>}
function World({selected,setSelected,lighting,showCoverage,fall,paused,night}){return <><color attach="background" args={[night?'#101d2c':'#9fbed0']}/><ambientLight intensity={night?.18:1.3}/><directionalLight position={[12,25,10]} intensity={night?.22:2.1} castShadow/><Park/>
  {POLES.map(p=><SensorPole key={p.id} data={p} selected={selected===p.id} onSelect={setSelected} isAlert={fall&&p.id==='AS-104'} brightness={lighting[p.id]} coverage={showCoverage}/>)}
  <People paused={paused} fall={fall}/><gridHelper args={[46,23,'#8ab5bd','#8ab5bd']} position={[0,.04,0]} visible={false}/><OrbitControls makeDefault minDistance={12} maxDistance={95} maxPolarAngle={Math.PI/2.15} target={[0,0,0]}/></>}
function initialLighting(){return Object.fromEntries(POLES.map(p=>[p.id,70]))}
function App(){const [selected,setSelected]=useState('AS-104');const [lighting,setLighting]=useState(initialLighting);const [night,setNight]=useState(true);const [showCoverage,setShowCoverage]=useState(false);const [fall,setFall]=useState(false);const [paused,setPaused]=useState(false);const [events,setEvents]=useState([{id:1,title:'Simulation ready',message:'Virtual park initialized; no real sensors connected.',at:new Date().toLocaleTimeString(),kind:'info'}]);
 const addEvent=(title,message,kind='info')=>setEvents(e=>[{id:Date.now()+Math.random(),title,message,kind,at:new Date().toLocaleTimeString()},...e].slice(0,12));
 const setPoleLight=(id,v)=>setLighting(l=>({...l,[id]:v}));
 const triggerFall=()=>{setFall(true);setSelected('AS-104');addEvent('Possible fall — AS-104','SIMULATED movement anomaly. Operator review required.','urgent')};
 const triggerDark=()=>{setPoleLight('AS-102',0);setSelected('AS-102');addEvent('Low lighting — AS-102','SIMULATED path brightness below demo threshold. Inspect lighting.','warning')};
 const reset=()=>{setLighting(initialLighting());setFall(false);setSelected('AS-104');addEvent('Simulation reset','Alerts and lighting returned to default.')};
 const chosen=POLES.find(p=>p.id===selected);
 return <div className="layout"><header><div><span className="brand-mark">✦</span><strong>XSense</strong><span className="sub">3D Park Monitoring</span></div><span className="demo-label">SIMULATION ONLY · NO LIVE SENSORS</span></header>
 <section className="workspace"><div className="viewer"><div className="viewer-top"><div><h1>Park overview</h1><p>Orbit: drag · Zoom: scroll · Select poles: click labels</p></div><div className="switches"><label><input type="checkbox" checked={night} onChange={e=>setNight(e.target.checked)}/> Night mode</label><label><input type="checkbox" checked={showCoverage} onChange={e=>setShowCoverage(e.target.checked)}/> LiDAR coverage</label><label><input type="checkbox" checked={paused} onChange={e=>setPaused(e.target.checked)}/> Pause dots</label></div></div>
 <div className="canvas-wrap"><Canvas shadows camera={{position:[30,35,39],fov:48,near:.1,far:250}}><World selected={selected} setSelected={setSelected} lighting={lighting} showCoverage={showCoverage} fall={fall} paused={paused} night={night}/></Canvas><span className="canvas-stamp">Visual positions and lighting are simulated</span></div>
 <div className="legend"><span><i className="dot teal"/> Anonymous moving dot</span><span><i className="dot amber"/> Possible fall</span><span><i className="dot blue"/> Virtual sensor coverage</span></div></div>
 <aside className="sidebar"><section className="panel"><h2>Simulation controls</h2><div className="actions"><button className="danger" onClick={triggerFall}>Simulate possible fall</button><button className="secondary" onClick={triggerDark}>Simulate dark pathway</button><button className="secondary" onClick={()=>{setPoleLight('AS-102',85);addEvent('Lighting restored','AS-102 demo brightness restored.')}}>Restore AS-102 light</button><button className="outline" onClick={reset}>Reset demo</button></div></section>
 <section className="panel"><h2>Selected pole</h2><label className="field-label" htmlFor="pole-select">Sensor pole</label><select id="pole-select" value={selected} onChange={e=>setSelected(e.target.value)}>{POLES.map(p=><option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select><p className="muted">{chosen.name} · Simulated sensor data</p>
 <div className="metric"><span>Virtual lamp setting</span><strong>{lighting[selected]}%</strong></div><input aria-label="Virtual light brightness" type="range" min="0" max="100" value={lighting[selected]} onChange={e=>setPoleLight(selected,Number(e.target.value))}/><div className="metric"><span>Lighting condition</span><strong className={lighting[selected]<30?'bad':'good'}>{lighting[selected]<30?'Review needed':'Normal (demo)'}</strong></div>{lighting[selected]<30&&<p className="notice">Low-light warning: virtual setting only, not a measured lux value.</p>}
 <div className="metric"><span>Virtual LiDAR</span><strong>Available (simulated)</strong></div><div className="metric"><span>Fall review</span><strong className={fall&&selected==='AS-104'?'bad':''}>{fall&&selected==='AS-104'?'Open · Review':'No active event'}</strong></div></section>
 <section className="panel"><h2>Incident & event feed</h2><div className="feed">{events.map(e=><article className={'event '+e.kind} key={e.id}><div><strong>{e.title}</strong><small>{e.at}</small></div><p>{e.message}</p></article>)}</div></section></aside></section><footer>XSense proof of concept — anonymous movement and simulated sensor readings. A dot stopping does not prove a fall. No emergency service is connected.</footer></div>}

createRoot(document.getElementById('root')).render(<App/>);
