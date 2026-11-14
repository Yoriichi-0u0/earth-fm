// Currents of Heat: NASA SVS 3912 (ECCO2 sea surface currents coloured by temperature, 19 Jun 2007).
// Side A plays the ocean pole to pole: each band's temperature, read from NASA's numeric colour bar,
// sets the pitch. Side B: touch any part of the ocean to hear and read its temperature.
import {useEffect,useMemo,useRef,useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent,PointerEvent as ReactPointerEvent} from 'react';
import {AudioLines} from 'lucide-react';
import DeckConsole from './DeckConsole';
import AirTurntable,{type GlobeTarget} from './AirTurntable';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';
import {useStudioLanguage} from '../lib/studioLanguage';
import {useOceanModel} from '../lib/ocean/useOceanModel';
import {OceanEngine} from '../lib/ocean/audio';
import {BANDS,COLS,DISPLAY_URL,NORTH,ROWS,SOUTH,cellAt,readWindow} from '../lib/ocean/analyze';
import {DEFAULT_BPM,MAPPING_TABLE,noteFor,stepSeconds} from '../lib/ocean/sonify';
import {bandCaption,celsius,cellCaption,feel,latLabel,lonLabel} from '../lib/ocean/describe';
import './NightLightsDeck.css';
import './AirDeck.css';
import './OceanDeck.css';

type Current={index:number;serial:number;at:number;kind:'band'|'cell';caption:string;temp:number|null;note:string;hz:number|null;lat:number;lon:number};
const REGIONS=[
  {name:'Western Pacific warm pool',box:[130,-5,170,10]},
  {name:'Eastern equatorial Pacific',box:[-120,-3,-90,3]},
  {name:'Gulf Stream',box:[-75,33,-60,40]},
  {name:'Labrador Sea',box:[-60,52,-48,62]},
  {name:'Mediterranean Sea',box:[0,32,30,42]},
  {name:'Southern Ocean, 55–65°S',box:[-180,-65,180,-55]},
] as const;

declare global{interface Window{terrajukeOcean?:{events:{index:number;kind:string;temp:number|null}[]}}}

