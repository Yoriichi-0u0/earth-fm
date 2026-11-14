// The jukebox cabinet: every record on the shelf stands in a Three.js carousel, its NASA
// visual on the label. Choosing a record swings it to the front and lifts it out; while a
// record plays, the chosen disc spins. Decorative: the shelf buttons are the accessible
// controls, and this canvas is hidden from assistive technology.
import {Component,useEffect,useMemo,useRef,useState} from 'react';
import type {ErrorInfo,ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,TextureLoader} from 'three';
import type {Group,Texture} from 'three';
import {DECK_EVENT,type DeckEventDetail} from '../lib/deckEvents';
import './JukeboxStage.css';

/** focus: the label's crop centre as fractions of the image (default: the middle). */
export type StageRecord={id:string;title:string;number:string;accent:string;image?:string;focus?:[number,number]};
type Props={records:readonly StageRecord[];selected:string;motion:boolean;onSelect:(id:string)=>void};


class Boundary extends Component<{children:ReactNode;onFail:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(_e:Error,_i:ErrorInfo){this.props.onFail();}
  render(){return this.state.failed?null:this.props.children;}
}

/** A round label: a square crop of the record's NASA image around its focus, with its number on a band. */
function labelTexture(record:StageRecord,image?:HTMLImageElement){
  const c=document.createElement('canvas');c.width=c.height=256;
  const g=c.getContext('2d')!;
  g.fillStyle=record.accent;g.fillRect(0,0,256,256);
  if(image){
    const w=image.naturalWidth,h=image.naturalHeight,s=Math.min(w,h),[fx,fy]=record.focus??[.5,.5];
    const sx=Math.max(0,Math.min(w-s,fx*w-s/2)),sy=Math.max(0,Math.min(h-s,fy*h-s/2));
    g.drawImage(image,sx,sy,s,s,0,0,256,256);
  }
  g.fillStyle='#000000a0';g.fillRect(0,176,256,48);
  g.fillStyle='#ffffff';g.textAlign='center';g.font='700 22px sans-serif';g.fillText(`${record.number} · ${record.title.toUpperCase().slice(0,16)}`,128,208);
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;
}

const SPACING=1.12;

function Disc({record,index,offset,selected,playing,motion,onSelect,onLabel}:{record:StageRecord;index:number;offset:{current:number};selected:boolean;playing:boolean;motion:boolean;onSelect:(id:string)=>void;onLabel:()=>void}){
  const pose=useRef<Group>(null),spin=useRef<Group>(null);
  const [label,setLabel]=useState<Texture>(()=>labelTexture(record));
  useEffect(()=>{
    if(!record.image){onLabel();return;}let alive=true;
    new TextureLoader().load(record.image,tex=>{if(!alive)return;const next=labelTexture(record,tex.image as HTMLImageElement);setLabel(prev=>{prev.dispose();return next;});tex.dispose();onLabel();},undefined,()=>onLabel());
    return()=>{alive=false;};
  },[record]);
  useEffect(()=>()=>label.dispose(),[label]);
  useFrame((_,delta)=>{
    const p=pose.current;if(!p||!spin.current)return;
    const k=motion?1-Math.exp(-Math.min(delta,.05)*7):1;
    // Position on the rack: a shallow arc that bends away from the centre, like a jukebox window.
    const x=index*SPACING+offset.current,away=Math.min(1,Math.abs(x)/3);
    const tx=x,ty=selected?.06:-.08,tz=selected?.35:-away*.9,ry=-x*.42,rx=selected?-.05:-.22,sc=selected?1.02:.82;
    p.position.x=tx; // the rack offset is already eased
    p.position.y+=(ty-p.position.y)*k;p.position.z+=(tz-p.position.z)*k;
    p.rotation.y+=(ry-p.rotation.y)*k;p.rotation.x+=(rx-p.rotation.x)*k;
    const s=p.scale.x+(sc-p.scale.x)*k;p.scale.setScalar(s);
    if(selected&&playing&&motion)spin.current.rotation.z-=delta*2.2;
  });
  return <group ref={pose} onClick={e=>{e.stopPropagation();onSelect(record.id);}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
    <group ref={spin}>
      <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.62,.62,.03,64]}/><meshStandardMaterial color="#0d1218" metalness={.55} roughness={.32}/></mesh>
      {[0,1,2,3,4,5].map(r=><mesh key={r} position={[0,0,.016]}><ringGeometry args={[.36+r*.045,.362+r*.045,64]}/><meshBasicMaterial color="#2e3946"/></mesh>)}
      <mesh position={[0,0,.017]}><circleGeometry args={[.33,48]}/><meshBasicMaterial map={label} toneMapped={false}/></mesh>
      <mesh position={[0,0,.018]}><circleGeometry args={[.022,16]}/><meshBasicMaterial color="#0d1218"/></mesh>
    </group>
    {selected&&<mesh position={[0,0,-.03]}><ringGeometry args={[.64,.69,64]}/><meshBasicMaterial color={record.accent} toneMapped={false}/></mesh>}
  </group>;
}

