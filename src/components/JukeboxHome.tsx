import {lazy,Suspense,useEffect,useId,useMemo,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {ArrowDown,ArrowUpRight,AudioLines,ChevronLeft,ChevronRight,Disc3,ImagePlus,Play,ShieldCheck,Square,Volume2} from 'lucide-react';
import {jukeboxRecords} from '../data/jukeboxRecords';
import type {JukeboxRecord,JukeboxRecordId} from '../data/jukeboxRecords';
import {defaults} from '../lib/symphony';
import {measurementSequence,mapRecordPoint} from '../lib/jukeboxData';
import type {RecordPoint} from '../lib/jukeboxData';
import DataArtwork from './JukeboxDataArtwork';
import {mapValueToNote} from '../lib/audio';
import {useSequenceTransport} from '../lib/useSequenceTransport';
import {useVisualTransport,VISUAL_SCAN_STEPS} from '../lib/useVisualTransport';
import {useStudioLanguage} from '../lib/studioLanguage';
import {goToPage,pageUrl} from '../lib/studioRouter';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';
import EarthRecord from './EarthRecord';
import DeckConsole from './DeckConsole';
import type {DeckState,VisualRecord} from './DeckConsole';
import {GrooveprintKey} from './Grooveprint';
import {imageGrooveprint,measurementGrooveprint} from '../lib/grooveprint';
import ScratchScanner from './ScratchScanner';
import {useFrameInstrument} from '../lib/useFrameInstrument';
import {useEarthLooper} from '../lib/useEarthLooper';
import EarthLooper from './EarthLooper';
import {usePersonalImage} from '../lib/usePersonalImage';
import type {PersonalImage} from '../lib/personalImage';
import {observatoryImagery} from '../data/observatory';
import {ShowContext} from '../lib/showMode';
import './JukeboxHome.css';
import './JukeboxShow.css';
import './TerraJukeExperience.css';

const noop=()=>{};
const EarthGlobe=lazy(()=>import('./EarthGlobe'));
const MysteryRecord=lazy(()=>import('./MysteryRecord'));
const NightLightsDeck=lazy(()=>import('./NightLightsDeck'));
const AirDeck=lazy(()=>import('./AirDeck'));
const RecordJourney=lazy(()=>import('./RecordJourney'));
const ShowCard=lazy(()=>import('./ShowCard'));
type Show={index:number;phase:'intro'|'playing';cue:number|null};
const JukeboxStage=lazy(()=>import('./JukeboxStage'));
function useVisualRecord(record:VisualRecord,motion:boolean,volume:number){
  const {t}=useStudioLanguage();const [animate,setAnimate]=useState(true),[requestAt,setRequestAt]=useState(0);
  const frame=record.frame!;
  const visual=useVisualTransport({imageUrl:frame.imageUrl,videoUrl:frame.videoUrl,animate,motionAllowed:motion,tempo:120,volume,onStart:noop});
  const current=visual.steps[visual.scanIndex],mapped=current?mapValueToNote(current.brightness,0,1):null;
  const signal:RecordSignal={playing:visual.playing,note:mapped?.note??'—',frequency:mapped?.frequency??null,event:visual.noteEvent};
  const state:DeckState={playing:visual.playing,starting:visual.starting,ready:visual.ready,completed:visual.completed,progress:visual.completed?1:visual.scanIndex/VISUAL_SCAN_STEPS,note:signal.note,frequency:mapped?`${mapped.frequency.toFixed(2)} Hz`:'—',position:`${String(visual.scanIndex+1).padStart(2,'0')} / 48`,input:current?`${Math.round(current.brightness*100)}% ${t('brightness')}`:'—',onPlay:()=>{if(visual.playing||visual.starting)visual.stop();else{setRequestAt(performance.now());void visual.start();}},signal,requestAt,error:visual.error};
  const extra=frame.videoUrl?<div className="jb-motion-control"><label><input type="checkbox" checked={animate&&motion} disabled={!motion} onChange={e=>{visual.stop();setAnimate(e.target.checked);}}/>{t('Follow the animation')}</label><span>{t('Sampled frame')} {visual.sampledTime.toFixed(2)} s</span>{!motion&&<p>{t('Motion is off. This record plays a still frame.')}</p>}</div>:undefined;
  return {visual,state,extra};
}

function VisualArtwork({record,transport,manual=false}:{record:VisualRecord;transport:ReturnType<typeof useVisualRecord>;manual?:boolean}){
  const {t}=useStudioLanguage();const {visual}=transport;const frame=record.frame!;
  return <div className={`jb-media ${record.id==='motion'?'jb-media-motion':''}`} ref={visual.screenRef} aria-label={t('Record artwork and live scan')}>
    <div className="jb-art-label"><span>{t('Visual sound')}</span><span>{record.id==='personal'?t('YOUR IMAGE'):record.id==='spiral'?'NASA / 5190':'NASA / EIC'}</span></div>
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


function useDataRecord(record:JukeboxRecord,volume:number){
  const {t}=useStudioLanguage();const [dataOnly,setDataOnly]=useState(false),[requestAt,setRequestAt]=useState(0);
  const arctic=record.id==='arctic';
  const {points,pitches}=useMemo(()=>measurementSequence(arctic?'arctic':'temperature'),[arctic]);
  const audio=useSequenceTransport<RecordPoint>();
  useEffect(()=>{audio.setVolume(volume);},[volume]);
  const completed=audio.status.startsWith('Complete.'),point=audio.audible??(completed?points.at(-1)!:points[0]);
  const index=points.findIndex(p=>p.period===point.period),note=mapRecordPoint(point,arctic);
  const signal:RecordSignal={playing:audio.playing,note:note?.note??'—',frequency:note?.frequencyHz??null,event:audio.noteEvent};
  const state:DeckState={playing:audio.playing,starting:audio.status==='Starting audio…',ready:true,completed,progress:completed?1:index/points.length,note:signal.note,frequency:note?`${note.frequencyHz.toFixed(2)} Hz`:'—',position:`${String(index+1).padStart(2,'0')} / 12`,input:t(arctic?'September mean extent':'January global anomaly'),onPlay:()=>{if(audio.playing)audio.stop();else{setRequestAt(performance.now());void audio.play(points,pitches,{...defaults,tempo:60,volume,dataOnly});}},signal,requestAt,error:audio.status.startsWith('Audio could not')?audio.status:undefined};
  const extra=<div className="jb-data-only"><label><input type="checkbox" checked={dataOnly} onChange={e=>{audio.stop();setDataOnly(e.target.checked);}}/>{t('Hear Data Only')}</label><span>{t(dataOnly?'One observation. One note.':'Data melody + musical arrangement')}</span></div>;
  function audition(index:number){
    const pitch=pitches[index];
    if(pitch!=null)void audio.play([points[index]],[pitch],{...defaults,tempo:60,volume,dataOnly:true});
  }
  return {audio,point,state,extra,points,index,audition};
}
function DataDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const data=useDataRecord(record,volume);
  return <DeckConsole record={record} {...data.state} artwork={<DataArtwork record={record} current={data.point} pulse={data.audio.noteEvent?.serial??0} motion={motion}/>} volume={volume} onVolume={onVolume} extra={data.extra}/>;
}

/** Shared Scratch/Looper path; scientific adapters and renderers stay independent. */
function useImagePerformance(visual:ReturnType<typeof useVisualRecord>,volume:number,sourceIdentity:string,enabled=true,canAudition=false){
  const [manual,setManual]=useState(false),[requestAt,setRequestAt]=useState(0);
  const instrument=useFrameInstrument(visual.visual.steps,volume,enabled&&(manual||canAudition));
  const looper=useEarthLooper({enabled:manual&&enabled&&visual.visual.ready,sourceImage:sourceIdentity,stripCount:visual.visual.steps.length,prepare:instrument.prepare,play:instrument.play,stopAudio:instrument.stop,onSelect:index=>{visual.visual.setScanIndex(index);setRequestAt(performance.now());}});
  const replaying=looper.phase==='replaying'||looper.phase==='preparing';
  function changeMode(){visual.visual.stop();looper.stop();setManual(value=>!value);}
  function playStrip(index:number){looper.cancelReplay();visual.visual.setScanIndex(index);setRequestAt(performance.now());void instrument.play(index).then(event=>{if(event)looper.capture(event);});}
  function cancelGesture(){looper.cancelReplay();instrument.stop();}
  const manualState:DeckState={...visual.state,manual:true,playing:instrument.playing||looper.phase==='replaying',starting:instrument.starting||looper.phase==='preparing',completed:false,progress:visual.visual.scanIndex/(VISUAL_SCAN_STEPS-1),signal:{...visual.state.signal,playing:instrument.playing||looper.phase==='replaying',event:instrument.noteEvent},requestAt,error:instrument.error||visual.state.error,playLabel:'Hear this position',onPlay:()=>{if(replaying||(looper.phase==='recording'&&(instrument.playing||instrument.starting)))looper.stop();else if(instrument.playing||instrument.starting)instrument.stop();else playStrip(visual.visual.scanIndex);}};
  return {manual,manualState,instrument,looper,changeMode,playStrip,cancelGesture};
}

function ClimateDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();const [side,setSide]=useState<RecordSide>('a');
  const [inspectedObservation,setInspectedObservation]=useState<number|null>(null);
  const measurementRecord=jukeboxRecords.find(item=>item.id==='temperature')!;
  // Both adapters persist through a flip; only an explicit Play action starts an engine.
  const visual=useVisualRecord(record,motion,volume),data=useDataRecord(measurementRecord,volume);
  const visualGrooves=useMemo(()=>imageGrooveprint(visual.visual.steps),[visual.visual.steps]);
  const dataGrooves=useMemo(()=>measurementGrooveprint(data.points),[data.points]);
  const grooveDescription=useId();
  const {manual,manualState,instrument,looper,changeMode,playStrip,cancelGesture}=useImagePerformance(visual,volume,record.frame!.imageUrl,side==='a',true);
  function changeSide(next:RecordSide){if(next===side)return;visual.visual.stop();visual.visual.setScanIndex(0);data.audio.stop();looper.stop();setInspectedObservation(null);setSide(next);}
  function inspectGroove(index:number){
    const segments=side==='a'?visualGrooves:dataGrooves;
    if(!Number.isInteger(index)||index<0||index>=segments.length)return;
    visual.visual.stop();data.audio.stop();looper.stop();instrument.stop();
    if(side==='a')visual.visual.setScanIndex(index);else setInspectedObservation(index);
  }
  const current=side==='a'?(manual?manualState:visual.state):data.state;
  const grooveIndex=side==='a'?visual.visual.scanIndex:inspectedObservation??data.index;
  const auditioning=side==='a'?instrument.playing||instrument.starting:inspectedObservation!==null&&data.audio.playing;
  function auditionGroove(){
    if(side==='a'){
      visual.visual.stop();looper.stop();
      if(!auditioning)void instrument.play(grooveIndex);
    }else if(auditioning)data.audio.stop();
    else{setInspectedObservation(grooveIndex);data.audition(grooveIndex);}
  }
  const inspected=side==='b'&&inspectedObservation!==null?dataGrooves[inspectedObservation]:null;
  const shown=inspected?{...current,progress:grooveIndex/data.points.length,position:`${String(grooveIndex+1).padStart(2,'0')} / 12`,note:inspected.note??'—',frequency:inspected.frequencyHz===null?'—':`${inspected.frequencyHz.toFixed(2)} Hz`,signal:{...current.signal,note:inspected.note??'—',frequency:inspected.frequencyHz}}:current;
  const effective=side==='a'?record:{...measurementRecord,id:record.id,number:record.number,title:record.title};
  const controls=<><div className="jb-side-selector" role="group" aria-label={t('Choose a side of Climate Spiral')}>
    <button type="button" aria-label={t('Side A: hear the picture')} aria-pressed={side==='a'} onClick={()=>changeSide('a')}><b>A</b><span>{t('Hear the picture')}<small>{t('Visual sound')}</small></span></button>
    <button type="button" aria-label={t('Side B: hear the measurements')} aria-pressed={side==='b'} onClick={()=>changeSide('b')}><b>B</b><span>{t('Hear the measurements')}<small>{t('Measurement sound')}</small></span></button>
  </div><div className="jb-science-cue"><p>{t(side==='a'?'Brightness → pitch. Not temperature.':'January anomaly (°C) · relative to 1951–1980.')}</p>{side==='a'&&<button className="jb-manual-toggle" type="button" data-manual={manual} disabled={!visual.visual.ready} aria-controls={manual?'earth-scratch-controls':undefined} onClick={changeMode}>{t(manual?'Back to playback':'Play with Earth')}<span aria-hidden="true">{manual?' ↗':' ↔'}</span></button>}</div></>;
  const picture=<VisualArtwork record={record} transport={visual} manual={manual}/>;
  const stripFeedback=instrument.error?'The strip could not play. Try Hear selected strip again.':instrument.notice?'Audio is ready. Press Hear selected strip again.':undefined;
  return <DeckConsole record={effective} {...shown} error={shown.error||(side==='a'&&!manual?stripFeedback:undefined)} onPlay={()=>{setInspectedObservation(null);if(side==='a'&&!manual)instrument.stop();current.onPlay();}} side={side} sideControls={controls} recordObject={<EarthRecord side={side} signal={shown.signal} motion={motion} onFlip={()=>changeSide(side==='a'?'b':'a')} grooves={side==='a'?visualGrooves:dataGrooves} position={grooveIndex} descriptionId={grooveDescription}/>}
    recordNote={<GrooveprintKey side={side} id={grooveDescription} ready={side==='b'||visual.visual.ready} segments={side==='a'?visualGrooves:dataGrooves} index={grooveIndex} onInspect={inspectGroove} onAudition={auditionGroove} auditioning={auditioning}/>}
    performanceControls={side==='a'&&manual&&visual.visual.ready?<EarthLooper looper={looper}/>:undefined}
    artwork={<><div className="jb-side-content" hidden={side!=='a'}><ScratchScanner enabled={manual&&visual.visual.ready} steps={visual.visual.steps} index={visual.visual.scanIndex} fit={visual.visual.frameFit} onSelect={playStrip} onCancel={cancelGesture} notice={instrument.notice}>{picture}</ScratchScanner></div><div className="jb-side-content" hidden={side!=='b'}><DataArtwork record={measurementRecord} current={side==='b'?(data.points[grooveIndex]??data.point):data.point} pulse={side==='b'?data.audio.noteEvent?.serial??0:0} motion={motion} onSelect={side==='b'?inspectGroove:undefined}/></div></>}
    volume={volume} onVolume={onVolume} extra={side==='b'?data.extra:undefined}/>;
}

