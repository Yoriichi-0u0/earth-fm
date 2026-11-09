import type {GrooveSegment} from '../lib/grooveprint';
import type {RecordSide} from '../lib/recordSignal';
import {useStudioLanguage} from '../lib/studioLanguage';
import {useState} from 'react';
import './Grooveprint.css';

/** Presentation only: no media, audio, effects, timers, or animation loop. */
export default function Grooveprint({segments,index,side}:{segments:readonly GrooveSegment[];index:number;side:RecordSide}){
  if(!segments.length)return null;
  return <svg className={`jb-grooveprint groove-side-${side}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-groove-kind={side==='a'?'image':'measurement'} data-groove-count={segments.length} data-groove-index={index}>
    <circle className="gg-bed" cx="50" cy="50" r="34.5"/>
    {[26,35,44].map(r=><circle className="gg-guide" key={r} cx="50" cy="50" r={r}/>)}
    {segments.map(segment=><g key={segment.index} data-groove-sector={segment.index} data-groove-status={segment.status} data-groove-value={segment.value??''} data-groove-band={segment.band??''} data-selected={segment.index===index}>
      {segment.path?<path className="gg-mark" d={segment.path}/>:<path className="gg-gap" d={segment.gapPath}/>}
    </g>)}
    <path className="gg-start" d="M50,2 L50,6"/>
  </svg>;
}

export function GrooveprintKey({side,id,ready,segments,index}:{side:RecordSide;id:string;ready:boolean;segments:readonly GrooveSegment[];index:number}){
  const {t}=useStudioLanguage();
  const [open,setOpen]=useState(false);
  return <div className="jb-groove-key">
    <p id={id}><span>{t('2D EARTH GROOVEPRINT')} / {side.toUpperCase()}</span>{t(side==='a'?(ready?'48 image sectors · Brighter pixels → longer grooves.':'Image grooves appear when the decoded strips are ready.'):'12 January sectors · Higher note bands → longer grooves.')} <strong>{t('Outline: selected position.')}</strong></p>
    <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>{t('Read the grooves')}</summary>
      <div className="jb-groove-reading">
        {open&&segments.length>0&&<figure className="jb-groove-detail" role="img" aria-label={t(side==='a'?'Enlarged image grooveprint':'Enlarged measurement grooveprint')}><Grooveprint segments={segments} index={index} side={side}/><figcaption>{t('Selected sector')} {index+1} / {segments.length}</figcaption></figure>}
        <div><p>{t(side==='a'?'From the top, clockwise: one sector per decoded strip, in left-to-right image order. Length follows absolute strip brightness from 0 to 100%, without rescaling this image. These are pixels, not temperatures. Pitch is rounded to the existing notes, so different lengths may share a note. Colour and stereo still follow the original sound mapping.':'From the top, clockwise: one sector per selected January observation, in observation order. Equal angles do not represent elapsed years. Length follows the same ten fixed temperature note bands as the sound: −1.00 to +1.50 °C, in 0.25 °C bands, relative to the 1951–1980 January average. Values within one band share a length.')}</p>
        <p>{t('A dashed gap means missing or outside the mapping, never zero. The outline follows the selected position, including when paused; it does not mean sound is playing. Side colour adds no measurement. The illustration may rotate; the indexed grooves stay in place. The optional 3D record stays illustrative. Grooves do not encode musical accompaniment.')}</p></div>
      </div>
    </details>
  </div>;
}