function Carousel({records,selected,motion,onSelect,playing,onLabel}:Props&{playing:boolean;onLabel:()=>void}){
  const {invalidate}=useThree();
  const index=records.findIndex(r=>r.id===selected);
  const target=-(index<0?0:index)*SPACING;
  const offset=useRef(target),settle=useRef(0);
  useEffect(()=>{settle.current=performance.now();invalidate();},[selected,playing,motion,invalidate]);
  useFrame((_,delta)=>{
    const d=target-offset.current;
    offset.current+=motion?d*(1-Math.exp(-Math.min(delta,.05)*6)):d;
    if(motion&&(Math.abs(d)>.002||performance.now()-settle.current<1200||playing))invalidate();
  });
  const accent=records[index]?.accent??'#64d2ff';
  return <>
    <ambientLight intensity={1.15}/>
    <directionalLight position={[2,4,5]} intensity={2.6}/>
    <pointLight position={[0,1.4,2.2]} intensity={7} color={accent} distance={6}/>
    {/* The cabinet arch: a classic jukebox silhouette in the record's colour. */}
    <mesh position={[0,-.62,-1.3]}><torusGeometry args={[1.85,.04,12,96,Math.PI]}/><meshBasicMaterial color={accent} toneMapped={false}/></mesh>
    <mesh position={[0,-.62,-1.35]}><torusGeometry args={[1.66,.012,8,96,Math.PI]}/><meshBasicMaterial color="#ffffff" transparent opacity={.3}/></mesh>
    {records.map((r,i)=><Disc key={r.id} record={r} index={i} offset={offset} selected={r.id===selected} playing={playing} motion={motion} onSelect={onSelect} onLabel={onLabel}/>)}
  </>;
}

function webglAvailable(){
  try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}
}

export default function JukeboxStage(props:Props){
  const [failed,setFailed]=useState(()=>!webglAvailable());
  const [playing,setPlaying]=useState(false);
  // All label images fetched: lets tests (and diagnostics) know the stage has no requests left to make.
  const labels=useRef(0),[loaded,setLoaded]=useState(false);
  const onLabel=()=>{labels.current++;if(labels.current>=props.records.length)setLoaded(true);};
  useEffect(()=>{
    const on=(e:Event)=>setPlaying(Boolean((e as CustomEvent<DeckEventDetail>).detail?.playing));
    window.addEventListener(DECK_EVENT,on);return()=>window.removeEventListener(DECK_EVENT,on);
  },[]);
  const records=useMemo(()=>props.records,[props.records]);
  if(failed)return null;
  return <div className="jb-stage" aria-hidden="true" data-stage-playing={playing} data-stage-selected={props.selected} data-stage-labels={loaded?'loaded':'loading'}>
    <Boundary onFail={()=>setFailed(true)}>
      <Canvas camera={{position:[0,.38,4.3],fov:36}} dpr={[1,2]} frameloop="demand" gl={{alpha:true,antialias:true,powerPreference:'low-power'}} onCreated={({gl})=>gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setFailed(true);})}>
        <Carousel {...props} records={records} playing={playing} onLabel={onLabel}/>
      </Canvas>
    </Boundary>
  </div>;
}
