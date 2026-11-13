import {useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {BufferGeometry,Color,Float32BufferAttribute,LineBasicMaterial,Line as ThreeLine} from 'three';
import type {Group,Mesh,MeshStandardMaterial} from 'three';
import type {ThreeEvent} from '@react-three/fiber';
import {climateSnapshot} from '../data/climateSpiral';
import type {RecordPoint} from '../lib/jukeboxData';
import {COIL_LENGTH as LENGTH,COIL_R_HIGH as R_HIGH,COIL_SPAN,coilPoint as point,coilRadius,coilRuns} from '../lib/climateCoil';

/** Three.js view of src/lib/climateCoil.ts. It draws the pinned 18 October 2026 GISTEMP snapshot; NASA did not render it. */
const COIL=coilRuns(climateSnapshot.years);
const coilPoint=(year:number,month:number,anomaly:number)=>point(year,month,anomaly,COIL.first,COIL.last);
const coilX=(year:number,month:number)=>coilPoint(year,month,0)[0];
const COOL=new Color('#2f7bff'),NEUTRAL=new Color('#8e8e93'),WARM=new Color('#ff3b30'),HOT=new Color('#ffd60a');
/** Fixed diverging colour: blue below the 1951–1980 mean, red above, yellow beyond +1 °C; same for every view. */
export function coilColor(anomaly:number){
  const c=new Color();
  if(anomaly<0)return c.lerpColors(NEUTRAL,COOL,Math.min(1,-anomaly/.6));
  return anomaly<=1?c.lerpColors(NEUTRAL,WARM,anomaly):c.lerpColors(WARM,HOT,Math.min(1,(anomaly-1)/(COIL_SPAN.high-1)));
}

type Props={beads:readonly RecordPoint[];current:RecordPoint;pulse:number;motion:boolean;onReady:()=>void;onUnavailable:()=>void;onSelect?:(index:number)=>void;onHover?:(index:number|null)=>void};

function useCoilLines(){
  return useMemo(()=>{
    const runs=COIL.runs.map(run=>run.positions),colors=COIL.runs.map(run=>run.anomalies.flatMap(value=>{const c=coilColor(value);return [c.r,c.g,c.b];}));
    return runs.map((positions,i)=>{
      const geometry=new BufferGeometry();
      geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
      geometry.setAttribute('color',new Float32BufferAttribute(colors[i],3));
      return new ThreeLine(geometry,new LineBasicMaterial({vertexColors:true,transparent:true,opacity:.92}));
    });
  },[]);
}

function Coil({beads,current,pulse,motion,onReady,onUnavailable,onSelect,onHover}:Props){
  const {invalidate,gl,camera,size}=useThree();
  const turn=useRef<Group>(null),halo=useRef<Mesh>(null),drag=useRef<{x:number;y:number}|null>(null);
  const angle=useRef({x:.35,y:-.5}),sway=useRef(0),pulseAt=useRef(0),cursor=useRef<Group>(null);
  const [hovered,setHovered]=useState<number|null>(null);
  const cursorX=coilX(current.year,current.month);
  const lines=useCoilLines();
  useEffect(()=>()=>{lines.forEach(line=>{line.geometry.dispose();(line.material as LineBasicMaterial).dispose();});},[lines]);
  useEffect(()=>{
    const canvas=gl.domElement,lost=(event:Event)=>{event.preventDefault();onUnavailable();};
    canvas.addEventListener('webglcontextlost',lost);onReady();
    const down=(e:PointerEvent)=>{drag.current={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!drag.current)return;angle.current.x+=(e.clientY-drag.current.y)*.008;angle.current.y+=(e.clientX-drag.current.x)*.006;angle.current.y=Math.max(-1.1,Math.min(1.1,angle.current.y));drag.current={x:e.clientX,y:e.clientY};invalidate();};
    const up=()=>{drag.current=null;};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    return()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
  },[gl,invalidate,onReady,onUnavailable]);
  useEffect(()=>{
    // Fit the whole time axis to the panel width at any aspect ratio.
    const aspect=size.width/Math.max(1,size.height),fov=28*Math.PI/180;
    const distance=Math.max((LENGTH/2+.45)/(Math.tan(fov/2)*aspect),(R_HIGH+.35)/Math.tan(fov/2));
    camera.position.set(0,0,distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();invalidate();
  },[camera,size.width,size.height,invalidate]);
  useEffect(()=>{pulseAt.current=performance.now();invalidate();},[pulse,current.period,invalidate]);
  useFrame((_,delta)=>{
    if(!turn.current)return;
    if(motion&&!drag.current){angle.current.x+=Math.min(delta,.05)*.18;sway.current+=Math.min(delta,.05)*.25;}
    turn.current.rotation.set(angle.current.x,angle.current.y+Math.sin(sway.current)*.18,0);
    // The time cursor glides to the current observation's year; with reduced motion it jumps.
    let gliding=false;
    if(cursor.current){const dx=cursorX-cursor.current.position.x;cursor.current.position.x=motion?cursor.current.position.x+dx*(1-Math.exp(-Math.min(delta,.05)*8)):cursorX;gliding=Math.abs(dx)>.002;}
    const age=(performance.now()-pulseAt.current)/1000,glow=motion?Math.exp(-age*4):0;
    if(halo.current){halo.current.scale.setScalar(1+glow*1.6);(halo.current.material as MeshStandardMaterial).opacity=.18+glow*.5;}
    if(motion&&!drag.current)invalidate();else if(glow>.01||gliding)invalidate();
  });
  const at=current.value===null?null:coilPoint(current.year,current.month,current.value);
  return <>
    <ambientLight intensity={1.1}/>
    <directionalLight position={[2,4,5]} intensity={2.2}/>
    <group ref={turn}>
      {lines.map((line,i)=><primitive key={i} object={line}/>)}
      {/* Reference rings at both ends: the 1951–1980 mean (0 °C) and +1.5 °C on the fixed scale. */}
      {[-1,1].flatMap(end=>[0,1.5].map(value=><mesh key={`${end}:${value}`} position={[end*(LENGTH/2+.06),0,0]} rotation={[0,Math.PI/2,0]}>
        <ringGeometry args={[coilRadius(value)-.008,coilRadius(value)+.008,96]}/>
        <meshBasicMaterial color={value===0?'#c7c7cc':'#ff9f0a'} transparent opacity={.75} depthWrite={false} side={2}/>
      </mesh>))}
      <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.012,.012,LENGTH+.3,8]}/><meshBasicMaterial color="#8e8e93"/></mesh>
      {/* Time cursor: a ring around the coil at the current observation's year. */}
      <group ref={cursor} position={[cursorX,0,0]}>
        <mesh rotation={[0,Math.PI/2,0]}><torusGeometry args={[R_HIGH+.09,.012,8,96]}/><meshBasicMaterial color="#2997ff" transparent opacity={.7} depthWrite={false}/></mesh>
      </group>
      {beads.map((point,index)=>{
        if(point.value===null)return null;
        const selected=point.period===current.period,over=hovered===index;
        const pick=onSelect?{
          onClick:(event:ThreeEvent<MouseEvent>)=>{if(event.delta>6)return;event.stopPropagation();onSelect(index);},
          onPointerOver:(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();setHovered(index);onHover?.(index);gl.domElement.style.cursor='pointer';invalidate();},
          onPointerOut:()=>{setHovered(value=>value===index?null:value);onHover?.(null);gl.domElement.style.cursor='';invalidate();},
        }:{};
        return <group key={point.period} position={coilPoint(point.year,point.month,point.value)}>
          <mesh scale={over&&!selected?1.45:1}>
            <sphereGeometry args={[selected?.085:.055,24,16]}/>
            <meshStandardMaterial color="#ffffff" emissive={selected?'#2997ff':over?'#64d2ff':'#5e5e63'} emissiveIntensity={selected?1.6:over?1.2:.5} roughness={.3}/>
          </mesh>
          {/* A larger invisible target keeps each January tappable on a phone. */}
          {onSelect&&<mesh {...pick}><sphereGeometry args={[.2,12,8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}
        </group>;
      })}
      {at&&<mesh ref={halo} position={at}><sphereGeometry args={[.12,24,16]}/><meshStandardMaterial color="#2997ff" emissive="#2997ff" emissiveIntensity={1} transparent opacity={.2} depthWrite={false}/></mesh>}
    </group>
  </>;
}

/** Loaded on demand. frameloop="demand" keeps it idle unless motion, a drag or a note pulse needs a frame. */
export default function ClimateCoil(props:Props){
  return <Canvas camera={{fov:28,near:.1,far:100,position:[0,0,14]}} dpr={[1,2]} frameloop="demand" gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={<span/>}>
    <Coil {...props}/>
  </Canvas>;
}
