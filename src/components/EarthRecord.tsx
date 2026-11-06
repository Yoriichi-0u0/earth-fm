import {Component,lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import type {ErrorInfo,ReactNode} from 'react';
import {Rotate3D} from 'lucide-react';
import {useStudioLanguage} from '../lib/studioLanguage';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';

const Scene=lazy(()=>import('./RecordScene'));
class SceneBoundary extends Component<{children:ReactNode;onUnavailable:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(_error:Error,_info:ErrorInfo){this.props.onUnavailable();}
  render(){return this.state.failed?null:this.props.children;}
}

type Props={side:RecordSide;signal:RecordSignal;motion:boolean;onFlip:()=>void};
export default function EarthRecord({side,signal,motion,onFlip}:Props){
  const {t}=useStudioLanguage();
  const [three,setThree]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[visible,setVisible]=useState(true),[pageVisible,setPageVisible]=useState(!document.hidden);
  const root=useRef<HTMLDivElement>(null),pointer=useRef({x:0,y:0}),requestRender=useRef(()=>{});
  const unavailable=useCallback(()=>{setFailed(true);setReady(false);setThree(false);},[]);
  const sceneReady=useCallback((invalidate:()=>void)=>{requestRender.current=invalidate;setReady(true);},[]);
  useEffect(()=>{
    let frame=0;
    const measure=()=>{frame=0;const bounds=root.current?.getBoundingClientRect();if(bounds)setVisible(bounds.width>0&&bounds.height>0&&bounds.bottom>=-80&&bounds.top<=innerHeight+80&&bounds.right>=0&&bounds.left<=innerWidth);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);if(root.current)observer.observe(root.current);
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);measure();
    const visibility=()=>setPageVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);visibility();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const rendering=three&&visible&&pageVisible;
  useEffect(()=>{if(!rendering){setReady(false);requestRender.current=()=>{};}},[rendering]);
  return <div ref={root} className={`jb-earth-record ${motion?'has-motion':'motion-off'}${signal.playing&&motion?' is-spinning':''}${ready&&rendering?' is-three':''}`} data-record-renderer={ready&&rendering?'three':'2d'} data-record-in-view={visible} data-record-page-visible={pageVisible} data-note-serial={signal.event?.serial??0}>
    {signal.playing&&signal.event&&motion&&<span key={signal.event.serial} className="jb-note-halo" aria-hidden="true"/>}
    <button type="button" className="jb-vinyl-button" aria-label={t(side==='a'?'Flip to Side B: hear the measurements':'Flip to Side A: hear the picture')} onClick={onFlip}
      onPointerMove={e=>{if(!motion||e.pointerType==='touch')return;const bounds=e.currentTarget.getBoundingClientRect();pointer.current={x:(e.clientX-bounds.left)/bounds.width*2-1,y:(e.clientY-bounds.top)/bounds.height*2-1};if(rendering)requestRender.current();}}
      onPointerLeave={()=>{pointer.current={x:0,y:0};if(rendering)requestRender.current();}}>
      <span className={`jb-vinyl-fallback side-${side}`} aria-hidden="true"><span className="jb-vinyl-disc"><span className="jb-vinyl-label"><small>EARTH FM</small><i>◉</i><b>{side.toUpperCase()}</b></span><span className="jb-spindle"/></span></span>
      {rendering&&<span className="jb-three-canvas" aria-hidden="true"><SceneBoundary onUnavailable={unavailable}><Suspense fallback={null}><Scene side={side} signal={signal} motion={motion} pointer={pointer} onReady={sceneReady} onUnavailable={unavailable}/></Suspense></SceneBoundary></span>}
      <span className="jb-flip-hint"><Rotate3D size={13}/>{t('Flip the record')}</span>
    </button>
    <button type="button" className="jb-3d-toggle" aria-pressed={three} onClick={()=>{setReady(false);setFailed(false);setThree(v=>!v);}}>{t(three?'Use 2D record':'Try 3D record')}<span aria-hidden="true">{three?' ↙':' ↗'}</span></button>
    <p className="jb-record-art-caption">{t(failed?'2D active · 3D unavailable':'AI artwork · note activity')}</p>
    <span className="sr-only" role="status">{failed?t('3D is unavailable. The 2D record and all audio controls still work.'):three&&!ready?t('Loading the 3D record. Audio is ready independently.'):''}</span>
  </div>;
}
