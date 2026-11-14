// The Air We Share: NASA SVS 5669 (GEOS Aerosols, 19 Aug 2025 20:00 UTC) on the jukebox.
// Side A turns the whole planet under the needle, west to east; Side B plays the six events NASA
// describes. Four aerosols, four instruments, one fixed score. Every step drives the sound, the
// globe, the map needle, the mixer meters, a caption, optional vibration and the screen reader.
import {useEffect,useMemo,useRef,useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent,PointerEvent as ReactPointerEvent} from 'react';
import {AudioLines,Vibrate} from 'lucide-react';
import DeckConsole from './DeckConsole';
import AirMixer,{audibleFrom,type TrackState} from './AirMixer';
import AirTurntable,{type GlobeTarget} from './AirTurntable';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import type {RecordSignal} from '../lib/recordSignal';
import {useStudioLanguage} from '../lib/studioLanguage';
import {useAirModel} from '../lib/air/useAirModel';
import {AirEngine} from '../lib/air/audio';
import {AEROSOLS,AEROSOL_NAMES,IMAGE_HEIGHT,IMAGE_WIDTH,STEPS,STILL_URL,type Aerosol} from '../lib/air/analyze';
import {STORIES,STORY_STEPS} from '../lib/air/stories';
import {DEFAULT_BPM,MAPPING_TABLE,MAX_BPM,MIN_BPM,VOICES,stepSeconds,type Chord} from '../lib/air/sonify';
import {lonLabel,mixSentence,shareSentence,stepCaption,strengthWord} from '../lib/air/describe';
import './NightLightsDeck.css';
import './AirDeck.css';

type Side='a'|'b';
type Mode='idle'|'world'|'story'|'tour';
type Current={index:number;chord:Chord;serial:number;at:number;dur:number;scope:string};
const canVibrate=()=>typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'&&/Android/i.test(navigator.userAgent);
const loudest=(c:Chord)=>c.notes.reduce<Chord['notes'][number]|null>((a,n)=>!a||n.loudness>a.loudness?n:a,null);
const pctBox=(r:{x0:number;y0:number;x1:number;y1:number})=>({left:`${r.x0/IMAGE_WIDTH*100}%`,top:`${r.y0/IMAGE_HEIGHT*100}%`,width:`${(r.x1-r.x0+1)/IMAGE_WIDTH*100}%`,height:`${(r.y1-r.y0+1)/IMAGE_HEIGHT*100}%`});

declare global{interface Window{terrajukeAir?:{events:{index:number;scope:string;aerosols:string[];at:number}[];audible?:Record<string,boolean>;shares?:Record<string,number>}}}

