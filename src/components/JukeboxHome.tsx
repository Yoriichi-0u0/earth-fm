import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {ArrowDown,ArrowUpRight,AudioLines,ChevronLeft,ChevronRight,Disc3,Headphones,Play,Square,Volume2} from 'lucide-react';
import {jukeboxRecords} from '../data/jukeboxRecords';
import type {JukeboxRecord,JukeboxRecordId} from '../data/jukeboxRecords';
import {arcticPoints,arcticStory,mapArctic} from '../data/earthStations';
import {storyPoints} from '../data/guidedStory';
import {MONTHS,formatAnomaly} from '../lib/climateMapping';
import {defaults,mapData,NOTES} from '../lib/symphony';
import {mapValueToNote} from '../lib/audio';
import {useSequenceTransport} from '../lib/useSequenceTransport';
import {useVisualTransport,VISUAL_SCAN_STEPS} from '../lib/useVisualTransport';
import {useStudioLanguage} from '../lib/studioLanguage';
import {goToPage,pageUrl} from '../lib/studioRouter';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';
import EarthRecord from './EarthRecord';
import ScratchScanner from './ScratchScanner';
import {useFrameInstrument} from '../lib/useFrameInstrument';
import {useEarthLooper} from '../lib/useEarthLooper';
import EarthLooper from './EarthLooper';
import {observatoryImagery} from '../data/observatory';
import './JukeboxHome.css';

const noop=()=>{};
const EarthGlobe=lazy(()=>import('./EarthGlobe'));
type RecordPoint={year:number;month:number;period:string;value:number|null};
function mapRecordPoint(point:RecordPoint,arctic:boolean){
  if(arctic){const note=mapArctic(point);return note?{frequencyHz:note.frequencyHz,note:note.note}:null;}
  const event=mapData({...point,anomaly:point.value});
  return event.kind==='note'?{frequencyHz:event.frequencyHz,note:NOTES[event.bandIndex]}:null;
}
type DeckState={playing:boolean;starting:boolean;ready:boolean;completed:boolean;progress:number;note:string;frequency:string;position:string;input:string;onPlay:()=>void;signal:RecordSignal;requestAt:number;error?:string;playLabel?:string;manual?:boolean};
type ConsoleProps=DeckState&{record:JukeboxRecord;artwork:ReactNode;volume:number;onVolume:(value:number)=>void;extra?:ReactNode;side?:RecordSide;sideControls?:ReactNode;recordObject?:ReactNode;performanceControls?:ReactNode};

function DeckConsole({record,artwork,playing,starting,ready,completed,progress,note,frequency,position,input,onPlay,volume,onVolume,error,extra,side,sideControls,recordObject,signal,requestAt,playLabel,manual,performanceControls}:ConsoleProps){
  const {t}=useStudioLanguage();const active=playing||starting;
  return <article className={`jb-deck ${active?'is-playing':''}${side?' jb-two-sided':''}${manual?' jb-manual':''}`} aria-labelledby="jb-record-title" data-record-kind={record.kind} data-record-side={side} data-play-mode={manual?'manual':'automatic'} data-note-serial={signal.event?.serial??0} data-note-at={signal.event?.at??0} data-play-request-at={requestAt} data-frequency={signal.frequency??''}>
    <header className="jb-deck-header"><div className="jb-record-heading"><span className="jb-catalogue">EARTH FM / {record.number}</span><h2 id="jb-record-title">{t(record.title)}</h2></div><div className="jb-deck-actions"><span className="jb-state" role="status"><i className={active?'is-on':''}/>{t(!ready?(error?'Visual unavailable':'Loading…'):starting?'Starting…':playing?'Now playing':completed?'Finished':'Ready to play')}</span><button className="jb-compact-play" type="button" disabled={!ready} aria-label={t(active?'Stop selected record':manual?'Hear selected position':'Play selected record')} onClick={onPlay}>{t(active?'Stop':manual?'Hear':'Play')}</button></div></header>
    {sideControls}
    <div className={`jb-artwork${recordObject?' jb-artwork-paired':''}`}>{recordObject}<div className="jb-science-window">{artwork}</div></div>
    {performanceControls}
    <dl className="jb-readout"><div><dt>{t(record.kind==='visual'?'PIXEL INPUT':'OBSERVATION')}</dt><dd>{input}</dd></div><div><dt>{t('GENERATED NOTE')}</dt><dd className="jb-note">{note}<small>{frequency}</small></dd></div><div><dt>{t(record.kind==='visual'?'SCAN POSITION':'RECORD POSITION')}</dt><dd>{position}</dd></div></dl>
    <div className="jb-transport"><button className="jb-play" type="button" disabled={!ready} onClick={onPlay}>{active?<Square size={17} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}<span>{t(active?'Stop':playLabel??'Play record')}</span><span className="jb-play-shortcut" aria-hidden="true">{active?'■':'▶'}</span></button><label className="jb-volume"><Volume2 size={18}/><span className="sr-only">{t('Jukebox volume')}</span><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>onVolume(Number(e.target.value))}/></label></div>
    <div className="jb-progress-row"><progress aria-label={t(manual?'Scan position':'Record progress')} max="1" value={progress}/><span>{t(completed?'Complete':record.kind==='visual'?'48 visual strips':'12 observations')}<b>{manual?t('Your pace'):<>~25 {t('seconds')}</>}</b></span></div>
    {extra}
    <div className="jb-source"><div className="jb-source-line"><span>{t(record.kind==='visual'?'Visual sound':'Measurement sound')}</span><a href={record.sourceUrl} target="_blank" rel="noreferrer">{t(record.source)} <ArrowUpRight size={13}/></a></div><p>{t(record.meaning)}</p>{side&&<p className="jb-side-provenance">{t('Related sources, different transformations. The image and observations are not matched frame by frame.')}</p>}</div>
    {error&&<p className="jb-error" role="alert">{t(error)}</p>}
  </article>;
}

