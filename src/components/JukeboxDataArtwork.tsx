import type {JukeboxRecord} from '../data/jukeboxRecords';
import {arcticPoints} from '../data/earthStations';
import {storyPoints} from '../data/guidedStory';
import {MONTHS,formatAnomaly} from '../lib/climateMapping';
import {AudioLines} from 'lucide-react';
import {useStudioLanguage} from '../lib/studioLanguage';
import type {RecordPoint} from '../lib/jukeboxData';

export default function DataArtwork({record,current}:{record:JukeboxRecord;current:RecordPoint}){
  const {t,date}=useStudioLanguage();
  const arctic=record.id==='arctic';
  const all:readonly RecordPoint[]=arctic?arcticPoints:storyPoints.map(p=>({...p,value:p.anomaly}));
  const low=arctic?3:-1,high=arctic?8:1.5,minYear=all[0].year,maxYear=all.at(-1)!.year;
  const x=(year:number)=>58+(year-minYear)/(maxYear-minYear)*600,y=(value:number)=>216-(value-low)/(high-low)*160;
  const path=all.filter(p=>p.value!==null).map((p,i)=>`${i?'L':'M'}${x(p.year).toFixed(2)},${y(p.value!).toFixed(2)}`).join(' ');
  return <div className="jb-data-art">
    <div className="jb-art-label"><span>{t('DATA RECORD')}</span><span>{arctic?'NSIDC / ARCTIC':'NASA / GISTEMP'}</span></div>
    <div className="jb-data-caption"><span>{t(arctic?'SEPTEMBER SEA-ICE EXTENT':'SELECTED JANUARY ANOMALIES')}</span><small>{arctic?t('million km²'):'°C · 1951–1980'}</small></div>
    <svg viewBox="0 0 710 260" role="img" aria-label={t(arctic?'September mean Arctic sea-ice extent, 1987–2022. The highlighted point is the current observation.':'Selected January temperature anomalies, 1880–2025. Years use actual calendar spacing.')}>
      {[low,(low+high)/2,high].map(value=><g key={value}><line x1="58" x2="658" y1={y(value)} y2={y(value)} stroke="#ffffff22" strokeDasharray="3 7"/><text x="12" y={y(value)+4}>{value.toFixed(1)}</text></g>)}
      <path d={`${path}L658,225L58,225Z`} fill="currentColor" opacity=".06"/>
      <path d={path} stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinejoin="round"/>
      {all.map(p=>p.value!==null&&<circle key={p.period} cx={x(p.year)} cy={y(p.value)} r="2.8" fill="currentColor" opacity=".45"/>)}
      {current.value!==null&&<g><line x1={x(current.year)} x2={x(current.year)} y1="40" y2="225" stroke="currentColor" opacity=".5" strokeDasharray="4 6"/><circle cx={x(current.year)} cy={y(current.value)} r="7" fill="currentColor" stroke="#101e28" strokeWidth="3"/></g>}
      <text x="58" y="249">{minYear}</text><text x="658" y="249" textAnchor="end">{maxYear}</text>
    </svg>
    <div className="jb-data-value"><span>{date(current.year,current.month,MONTHS[current.month-1])}</span><strong>{current.value===null?'—':arctic?current.value.toFixed(4):formatAnomaly(current.value)}{arctic&&<small>{t('million km²')}</small>}</strong></div>
    <div className="jb-art-footer"><span>{t('EARTH FM · PLOT OF THE SOURCE VALUES')}</span><AudioLines size={16}/></div>
  </div>;
}

