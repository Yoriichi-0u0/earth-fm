import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useLoader,useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,TextureLoader} from 'three';
import type {Group,Mesh,MeshBasicMaterial,OrthographicCamera} from 'three';
import type {MutableRefObject} from 'react';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';

export type SceneProps={side:RecordSide;signal:RecordSignal;motion:boolean;pointer:MutableRefObject<{x:number;y:number}>;onReady:(invalidate:()=>void)=>void;onUnavailable:()=>void};

/** Procedural groove relief and labels sit over separately attributed generated artwork. */
function makeTexture(side:RecordSide|'grooves'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  if(side==='grooves'){
    ctx.fillStyle='#777';ctx.fillRect(0,0,512,512);
    for(let radius=75;radius<256;radius+=2){ctx.strokeStyle=radius%4?'#444':'#aaa';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(256,256,radius,0,Math.PI*2);ctx.stroke();}
  }else{
    ctx.clearRect(0,0,512,512);ctx.shadowColor='#041118';ctx.shadowBlur=8;
    ctx.fillStyle=side==='a'?'#eff8d7':'#ffe0c5';ctx.textAlign='center';ctx.font='500 25px sans-serif';ctx.fillText('T E R R A J U K E',256,92);
    ctx.font='500 72px sans-serif';ctx.fillText(side.toUpperCase(),256,378);
    ctx.font='19px sans-serif';ctx.fillText('CLIMATE SPIRAL / 01',256,432);
  }
  const texture=new CanvasTexture(canvas);if(side!=='grooves')texture.colorSpace=SRGBColorSpace;return texture;
}

function Vinyl({side,signal,motion,pointer,onReady,onUnavailable}:SceneProps){
  const pose=useRef<Group>(null),spin=useRef<Group>(null),halo=useRef<Mesh>(null);
  const {invalidate,gl,size,camera}=useThree();
  const originalArt=useLoader(TextureLoader,'/art/terrajuke-vinyl-surface.jpg');
  const textures=useMemo(()=>{const surface=originalArt.clone();surface.colorSpace=SRGBColorSpace;surface.needsUpdate=true;return {surface,grooves:makeTexture('grooves'),a:makeTexture('a'),b:makeTexture('b')};},[originalArt]);
  const frameCount=useRef(0),lastPublish=useRef(0),fps=useRef(60);
  useEffect(()=>()=>{Object.values(textures).forEach(texture=>texture.dispose());},[textures]);
  useEffect(()=>{
    const orthographic=camera as OrthographicCamera;orthographic.zoom=Math.min(size.width,size.height)/3.25;orthographic.updateProjectionMatrix();invalidate();
  },[camera,size.width,size.height,invalidate]);
  useEffect(()=>{invalidate();},[side,signal.event?.serial,signal.playing,motion,invalidate]);
  useEffect(()=>{
    const canvas=gl.domElement;const lost=(event:Event)=>{event.preventDefault();onUnavailable();};
    canvas.addEventListener('webglcontextlost',lost);onReady(invalidate);
    return()=>canvas.removeEventListener('webglcontextlost',lost);
  },[gl,invalidate,onReady,onUnavailable]);
  useFrame((_,delta)=>{
    if(!pose.current||!spin.current||!halo.current)return;
    const now=performance.now(),dt=Math.min(delta,.05);
    const targetY=(side==='b'?Math.PI:0)-.28+pointer.current.x*.13;
    const targetX=-.18-pointer.current.y*.10;
    const blend=motion?1-Math.exp(-dt*9):1;
    pose.current.rotation.y+=(targetY-pose.current.rotation.y)*blend;
    pose.current.rotation.x+=(targetX-pose.current.rotation.x)*blend;
    const noteAge=signal.event?(now-signal.event.at)/1000:10;
    const pulse=motion&&signal.playing&&signal.frequency!==null?Math.exp(-noteAge*5):0;
    if(signal.playing&&motion)spin.current.rotation.z-=dt*.32;
    halo.current.scale.setScalar(1+pulse*.045);
    (halo.current.material as MeshBasicMaterial).opacity=.10+pulse*.40;
    frameCount.current++;
    if(delta>0&&delta<.2)fps.current=fps.current*.92+(1/delta)*.08;
    if(now-lastPublish.current>200){
      const host=gl.domElement.closest<HTMLElement>('[data-record-renderer]');
      if(host){host.dataset.recordFrames=String(frameCount.current);host.dataset.recordFps=fps.current.toFixed(1);host.dataset.recordDrawCalls=String(gl.info.render.calls);host.dataset.recordTriangles=String(gl.info.render.triangles);}
      lastPublish.current=now;
    }
    const settling=Math.abs(targetY-pose.current.rotation.y)+Math.abs(targetX-pose.current.rotation.x)>.001;
    if(motion&&(signal.playing||settling||pulse>.005))invalidate();
  });
  return <>
    <ambientLight intensity={1.3}/>
    <directionalLight position={[3,4,5]} intensity={4} color="#d5ebef"/>
    <directionalLight position={[-3,-1,3]} intensity={2.5} color="#d8b899"/>
    <group ref={pose} rotation={[-.18,-.28,0]}>
      <mesh ref={halo} position={[0,0,-.12]}><ringGeometry args={[1.43,1.455,96]}/><meshBasicMaterial color={side==='a'?'#d5f38b':'#f0b08b'} transparent opacity={.12} depthWrite={false}/></mesh>
      <group ref={spin}>
        <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[1.31,1.31,.075,96]}/><meshStandardMaterial color="#131e27" metalness={.68} roughness={.35}/></mesh>
        {[1,-1].map(face=><group key={face} position={[0,0,face*.039]} rotation={[0,face===-1?Math.PI:0,0]}>
          <mesh><ringGeometry args={[.13,1.30,96]}/><meshStandardMaterial color="#ffffff" map={textures.surface} metalness={.18} roughness={.48} bumpMap={textures.grooves} bumpScale={.008}/></mesh>
          <mesh position={[0,0,.003]}><ringGeometry args={[.11,.45,64]}/><meshBasicMaterial map={face===1?textures.a:textures.b} transparent toneMapped={false} depthWrite={false}/></mesh>
          <mesh position={[0,0,.005]}><ringGeometry args={[1.275,1.30,96]}/><meshStandardMaterial color="#70878b" metalness={.9} roughness={.24}/></mesh>
          <mesh position={[0,0,.006]}><ringGeometry args={[.10,.14,48]}/><meshStandardMaterial color="#b0bdb4" metalness={.8} roughness={.22}/></mesh>
        </group>)}
      </group>
    </group>
  </>;
}

/** Loaded only after an explicit 3D request. R3F owns geometry/material disposal and its frame subscription. */
export default function RecordScene(props:SceneProps){
  return <Canvas orthographic camera={{position:[0,0,6],zoom:75,near:.1,far:20}} dpr={1} frameloop="demand" gl={{alpha:true,antialias:false,powerPreference:'low-power'}} fallback={<span/>}>
    <Vinyl {...props}/>
  </Canvas>;
}