function useVisualRecord(record:JukeboxRecord,motion:boolean,volume:number){
  const {t}=useStudioLanguage();const [animate,setAnimate]=useState(true),[requestAt,setRequestAt]=useState(0);
  const frame=record.frame!;
  const visual=useVisualTransport({imageUrl:frame.imageUrl,videoUrl:frame.videoUrl,animate,motionAllowed:motion,tempo:120,volume,onStart:noop});
  const current=visual.steps[visual.scanIndex],mapped=current?mapValueToNote(current.brightness,0,1):null;
  const signal:RecordSignal={playing:visual.playing,note:mapped?.note??'—',frequency:mapped?.frequency??null,event:visual.noteEvent};
  const state:DeckState={playing:visual.playing,starting:visual.starting,ready:visual.ready,completed:visual.completed,progress:visual.completed?1:visual.scanIndex/VISUAL_SCAN_STEPS,note:signal.note,frequency:mapped?`${mapped.frequency.toFixed(2)} Hz`:'—',position:`${String(visual.scanIndex+1).padStart(2,'0')} / 48`,input:current?`${Math.round(current.brightness*100)}% ${t('brightness')}`:'—',onPlay:()=>{if(visual.playing||visual.starting)visual.stop();else{setRequestAt(performance.now());void visual.start();}},signal,requestAt,error:visual.error};
  const extra=frame.videoUrl?<div className="jb-motion-control"><label><input type="checkbox" checked={animate&&motion} disabled={!motion} onChange={e=>{visual.stop();setAnimate(e.target.checked);}}/>{t('Follow the animation')}</label><span>{t('Sampled frame')} {visual.sampledTime.toFixed(2)} s</span>{!motion&&<p>{t('Motion is off. This record plays a still frame.')}</p>}</div>:undefined;
  return {visual,state,extra};
}

function VisualArtwork({record,transport,manual=false}:{record:JukeboxRecord;transport:ReturnType<typeof useVisualRecord>;manual?:boolean}){
  const {t}=useStudioLanguage();const {visual}=transport;const frame=record.frame!;
  return <div className={`jb-media ${record.id==='motion'?'jb-media-motion':''}`} ref={visual.screenRef} aria-label={t('Record artwork and live scan')}>
    <div className="jb-art-label"><span>{t('Visual sound')}</span><span>{record.id==='spiral'?'NASA / 5190':'NASA / EIC'}</span></div>
    {frame.videoUrl?<video ref={visual.videoRef} src={frame.videoUrl} poster={record.posterUrl} muted playsInline loop preload="auto" aria-label={t(frame.description)} onError={()=>{visual.stop();visual.setReady(false);visual.setError('The animation could not load. Try another frame.');}}/>:<img ref={visual.imageRef} src={frame.imageUrl} alt={t(frame.description)} onLoad={visual.prepare} onError={()=>{visual.stop();visual.setReady(false);visual.setError('The image could not load. Try another frame.');}}/>}
    {visual.ready&&<div className="jb-scan" style={{left:`${visual.frameFit.left+(visual.scanIndex+.5)/VISUAL_SCAN_STEPS*visual.frameFit.width}%`}}><span>{String(visual.scanIndex+1).padStart(2,'0')}</span></div>}
    {!visual.ready&&!visual.error&&<p className="jb-media-loading">{t('Loading the visual…')}</p>}
    <div className="jb-art-footer"><span>{t(manual?'DRAG TO PLAY · PIXELS → NOTES':visual.playing?'SOUND GENERATED IN YOUR BROWSER':'PRESS PLAY TO HEAR THE PICTURE')}</span><AudioLines size={16}/></div>
  </div>;
}
function VisualDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const transport=useVisualRecord(record,motion,volume);
  return <DeckConsole record={record} {...transport.state} artwork={<VisualArtwork record={record} transport={transport}/>} volume={volume} onVolume={onVolume} extra={transport.extra}/>;
}

