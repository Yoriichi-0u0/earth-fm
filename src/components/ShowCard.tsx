// Jukebox Show title card: which record is about to play, and where its picture comes from.
// Anime.js springs the card in, staggers its lines, holds, then lifts it away. Reduced motion: a still card.
import {useEffect,useRef} from 'react';
import {createTimeline,stagger} from 'animejs';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import {useStudioLanguage} from '../lib/studioLanguage';
import './JukeboxShow.css';

type Props={record:JukeboxRecord;index:number;total:number;motion:boolean;onDone:()=>void};
export default function ShowCard({record,index,total,motion,onDone}:Props){
  const {t}=useStudioLanguage();
  const card=useRef<HTMLDivElement>(null),done=useRef(onDone);
  done.current=onDone;
  useEffect(()=>{
    const el=card.current;if(!el)return;
    if(!motion){const timer=window.setTimeout(()=>done.current(),1100);return()=>window.clearTimeout(timer);}
    const timeline=createTimeline({defaults:{ease:'outCubic'},onComplete:()=>done.current()})
      .add(el,{opacity:[0,1],scale:[.92,1],y:[18,0],duration:520,ease:'outBack(1.4)'})
      .add(el.querySelectorAll('.show-card-line'),{opacity:[0,1],y:[10,0],duration:420,delay:stagger(90)},'-=320')
      .add(el.querySelector('.show-card-sleeve')!,{rotate:[-12,0],duration:700,ease:'outElastic(1,.6)'},'<<')
      .add(el,{opacity:0,y:-14,scale:.98,duration:360,ease:'inCubic'},'+=900');
    return()=>{timeline.revert();};
  },[motion,record.id]);
  const art=record.frame?.imageUrl??record.posterUrl;
  return <div className={`show-card${motion?' has-motion':''}`} ref={card} aria-hidden="true">
    <span className="show-card-sleeve" style={{'--record-accent':record.accent} as React.CSSProperties}>{art?<img src={art} alt=""/>:<span>{record.number}</span>}</span>
    <span className="show-card-copy">
      <small className="show-card-line">{t('NOW PLAYING')} · {String(index+1).padStart(2,'0')} / {String(total).padStart(2,'0')}</small>
      <strong className="show-card-line">{t(record.title)}</strong>
      <span className="show-card-line">{t(record.source)}</span>
    </span>
  </div>;
}
