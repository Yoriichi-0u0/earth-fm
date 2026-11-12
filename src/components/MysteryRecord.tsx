import {useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {ArrowUpRight,Disc3,Play,RotateCcw,Square,Volume2} from 'lucide-react';
import {jukeboxRecords} from '../data/jukeboxRecords';
import type {JukeboxRecord,JukeboxRecordId} from '../data/jukeboxRecords';
import {chooseMysteryRecord} from '../lib/mysteryRecord';
import {measurementSequence} from '../lib/jukeboxData';
import {useVisualTransport} from '../lib/useVisualTransport';
import {useSequenceTransport} from '../lib/useSequenceTransport';
import {useStudioLanguage} from '../lib/studioLanguage';
import {defaults} from '../lib/symphony';
import type {NoteEvent} from '../lib/recordSignal';
import DataArtwork from './JukeboxDataArtwork';
import './MysteryRecord.css';

type Props={motion:boolean;volume:number;onVolume:(value:number)=>void;onOpen:(id:JukeboxRecordId)=>void};
type RoundProps=Props&{record:JukeboxRecord;onNext:()=>void};
type Playback={ready:boolean;active:boolean;starting:boolean;error:boolean;event:NoteEvent|null;start:()=>void;stop:()=>void};
const noop=()=>{};

/** Exactly one kind of transport is mounted for a mystery. No new synthesis or mapping. */
export default function MysteryRecord(props:Props){
  const [record,setRecord]=useState(()=>chooseMysteryRecord());
  const onNext=()=>setRecord(previous=>chooseMysteryRecord(previous.id));
  return record.kind==='visual'?<VisualRound key={record.id} {...props} record={record} onNext={onNext}/>:<MeasurementRound key={record.id} {...props} record={record} onNext={onNext}/>;
}

function VisualRound(props:RoundProps){
  const {t}=useStudioLanguage(),{record,motion,volume}=props,frame=record.frame!;
  const visual=useVisualTransport({imageUrl:frame.imageUrl,videoUrl:frame.videoUrl,animate:true,motionAllowed:motion,tempo:120,volume,onStart:noop});
  const fail=()=>{visual.stop();visual.setReady(false);visual.setError('Unavailable');};
  const playback:Playback={ready:visual.ready,active:visual.playing||visual.starting,starting:visual.starting,error:Boolean(visual.error),event:visual.noteEvent,start:()=>void visual.start(),stop:visual.stop};
  return <MysteryRound {...props} playback={playback} source={revealed=><div hidden={!revealed} className="mr-media" ref={visual.screenRef}>
    {/* Decode locally for the existing sampler; no identity-bearing accessible name before reveal. */}
    {frame.videoUrl?<video ref={visual.videoRef} src={frame.videoUrl} poster={record.posterUrl} muted playsInline preload="auto" loop aria-label={revealed?t(frame.description):undefined} onError={fail}/>:<img ref={visual.imageRef} src={frame.imageUrl} alt={revealed?t(frame.description):''} onLoad={visual.prepare} onError={fail}/>}
  </div>}/>;
}

function MeasurementRound(props:RoundProps){
  const {record,volume}=props;
  const sequence=useMemo(()=>measurementSequence(record.id==='arctic'?'arctic':'temperature'),[record.id]);
  const audio=useSequenceTransport<(typeof sequence.points)[number]>();
  // Stop clears the transport readout. Keep only committed observations for reveal.
  const [lastHeard,setLastHeard]=useState<(typeof sequence.points)[number]|null>(null);
  useEffect(()=>{if(audio.audible)setLastHeard(audio.audible);},[audio.audible]);
  const {t}=useStudioLanguage();
  useEffect(()=>{audio.setVolume(volume);},[volume]);
  const playback:Playback={ready:true,active:audio.playing,starting:audio.status==='Starting audio…',error:audio.status.startsWith('Audio could not'),event:audio.noteEvent,start:()=>{setLastHeard(null);void audio.play(sequence.points,sequence.pitches,{...defaults,tempo:60,volume});},stop:audio.stop};
  return <MysteryRound {...props} playback={playback} source={revealed=>revealed?<><p className="mr-observation-label">{t(audio.audible?'Current observation':lastHeard?'Last heard observation':'Starting observation · no note heard yet')}</p><DataArtwork record={record} current={audio.audible??lastHeard??sequence.points[0]}/></>:null}/>;
}

function MysteryRound({record,motion,volume,onVolume,onOpen,onNext,playback,source}:RoundProps&{playback:Playback;source:(revealed:boolean)=>ReactNode}){
  const {t}=useStudioLanguage();
  const [revealed,setRevealed]=useState(false),[guess,setGuess]=useState<JukeboxRecordId|null>(null),[attempted,setAttempted]=useState(false),[limited,setLimited]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null),answer=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});},[]);
  useEffect(()=>{if(revealed)answer.current?.focus();},[revealed]);
  // Natural performances are about 25 s; this also bounds a stalled startup/session.
  useEffect(()=>{if(!playback.active)return;const timer=setTimeout(()=>{playback.stop();setLimited(true);},30_000);return()=>clearTimeout(timer);},[playback.active,playback.stop]);
  function play(){if(document.hidden)return;setAttempted(true);setLimited(false);playback.start();}
  function reveal(){playback.stop();setRevealed(true);}
  const status=playback.error?'This record could not play. Try again, reveal its source, or choose another mystery.':playback.starting?'Starting sound…':playback.active?'Listening…':limited?'Excerpt stopped. Replay or reveal its source.':attempted?'Ready to replay':'Ready to listen';
  const explanation=record.id==='spiral'?'You heard the Climate Spiral picture: brightness sets pitch, colour shapes timbre, and horizontal position sets stereo pan. The pixels are not monthly temperature measurements.':record.id==='motion'?'Changing pixels in an archived animation shape pitch, timbre and stereo pan. With motion off, a still frame is used. This is not a live measurement feed.':record.id==='arctic'?'Twelve selected September mean extents, in million km², set pitch through fixed sea-ice bands. These are project-derived NSIDC means. Accompaniment is musical arrangement, not extra observations.':'Twelve selected January anomalies, in °C relative to 1951–1980, set pitch through fixed temperature bands. Selected years are not a continuous timeline. Accompaniment is musical arrangement, not extra observations.';
  return <section className={`mr-record${motion?'':' mr-quiet'}`} aria-labelledby="mr-title" data-mystery-phase={revealed?'revealed':'concealed'}>
    <header className="mr-heading"><div><p>TerraJuke / ?</p><h2 id="mr-title" ref={heading} tabIndex={-1}>{t('Mystery Record')}</h2></div><span className="mr-live"><i aria-hidden="true"/>{t('GENERATED LIVE')}</span></header>
    {!revealed&&<div className="mr-sleeve">
      <div className={`mr-vinyl${playback.active?' is-playing':''}`} aria-hidden="true"><div className="mr-grooves"/><div className="mr-label"><small>TerraJuke</small><b>?</b><small>{t('LISTEN CLOSELY')}</small></div>{playback.active&&playback.event&&<span key={playback.event.serial} className="mr-note-ring"/>}</div>
      <div className="mr-sleeve-copy"><p>{t('An Earth story is hiding in the grooves.')}</p><span>{t('Listen. Follow a hunch. Lift the sleeve.')}</span></div>
    </div>}
    {revealed&&<div className="mr-answer"><span className="mr-kicker">{t('UNDER THE SLEEVE')}</span><h3 ref={answer} tabIndex={-1}>{t(record.title)}</h3><p>{t(guess===null?"Here's the source. Curiosity is the point.":guess===record.id?'Your pick matched this round.':'Another record was in the grooves. Meet its source.')}</p>{guess&&<p className="mr-hunch">{t('Your hunch')}: {t(jukeboxRecords.find(item=>item.id===guess)!.title)}</p>}</div>}
    {source(revealed)}
    <div className="mr-controls"><button className="mr-primary" type="button" disabled={!playback.ready} onClick={playback.active?playback.stop:play}>{playback.active?<Square aria-hidden="true" size={16}/>:attempted?<RotateCcw aria-hidden="true" size={16}/>:<Play aria-hidden="true" size={17} fill="currentColor"/>}{t(playback.active?'Stop mystery':attempted?'Replay':revealed?'Play record':'Play mystery')}</button>{!revealed&&<button className="mr-reveal" type="button" onClick={reveal}>{t('Reveal source')}<ArrowUpRight aria-hidden="true" size={15}/></button>}<label className="mr-volume"><Volume2 aria-hidden="true" size={17}/><span className="sr-only">{t('Mystery volume')}</span><input type="range" min="0" max="1" step=".01" value={volume} onChange={event=>onVolume(Number(event.target.value))}/></label></div>
    <p className={`mr-status${playback.error?' mr-error':''}`} role={playback.error?'alert':'status'}>{t(!playback.ready&&!playback.error?'Loading the record…':status)} <span>{t('~25 seconds · made in your browser')}</span></p>
    {!revealed?<div className="mr-guess"><fieldset><legend>{t('Which record do you imagine?')}</legend><p>{t('Pick a hunch, or reveal without guessing.')}</p><div className="mr-choices">{jukeboxRecords.map(choice=><label key={choice.id}><input type="radio" name="mystery-guess" value={choice.id} checked={guess===choice.id} onChange={()=>setGuess(choice.id)}/><span>{t(choice.title)}</span></label>)}</div></fieldset><p className="mr-honesty">{t('Sound alone does not uniquely identify a source. This is curiosity, not a knowledge test.')}</p><button className="mr-next-link" type="button" onClick={onNext}>{t('Try another mystery')} <RotateCcw aria-hidden="true" size={13}/></button></div>:<div className="mr-provenance"><div className="mr-source-line"><span>{t(record.kind==='visual'?'Visual sound':'Measurement sound')}</span><a href={record.sourceUrl} target="_blank" rel="noreferrer">{t(record.source)} <ArrowUpRight aria-hidden="true" size={14}/></a></div><p>{t(record.meaning)}</p><p>{t(explanation)}</p><p className="mr-honesty">{t('Sound is an interpretation, not proof of an Earth-science conclusion.')}</p><div className="mr-finish"><button className="mr-primary" type="button" onClick={()=>onOpen(record.id)}><Disc3 aria-hidden="true" size={16}/>{t('Open full record')}</button><button type="button" onClick={onNext}>{t('Try another mystery')}<RotateCcw aria-hidden="true" size={14}/></button></div></div>}
  </section>;
}