function DataArtwork({record,current}:{record:JukeboxRecord;current:RecordPoint}){
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

function useDataRecord(record:JukeboxRecord,volume:number){
  const {t}=useStudioLanguage();const [dataOnly,setDataOnly]=useState(false),[requestAt,setRequestAt]=useState(0);
  const arctic=record.id==='arctic';
  const points=useMemo<RecordPoint[]>(()=>arctic?[...arcticStory]:storyPoints.map(p=>({...p,value:p.anomaly})),[arctic]);
  const pitches=useMemo(()=>points.map(p=>mapRecordPoint(p,arctic)?.frequencyHz??null),[points,arctic]);
  const audio=useSequenceTransport<RecordPoint>();
  useEffect(()=>{audio.setVolume(volume);},[volume]);
  const completed=audio.status.startsWith('Complete.'),point=audio.audible??(completed?points.at(-1)!:points[0]);
  const index=points.findIndex(p=>p.period===point.period),note=mapRecordPoint(point,arctic);
  const signal:RecordSignal={playing:audio.playing,note:note?.note??'—',frequency:note?.frequencyHz??null,event:audio.noteEvent};
  const state:DeckState={playing:audio.playing,starting:audio.status==='Starting audio…',ready:true,completed,progress:completed?1:index/points.length,note:signal.note,frequency:note?`${note.frequencyHz.toFixed(2)} Hz`:'—',position:`${String(index+1).padStart(2,'0')} / 12`,input:t(arctic?'September mean extent':'January global anomaly'),onPlay:()=>{if(audio.playing)audio.stop();else{setRequestAt(performance.now());void audio.play(points,pitches,{...defaults,tempo:60,volume,dataOnly});}},signal,requestAt,error:audio.status.startsWith('Audio could not')?audio.status:undefined};
  const extra=<div className="jb-data-only"><label><input type="checkbox" checked={dataOnly} onChange={e=>{audio.stop();setDataOnly(e.target.checked);}}/>{t('Hear Data Only')}</label><span>{t(dataOnly?'One observation. One note.':'Data melody + musical arrangement')}</span></div>;
  return {audio,point,state,extra};
}
function DataDeck({record,volume,onVolume}:{record:JukeboxRecord;volume:number;onVolume:(value:number)=>void}){
  const data=useDataRecord(record,volume);
  return <DeckConsole record={record} {...data.state} artwork={<DataArtwork record={record} current={data.point}/>} volume={volume} onVolume={onVolume} extra={data.extra}/>;
}

function ClimateDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();const [side,setSide]=useState<RecordSide>('a'),[manual,setManual]=useState(false),[requestAt,setRequestAt]=useState(0);
  const measurementRecord=jukeboxRecords.find(item=>item.id==='temperature')!;
  // Both adapters persist through a flip; only an explicit Play action starts an engine.
  const visual=useVisualRecord(record,motion,volume),data=useDataRecord(measurementRecord,volume);
  const instrument=useFrameInstrument(visual.visual.steps,volume,manual&&side==='a');
  const looper=useEarthLooper({enabled:manual&&side==='a'&&visual.visual.ready,sourceImage:record.frame!.imageUrl,stripCount:visual.visual.steps.length,prepare:instrument.prepare,play:instrument.play,stopAudio:instrument.stop,onSelect:index=>{visual.visual.setScanIndex(index);setRequestAt(performance.now());}});
  const replaying=looper.phase==='replaying'||looper.phase==='preparing';
  function changeSide(next:RecordSide){if(next===side)return;visual.visual.stop();visual.visual.setScanIndex(0);data.audio.stop();looper.stop();setSide(next);}
  function changeMode(){visual.visual.stop();looper.stop();setManual(value=>!value);}
  function playStrip(index:number){looper.cancelReplay();visual.visual.setScanIndex(index);setRequestAt(performance.now());void instrument.play(index).then(event=>{if(event)looper.capture(event);});}
  function cancelGesture(){looper.cancelReplay();instrument.stop();}
  const manualState:DeckState={...visual.state,manual:true,playing:instrument.playing||looper.phase==='replaying',starting:instrument.starting||looper.phase==='preparing',completed:false,progress:visual.visual.scanIndex/(VISUAL_SCAN_STEPS-1),signal:{...visual.state.signal,playing:instrument.playing||looper.phase==='replaying',event:instrument.noteEvent},requestAt,error:instrument.error||visual.state.error,playLabel:'Hear this position',onPlay:()=>{if(replaying||(looper.phase==='recording'&&(instrument.playing||instrument.starting)))looper.stop();else if(instrument.playing||instrument.starting)instrument.stop();else playStrip(visual.visual.scanIndex);}};
  const current=side==='a'?(manual?manualState:visual.state):data.state;
  const effective=side==='a'?record:{...measurementRecord,id:record.id,number:record.number,title:record.title};
  const controls=<><div className="jb-side-selector" role="group" aria-label={t('Choose a side of Climate Spiral')}>
    <button type="button" aria-label={t('Side A: hear the picture')} aria-pressed={side==='a'} onClick={()=>changeSide('a')}><b>A</b><span>{t('Hear the picture')}<small>{t('Visual sound')}</small></span></button>
    <button type="button" aria-label={t('Side B: hear the measurements')} aria-pressed={side==='b'} onClick={()=>changeSide('b')}><b>B</b><span>{t('Hear the measurements')}<small>{t('Measurement sound')}</small></span></button>
  </div><div className="jb-science-cue"><p>{t(side==='a'?'Brightness → pitch. Not temperature.':'January anomaly (°C) · relative to 1951–1980.')}</p>{side==='a'&&<button className="jb-manual-toggle" type="button" data-manual={manual} disabled={!visual.visual.ready} aria-controls={manual?'earth-scratch-controls':undefined} onClick={changeMode}>{t(manual?'Automatic playback':'Play with Earth')}<span aria-hidden="true">{manual?' ↗':' ↔'}</span></button>}</div></>;
  const picture=<VisualArtwork record={record} transport={visual} manual={manual}/>;
  return <DeckConsole record={effective} {...current} side={side} sideControls={controls} recordObject={<EarthRecord side={side} signal={current.signal} motion={motion} onFlip={()=>changeSide(side==='a'?'b':'a')}/>}
    performanceControls={side==='a'&&manual&&visual.visual.ready?<EarthLooper looper={looper}/>:undefined}
    artwork={<><div className="jb-side-content" hidden={side!=='a'}><ScratchScanner enabled={manual&&visual.visual.ready} steps={visual.visual.steps} index={visual.visual.scanIndex} fit={visual.visual.frameFit} onSelect={playStrip} onCancel={cancelGesture} notice={instrument.notice}>{picture}</ScratchScanner></div><div className="jb-side-content" hidden={side!=='b'}><DataArtwork record={measurementRecord} current={data.point}/></div></>}
    volume={volume} onVolume={onVolume} extra={side==='b'?data.extra:undefined}/>;
}

