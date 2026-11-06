import {useEffect,useRef} from 'react';
import type {PointerEvent,ReactNode} from 'react';
import {mapValueToNote} from '../lib/audio';
import type {FrameStep} from '../lib/imageSonification';
import {useStudioLanguage} from '../lib/studioLanguage';

type Props={children:ReactNode;enabled:boolean;steps:readonly FrameStep[];index:number;fit:{left:number;width:number};onSelect:(index:number)=>void;onCancel:()=>void};

/** Pointer surface has a native range equivalent; the image remains unmodified. */
export default function ScratchScanner({children,enabled,steps,index,fit,onSelect,onCancel}:Props){
  const {t}=useStudioLanguage();
  const range=useRef<HTMLInputElement>(null),pointer=useRef<number|null>(null),last=useRef(-1);
  useEffect(()=>{if(!enabled){pointer.current=null;last.current=-1;}},[enabled]);
  const step=steps[index],note=step?mapValueToNote(step.brightness,0,1):null;
  function select(event:PointerEvent<HTMLDivElement>,force=false){
    const bounds=event.currentTarget.getBoundingClientRect();
    if(!bounds.width)return;
    const next=Math.max(0,Math.min(steps.length-1,Math.floor((event.clientX-bounds.left)/bounds.width*steps.length)));
    if(force||last.current!==next){last.current=next;onSelect(next);}
  }
  function cancel(){pointer.current=null;last.current=-1;onCancel();}
  return <div className={`jb-scratch${enabled?' is-enabled':''}`} data-scratch-index={index} data-scratch-brightness={step?.brightness} data-scratch-pan={step?.pan}>
    <div className="jb-scratch-image">{children}{enabled&&<div className="jb-scratch-surface" aria-hidden="true" style={{left:`${fit.left}%`,width:`${fit.width}%`}}
      onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;event.preventDefault();range.current?.focus({preventScroll:true});pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);select(event,true);}}
      onPointerMove={event=>{if(pointer.current===event.pointerId)select(event);}}
      onPointerUp={event=>{if(pointer.current===event.pointerId){pointer.current=null;last.current=-1;event.currentTarget.releasePointerCapture(event.pointerId);}}}
      onPointerCancel={cancel} onLostPointerCapture={()=>{if(pointer.current!==null)cancel();}}/>}
    </div>
    {enabled&&<div className="jb-scratch-control" id="earth-scratch-controls">
      <label htmlFor="earth-scratch-position"><span>{t('Scratch the Planet')}</span><small>{String(index+1).padStart(2,'0')} / {steps.length}</small></label>
      <input ref={range} id="earth-scratch-position" type="range" min="1" max={steps.length} step="1" value={index+1} aria-label={t('Image scan position')} aria-describedby="earth-scratch-hint"
        aria-valuetext={`${t('Strip')} ${index+1} ${t('of')} ${steps.length}, ${Math.round((step?.brightness??0)*100)}% ${t('brightness')}, ${note?.note??'—'}, ${note?.frequency.toFixed(2)??'—'} Hz`}
        onChange={event=>onSelect(Number(event.target.value)-1)} onBlur={event=>{if(!(event.relatedTarget instanceof Element&&event.relatedTarget.matches('.jb-play')))onCancel();}} onPointerCancel={onCancel}
        onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();onCancel();}}}/>
      <p id="earth-scratch-hint">{t('Drag the image or use this slider. Arrows move one strip.')}</p>
    </div>}
  </div>;
}
