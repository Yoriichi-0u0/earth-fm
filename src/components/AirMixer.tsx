// Four-track mixing desk: one strip per aerosol, with Mute, Solo and a live level meter.
// Meters jump to each sounding step's loudness and fall back (Anime.js); under reduced motion they
// simply show the level. Mute and Solo change what you hear, never the score.
import {useEffect,useRef} from 'react';
import {animate,stagger} from 'animejs';
import {AEROSOLS,AEROSOL_NAMES,type Aerosol} from '../lib/air/analyze';
import {VOICES,type Chord} from '../lib/air/sonify';
import {useStudioLanguage} from '../lib/studioLanguage';

export type TrackState={muted:boolean;solo:boolean};
export const audibleFrom=(tracks:Record<Aerosol,TrackState>)=>{const anySolo=AEROSOLS.some(a=>tracks[a].solo);return Object.fromEntries(AEROSOLS.map(a=>[a,anySolo?tracks[a].solo:!tracks[a].muted])) as Record<Aerosol,boolean>;};

type Props={tracks:Record<Aerosol,TrackState>;onChange:(a:Aerosol,next:TrackState)=>void;shares:Record<Aerosol,number>|null;chord:Chord|null;serial:number;stepMs:number;motion:boolean};
export default function AirMixer({tracks,onChange,shares,chord,serial,stepMs,motion}:Props){
  const {t}=useStudioLanguage();
  const root=useRef<HTMLDivElement>(null),meters=useRef<Partial<Record<Aerosol,HTMLSpanElement|null>>>({});
  const audible=audibleFrom(tracks);
  useEffect(()=>{
    if(!motion||!root.current)return;
    const strips=root.current.querySelectorAll('.air-strip');
    const a=animate(strips,{opacity:[0,1],y:[10,0],duration:520,delay:stagger(70),ease:'outCubic'});
    return()=>{a.revert();};
  },[motion]);
  useEffect(()=>{
    for(const aerosol of AEROSOLS){
      const el=meters.current[aerosol];if(!el)continue;
      const level=chord?.notes.find(n=>n.aerosol===aerosol)?.loudness??0;
      if(!motion||!chord){el.style.transform=`scaleX(${Math.max(.02,level)})`;continue;}
      animate(el,{scaleX:[{to:Math.max(.02,level),duration:60,ease:'outQuad'},{to:.02,duration:Math.max(220,stepMs*1.8),ease:'outCubic'}],composition:'replace'});
    }
  },[serial,chord,motion,stepMs]);
  return <div className="air-mixer" ref={root} role="group" aria-label={t('Mixer: four aerosol tracks')}>
    {AEROSOLS.map(aerosol=>{
      const v=VOICES[aerosol],s=tracks[aerosol],name=t(AEROSOL_NAMES[aerosol]),on=audible[aerosol];
      const note=chord?.notes.find(n=>n.aerosol===aerosol);
      return <div key={aerosol} className={`air-strip${on?'':' is-silent'}${note?' is-sounding':''}`} style={{'--track':v.colour} as React.CSSProperties} data-track={aerosol} data-audible={on}>
        <span className="air-strip-swatch" aria-hidden="true"/>
        <span className="air-strip-name"><strong>{name}</strong><small>{t(v.instrument)}{shares?` · ${(shares[aerosol]*100).toFixed(1)}% ${t('of the map')}`:''}</small></span>
        <span className="air-strip-meter" aria-hidden="true"><span ref={el=>{meters.current[aerosol]=el;}}/></span>
        <span className="air-strip-note" aria-hidden="true">{note?.name??'·'}</span>
        <span className="air-strip-buttons">
          <button type="button" aria-pressed={s.muted} aria-label={`${t('Mute')} ${name}`} onClick={()=>onChange(aerosol,{...s,muted:!s.muted})}>M</button>
          <button type="button" aria-pressed={s.solo} aria-label={`${t('Solo')} ${name}`} onClick={()=>onChange(aerosol,{...s,solo:!s.solo})}>S</button>
        </span>
      </div>;
    })}
  </div>;
}