export default function JukeboxHome({motion}:{motion:boolean}){
  const {t}=useStudioLanguage();
  const [selected,setSelected]=useState<JukeboxRecordId>('spiral'),[volume,setVolume]=useState(.55),[earthOpen,setEarthOpen]=useState(false),[earthReady,setEarthReady]=useState(false);
  const shelf=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({left:false,right:false});
  useEffect(()=>{
    const element=shelf.current;if(!element)return;
    const update=()=>{const left=element.scrollLeft>2,right=element.scrollLeft+element.clientWidth<element.scrollWidth-2;setEdges(previous=>previous.left===left&&previous.right===right?previous:{left,right});};
    const observer=new ResizeObserver(update);observer.observe(element);element.addEventListener('scroll',update,{passive:true});update();
    return()=>{observer.disconnect();element.removeEventListener('scroll',update);};
  },[]);
  const record=jukeboxRecords.find(r=>r.id===selected)!,station=record.id==='arctic'?'arctic':'climate';
  function moveShelf(direction:number){const element=shelf.current;if(element)element.scrollBy({left:direction*element.clientWidth*.8,behavior:motion?'smooth':'instant'});}
  return <div className="jb-home" style={{'--record-accent':record.accent} as CSSProperties}>
    <header className="jb-intro"><div><p className="jb-eyebrow"><Disc3 size={15}/>{t('THE EARTH INFORMATION JUKEBOX')}</p><h1 tabIndex={-1}>{t('Your planet.')} <em>{t('On the record.')}</em></h1></div><p>{t('Choose an Earth story. Press Play.')}<span>{t('Sound made from NASA visuals and Earth observations.')}</span></p></header>
    <div className="jb-layout">
      <section className="jb-library" aria-label={t('Choose an Earth record')}><div className="jb-library-heading"><h2>{t('Choose a record')}</h2><span>{String(jukeboxRecords.findIndex(item=>item.id===selected)+1).padStart(2,'0')} / 04</span></div>
        <div className={`jb-shelf-wrap${edges.left?' has-previous':''}${edges.right?' has-next':''}`}>
          <div className="jb-records" ref={shelf}>{jukeboxRecords.map((item,index)=><button key={item.id} className={`jb-record ${selected===item.id?'is-selected':''}`} aria-pressed={selected===item.id} aria-label={`${t('Select record')}: ${t(item.title)}`} onClick={()=>setSelected(item.id)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=shelf.current?.querySelectorAll<HTMLButtonElement>('.jb-record');const next=e.key==='Home'?0:e.key==='End'?jukeboxRecords.length-1:(index+(e.key==='ArrowRight'?1:-1)+jukeboxRecords.length)%jukeboxRecords.length;buttons?.[next]?.focus();}}>
            <span className={`jb-sleeve jb-sleeve-${item.id}`} aria-hidden="true">{item.id==='spiral'?<img src={item.frame!.imageUrl} alt=""/>:item.posterUrl?<img src={item.posterUrl} alt=""/>:<span>{item.id==='arctic'?'↘':'↗'}</span>}<i/></span>
            <span className="jb-record-copy"><small>{item.number} / {t(item.id==='spiral'?'SIDES A + B':item.kind==='visual'?'Visual':'Measurements')}</small><strong>{t(item.title)}</strong><span>{t(item.id==='motion'?'Still from the archived animation':item.subtitle)}</span></span><span className="jb-record-indicator" aria-hidden="true">{selected===item.id?<AudioLines size={17}/>:<ArrowUpRight size={17}/>}</span>
          </button>)}</div>
          {edges.left&&<button className="jb-shelf-arrow jb-shelf-previous" type="button" aria-label={t('Previous records')} onClick={()=>moveShelf(-1)}><ChevronLeft size={17}/></button>}
          {edges.right&&<button className="jb-shelf-arrow jb-shelf-next" type="button" aria-label={t('More records')} onClick={()=>moveShelf(1)}><ChevronRight size={17}/></button>}
        </div>
        <p className="jb-library-note"><Headphones size={15}/>{t('Four records. Sound generated as you listen.')}</p>
      </section>
      <div className="jb-player" key={record.id}>{record.id==='spiral'?<ClimateDeck record={record} motion={motion} volume={volume} onVolume={setVolume}/>:record.kind==='visual'?<VisualDeck record={record} motion={motion} volume={volume} onVolume={setVolume}/>:<DataDeck record={record} volume={volume} onVolume={setVolume}/>}</div>
    </div>
    <div className="jb-deeper"><span>{t('Curiosity has a B-side.')} <ArrowDown size={14}/></span><a href={pageUrl('listen',station,record.id==='motion'?'motion':undefined)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('listen',station,record.id==='motion'?'motion':undefined);}}>{t('Discover the story')} <ArrowUpRight size={15}/></a><a href={pageUrl('data',station)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('data',station);}}>{t('Inspect the data')} <ArrowUpRight size={15}/></a><a href={pageUrl('create',station)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('create',station);}}>{t('Open the music studio')} <ArrowUpRight size={15}/></a></div>
    <details className="jb-earth-extra" onToggle={e=>{setEarthOpen(e.currentTarget.open);if(!e.currentTarget.open)setEarthReady(false);}}><summary>{t('A closer look at home')} <span>{t('The Earth Observatory view')} ↗</span></summary>{earthOpen&&<div><Suspense fallback={<p role="status">{t('Loading the Earth view…')}</p>}><EarthGlobe locations={[]} selectedId="" onSelect={noop} playing={false} autoRotate={motion} photographic onSurfaceReady={setEarthReady}/></Suspense><p>{t(earthReady?'July 2004 composite. Lighting and rotation are illustrative, not live weather.':'Interactive illustration with Natural Earth boundaries. Lighting and rotation are illustrative.')} <a href={earthReady?observatoryImagery.sourcePage:'https://www.naturalearthdata.com/'} target="_blank" rel="noreferrer">{t(earthReady?'NASA Earth Observatory · Blue Marble ↗':'Interactive Earth illustration ↗')}</a></p></div>}</details>
  </div>;
}
