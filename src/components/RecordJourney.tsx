// "From orbit to your ears": the chain behind the selected record, ending with the listener.
// The last stop uses only the browser's own time zone and clock; nothing is requested or sent.
// Anime.js draws the path and lets a signal hop from link to link; reduced motion shows it still.
import {useEffect,useMemo,useRef,useState} from 'react';
import {animate,stagger,svg} from 'animejs';
import {Archive,Building2,Cpu,Disc3,Headphones,Palette,Satellite,Thermometer} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {JOURNEYS,type JourneyIcon} from '../data/journeys';
import type {JukeboxRecordId} from '../data/jukeboxRecords';
import {useStudioLanguage} from '../lib/studioLanguage';
import './RecordJourney.css';

const ICONS:Record<JourneyIcon,LucideIcon>={satellite:Satellite,thermometer:Thermometer,model:Cpu,studio:Palette,center:Building2,archive:Archive,jukebox:Disc3};

/** "Kuching" from "Asia/Kuching"; never a location lookup. */
export function placeFromTimeZone(zone:string|undefined):string|null{
  if(!zone||!zone.includes('/'))return null;
  return zone.split('/').pop()!.replaceAll('_',' ');
}

export default function RecordJourney({recordId,motion}:{recordId:JukeboxRecordId;motion:boolean}){
  const {t}=useStudioLanguage();
  const links=JOURNEYS[recordId];
  const root=useRef<HTMLElement>(null);
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),30_000);return()=>window.clearInterval(id);},[]);
  const zone=useMemo(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone;}catch{return undefined;}},[]);
  const place=placeFromTimeZone(zone);
  const time=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});

  useEffect(()=>{
    const el=root.current;if(!el||!motion)return;
    const running:{revert:()=>void}[]=[];
    const start=()=>{
      const path=el.querySelector<SVGPathElement>('.rj-path');
      if(path)running.push(animate(svg.createDrawable(path),{draw:['0 0','0 1'],duration:1400,ease:'inOutCubic'}));
      running.push(animate(el.querySelectorAll('.rj-stop'),{opacity:[0,1],y:[12,0],duration:520,delay:stagger(110,{start:120}),ease:'outCubic'}));
      running.push(animate(el.querySelectorAll('.rj-dot'),{scale:[{to:1.55,duration:260,ease:'outQuad'},{to:1,duration:520,ease:'outCubic'}],delay:stagger(320,{start:1500}),loop:true,loopDelay:1600}));
    };
    let io:IntersectionObserver|undefined;
    if(typeof IntersectionObserver==='undefined')start();
    else{io=new IntersectionObserver(([e])=>{if(e.isIntersecting){io?.disconnect();start();}},{threshold:.25});io.observe(el);}
    return()=>{io?.disconnect();running.forEach(a=>a.revert());};
  },[motion,recordId]);

  const all=[...links,{icon:'you' as const,title:place?`${t('You')}, ${place}`:t('You'),detail:`${t('Listening at')} ${time}${zone?` · ${zone.replaceAll('_',' ')}`:''}`}];
  return <section ref={root} className={`rj${motion?' has-motion':''}`} aria-labelledby={`rj-title-${recordId}`} data-journey={recordId}>
    <header><p className="rj-kicker">{t('FROM ORBIT TO YOUR EARS')}</p><h3 id={`rj-title-${recordId}`}>{t('Where this record comes from')}</h3></header>
    <div className="rj-track">
      <svg className="rj-line" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true"><path className="rj-path" d="M1 2 H99" pathLength={1}/></svg>
      <ol>{all.map((link,i)=>{const Icon=link.icon==='you'?Headphones:ICONS[link.icon];return <li key={i} className={`rj-stop${link.icon==='you'?' rj-you':''}`}>
        <span className="rj-dot" aria-hidden="true"><Icon size={16} strokeWidth={1.75}/></span>
        <strong>{link.icon==='you'?link.title:t(link.title)}</strong>
        <small>{link.icon==='you'?link.detail:t(link.detail)}</small>
      </li>;})}</ol>
    </div>
  </section>;
}
