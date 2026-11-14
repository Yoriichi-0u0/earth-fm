// The Air We Share: Earth as the record. A Three.js globe when WebGL is available and on screen;
// otherwise a 2D globe that slides NASA's map behind a shaded disc. Both show the same longitude.
import {Component,lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import type {ErrorInfo,ReactNode} from 'react';
import {useStudioLanguage} from '../lib/studioLanguage';
import {lonLabel} from '../lib/air/describe';

export const GLOBE_TEXTURE_URL='/nasa/svs5669/svs5669_globe_2048x1024.jpg';
export const STEP_DEG=360/64;
/** Where the needle should be: a longitude/latitude, and when the current slice started sounding. */
export type GlobeTarget={lon:number;lat:number;at:number;dur:number;glide:boolean};

const Scene=lazy(()=>import('./AirGlobeScene'));
class Boundary extends Component<{children:ReactNode;onFail:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(_e:Error,_i:ErrorInfo){this.props.onFail();}
  render(){return this.state.failed?null:this.props.children;}
}
const webgl=()=>{try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2')??c.getContext('webgl'));}catch{return false;}};

type Props={target:GlobeTarget;playing:boolean;pulse:number;motion:boolean;accent:string;caption:string};
export default function AirTurntable({target,playing,pulse,motion,accent,caption}:Props){
  const {t}=useStudioLanguage();
  const root=useRef<HTMLDivElement>(null);
  const [wanted,setWanted]=useState(true),[failed,setFailed]=useState(false),[ready,setReady]=useState(false),[visible,setVisible]=useState(true);
  const [supported]=useState(webgl);
  useEffect(()=>{
    const el=root.current;if(!el||typeof IntersectionObserver==='undefined')return;
    const io=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{rootMargin:'80px'});io.observe(el);
    const vis=()=>{if(document.hidden)setVisible(false);};document.addEventListener('visibilitychange',vis);
    return()=>{io.disconnect();document.removeEventListener('visibilitychange',vis);};
  },[]);
  const fail=useCallback(()=>{setFailed(true);setReady(false);},[]);
  const onReady=useCallback(()=>setReady(true),[]);
  const three=supported&&wanted&&!failed&&visible;
  const u=((target.lon+180)%360+360)%360/360;
  return <div ref={root} className={`air-turntable${playing&&motion?' is-playing':''}`} data-globe-renderer={three&&ready?'three':'2d'} data-globe-lon={target.lon.toFixed(2)}>
    <div className="air-globe" aria-hidden="true">
      <span className="air-globe-2d" style={{backgroundImage:`url(${GLOBE_TEXTURE_URL})`,backgroundPosition:`${(2*u-.5)*100}% ${50-target.lat*.25}%`,opacity:three&&ready?0:1,transition:motion?'background-position .35s cubic-bezier(.2,.8,.2,1)':'none'}}/>
      {three&&<span className="air-globe-3d"><Boundary onFail={fail}><Suspense fallback={null}><Scene target={target} playing={playing} pulse={pulse} motion={motion} accent={accent} onReady={onReady} onUnavailable={fail}/></Suspense></Boundary></span>}
      <span className="air-needle-tag" style={{color:accent}}>▼ {lonLabel(target.lon)}</span>
    </div>
    <p className="air-globe-caption">{caption}</p>
    {supported&&!failed&&<button type="button" className="air-globe-toggle" aria-pressed={wanted} onClick={()=>{setReady(false);setWanted(v=>!v);}}>{t(wanted?'Use flat globe':'Use 3D globe')}</button>}
    <span className="sr-only" role="status">{failed?t('3D globe unavailable. The map and every sound still work.'):''}</span>
  </div>;
}