export default function OceanDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();
  const model=useOceanModel(),ready=model.status==='ready';
  const [side,setSide]=useState<RecordSide>('a');
  const [playing,setPlaying]=useState(false),[completed,setCompleted]=useState(false),[requestAt,setRequestAt]=useState(0);
  const [current,setCurrent]=useState<Current|null>(null),[message,setMessage]=useState('');
  const [band,setBand]=useState(16),[cell,setCell]=useState({col:58,row:15});
  const [bpm,setBpm]=useState(DEFAULT_BPM);const bpmRef=useRef(DEFAULT_BPM);
  const audio=useRef<OceanEngine|null>(null),serial=useRef(0);
  useEffect(()=>{audio.current=new OceanEngine();window.terrajukeOcean={events:[]};return()=>audio.current?.dispose();},[]);
  useEffect(()=>{audio.current?.setVolume(volume);},[volume]);

  function show(next:Omit<Current,'serial'|'at'>){
    const id=++serial.current;setCurrent({...next,serial:id,at:performance.now()});
    const log=window.terrajukeOcean;if(log){log.events.push({index:next.index,kind:next.kind,temp:next.temp});if(log.events.length>200)log.events.splice(0,log.events.length-200);}
  }
  function showBand(i:number){
    if(!ready)return;const b=model.bands[i],n=model.score[i];
    show({index:i,kind:'band',caption:bandCaption(b.lat0,b.lat1,b.reading),temp:n?n.temp:null,note:n?.name??t('Rest'),hz:n?.hz??null,lat:(b.lat0+b.lat1)/2,lon:b.reading.warmLon??-30});
  }
  function stop(say=true){const was=playing;audio.current?.stop();setPlaying(false);if(say&&was)setMessage(t('Stopped.'));}
  function play(){
    if(!ready)return;stop(false);setPlaying(true);setCompleted(false);setRequestAt(performance.now());setSide('a');
    setMessage(t('From the Arctic to Antarctica: each band of ocean, warm water high, cold water low. Escape stops.'));
    audio.current?.play(model.score,{getStepSeconds:()=>stepSeconds(bpmRef.current),onStep:i=>{setBand(i);showBand(i);},onEnd:()=>{setPlaying(false);setCompleted(true);setMessage(t('Pole to pole is complete.'));}});
  }
  function hearBand(i:number){if(!ready)return;stop(false);setBand(i);audio.current?.playOne(model.score[i],stepSeconds(bpmRef.current));showBand(i);setMessage(bandCaption(model.bands[i].lat0,model.bands[i].lat1,model.bands[i].reading));}
  function hearCell(col:number,row:number){
    if(!ready)return;stop(false);setCell({col,row});
    const c=cellAt(model.field,col,row),n=noteFor(c.reading),lat=c.lat1-90/ROWS,lon=c.lon0+180/COLS,caption=cellCaption(lat,lon,c.reading);
    audio.current?.playOne(n,stepSeconds(bpmRef.current));
    show({index:row*COLS+col,kind:'cell',caption,temp:n?n.temp:null,note:n?.name??t('Silence'),hz:n?.hz??null,lat,lon});setMessage(caption);
  }
  function changeSide(next:RecordSide){if(next===side)return;stop(false);setSide(next);setCompleted(false);setCurrent(null);}
  function onKey(e:ReactKeyboardEvent<HTMLDivElement>){
    const k=e.key;
    if(k==='Escape'){e.preventDefault();stop();return;}
    if(side==='a'){
      if(k==='ArrowDown'||k==='ArrowUp'){e.preventDefault();hearBand(Math.max(0,Math.min(BANDS-1,band+(k==='ArrowDown'?1:-1))));}
      else if(k==='Home'||k==='End'){e.preventDefault();hearBand(k==='Home'?0:BANDS-1);}
      else if(k==='Enter'||k===' '){e.preventDefault();playing?stop():play();}
    }else{
      const moves:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(k in moves){e.preventDefault();const [dc,dr]=moves[k];hearCell((cell.col+dc+COLS)%COLS,Math.max(0,Math.min(ROWS-1,cell.row+dr)));}
      else if(k==='Enter'||k===' '){e.preventDefault();hearCell(cell.col,cell.row);}
    }
  }
  function onPointer(e:ReactPointerEvent<HTMLDivElement>){
    const box=e.currentTarget.getBoundingClientRect(),fx=(e.clientX-box.left)/box.width,fy=(e.clientY-box.top)/box.height;
    if(fx<0||fx>1||fy<0||fy>1)return;
    if(side==='b')hearCell(Math.min(COLS-1,Math.floor(fx*COLS)),Math.min(ROWS-1,Math.floor(fy*ROWS)));
    else{const lat=90-fy*180,i=Math.floor((NORTH-lat)/((NORTH-SOUTH)/BANDS));if(i>=0&&i<BANDS)hearBand(i);}
  }

  const regions=useMemo(()=>ready?REGIONS.map(r=>({name:r.name,reading:readWindow(model.field,r.box[0],r.box[1],r.box[2],r.box[3])})):[],[model]);
  const focusLat=side==='a'?(ready?model.bands[band]:null):null;
  const bandBox=focusLat?{top:`${(90-focusLat.lat1)/180*100}%`,height:`${(focusLat.lat1-focusLat.lat0)/180*100}%`}:null;
  const cellBox=side==='b'?{left:`${cell.col/COLS*100}%`,top:`${cell.row/ROWS*100}%`,width:`${100/COLS}%`,height:`${100/ROWS}%`}:null;
  const target:GlobeTarget=current?{lon:current.lon,lat:current.lat,at:current.at,dur:stepSeconds(bpm),glide:false}:{lon:150,lat:5,at:0,dur:1,glide:false};
  const signal:RecordSignal={playing,note:current?.note??'—',frequency:current?.hz??null,event:current?{serial:current.serial,at:current.at,index:current.index}:null};
  const caption=!ready?t(model.status==='error'?'NASA’s ocean image could not be read.':'Reading NASA’s ocean temperatures in your browser…'):current?.caption??t(side==='a'?'Press Play to travel from the Arctic to Antarctica.':'Tap the ocean, or use the arrow keys, to hear its temperature.');

  const sideControls=<>
    <div className="jb-side-selector" role="group" aria-label={t('Choose a side of Currents of Heat')}>
      <button type="button" aria-label={t('Side A: pole to pole')} aria-pressed={side==='a'} onClick={()=>changeSide('a')}><b>A</b><span>{t('Pole to pole')}<small>{t('48 bands · Arctic to Antarctica')}</small></span></button>
      <button type="button" aria-label={t('Side B: touch the ocean')} aria-pressed={side==='b'} onClick={()=>changeSide('b')}><b>B</b><span>{t('Touch the ocean')}<small>{t('Any place · its temperature')}</small></span></button>
    </div>
    <div className="air-tempo"><label htmlFor="ocean-bpm">{t('Tempo')}</label><input id="ocean-bpm" type="range" min={60} max={160} step={4} value={bpm} aria-valuetext={`${bpm} ${t('beats per minute')}`} onChange={e=>{bpmRef.current=Number(e.target.value);setBpm(Number(e.target.value));}}/><output htmlFor="ocean-bpm">{bpm} BPM</output></div>
  </>;

  const artwork=<div className="jb-media ocean-media" aria-label={t('NASA ocean currents map, explorable by touch, mouse or keyboard')}>
    <div className="jb-art-label"><span>{t('ECCO2 currents · 19 June 2007')}</span><span>NASA / SVS 3912</span></div>
    <div className="ocean-map" tabIndex={0} role="application" aria-roledescription={t('sound map')} aria-label={t(side==='a'?'Ocean map, pole to pole. Up and down arrows move between bands of latitude and play each one; Home and End jump to the poles; Enter plays the whole journey; Escape stops.':'Ocean map. Arrow keys move around the ocean and play each place’s temperature; Enter plays it again; Escape stops.')} onKeyDown={onKey} onPointerDown={onPointer} data-side={side}>
      <img src={DISPLAY_URL} width={2048} height={1024} alt={t('NASA map of the world’s ocean currents on 19 June 2007, traced as fine swirling lines coloured by sea-surface temperature: deep red in the tropics, through orange, yellow and green, to blue near the poles.')} draggable={false} decoding="async"/>
      {bandBox&&<span className={`ocean-band${playing?' is-playing':''}`} style={bandBox} aria-hidden="true"/>}
      {cellBox&&<span className="ocean-cell" style={cellBox} aria-hidden="true"/>}
    </div>
    <img className="ocean-cbar" src="/nasa/svs3912/svs3912_sst_cbar.png" width={310} height={95} alt={t('NASA’s colour bar: sea-surface temperature from 0 °C (blue) through green and yellow to 32 °C (red).')}/>
    <p className="air-caption" data-testid="ocean-caption">{caption}</p>
    <div className="jb-art-footer"><span>{t(playing?'SOUND GENERATED IN YOUR BROWSER':side==='a'?'PRESS PLAY, TAP A LATITUDE OR USE THE ARROW KEYS':'TAP THE OCEAN OR USE THE ARROW KEYS')}</span><AudioLines size={16}/></div>
  </div>;

  const notes=<details className="nl-notes ocean-notes">
    <summary>{t('Liner notes: reading the ocean’s temperature from NASA’s colours')}</summary>
    <p>{t('NASA’s ECCO2 project (MIT and NASA JPL) combines satellite and ocean-float observations with the MIT general circulation model to reconstruct the whole ocean, down to individual eddies. NASA’s Scientific Visualization Studio traced its surface currents and coloured every trace by sea-surface temperature on a numeric scale from 0 to 32 °C. Because that scale is printed with the image, TerraJuke can read each trace’s colour back to a temperature: it matches the colour, ignoring how bright the trace is, to the nearest point on NASA’s colour bar.')}</p>
    <table className="nl-mapping"><tbody>{MAPPING_TABLE.map(([a,b])=><tr key={a}><td>{t(a)}</td><td>{t(b)}</td></tr>)}</tbody></table>
    <h3>{t('Does it read the ocean sensibly?')}</h3>
    {ready&&<div className="nl-table-scroll" tabIndex={0} role="region" aria-label={t('Regional temperatures read in your browser')}><table className="nl-compare"><caption>{t('Temperatures read in your browser from NASA’s colours, 19 June 2007')}</caption><thead><tr><th scope="col">{t('Region')}</th><th scope="col">{t('Median')}</th><th scope="col">{t('Most water')}</th><th scope="col">{t('Feels')}</th></tr></thead>
      <tbody>{regions.map(r=><tr key={r.name}><th scope="row">{t(r.name)}</th><td>{celsius(r.reading.median)}</td><td>{celsius(r.reading.p10)}–{celsius(r.reading.p90)}</td><td>{t(feel(r.reading.median))}</td></tr>)}</tbody></table></div>}
    <p>{t('The western Pacific warm pool reads warmest and the eastern Pacific’s cold tongue several degrees cooler; the Gulf Stream is far warmer than the Labrador Sea beside it; the Southern Ocean sits near freezing. Automated tests pin these readings and check that the ocean warms from each pole toward the equator.')}</p>
    <h3>{t('Limits')}</h3>
    <ul><li>{t('ECCO2 is a model that assimilates observations; this is one moment, 19 June 2007, not today’s ocean.')}</li><li>{t('Temperatures are read from rendered colour, so they are only as precise as NASA’s colour scale: about one degree.')}</li><li>{t('The traces show where currents flow, not how fast; their coverage sets only the shimmer’s loudness.')}</li><li>{t('The analysed copy is NASA’s JPEG decoded once and halved to 1024 × 512 pixels.')}</li></ul>
    <p className="nl-credit">{t('NASA’s Scientific Visualization Studio. Visualizer: Greg Shirah. Model: ECCO2 (MIT and NASA JPL), MITgcm.')}</p>
  </details>;

  return <>
    <DeckConsole record={record} labels={{input:'WATER',position:side==='a'?'LATITUDE':'PLACE',count:side==='a'?'48 bands, Arctic to Antarctica':'Any place in the ocean',duration:side==='a'?`~${Math.round(BANDS*stepSeconds(bpm))} s`:t('Your pace')}}
      playing={playing} starting={false} ready={ready} completed={completed} progress={side==='a'&&current?.kind==='band'?(current.index+1)/BANDS:0}
      note={current?.note??'—'} frequency={current?.hz?`${current.hz.toFixed(2)} Hz`:'—'}
      position={current?`${latLabel(current.lat)}${current.kind==='cell'?`, ${lonLabel(current.lon)}`:''}`:'—'}
      input={current?.temp!=null?`${celsius(current.temp)} · ${t(feel(current.temp))}`:current?t('No open ocean'):'—'}
      onPlay={()=>playing?stop():play()} playLabel="Play pole to pole"
      signal={signal} requestAt={requestAt} error={model.status==='error'?model.error:undefined}
      sideControls={sideControls}
      recordObject={<AirTurntable target={target} texture={DISPLAY_URL} playing={playing} pulse={current?.serial??0} motion={motion} accent={record.accent} caption={t(playing?'The globe turns to each band’s warmest water':'Earth is the record. Press Play.')}/>}
      artwork={artwork} volume={volume} onVolume={onVolume} extra={notes}/>
    <p className="sr-only" aria-live="polite" data-testid="ocean-announcer">{message}</p>
  </>;
}
