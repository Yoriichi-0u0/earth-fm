// Night Lights: NASA SVS 5313 (EIC Version) on the jukebox.
// Side A plays NASA's change map (purple = more light, orange = less light); Side B plays the
// decade through NASA's own twelve annual frames. Every sound is one event that drives the
// note, a ring on the map, a caption, an optional screen-reader message and optional vibration.
import {useEffect,useMemo,useRef,useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent,PointerEvent as ReactPointerEvent} from 'react';
import {AudioLines,Vibrate} from 'lucide-react';
import DeckConsole from './DeckConsole';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';
import {useStudioLanguage} from '../lib/studioLanguage';
import {useNightLightsModel,CHANGE_MAP_URL} from '../lib/nightLights/useNightLightsModel';
import {AudioEngine} from '../lib/nightLights/audio';
import {planFor,legendTourPositions,MAPPING_TABLE,type NotePlan} from '../lib/nightLights/sonify';
import {COLS,ROWS,cellRect,directionOf,type Cell,type Direction,type RegionStats} from '../lib/nightLights/analyze';
import {beatMs,beatPosition,clampBpm,decadeSeries,decadeTrend,frameUrl,rhythmPlan,startLight,yearDirection,yearPlan,DEFAULT_BPM,METERS,MIN_BPM,MAX_BPM,YEARS,SMALL_PLACE_PIXELS,DECADE_MAPPING_TABLE,type Meter,type YearStats} from '../lib/nightLights/decade';
import {IMAGE_HEIGHT,IMAGE_WIDTH,INSETS,LEGEND_BAR,maskReason} from '../lib/nightLights/layout';
import type {Rect} from '../lib/nightLights/raster';
import {cellPosition,decadeSentence,directionWords,eventCaption,pct,trendWords,yearCaption} from '../lib/nightLights/describe';
import crosscheck from '../../validation/svs5276-crosscheck.json';
import './NightLightsDeck.css';

type Place={id:string;label:string;rect:Rect;change:RegionStats|null};
type Shown={id:number;text:string;direction:Direction;rect:Rect;pulses:number;litFraction:number;note:string;hz:number|null;at:number};
const FULL:Rect={x0:0,y0:0,x1:IMAGE_WIDTH-1,y1:IMAGE_HEIGHT-1};
const CHANGE_POSITION=2024;
const TOUR_STEP_MS=1300;
const VIBRATION:Record<Direction,number[]>={more:[30,40,30],less:[120],steady:[15]};
const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName=(hz:number)=>{const m=Math.round(12*Math.log2(hz/440)+69);return `${NOTE_NAMES[((m%12)+12)%12]}${Math.floor(m/12)-1}`;};
const centreX=(r:Rect)=>(r.x0+r.x1)/2;
const pctBox=(r:Rect)=>({left:`${r.x0/IMAGE_WIDTH*100}%`,top:`${r.y0/IMAGE_HEIGHT*100}%`,width:`${(r.x1-r.x0+1)/IMAGE_WIDTH*100}%`,height:`${(r.y1-r.y0+1)/IMAGE_HEIGHT*100}%`});
/** Vibration only where it can be felt: Android browsers that implement it (not desktop Chrome, not iOS). */
const canVibrate=()=>typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'&&/Android/i.test(navigator.userAgent);

declare global{interface Window{terrajukeNightLights?:{events:{id:number;text:string;direction:string;audioAt:number|null;shownAt:number}[];regions?:{id:string;trend:string|null;change:string|null;ratio:number;small:boolean}[]}}}

