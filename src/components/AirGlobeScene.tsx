// Three.js: NASA's GEOS aerosol still wrapped on a globe that turns under a fixed needle.
// The needle is the front meridian; the longitude under it is the slice being played.
// Presentation only: it follows the audio clock's step events and never schedules sound.
import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useLoader,useThree} from '@react-three/fiber';
import {AdditiveBlending,BackSide,BufferGeometry,Float32BufferAttribute,SRGBColorSpace,TextureLoader} from 'three';
import type {Group,Mesh,MeshBasicMaterial} from 'three';
import {STEP_DEG,type GlobeTarget} from './AirTurntable';

const RAD=Math.PI/180;
/** Rotation that puts longitude `lon` in front of the camera (three.js maps texture u=0.25, lon −90°, to +z). */
const yawFor=(lon:number)=>-(lon+90)*RAD;
const shortest=(d:number)=>{const t=Math.PI*2;return ((d%t)+t*1.5)%t-t/2;};

type Props={target:GlobeTarget;playing:boolean;pulse:number;motion:boolean;accent:string;texture:string;onReady:(invalidate:()=>void)=>void;onUnavailable:()=>void};

function Stars(){
  const geometry=useMemo(()=>{
    const g=new BufferGeometry(),n=420,pos=new Float32Array(n*3);
    let seed=5669;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<n;i++){const u=rnd()*2-1,a=rnd()*Math.PI*2,r=9+rnd()*4,s=Math.sqrt(1-u*u);pos.set([r*s*Math.cos(a),r*u,r*s*Math.sin(a)-4],i*3);}
    g.setAttribute('position',new Float32BufferAttribute(pos,3));return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <points geometry={geometry}><pointsMaterial color="#cfe3ff" size={0.035} sizeAttenuation transparent opacity={0.75}/></points>;
}

function Globe({target,playing,pulse,motion,accent,texture:textureUrl,onReady,onUnavailable}:Props){
  const {invalidate,gl}=useThree();
  const texture=useLoader(TextureLoader,textureUrl);
  useMemo(()=>{texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;},[texture]);
  const tilt=useRef<Group>(null),spin=useRef<Mesh>(null),needle=useRef<Mesh>(null),glow=useRef<Mesh>(null),stars=useRef<Group>(null);
  const pulseAt=useRef(0);
  useEffect(()=>{pulseAt.current=performance.now();invalidate();},[pulse,invalidate]);
  useEffect(()=>{invalidate();},[target,playing,motion,invalidate]);
  useEffect(()=>{
    const canvas=gl.domElement,lost=(e:Event)=>{e.preventDefault();onUnavailable();};
    canvas.addEventListener('webglcontextlost',lost);onReady(invalidate);
    return()=>canvas.removeEventListener('webglcontextlost',lost);
  },[gl,invalidate,onReady,onUnavailable]);
  useFrame((_,delta)=>{
    if(!tilt.current||!spin.current||!needle.current||!glow.current)return;
    const dt=Math.min(delta,.05),now=performance.now();
    // Glide across the current slice while it sounds, so the planet turns smoothly under the needle.
    const progress=playing&&target.glide&&motion?Math.min(1,(now-target.at)/(target.dur*1000)):0;
    const lon=target.lon+(progress-.5)*STEP_DEG*(target.glide?1:0);
    const blend=motion?1-Math.exp(-dt*(playing?10:4)):1;
    const yaw=yawFor(lon),pitch=Math.max(-.5,Math.min(.5,target.lat*RAD*.55))+.12;
    spin.current.rotation.y+=shortest(yaw-spin.current.rotation.y)*blend;
    tilt.current.rotation.x+=(pitch-tilt.current.rotation.x)*blend;
    if(stars.current&&motion)stars.current.rotation.y+=dt*.004;
    const age=(now-pulseAt.current)/1000,flash=motion?Math.exp(-age*4):0;
    (needle.current.material as MeshBasicMaterial).opacity=.55+.45*flash;
    glow.current.scale.setScalar(1.06+.025*flash);
    const settled=Math.abs(shortest(yaw-spin.current.rotation.y))<1e-4&&Math.abs(pitch-tilt.current.rotation.x)<1e-4&&flash<.01;
    if(playing||!settled)invalidate();
  });
  return <>
    <group ref={stars}><Stars/></group>
    <group ref={tilt}>
      <mesh ref={spin}><sphereGeometry args={[1,96,64]}/><meshBasicMaterial map={texture}/></mesh>
    </group>
    <mesh ref={glow}><sphereGeometry args={[1,48,32]}/><meshBasicMaterial color="#7fb2ff" transparent opacity={.13} side={BackSide} blending={AdditiveBlending} depthWrite={false}/></mesh>
    {/* The needle: a fixed half-ring on the front meridian. */}
    <group rotation={[0,-Math.PI/2,0]}><mesh ref={needle} rotation={[0,0,-Math.PI/2]}><torusGeometry args={[1.012,.0075,8,96,Math.PI]}/><meshBasicMaterial color={accent} transparent opacity={.7} depthTest={false}/></mesh></group>
    <mesh position={[0,1.08,.08]}><coneGeometry args={[.045,.12,16]}/><meshBasicMaterial color={accent}/></mesh>
  </>;
}

export default function AirGlobeScene(props:Props){
  return <Canvas frameloop="demand" dpr={[1,2]} camera={{position:[0,0,3.1],fov:42}} gl={{antialias:true,alpha:true,powerPreference:'low-power'}} onCreated={({gl})=>{gl.setClearColor(0x000000,0);}}>
    <Globe {...props}/>
  </Canvas>;
}