function PersonalDeck({image,motion,volume,onVolume}:{image:PersonalImage;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();
  useEffect(()=>{document.getElementById('jb-record-title')?.focus();},[]);
  const record:VisualRecord={id:'personal',number:'YOU',title:'Your Record',kind:'visual',subtitle:'Your image. Your sound.',source:'Your image · processed locally',meaning:'Image brightness makes pitch. Colour shapes timbre; position shapes stereo pan. These are your image’s pixels, not NASA imagery or scientific measurements.',accent:'#d5f38b',frame:{imageUrl:image.url,description:'Your temporary personal image'}};
  const visual=useVisualRecord(record,motion,volume);
  const {manual,manualState,instrument,looper,changeMode,playStrip,cancelGesture}=useImagePerformance(visual,volume,`personal:${image.id}`);
  return <DeckConsole record={record} {...(manual?manualState:visual.state)} volume={volume} onVolume={onVolume}
    sideControls={<div className="jb-science-cue"><p>{t('Your image. Brightness → pitch.')}</p><button className="jb-manual-toggle" type="button" data-manual={manual} disabled={!visual.visual.ready} aria-controls={manual?'earth-scratch-controls':undefined} onClick={changeMode}>{t(manual?'Back to playback':'Scratch your image')}<span aria-hidden="true">{manual?' ↗':' ↔'}</span></button></div>}
    performanceControls={manual&&visual.visual.ready?<EarthLooper looper={looper}/>:undefined}
    artwork={<ScratchScanner enabled={manual&&visual.visual.ready} steps={visual.visual.steps} index={visual.visual.scanIndex} fit={visual.visual.frameFit} onSelect={playStrip} onCancel={cancelGesture} notice={instrument.notice}><VisualArtwork record={record} transport={visual} manual={manual}/></ScratchScanner>}/>;
}

export default function JukeboxHome({motion}:{motion:boolean}){
  const {t}=useStudioLanguage();
  const [selected,setSelected]=useState<JukeboxRecordId|'personal'|'mystery'>('spiral'),[volume,setVolume]=useState(.55),[earthOpen,setEarthOpen]=useState(false),[earthReady,setEarthReady]=useState(false);
  const personal=usePersonalImage(),fileInput=useRef<HTMLInputElement>(null),player=useRef<HTMLDivElement>(null);
  const shelf=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({left:false,right:false});
  // ---- Jukebox Show: every NASA record in turn --------------------------------------------
  const [show,setShow]=useState<Show|null>(null),[deckEpoch,setDeckEpoch]=useState(0),[showMessage,setShowMessage]=useState('');
  const showNow=useRef<Show|null>(null),cueSerial=useRef(0);showNow.current=show;
  const announce=(index:number)=>{const r=jukeboxRecords[index];setShowMessage(`${t('Now playing record')} ${index+1} ${t('of')} ${jukeboxRecords.length}: ${t(r.title)}, ${t(r.source)}.`);};
  function startShow(){
    personal.cancel();setSelected(jukeboxRecords[0].id);setDeckEpoch(e=>e+1);setShow({index:0,phase:'intro',cue:null});announce(0);
    player.current?.scrollIntoView({block:'start',behavior:motion?'smooth':'instant'});
  }
  function stopShow(say=true){if(!showNow.current)return;setShow(null);setDeckEpoch(e=>e+1);if(say)setShowMessage(t('Show stopped.'));}
  const introDone=()=>setShow(s=>s&&s.phase==='intro'?{...s,phase:'playing',cue:++cueSerial.current}:s);
  const onEnded=(cue:number)=>{
    const s=showNow.current;if(!s||s.cue!==cue)return;
    const next=s.index+1;
    if(next>=jukeboxRecords.length){setShow(null);setShowMessage(t('That was the whole jukebox: six records from NASA’s view of Earth.'));return;}
    setSelected(jukeboxRecords[next].id);setShow({index:next,phase:'intro',cue:null});announce(next);
  };
  const onStopped=(cue:number)=>{const s=showNow.current;if(s&&s.cue===cue){setShow(null);setShowMessage(t('Show stopped.'));}};
  useEffect(()=>{if(!show)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')stopShow();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[show!==null]);
  useEffect(()=>{
    const element=shelf.current;if(!element)return;
    const update=()=>{const left=element.scrollLeft>2,right=element.scrollLeft+element.clientWidth<element.scrollWidth-2;setEdges(previous=>previous.left===left&&previous.right===right?previous:{left,right});};
    const observer=new ResizeObserver(update);observer.observe(element);element.addEventListener('scroll',update,{passive:true});update();
    return()=>{observer.disconnect();element.removeEventListener('scroll',update);};
  },[]);
  const record=jukeboxRecords.find(r=>r.id===selected)??jukeboxRecords[0],station=record.id==='arctic'?'arctic':'climate';
  const optional=selected==='personal'||selected==='mystery';
  const stageRecords=useMemo(()=>jukeboxRecords.map(r=>({id:r.id,title:r.title,number:r.number,accent:r.accent,image:r.frame?.imageUrl??r.posterUrl,focus:r.id==='nightlights'?[.855,.72] as [number,number]:undefined})),[]);
  function selectRecord(id:JukeboxRecordId|'mystery'){
    stopShow(false);
    personal.cancel();
    setSelected(id);
    player.current?.focus({preventScroll:true});
    if(player.current&&player.current.getBoundingClientRect().top<0){
      player.current.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  function selectPersonal(){stopShow(false);setSelected('personal');player.current?.scrollIntoView({block:'start',behavior:motion?'smooth':'instant'});}
  function chooseImage(file:File){selectPersonal();void personal.choose(file);}
  function moveShelf(direction:number){const element=shelf.current;if(element)element.scrollBy({left:direction*element.clientWidth*.8,behavior:motion?'smooth':'instant'});}
  return <div className="jb-home" style={{'--record-accent':record.accent} as CSSProperties}>
    <header className="jb-intro"><div><p className="jb-eyebrow"><Disc3 size={15}/>{t('THE EARTH INFORMATION JUKEBOX')}</p><h1 tabIndex={-1}>{t('Your planet.')} <em>{t('On the record.')}</em></h1></div><p>{t('Choose an Earth story. Press Play.')}<span>{t('Sound made from NASA visuals and Earth observations.')}</span><a className="jb-shelf-link" href="#record-shelf">{t('Browse records')} <ArrowDown aria-hidden="true" size={14}/></a><button type="button" className="jb-show-start" aria-pressed={show!==null} onClick={()=>show?stopShow():startShow()}>{show?<><Square size={14} fill="currentColor"/>{t('Stop the show')}</>:<><Play size={15} fill="currentColor"/>{t('Play the whole jukebox')}</>}</button></p></header>
    <div className="jb-layout">
      <div className="jb-player" ref={player} role="region" aria-label={t('Record player')} tabIndex={-1}>
        <ShowContext.Provider value={{cue:show?.phase==='playing'?show.cue:null,onEnded,onStopped}}>
        {show?.phase==='intro'&&<Suspense fallback={null}><ShowCard key={show.index} record={jukeboxRecords[show.index]} index={show.index} total={jukeboxRecords.length} motion={motion} onDone={introDone}/></Suspense>}
        {selected==='personal'&&personal.error&&<p className="jb-personal-error" role="alert">{t(personal.error)}{personal.image&&<> {t('Your previous image is still available. Its take has been cleared.')}</>}</p>}
        {selected==='mystery'?<Suspense fallback={<p role="status">{t('Loading Mystery Record…')}</p>}><MysteryRecord motion={motion} volume={volume} onVolume={setVolume} onOpen={selectRecord}/></Suspense>:selected==='personal'?personal.loading||!personal.image?<section className="jb-personal-loading" aria-labelledby="jb-personal-loading-title"><ImagePlus size={32}/><h2 id="jb-personal-loading-title">{t('Your Record')}</h2><p role="status">{t(personal.loading?'Opening your image…':'Choose an image to make your record.')}</p><p>{t('The previous performance has been cleared.')}</p>{!personal.loading&&<button type="button" onClick={()=>fileInput.current?.click()}>{t('Choose another image')}</button>}</section>:<PersonalDeck key={personal.image.id} image={personal.image} motion={motion} volume={volume} onVolume={setVolume}/>:record.id==='spiral'?<ClimateDeck key={`${record.id}:${deckEpoch}`} record={record} motion={motion} volume={volume} onVolume={setVolume}/>:record.id==='nightlights'?<Suspense fallback={<p role="status">{t('Loading Night Lights…')}</p>}><NightLightsDeck key={`${record.id}:${deckEpoch}`} record={record} motion={motion} volume={volume} onVolume={setVolume}/></Suspense>:record.id==='air'?<Suspense fallback={<p role="status">{t('Loading The Air We Share…')}</p>}><AirDeck key={`${record.id}:${deckEpoch}`} record={record} motion={motion} volume={volume} onVolume={setVolume}/></Suspense>:record.kind==='visual'?<VisualDeck key={`${record.id}:${deckEpoch}`} record={record} motion={motion} volume={volume} onVolume={setVolume}/>:<DataDeck key={`${record.id}:${deckEpoch}`} record={record} motion={motion} volume={volume} onVolume={setVolume}/>}
        {!optional&&<Suspense fallback={null}><RecordJourney key={record.id} recordId={record.id} motion={motion}/></Suspense>}
        </ShowContext.Provider>
      </div>
      <div className="jb-record-shelf">
        <Suspense fallback={null}><JukeboxStage records={stageRecords} selected={selected} motion={motion} onSelect={id=>selectRecord(id as JukeboxRecordId)}/></Suspense>
        <section className="jb-library" id="record-shelf" tabIndex={-1} aria-label={t('Choose an Earth record')}><div className="jb-library-heading"><h2>{t('Choose a record')}</h2><button className="jb-mystery-entry" type="button" aria-label={t('Open Mystery Record')} aria-pressed={selected==='mystery'} onClick={()=>selectRecord('mystery')}><Disc3 aria-hidden="true" size={14}/>{t('Mystery Record')}</button></div>
          <div className={`jb-shelf-wrap${edges.left?' has-previous':''}${edges.right?' has-next':''}`}>
            <div className="jb-records" ref={shelf}>{jukeboxRecords.map((item,index)=><button key={item.id} className={`jb-record ${selected===item.id?'is-selected':''}`} aria-pressed={selected===item.id} aria-label={`${t('Select record')}: ${t(item.title)}`} onClick={()=>selectRecord(item.id)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=shelf.current?.querySelectorAll<HTMLButtonElement>('.jb-record');const next=e.key==='Home'?0:e.key==='End'?jukeboxRecords.length-1:(index+(e.key==='ArrowRight'?1:-1)+jukeboxRecords.length)%jukeboxRecords.length;buttons?.[next]?.focus();}}>
              <span className={`jb-sleeve jb-sleeve-${item.id}`} aria-hidden="true">{item.id==='spiral'?<img src={item.frame!.imageUrl} alt=""/>:item.posterUrl?<img src={item.posterUrl} alt=""/>:<span>{item.id==='arctic'?'↘':'↗'}</span>}<i/></span>
              <span className="jb-record-copy"><small>{t(item.id==='spiral'||item.id==='nightlights'||item.id==='air'?'SIDES A + B':item.kind==='visual'?'Visual':'Measurements')}</small><strong>{t(item.title)}</strong><span>{t(item.id==='motion'?'Still from the archived animation':item.subtitle)}</span></span><span className="jb-record-indicator" aria-hidden="true">{selected===item.id?<AudioLines size={17}/>:<ArrowUpRight size={17}/>}</span>
            </button>)}</div>
            {edges.left&&<button className="jb-shelf-arrow jb-shelf-previous" type="button" aria-label={t('Previous records')} onClick={()=>moveShelf(-1)}><ChevronLeft size={17}/></button>}
            {edges.right&&<button className="jb-shelf-arrow jb-shelf-next" type="button" aria-label={t('More records')} onClick={()=>moveShelf(1)}><ChevronRight size={17}/></button>}
          </div>
        </section>
        <section className="jb-personal-panel" aria-labelledby="jb-personal-title" aria-busy={personal.loading}>
          <div className="jb-personal-heading"><span aria-hidden="true">{personal.image?<img src={personal.image.url} alt=""/>:<ImagePlus size={24}/>}</span><div><p>{t('PRESS YOUR OWN RECORD')}</p><h2 id="jb-personal-title">{t('Your image. Your sound.')}</h2></div></div>
          <p>{t('Turn a picture into a playable record. Keep it here, just for you.')}</p>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label={t('Choose a personal image')} hidden onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)chooseImage(file);}}/>
          <div className="jb-personal-actions">
            {personal.image&&!personal.loading&&<button type="button" aria-pressed={selected==='personal'} onClick={selectPersonal}>{t('Your Record')} <Disc3 size={14}/></button>}
            <button type="button" onClick={()=>fileInput.current?.click()}>{t(personal.image?'Replace image':'Choose image')}<ImagePlus size={15}/></button>
            {(personal.image||personal.loading)&&<button type="button" onClick={()=>{personal.remove();if(selected==='personal')setSelected('spiral');}}>{t('Remove')}</button>}
          </div>
          <p className="jb-personal-limits">{t('PNG, JPEG or WebP · up to 10 MB')}</p><details className="jb-personal-specs"><summary>{t('Image requirements')}</summary><p>{t('4096 px per edge · 12.6 MP · up to 8:1')}</p></details>
          <p className="jb-personal-privacy"><ShieldCheck size={15}/>{t('No upload. Image and take disappear when you leave Home or reload.')}</p>
          {personal.loading&&<p role="status">{t('Opening your image…')}</p>}
        </section>
      </div>
    </div>
    <div className="jb-deeper"><span>{t(optional?'Explore more of TerraJuke.':'Curiosity has a B-side.')} <ArrowDown size={14}/></span><a href={pageUrl('listen',optional?'all':station,record.id==='motion'?'motion':undefined)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('listen',optional?'all':station,record.id==='motion'?'motion':undefined);}}>{t(optional?'Browse Earth stories':'Discover the story')} <ArrowUpRight size={15}/></a><a href={pageUrl('data',station)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('data',station);}}>{t(optional?'Inspect Earth data':'Inspect the data')} <ArrowUpRight size={15}/></a><a href={pageUrl('create',station)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('create',station);}}>{t('Open the music studio')} <ArrowUpRight size={15}/></a></div>
    <details className="jb-earth-extra" onToggle={e=>{setEarthOpen(e.currentTarget.open);if(!e.currentTarget.open)setEarthReady(false);}}><summary>{t('A closer look at home')} <span>{t('The Earth Observatory view')} ↗</span></summary>{earthOpen&&<div><Suspense fallback={<p role="status">{t('Loading the Earth view…')}</p>}><EarthGlobe locations={[]} selectedId="" onSelect={noop} playing={false} autoRotate={motion} photographic onSurfaceReady={setEarthReady}/></Suspense><p>{t(earthReady?'July 2004 composite. Lighting and rotation are illustrative, not live weather.':'Interactive illustration with Natural Earth boundaries. Lighting and rotation are illustrative.')} <a href={earthReady?observatoryImagery.sourcePage:'https://www.naturalearthdata.com/'} target="_blank" rel="noreferrer">{t(earthReady?'NASA Earth Observatory · Blue Marble ↗':'Interactive Earth illustration ↗')}</a></p></div>}</details>
    {show&&<div className="jb-show-bar" role="group" aria-label={t('Jukebox show')}><i aria-hidden="true"/><span>{t('Jukebox show')} · <b>{String(show.index+1).padStart(2,'0')} / {String(jukeboxRecords.length).padStart(2,'0')}</b> · {t(jukeboxRecords[show.index].title)}</span><button type="button" onClick={()=>stopShow()}>{t('Stop')}</button></div>}
    <p className="sr-only" aria-live="polite" data-testid="show-announcer">{showMessage}</p>
  </div>;
}