export default function NightLightsDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();
  const model=useNightLightsModel();
  const [side,setSide]=useState<RecordSide>('a');
  const [mode,setMode]=useState<'idle'|'tour'|'decade'|'legend'>('idle');
  const [year,setYear]=useState<number|null>(null);
  const [focus,setFocus]=useState({col:26,row:3});
  const [shown,setShown]=useState<Shown|null>(null);
  const [progress,setProgress]=useState(0);
  const [completed,setCompleted]=useState(false);
  const [message,setMessage]=useState('');
  const [vibrate,setVibrate]=useState(false);
  const [requestAt,setRequestAt]=useState(0);
  const [bpm,setBpmState]=useState(DEFAULT_BPM),[meter,setMeterState]=useState<Meter>(4),[metronome,setMetronome]=useState(false),[beat,setBeat]=useState<{bar:number;beat:number}|null>(null);
  // Read live by the running decade, so a change takes effect on the next beat.
  const rhythm=useRef({bpm:DEFAULT_BPM,meter:4 as Meter,metronome:false});
  const setBpm=(v:number)=>{rhythm.current.bpm=clampBpm(v);setBpmState(clampBpm(v));};
  const setMeter=(v:Meter)=>{rhythm.current.meter=v;setMeterState(v);};
  const toggleMetronome=(v:boolean)=>{rhythm.current.metronome=v;setMetronome(v);};
  const audio=useRef<AudioEngine|null>(null),timer=useRef<number|undefined>(undefined),serial=useRef(0);
  const placeRef=useRef<Place|null>(null);
  const [place,setPlaceState]=useState<Place|null>(null);

  useEffect(()=>{audio.current=new AudioEngine();window.terrajukeNightLights={events:[]};return()=>{window.clearTimeout(timer.current);audio.current?.dispose();};},[]);
  useEffect(()=>{audio.current?.setVolume(volume);},[volume]);

  const world:Place|null=model.overall?{id:'world',label:'The whole map',rect:FULL,change:model.overall}:null;
  const regions:Place[]=useMemo(()=>model.insets.map(s=>({id:s.id,label:`${s.name} map region`,rect:s.region,change:s})),[model.insets]);
  const current=place??world;
  function setPlace(p:Place){placeRef.current=p;setPlaceState(p);}

  // ---- One event, every channel -------------------------------------------------
  function emit(plan:NotePlan,text:string,rect:Rect,direction:Direction,litFraction:number,origin:'user'|'auto'){
    let audioAt:number|null=null;
    try{audio.current?.play(plan);audioAt=performance.now();}catch{/* sound never blocks the other channels */}
    const id=++serial.current;
    setShown({id,text,direction,rect,pulses:plan.pulses,litFraction,note:noteName(plan.notes[0].hz),hz:plan.notes[0].hz,at:performance.now()});
    if(origin==='user')setMessage(text);
    if(vibrate&&canVibrate())navigator.vibrate(VIBRATION[direction]);
    const log=window.terrajukeNightLights;
    if(log){log.events.push({id,text,direction,audioAt,shownAt:performance.now()});if(log.events.length>100)log.events.splice(0,log.events.length-100);}
  }
  function stopAll(say=true){
    const was=mode!=='idle';
    window.clearTimeout(timer.current);timer.current=undefined;
    audio.current?.stop();
    setMode('idle');
    if(say&&was)setMessage(t('Stopped.'));
  }

  // ---- Side A: the change map ------------------------------------------------------
  function playChange(p:Place,origin:'user'|'auto',label=p.label){
    const s=p.change;
    const plan=s&&s.direction?planFor(s,centreX(p.rect),IMAGE_WIDTH):null;
    if(!s||!plan){const text=`${label} · ${s?t('no lit map pixels'):t('covered by graphics on the change map')} · ${t('silent')}`;setShown(prev=>prev&&{...prev,text});if(origin==='user')setMessage(text);return;}
    emit(plan,eventCaption(label,s,plan),p.rect,plan.direction,s.litFraction,origin);
  }
  function insetUnder(c:Cell){const cx=(c.rect.x0+c.rect.x1)>>1,cy=(c.rect.y0+c.rect.y1)>>1;return INSETS.findIndex(i=>cx>=i.frame.x0&&cx<=i.frame.x1&&cy>=i.frame.y0&&cy<=i.frame.y1);}
  function placeForCell(c:Cell):Place{
    if(c.mapPixels===0){const i=insetUnder(c);if(i>=0)return regions[i];}
    return {id:`cell-${c.col}-${c.row}`,label:cellPosition(c),rect:c.rect,change:c.mapPixels?c:null};
  }
  function startTour(){
    if(!world)return;
    stopAll(false);audio.current?.unlock();setMode('tour');setCompleted(false);setRequestAt(performance.now());
    const steps=[...regions,world];let i=0;
    setMessage(t('Playing NASA’s four highlighted regions, then the whole map. Escape stops.'));
    const next=()=>{
      if(i>=steps.length){setMode('idle');setCompleted(true);setProgress(1);return;}
      const p=steps[i++];setPlace(p);playChange(p,'auto');setProgress(i/steps.length);
      timer.current=window.setTimeout(next,TOUR_STEP_MS);
    };
    next();
  }
  function startLegend(){
    stopAll(false);audio.current?.unlock();setMode('legend');setCompleted(false);
    setMessage(t('Playing NASA’s legend from orange, less light, through white, to purple, more light.'));
    const positions=legendTourPositions();let i=0;
    const next=()=>{
      if(i>=positions.length){setMode('idle');return;}
      const s=positions[i++];let best=model.ramp[0];
      for(const r of model.ramp)if(Math.abs(r.s-s)<Math.abs(best.s-s))best=r;
      const direction=directionOf(s),plan=planFor({direction,meanChange:s,litFraction:.05},best.x,IMAGE_WIDTH)!;
      const colour=s< -.15?t('orange side'):s>.15?t('purple side'):t('white middle');
      emit(plan,`${t('Legend')} ${s>=0?'+':'−'}${Math.abs(s).toFixed(2)} · ${colour} · ${t(directionWords(direction))}`,{x0:best.x-2,x1:best.x+2,y0:LEGEND_BAR.y0,y1:LEGEND_BAR.y1},direction,.05,'auto');
      setProgress(i/positions.length);
      timer.current=window.setTimeout(next,1000);
    };
    next();
  }

  // ---- Side B: the decade -----------------------------------------------------------
  const decadeFor=(p:Place)=>model.decade?decadeSeries(model.decade,p.rect):null;
  function emitYear(p:Place,series:readonly YearStats[],i:number,origin:'user'|'auto',inRhythm=false){
    const cur=series[i],prev=i>0?series[i-1]:undefined,dir=yearDirection(prev,cur);
    const pos=beatPosition(i,rhythm.current.meter);
    if(inRhythm){setBeat({bar:pos.bar,beat:pos.beat});if(rhythm.current.metronome)audio.current?.click(pos.downbeat);}
    const text=yearCaption(p.label,cur,series.find(s=>s.light>0),dir,prev?prev.year:null)+(inRhythm?` · ${t('bar')} ${pos.bar}, ${t('beat')} ${pos.beat}`:'');
    const base=yearPlan(cur,startLight(series),dir,centreX(p.rect));
    if(!base){setShown(prevShown=>prevShown&&{...prevShown,text});if(origin==='user')setMessage(text);return;}
    emit(inRhythm?rhythmPlan(base,pos.downbeat,rhythm.current.bpm):base,text,p.rect,dir,cur.litFraction,origin);
  }
  function startDecade(p:Place|null=placeRef.current??world){
    const series=p&&decadeFor(p);
    if(!p||!series)return;
    stopAll(false);audio.current?.unlock();setPlace(p);setMode('decade');setCompleted(false);setRequestAt(performance.now());
    setMessage(`${t('The decade for')} ${p.label}: ${t('NASA’s yearly frames from 2012 to 2023, one note each, then NASA’s change map.')}`);
    const trend=decadeTrend(series);let i=0;
    const next=()=>{
      if(i<series.length){setYear(series[i].year);emitYear(p,series,i,'auto',true);i++;setProgress(i/(series.length+1));timer.current=window.setTimeout(next,beatMs(rhythm.current.bpm));}
      else if(i===series.length){setYear(null);setBeat(null);playChange(p,'auto',`${t('NASA’s change map')} · ${p.label}`);i++;setProgress(1);timer.current=window.setTimeout(next,TOUR_STEP_MS);}
      else{setMode('idle');setCompleted(true);setMessage(decadeSentence(p.label,series,trend,p.change?.direction??null,series[0].mapPixels<SMALL_PLACE_PIXELS));}
    };
    timer.current=window.setTimeout(next,200);
  }
  function playYear(p:Place,y:number,origin:'user'|'auto'){
    const series=decadeFor(p);if(!series)return;
    emitYear(p,series,YEARS.indexOf(y as (typeof YEARS)[number]),origin);
  }

  // ---- Choosing places ---------------------------------------------------------------
  function choose(p:Place){
    stopAll(false);audio.current?.unlock();setPlace(p);setRequestAt(performance.now());
    if(side==='a')playChange(p,'user');
    else if(year!==null)playYear(p,year,'user');
    else startDecade(p);
  }
  function chooseCell(c:Cell){setFocus({col:c.col,row:c.row});choose(side==='b'?{id:`cell-${c.col}-${c.row}`,label:cellPosition(c),rect:c.rect,change:c.mapPixels?c:null}:placeForCell(c));}
  function cellAt(col:number,row:number){return model.cells[row*COLS+col];}
  function describe(c:Cell):string{
    if(side==='b'&&year!==null&&model.decade){const s=decadeSeries(model.decade,cellRect(c.col,c.row))[YEARS.indexOf(year as (typeof YEARS)[number])];return `${cellPosition(c)}, ${year}: ${s.light>0?`${t('brightness above the base map')} ${s.light.toFixed(2)}`:t('nothing brighter than the base map')}.`;}
    if(c.mapPixels===0){const i=insetUnder(c);return i>=0?`${cellPosition(c)}: ${INSETS[i].name} ${t('inset, a magnified copy of a box on the map. Press Enter to hear that box.')}`:`${cellPosition(c)}: ${maskReason((c.rect.x0+c.rect.x1)>>1,(c.rect.y0+c.rect.y1)>>1)==='legend'?t('the legend'):t('masked graphics, not map data')}.`;}
    return `${cellPosition(c)}: ${c.direction?`${t(directionWords(c.direction))}, ${pct(c.litFraction)} ${t('of map pixels lit')}`:t('no lit map pixels')}.`;
  }
  function onMapKey(e:ReactKeyboardEvent<HTMLDivElement>){
    const moves:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(e.key in moves){e.preventDefault();if(mode!=='idle')stopAll(false);const [dc,dr]=moves[e.key];const next={col:Math.max(0,Math.min(COLS-1,focus.col+dc)),row:Math.max(0,Math.min(ROWS-1,focus.row+dr))};setFocus(next);setMessage(describe(cellAt(next.col,next.row)));}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseCell(cellAt(focus.col,focus.row));}
    else if(e.key==='Home'||e.key==='End'){e.preventDefault();const i=regions.findIndex(r=>r.id===placeRef.current?.id),n=regions.length;choose(regions[e.key==='End'?(i+1)%n:(i-1+n)%n]);}
    else if(e.key==='d'||e.key==='D'){e.preventDefault();if(mode==='decade')stopAll();else{setSide('b');startDecade(placeForCell(cellAt(focus.col,focus.row)));}}
    else if(e.key==='Escape'){e.preventDefault();stopAll();}
  }
  function onMapPointer(e:ReactPointerEvent<HTMLDivElement>){
    const box=e.currentTarget.getBoundingClientRect();
    const col=Math.floor((e.clientX-box.left)/box.width*COLS),row=Math.floor((e.clientY-box.top)/box.height*ROWS);
    if(col<0||row<0||col>=COLS||row>=ROWS||!model.cells.length)return;
    chooseCell(cellAt(col,row));
  }
  function changeSide(next:RecordSide){if(next===side)return;stopAll(false);setYear(null);setSide(next);setCompleted(false);setProgress(0);}
  function onYear(value:number){
    stopAll(false);audio.current?.unlock();
    if(value===CHANGE_POSITION){setYear(null);if(current)playChange(current,'user',`${t('NASA’s change map')} · ${current.label}`);return;}
    setYear(value);if(current)playYear(current,value,'user');
  }

  // ---- Regional comparison (liner notes) --------------------------------------------------
  const comparison=useMemo(()=>{
    if(!model.decade||!world)return null;
    const independent:Record<string,number>={world:crosscheck.series.world.light[11]/crosscheck.series.world.light[0],india:crosscheck.series.india.light[11]/crosscheck.series.india.light[0]};
    const rows=[world,...regions].map(p=>{const s=decadeSeries(model.decade!,p.rect);return {p,s,trend:decadeTrend(s),ratio:s[0].light>0?s[11].light/s[0].light:NaN,small:s[0].mapPixels<SMALL_PLACE_PIXELS,independent:independent[p.id]};});
    window.terrajukeNightLights&&(window.terrajukeNightLights.regions=rows.map(r=>({id:r.p.id,trend:r.trend,change:r.p.change?.direction??null,ratio:r.ratio,small:r.small})));
    return rows;
  },[model.decade,world,regions]);

  // ---- Console state --------------------------------------------------------------------
  const ready=model.status==='ready'&&(side==='a'||model.decadeStatus==='ready');
  const playing=mode!=='idle';
  const signal:RecordSignal={playing,note:shown?.note??'—',frequency:shown?.hz??null,event:shown?{serial:shown.id,at:shown.at,index:0}:null};
  const position=side==='b'?(year!==null?`${year} · ${mode==='decade'&&beat?`${t('bar')} ${beat.bar}, ${t('beat')} ${beat.beat}`:`${YEARS.indexOf(year as (typeof YEARS)[number])+1} / 12`}`:t('Change map')):current?current.label:'—';
  const error=model.status==='error'?model.error:side==='b'&&model.decadeStatus==='error'?t('NASA’s yearly frames could not be loaded. Side A still works.'):undefined;
  const sideRecord={...record,title:record.title};
  const focusRect=cellRect(focus.col,focus.row);

  const sideControls=<>
    <div className="jb-side-selector" role="group" aria-label={t('Choose a side of Night Lights')}>
      <button type="button" aria-label={t('Side A: the change map')} aria-pressed={side==='a'} onClick={()=>changeSide('a')}><b>A</b><span>{t('The change map')}<small>{t('2012 → 2023 · purple more, orange less')}</small></span></button>
      <button type="button" aria-label={t('Side B: hear the decade')} aria-pressed={side==='b'} onClick={()=>changeSide('b')}><b>B</b><span>{t('Hear the decade')}<small>{t('NASA’s 12 yearly frames')}</small></span></button>
    </div>
    <div className="nl-places" role="group" aria-label={t('Choose a place')}>
      {[world,...regions].filter((p):p is Place=>Boolean(p)).map(p=><button key={p.id} type="button" aria-pressed={current?.id===p.id} disabled={!ready} onClick={()=>choose(p)}>{t(p.id==='world'?'Whole map':p.label.replace(' map region',''))}</button>)}
    </div>
    {side==='a'?<div className="jb-science-cue"><p>{t('Purple (more light) rises. Orange (less light) falls. White is one tone.')}</p><button className="jb-manual-toggle" type="button" disabled={model.status!=='ready'} aria-pressed={mode==='legend'} onClick={()=>mode==='legend'?stopAll():startLegend()}>{t(mode==='legend'?'Stop the legend':'Listen to the legend')}</button></div>
      :<div className="nl-year"><label htmlFor="nl-year">{t('NASA yearly frame')}</label><input id="nl-year" type="range" min={YEARS[0]} max={CHANGE_POSITION} step={1} value={year??CHANGE_POSITION} disabled={model.decadeStatus!=='ready'} aria-valuetext={year===null?t('Change map, 2012 to 2023'):String(year)} onChange={e=>onYear(Number(e.target.value))}/><output htmlFor="nl-year">{year===null?t('Change map'):year}</output></div>}
    {side==='b'&&<div className="nl-rhythm" role="group" aria-label={t('Rhythm: your musical choice; the data still sets every note')}>
      <div className="nl-tempo"><label htmlFor="nl-bpm">{t('Tempo')}</label><input id="nl-bpm" type="range" min={MIN_BPM} max={MAX_BPM} step={5} value={bpm} aria-valuetext={`${bpm} ${t('beats per minute')}`} onChange={e=>setBpm(Number(e.target.value))}/><output htmlFor="nl-bpm">{bpm} BPM</output></div>
      <div className="nl-meter" role="group" aria-label={t('Beats per bar')}><span>{t('Beats per bar')}</span>{METERS.map(m=><button key={m} type="button" aria-pressed={meter===m} onClick={()=>setMeter(m)}>{m}</button>)}</div>
      <label className="nl-click"><input type="checkbox" checked={metronome} onChange={e=>toggleMetronome(e.target.checked)}/>{t('Metronome click')}</label>
      <div className="nl-beats" aria-hidden="true">{Array.from({length:meter},(_,k)=><i key={k} className={`${k===0?'is-down':''}${mode==='decade'&&beat&&beat.beat===k+1?' is-on':''}`}/>)}</div>
    </div>}
    {canVibrate()&&<label className="nl-vibrate"><input type="checkbox" checked={vibrate} onChange={e=>setVibrate(e.target.checked)}/><Vibrate size={14}/>{t('Feel each note (supported Android browsers)')}</label>}
  </>;

  const artwork=<div className="jb-media nl-media" aria-label={t('NASA night-lights map, explorable by touch, mouse or keyboard')}>
    <div className="jb-art-label"><span>{t(side==='a'?'Change map':'Hear the decade')}</span><span>NASA / SVS 5313</span></div>
    <div className="nl-map" tabIndex={0} role="application" aria-roledescription={t('sound map')} aria-label={t('Night-lights map. Arrow keys move between cells, Enter plays, Home and End jump between NASA’s four regions, D plays the decade, Escape stops.')} onKeyDown={onMapKey} onPointerDown={onMapPointer} data-side={side}>
      <img src={CHANGE_MAP_URL} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} alt={t('NASA world map of night-light change from 2012 to 2023: purple for more light, orange for less light, with four magnified insets and a legend.')} draggable={false}/>
      {year!==null&&<img className="nl-year-frame" src={frameUrl(year)} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} alt={`${t('NASA’s annual night-light average for')} ${year}`} draggable={false}/>}
      {year!==null&&<span className="nl-year-badge" aria-hidden="true">{year}</span>}
      {current&&current.id!=='world'&&<span className="nl-place-box" style={pctBox(current.rect)} aria-hidden="true"/>}
      <span className="nl-focus" style={pctBox(focusRect)} aria-hidden="true"/>
      {shown&&<span key={shown.id} className={`nl-ring nl-${shown.direction}${motion?'':' nl-static'}${shown.rect.x1-shown.rect.x0>300?' nl-area':''}`} style={(()=>{const r=shown.rect,w=r.x1-r.x0+1,h=r.y1-r.y0+1,s=Math.max(w,h)*(.7+Math.min(.9,shown.litFraction*9)),wide=w>300,bw=wide?w:s,bh=wide?h:s,cx=r.x0+w/2,cy=r.y0+h/2;return {left:`${(cx-bw/2)/IMAGE_WIDTH*100}%`,top:`${(cy-bh/2)/IMAGE_HEIGHT*100}%`,width:`${bw/IMAGE_WIDTH*100}%`,height:`${bh/IMAGE_HEIGHT*100}%`,animationIterationCount:shown.pulses};})()} data-event-id={shown.id} data-direction={shown.direction} aria-hidden="true"/>}
    </div>
    <p className="nl-caption" data-testid="nl-caption">{shown?.text??t(model.status==='ready'?'Choose a place, tap the map or press Play.':model.status==='error'?'The NASA image could not be analysed.':'Analysing NASA’s image in your browser…')}</p>
    <div className="jb-art-footer"><span>{t(playing?'SOUND GENERATED IN YOUR BROWSER':'PRESS PLAY, TAP THE MAP OR USE THE ARROW KEYS')}</span><AudioLines size={16}/></div>
  </div>;

  const notes=<details className="nl-notes">
    <summary>{t('Liner notes: what you are hearing, and how we checked it')}</summary>
    <p>{t('NASA Scientific Visualization Studio’s “Change in Night Lights between 2012 and 2023 – EIC Version” (SVS 5313) compares yearly night-light composites from NASA’s Black Marble product (Suomi NPP VIIRS). Purple marks more light in 2023 than in 2012, orange less, white about the same. TerraJuke reads every map pixel in your browser and places it on NASA’s own legend, read from the same image. The legend, the four magnified insets, their labels, outlines and wedges are masked so nothing counts twice.')}</p>
    {comparison&&<div className="nl-table-scroll" tabIndex={0} role="region" aria-label={t('Regional comparison table (scrolls sideways on small screens)')}><table className="nl-compare">
      <caption>{t('Compare the regions: the decade, NASA’s change map and an independent NASA check')}</caption>
      <thead><tr><th scope="col">{t('Place')}</th><th scope="col">{t('Brightness 2023 ÷ 2012')}</th><th scope="col">{t('Decade')}</th><th scope="col">{t('NASA change map')}</th><th scope="col">{t('Same direction?')}</th><th scope="col">{t('NASA SVS 5276 stills, 2023 ÷ 2012')}</th></tr></thead>
      <tbody>{comparison.map(r=><tr key={r.p.id}><th scope="row">{t(r.p.label)}</th><td>{Number.isNaN(r.ratio)?'—':`${r.ratio.toFixed(2)}×`}</td><td>{t(trendWords(r.trend))}{r.small?` (${t('weak: small box')})`:''}</td><td>{r.p.change?.direction?t(directionWords(r.p.change.direction)):t('no lit pixels')}</td><td>{!r.trend||!r.p.change?.direction?'—':r.trend===r.p.change.direction?t('agree'):t('differ')}</td><td>{r.independent?`${r.independent.toFixed(2)}×`:t('not available')}</td></tr>)}</tbody>
    </table></div>}
    {comparison&&<ul className="nl-summaries">{comparison.map(r=><li key={r.p.id}>{decadeSentence(r.p.label,r.s,r.trend,r.p.change?.direction??null,r.small)}</li>)}</ul>}
    <h3>{t('Side A: the change map')}</h3>
    <table className="nl-mapping"><tbody>{MAPPING_TABLE.map(([a,b])=><tr key={a}><td>{t(a)}</td><td>{t(b)}</td></tr>)}</tbody></table>
    <h3>{t('Side B: the decade')}</h3>
    <table className="nl-mapping"><tbody>{DECADE_MAPPING_TABLE.map(([a,b])=><tr key={a}><td>{t(a)}</td><td>{t(b)}</td></tr>)}</tbody></table>
    <h3>{t('Checked against NASA')}</h3>
    <p>{t('NASA’s original version of this visualization (SVS 5276) publishes the same annual averages as separate series. With the same measure, our decade tracks them year by year: r = 0.999 for the world and r = 0.96 for India. That check replaced an early measure that exaggerated growth at this coarse scale.')}</p>
    <h3>{t('Limits')}</h3>
    <ul><li>{t('Rendered colours and brightness, not radiance; shares of map pixels, not of area.')}</li><li>{t('The yearly frames come from NASA’s compressed movie, scaled to the change map’s grid.')}</li><li>{t('Small boxes (Ukraine: 280 map pixels; Eastern Mediterranean: 308) give weak decade readings.')}</li><li>{t('It does not measure urbanization, population, economic activity or energy use.')}</li></ul>
    <p className="nl-credit">{t('NASA’s Scientific Visualization Studio. Visualizer: Kel Elkins (USRA). Scientists: Zhuosen Wang, Miguel Román, Ranjay Shrestha, Srija Chakraborty, Virginia Kalb. Data: Black Marble, Suomi NPP VIIRS, NASA/NOAA.')}</p>
  </details>;

  return <>
    <DeckConsole record={sideRecord} labels={{input:'PLACE',position:side==='b'?'YEAR':'WHERE',count:side==='b'?'12 years + change map':'4 NASA regions + whole map',duration:side==='b'?`~${Math.round(12*60/bpm+1.3)} s`:'~7 s'}}
      playing={playing} starting={false} ready={ready} completed={completed} progress={progress}
      note={shown?.note??'—'} frequency={shown?.hz?`${shown.hz.toFixed(2)} Hz`:'—'} position={position}
      input={current?`${t(current.label)}${current.change?.direction?` · ${t(directionWords(current.change.direction))}`:''}`:'—'}
      onPlay={()=>playing?stopAll():side==='a'?startTour():startDecade()}
      playLabel={side==='a'?'Play the four regions':'Hear the decade'}
      signal={signal} requestAt={requestAt} error={error} side={side}
      sideControls={sideControls} artwork={artwork} volume={volume} onVolume={onVolume} extra={notes}/>
    <p className="sr-only" aria-live="polite" data-testid="nl-announcer">{message}</p>
  </>;
}
