// Sound: Note by note (• • •) or Continuous (━━━). One setting for every record; remembered on this device.
import {useState} from 'react';
import {setArticulation,useArticulation} from '../lib/articulation';
import type {Articulation} from '../lib/articulation';
import {useStudioLanguage} from '../lib/studioLanguage';
import './SoundShape.css';

const OPTIONS:readonly {value:Articulation;label:string;hint:string}[]=[
  {value:'notes',label:'Note by note',hint:'Each value is its own note.'},
  {value:'flow',label:'Continuous',hint:'One line that glides from value to value.'},
];
export default function SoundShape({playing=false}:{playing?:boolean}){
  const {t}=useStudioLanguage();const shape=useArticulation();const [said,setSaid]=useState('');
  function choose(value:Articulation){
    if(value===shape)return;setArticulation(value);
    const o=OPTIONS.find(x=>x.value===value)!;
    setSaid(`${t('Sound')}: ${t(o.label)}. ${t(o.hint)}${playing?` ${t('It starts with the next Play.')}`:''}`);
  }
  return <div className="jb-shape" role="group" aria-label={t('Sound: note by note or continuous')}>
    <span className="jb-shape-label" aria-hidden="true">{t('Sound')}</span>
    {OPTIONS.map(o=><button key={o.value} type="button" aria-pressed={shape===o.value} title={t(o.hint)} onClick={()=>choose(o.value)}>
      <span className={`jb-shape-icon is-${o.value}`} aria-hidden="true">{o.value==='notes'?<><i/><i/><i/><i/></>:<b/>}</span>{t(o.label)}
    </button>)}
    <span className="sr-only" aria-live="polite">{said}</span>
  </div>;
}
