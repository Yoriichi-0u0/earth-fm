import {Component,lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import {arcticPoints} from '../data/earthStations';
import {storyPoints} from '../data/guidedStory';
import {MONTHS,formatAnomaly} from '../lib/climateMapping';
import {AudioLines,Box,ChartLine} from 'lucide-react';
import {useStudioLanguage} from '../lib/studioLanguage';
import {mapRecordPoint} from '../lib/jukeboxData';
import type {RecordPoint} from '../lib/jukeboxData';
import './ClimateCoil.css';

const ClimateCoil=lazy(()=>import('./ClimateCoil'));
class CoilBoundary extends Component<{children:ReactNode;onUnavailable:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onUnavailable();}
  render(){return this.state.failed?null:this.props.children;}
}
let webgl:boolean|undefined;
function webglAvailable(){
  if(webgl===undefined){try{const canvas=document.createElement('canvas');webgl=Boolean(canvas.getContext('webgl2')??canvas.getContext('webgl'));}catch{webgl=false;}}
  return webgl;
}

type Props={record:JukeboxRecord;current:RecordPoint;pulse?:number;motion?:boolean;onSelect?:(index:number)=>void};
export default function DataArtwork({record,current,pulse=0,motion=false,onSelect}:Props){
  const {t,date}=useStudioLanguage();
  const arctic=record.id==='arctic';
  const all:readonly RecordPoint[]=arctic?arcticPoints:storyPoints.map(p=>({...p,value:p.anomaly}));
  const low=arctic?3:-1,high=arctic?8:1.5,minYear=all[0].year,maxYear=all.at(-1)!.year;
  const x=(year:number)=>58+(year-minYear)/(maxYear-minYear)*600,y=(value:number)=>216-(value-low)/(high-low)*160;
  const path=all.filter(p=>p.value!==null).map((p,i)=>`${i?'L':'M'}${x(p.year).toFixed(2)},${y(p.value!).toFixed(2)}`).join(' ');
  // The monthly GISTEMP coil exists for the temperature record only; it is the default wherever WebGL works.
  const [three,setThree]=useState(()=>!arctic&&webglAvailable()),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [visible,setVisible]=useState(true);const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=host.current;if(!element||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'120px'});observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  const unavailable=useCallback(()=>{setFailed(true);setReady(false);setThree(false);},[]);
  const onReady=useCallback(()=>setReady(true),[]);
  const [hovered,setHovered]=useState<number|null>(null);const tip=hovered===null?null:all[hovered]??null;const tipNote=tip&&!arctic?mapRecordPoint(tip,false):null;
  const coil=!arctic&&three&&!failed;
  return <div className={`jb-data-art${coil?' has-coil':''}`} ref={host} data-data-renderer={coil&&ready?'three':'2d'}>
    <div className="jb-art-label"><span>{t('DATA RECORD')}</span><span>{arctic?'NSIDC / ARCTIC':'NASA / GISTEMP'}</span></div>
    <div className="jb-data-caption"><span>{t(arctic?'SEPTEMBER SEA-ICE EXTENT':coil?'MONTHLY ANOMALIES, 1880–2026':'SELECTED JANUARY ANOMALIES')}</span><small>{arctic?t('million km²'):'°C · 1951–1980'}</small>
      {!arctic&&<button type="button" className="jb-coil-toggle" aria-pressed={coil} disabled={failed} onClick={()=>{setReady(false);setHovered(null);setThree(value=>!value);}}>{coil?<ChartLine size={14} aria-hidden="true"/>:<Box size={14} aria-hidden="true"/>}{t(coil?'2D chart':'3D coil')}</button>}
    </div>
    {coil?<div className="jb-coil" role="img" aria-label={t('Climate Coil: every monthly GISTEMP v4 anomaly from 1880 to 2026 as one coil. Time runs left to right, each turn is one year with January at the top, and the coil widens as the anomaly rises on a fixed −1.0 to +1.5 °C scale. White beads mark the twelve Januarys heard on Side B.')}>
      <div className="jb-coil-stage">{visible&&<CoilBoundary onUnavailable={unavailable}><Suspense fallback={null}><ClimateCoil beads={all} current={current} pulse={pulse} motion={motion} onReady={onReady} onUnavailable={unavailable} onSelect={onSelect} onHover={setHovered}/></Suspense></CoilBoundary>}</div>
      <div className="jb-coil-axis" aria-hidden="true"><span>{minYear}</span><span>{t(onSelect?'Drag to turn · tap a bead':'Drag to turn')}</span><span>2026</span></div>
      {tip&&tip.value!==null&&<p className="jb-coil-tip" aria-hidden="true"><b>{date(tip.year,tip.month,MONTHS[tip.month-1])}</b> {formatAnomaly(tip.value)}{tipNote&&<> · {tipNote.note}</>}</p>}
      <ul className="jb-coil-key" aria-hidden="true"><li><i className="is-cool"/>{t('below 1951–1980')}</li><li><i className="is-warm"/>{t('above')}</li><li><i className="is-bead"/>{t('January you hear')}</li></ul>
    </div>:<svg viewBox="0 0 710 260" role="img" aria-label={t(arctic?'September mean Arctic sea-ice extent, 1987–2022. The highlighted point is the current observation.':'Selected January temperature anomalies, 1880–2025. Years use actual calendar spacing.')}>
      {[low,(low+high)/2,high].map(value=><g key={value}><line x1="58" x2="658" y1={y(value)} y2={y(value)} stroke="#ffffff22" strokeDasharray="3 7"/><text x="12" y={y(value)+4}>{value.toFixed(1)}</text></g>)}
      <path d={`${path}L658,225L58,225Z`} fill="currentColor" opacity=".06"/>
      <path d={path} stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinejoin="round"/>
      {all.map(p=>p.value!==null&&<circle key={p.period} cx={x(p.year)} cy={y(p.value)} r="2.8" fill="currentColor" opacity=".45"/>)}
      {current.value!==null&&<g><line x1={x(current.year)} x2={x(current.year)} y1="40" y2="225" stroke="currentColor" opacity=".5" strokeDasharray="4 6"/><circle cx={x(current.year)} cy={y(current.value)} r="7" fill="currentColor" stroke="#101e28" strokeWidth="3"/></g>}
      <text x="58" y="249">{minYear}</text><text x="658" y="249" textAnchor="end">{maxYear}</text>
    </svg>}
    <div className="jb-data-value"><span>{date(current.year,current.month,MONTHS[current.month-1])}</span><strong>{current.value===null?'—':arctic?current.value.toFixed(4):formatAnomaly(current.value)}{arctic&&<small>{t('million km²')}</small>}</strong></div>
    <div className="jb-art-footer"><span>{t(coil?'TerraJuke · 3D COIL OF THE SOURCE VALUES':'TerraJuke · PLOT OF THE SOURCE VALUES')}</span><AudioLines size={16}/></div>
  </div>;
}
