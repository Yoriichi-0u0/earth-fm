import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {useStudioLanguage} from '../lib/studioLanguage';
import './ListenGuide.css';

/** "Guide me": a spotlight that rings the real controls on the Listen page, one at a time. It never plays sound. */
const stops=[
  {selector:'#record-shelf',title:'Choose a record',body:'Each record is one Earth story. Its NASA source is printed on the player once you choose it.'},
  {selector:'.jb-play',title:'Press Play',body:'Sound is made live from the picture or the numbers. Press again to stop.'},
  {selector:'.jb-side-selector',title:'Pick a side',body:'Side A plays the picture. Side B plays measurements or lets you choose a place to hear.'},
  {selector:'.jb-readout',title:'Read what you hear',body:'Every note is written here: what made it, the note and its frequency.'},
  {selector:'.jb-show-start',title:'Or play them all',body:'Play the whole jukebox to hear every record in turn. Press Escape to stop.'},
];
type Box={top:number;left:number;width:number;height:number};
export default function ListenGuide({motion,onClose}:{motion:boolean;onClose:()=>void}){
  const {t}=useStudioLanguage();
  // Only stops whose control exists for the current record (records differ: some have no sides).
  const [available]=useState(()=>stops.filter(stop=>document.querySelector(stop.selector)?.getClientRects().length));
  const [index,setIndex]=useState(0),[box,setBox]=useState<Box|null>(null);
  const card=useRef<HTMLDivElement>(null),stop=available[index],[cardHeight,setCardHeight]=useState(200);
  useLayoutEffect(()=>{const height=card.current?.offsetHeight;if(height&&height!==cardHeight)setCardHeight(height);});
  useLayoutEffect(()=>{
    if(!stop)return;const target=document.querySelector<HTMLElement>(stop.selector);if(!target)return;
    target.scrollIntoView({block:target.offsetHeight>window.innerHeight*.6?'start':'center',behavior:motion?'smooth':'instant'});
    let frame=0;const measure=()=>{const r=target.getBoundingClientRect();setBox({top:r.top-8,left:r.left-8,width:r.width+16,height:r.height+16});};
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    measure();const settle=window.setTimeout(measure,450);
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);window.clearTimeout(settle);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[stop?.selector]);
  useEffect(()=>{card.current?.focus({preventScroll:true});},[index]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
  if(!stop)return null;
  const last=index===available.length-1;
  // Under the ring if the card fits, else above it, else pinned to the bottom of the window (tall targets, small phones).
  const cardWidth=Math.min(320,window.innerWidth-24),left=box?Math.min(Math.max(12,box.left),window.innerWidth-cardWidth-12):12;
  const cardStyle:CSSProperties=!box?{bottom:12,left}:box.top+box.height+cardHeight+24<=window.innerHeight?{top:box.top+box.height+12,left}:box.top-cardHeight-12>=12?{top:box.top-cardHeight-12,left}:{bottom:12,left};
  return <div className="lg-layer" data-motion={motion}>
    {box&&<div className="lg-ring" aria-hidden="true" style={{top:box.top,left:box.left,width:box.width,height:box.height}}/>}
    <div ref={card} className="lg-card" role="dialog" aria-modal="false" aria-labelledby="lg-title" aria-describedby="lg-body" tabIndex={-1} style={cardStyle}>
      <p className="lg-count">{t('Guide')} · {index+1} / {available.length}</p>
      <h2 id="lg-title">{t(stop.title)}</h2><p id="lg-body">{t(stop.body)}</p>
      <div className="lg-actions"><button type="button" onClick={onClose}>{t('Close guide')}</button>{index>0&&<button type="button" onClick={()=>setIndex(i=>i-1)}>{t('Back')}</button>}<button type="button" className="lg-next" onClick={()=>last?onClose():setIndex(i=>i+1)}>{t(last?'Done':'Next')}</button></div>
    </div>
  </div>;
}