export default function AirDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();
  const model=useAirModel();
  const ready=model.status==='ready';
  const [side,setSide]=useState<Side>('a');
  const [mode,setMode]=useState<Mode>('idle');
  const [storyId,setStoryId]=useState('sahara');
  const [focus,setFocus]=useState(33);
  const [current,setCurrent]=useState<Current|null>(null);
  const [completed,setCompleted]=useState(false);
  const [message,setMessage]=useState('');
  const [vibrate,setVibrate]=useState(false);
  const [requestAt,setRequestAt]=useState(0);
  const [bpm,setBpmState]=useState(DEFAULT_BPM);
  const bpmRef=useRef(DEFAULT_BPM);
  const setBpm=(v:number)=>{bpmRef.current=v;setBpmState(v);};
  const [tracks,setTracks]=useState<Record<Aerosol,TrackState>>(()=>Object.fromEntries(AEROSOLS.map(a=>[a,{muted:false,solo:false}])) as Record<Aerosol,TrackState>);
  const audio=useRef<AirEngine|null>(null),serial=useRef(0),vibrateRef=useRef(false);
  vibrateRef.current=vibrate;

  useEffect(()=>{audio.current=new AirEngine();window.terrajukeAir={events:[]};return()=>{audio.current?.dispose();};},[]);
  useEffect(()=>{audio.current?.setVolume(volume);},[volume]);
  useEffect(()=>{const a=audibleFrom(tracks);audio.current?.setAudible(a);if(window.terrajukeAir)window.terrajukeAir.audible=a;},[tracks]);

  useEffect(()=>{if(model.status==='ready'&&window.terrajukeAir)window.terrajukeAir.shares=model.shares;},[model]);
  const story=STORIES.find(s=>s.id===storyId)!;
  const storyTrack=ready?model.stories.find(s=>s.story.id===storyId)!:null;
  const tour=useMemo(()=>ready?{score:model.stories.flatMap(s=>s.score),owner:model.stories.flatMap(s=>s.score.map(()=>s.story.id))}:null,[model]);

  function onStep(index:number,chord:Chord,scope:string,dur:number){
    const id=++serial.current;
    setCurrent({index,chord,serial:id,at:performance.now(),dur,scope});
    const top=loudest(chord);
    if(vibrateRef.current&&top&&canVibrate())navigator.vibrate(VOICES[top.aerosol].vibration);
    const log=window.terrajukeAir;
    if(log){log.events.push({index,scope,aerosols:chord.notes.map(n=>n.aerosol),at:performance.now()});if(log.events.length>200)log.events.splice(0,log.events.length-200);}
  }
  function stopAll(say=true){
    const was=mode!=='idle';
    audio.current?.stop();setMode('idle');
    if(say&&was)setMessage(t('Stopped.'));
  }
  function playWorld(from=0){
    if(!ready)return;
    stopAll(false);setMode('world');setCompleted(false);setRequestAt(performance.now());
    setMessage(t('Earth turns under the needle, west to east: 64 slices of longitude. Escape stops.'));
    audio.current?.play(model.score,{getBpm:()=>bpmRef.current,onStep:(i,c)=>{setFocus(i);onStep(i,c,'world',stepSeconds(bpmRef.current));},onEnd:()=>{setMode('idle');setCompleted(true);setMessage(t('The world is complete.'));}},from);
  }
  function playStory(id:string){
    if(!ready)return;
    const s=model.stories.find(x=>x.story.id===id)!;
    stopAll(false);setStoryId(id);setMode('story');setCompleted(false);setRequestAt(performance.now());
    setMessage(`${t(s.story.title)}. ${t(s.story.caption)}`);
    audio.current?.play(s.score,{getBpm:()=>bpmRef.current,onStep:(i,c)=>onStep(i,c,id,stepSeconds(bpmRef.current)),onEnd:()=>{setMode('idle');setCompleted(true);}});
  }
  function playTour(){
    if(!ready||!tour)return;
    stopAll(false);setMode('tour');setCompleted(false);setRequestAt(performance.now());
    let last='';
    audio.current?.play(tour.score,{getBpm:()=>bpmRef.current,onStep:(i,c)=>{const id=tour.owner[i];if(id!==last){last=id;setStoryId(id);const s=STORIES.find(x=>x.id===id)!;setMessage(`${t(s.title)}. ${t(s.caption)}`);}onStep(i%STORY_STEPS,c,id,stepSeconds(bpmRef.current));},onEnd:()=>{setMode('idle');setCompleted(true);setMessage(t('All six of NASA’s stories have played.'));}});
  }
  function hearStep(i:number){
    if(!ready)return;
    stopAll(false);setFocus(i);
    const c=model.score[i];audio.current?.playOne(c,bpmRef.current);onStep(i,c,'world',stepSeconds(bpmRef.current)*2);
    const s=model.steps[i];setMessage(stepCaption((s.lon0+s.lon1)/2,s.mix));
  }
  function changeSide(next:Side){if(next===side)return;stopAll(false);setSide(next);setCompleted(false);setCurrent(null);}
  function onMapKey(e:ReactKeyboardEvent<HTMLDivElement>){
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();hearStep((focus+(e.key==='ArrowRight'?1:-1)+STEPS)%STEPS);}
    else if(e.key==='Home'||e.key==='End'){e.preventDefault();hearStep(e.key==='Home'?0:STEPS-1);}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(mode==='world')stopAll();else playWorld(focus);}
    else if(e.key==='Escape'){e.preventDefault();stopAll();}
  }
  function onMapPointer(e:ReactPointerEvent<HTMLDivElement>){
    const box=e.currentTarget.getBoundingClientRect(),i=Math.floor((e.clientX-box.left)/box.width*STEPS);
    if(i>=0&&i<STEPS)hearStep(i);
  }

  // ---- What the needle shows -----------------------------------------------------------
  const playing=mode!=='idle';
  const worldStep=ready?model.steps[current&&current.scope==='world'?current.index:focus]:null;
  const storyStep=ready&&current&&current.scope!=='world'?model.stories.find(s=>s.story.id===current.scope)!.steps[current.index]:null;
  const shownStep=storyStep??(side==='a'||mode==='world'?worldStep:null);
  const top=current?loudest(current.chord):null;
  const target:GlobeTarget=storyStep?{lon:(storyStep.lon0+storyStep.lon1)/2,lat:STORIES.find(s=>s.id===current!.scope)!.lat,at:current!.at,dur:current!.dur,glide:false}
    :shownStep?{lon:(shownStep.lon0+shownStep.lon1)/2,lat:top?.lat??15,at:current?.at??0,dur:current?.dur??1,glide:mode==='world'}
    :{lon:story.lon,lat:story.lat,at:0,dur:1,glide:false};
  const caption=!ready?t(model.status==='error'?'NASA’s aerosol image could not be analysed.':'Reading NASA’s aerosol map in your browser…')
    :shownStep?stepCaption((shownStep.lon0+shownStep.lon1)/2,shownStep.mix):`${t(story.title)} · ${mixSentence(storyTrack!.mix)}`;
  const signal:RecordSignal={playing,note:top?.name??'—',frequency:top?.hz??null,event:current?{serial:current.serial,at:current.at,index:current.index}:null};
  const stepMs=stepSeconds(bpm)*1000;
  const progress=!current?0:mode==='world'?(current.index+1)/STEPS:mode==='tour'&&tour?(STORIES.findIndex(s=>s.id===current.scope)*STORY_STEPS+current.index+1)/tour.score.length:(current.index+1)/STORY_STEPS;
  const needleX=shownStep?(shownStep.rect.x0+shownStep.rect.x1)/2/IMAGE_WIDTH*100:null;

  const sideControls=<>
    <div className="jb-side-selector" role="group" aria-label={t('Choose a side of The Air We Share')}>
      <button type="button" aria-label={t('Side A: around the world')} aria-pressed={side==='a'} onClick={()=>changeSide('a')}><b>A</b><span>{t('Around the world')}<small>{t('64 slices · Earth turns under the needle')}</small></span></button>
      <button type="button" aria-label={t('Side B: NASA’s six stories')} aria-pressed={side==='b'} onClick={()=>changeSide('b')}><b>B</b><span>{t('NASA’s six stories')}<small>{t('Hurricane, dust, smoke, volcanoes')}</small></span></button>
    </div>
    <div className="air-stories" role="group" aria-label={t('NASA’s stories in this image')}>
      {STORIES.map(s=><button key={s.id} type="button" disabled={!ready} aria-pressed={(side==='b'||mode==='story')&&storyId===s.id} style={{'--track':VOICES[s.aerosol].colour} as React.CSSProperties} onClick={()=>{setSide('b');mode==='story'&&storyId===s.id?stopAll():playStory(s.id);}}><i aria-hidden="true"/>{t(s.title)}</button>)}
    </div>
  </>;

  const mixerPanel=<div className="air-performance">
    <div className="air-tempo"><label htmlFor="air-bpm">{t('Tempo')}</label><input id="air-bpm" type="range" min={MIN_BPM} max={MAX_BPM} step={4} value={bpm} aria-valuetext={`${bpm} ${t('beats per minute')}`} onChange={e=>setBpm(Number(e.target.value))}/><output htmlFor="air-bpm">{bpm} BPM</output></div>
    <AirMixer tracks={tracks} onChange={(a,next)=>setTracks(prev=>({...prev,[a]:next}))} shares={ready?model.shares:null} chord={current?.chord??null} serial={current?.serial??0} stepMs={stepMs} motion={motion}/>
    {canVibrate()&&<label className="nl-vibrate"><input type="checkbox" checked={vibrate} onChange={e=>setVibrate(e.target.checked)}/><Vibrate size={14}/>{t('Feel the loudest aerosol (supported Android browsers)')}</label>}
  </div>;

  const artwork=<div className="jb-media air-media" aria-label={t('NASA aerosol map, explorable by touch, mouse or keyboard')}>
    <div className="jb-art-label"><span>{t('GEOS aerosols · 19 Aug 2025, 20:00 UTC')}</span><span>NASA / SVS 5669</span></div>
    <div className="air-map" tabIndex={0} role="application" aria-roledescription={t('sound map')} aria-label={t('Aerosol map. Left and right arrows step around the world and play each slice; Home and End jump to the edges; Enter plays from here; Escape stops.')} onKeyDown={onMapKey} onPointerDown={onMapPointer}>
      <img src={STILL_URL} width={IMAGE_WIDTH} height={IMAGE_HEIGHT} alt={t('NASA GEOS model map of aerosols on 19 August 2025: green sulfate streams across both hemispheres, a lilac river of Saharan dust over the Atlantic, orange-red fire smoke over southern Africa and Spain, and pale blue sea-salt swirls over the oceans, including Hurricane Erin.')} draggable={false} decoding="async"/>
      {STORIES.map(s=><span key={s.id} className={`air-story-box${storyId===s.id&&(side==='b'||mode!=='world')?' is-on':''}`} style={{...pctBox(s.rect),'--track':VOICES[s.aerosol].colour} as React.CSSProperties} aria-hidden="true"/>)}
      {needleX!==null&&<span key={motion?undefined:current?.serial} className={`air-needle${playing?' is-playing':''}`} style={{left:`${needleX}%`,transitionDuration:motion&&mode==='world'?`${stepMs}ms`:'0ms'}} aria-hidden="true"/>}
    </div>
    <p className="nl-caption air-caption" data-testid="air-caption">{caption}</p>
    <div className="jb-art-footer"><span>{t(playing?'FOUR TRACKS GENERATED IN YOUR BROWSER':'PRESS PLAY, TAP THE MAP OR USE THE ARROW KEYS')}</span><AudioLines size={16}/></div>
  </div>;

  const notes=<details className="nl-notes air-notes">
    <summary>{t('Liner notes: four aerosols, four instruments, and how we checked them')}</summary>
    <p>{t('NASA’s Goddard Earth Observing System (GEOS) combines satellite observations, ground measurements and about a million weather observations every hour into a model of the whole atmosphere. NASA’s Scientific Visualization Studio coloured one moment of it, 19 August 2025 at 20:00 UTC, by aerosol type. TerraJuke reads every other pixel of NASA’s image in your browser and places it on NASA’s own colour bar: the nearest colour decides the aerosol, and how strongly the pixel shows that colour decides how much.')}</p>
    <table className="nl-mapping"><tbody>{MAPPING_TABLE.map(([a,b])=><tr key={a}><td>{t(a)}</td><td>{t(b)}</td></tr>)}</tbody></table>
    <h3>{t('The four tracks')}</h3>
    <ul className="air-voice-list">{AEROSOLS.map(a=><li key={a} style={{'--track':VOICES[a].colour} as React.CSSProperties}><i aria-hidden="true"/><strong>{t(AEROSOL_NAMES[a])}</strong> · {t(VOICES[a].instrument)}{ready?` · ${(model.shares[a]*100).toFixed(1)}% ${t('of map pixels')}`:''}</li>)}</ul>
    {ready&&<p>{t('Share of map pixels by aerosol')}: {shareSentence(model.shares)}.</p>}
    <h3>{t('NASA’s six stories, checked')}</h3>
    {ready&&<ul className="air-story-list">{model.stories.map(s=><li key={s.story.id}><strong>{t(s.story.title)}</strong> ({t(s.story.place)}). {t(s.story.caption)} <em>{t('Heard here')}: {mixSentence(s.mix)}.</em></li>)}</ul>}
    <p>{t('For each story, TerraJuke’s automated tests check that the aerosol NASA names is the strongest in that box, at least twice the next one; grey land and Antarctica stay near silent.')}</p>
    <h3>{t('Limits')}</h3>
    <ul><li>{t('GEOS is a model analysis, not a direct measurement.')}</li><li>{t('NASA’s colour bar has no numeric scale, so loudness follows rendered colour strength, never aerosol optical depth or concentration.')}</li><li>{t('One moment, 19 August 2025 at 20:00 UTC, not a live feed.')}</li><li>{t('Shares are of map pixels on a flat map, not of area: polar regions are stretched.')}</li></ul>
    <p className="nl-credit">{t('NASA’s Global Modeling and Assimilation Office and Scientific Visualization Studio. Visualizers: Joseph V. Ardizzone, Helen-Nicole Kostis. Scientist: Lesley Ott. Data: GEOS-FP 2 km replay.')}</p>
  </details>;

  const shownMix=shownStep?.mix;
  const input=shownMix?AEROSOLS.filter(a=>shownMix[a].amount>=.004).sort((a,b)=>shownMix[b].amount-shownMix[a].amount).slice(0,2).map(a=>`${t(AEROSOL_NAMES[a])} ${t(strengthWord(shownMix[a].amount))}`).join(' · ')||t('Clear air'):'—';
  return <>
    <DeckConsole record={record} labels={{input:'AIR HERE',position:'NEEDLE',count:side==='a'?'64 slices of longitude':'6 NASA stories',duration:`~${Math.round((side==='a'?STEPS:STORIES.length*STORY_STEPS)*stepSeconds(bpm))} s`}}
      playing={playing} starting={false} ready={ready} completed={completed} progress={progress}
      note={current?current.chord.notes.map(n=>n.name).join(' · ')||t('Rest'):'—'} frequency={current?`${current.chord.notes.length} ${t(current.chord.notes.length===1?'track':'tracks')}`:'—'}
      position={shownStep?`${lonLabel((shownStep.lon0+shownStep.lon1)/2)}${storyStep?` · ${t(STORIES.find(s=>s.id===current!.scope)!.title)}`:''}`:t(story.title)}
      input={input}
      onPlay={()=>playing?stopAll():side==='a'?playWorld(0):playTour()}
      playLabel={side==='a'?'Play the world':'Play NASA’s six stories'}
      signal={signal} requestAt={requestAt} error={model.status==='error'?model.error:undefined}
      sideControls={sideControls} performanceControls={mixerPanel}
      recordObject={<AirTurntable target={target} playing={playing} pulse={current?.serial??0} motion={motion} accent={record.accent} caption={t(playing?'Earth turns under the needle':'Earth is the record. Press Play.')}/>}
      artwork={artwork} volume={volume} onVolume={onVolume} extra={notes}/>
    <p className="sr-only" aria-live="polite" data-testid="air-announcer">{message}</p>
  </>;
}
