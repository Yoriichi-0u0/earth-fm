// The record player's console: title, transport, progress, artwork, readouts and source.
// Shared by every record on the jukebox (moved out of JukeboxHome.tsx unchanged).
import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {announceDeck} from '../lib/deckEvents';
import {useShowCue} from '../lib/showMode';
import {ArrowUpRight,Play,Square,Volume2} from 'lucide-react';
import type {JukeboxRecord,JukeboxRecordId} from '../data/jukeboxRecords';
import {useStudioLanguage} from '../lib/studioLanguage';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';

export type DeckState={playing:boolean;starting:boolean;ready:boolean;completed:boolean;progress:number;note:string;frequency:string;position:string;input:string;onPlay:()=>void;signal:RecordSignal;requestAt:number;error?:string;playLabel?:string;manual?:boolean};
export type VisualRecord=Omit<JukeboxRecord,'id'|'frame'|'sourceUrl'>&{id:JukeboxRecordId|'personal';sourceUrl?:string;frame?:{imageUrl:string;videoUrl?:string;description:string}};
export type ConsoleLabels={input?:string;position?:string;count?:string;duration?:string};
export type ConsoleProps=DeckState&{labels?:ConsoleLabels;record:VisualRecord;artwork:ReactNode;volume:number;onVolume:(value:number)=>void;extra?:ReactNode;side?:RecordSide;sideControls?:ReactNode;recordObject?:ReactNode;recordNote?:ReactNode;performanceControls?:ReactNode};

export default function DeckConsole({labels,record,artwork,playing,starting,ready,completed,progress,note,frequency,position,input,onPlay,volume,onVolume,error,extra,side,sideControls,recordObject,recordNote,signal,requestAt,playLabel,manual,performanceControls}:ConsoleProps){
  const {t}=useStudioLanguage();const active=playing||starting;
  useEffect(()=>{announceDeck(active);},[active]);
  useEffect(()=>()=>announceDeck(false),[]);
  // Jukebox Show: press Play once per cue when ready; report a natural finish or an early stop.
  const show=useShowCue(),showNow=useRef(show),startedFor=useRef<number|null>(null),wasActive=useRef(false),completedNow=useRef(completed),onPlayNow=useRef(onPlay);
  showNow.current=show;completedNow.current=completed;onPlayNow.current=onPlay;
  useEffect(()=>{if(show.cue!==null&&ready&&!active&&startedFor.current!==show.cue){startedFor.current=show.cue;onPlayNow.current();}},[show.cue,ready,active]);
  useEffect(()=>{
    const cue=show.cue;if(cue===null||startedFor.current!==cue)return;
    if(active){wasActive.current=true;return;}
    if(!wasActive.current)return;
    wasActive.current=false;
    // Read the result a moment later: some decks set "completed" just after they stop.
    window.setTimeout(()=>{if(showNow.current.cue===cue)(completedNow.current?showNow.current.onEnded:showNow.current.onStopped)(cue);},60);
  },[active,show.cue]);
  return <article className={`jb-deck ${active?'is-playing':''}${side?' jb-two-sided':''}${manual?' jb-manual':''}`} aria-labelledby="jb-record-title" data-record-kind={record.kind} data-record-side={side} data-play-mode={manual?'manual':'automatic'} data-note-serial={signal.event?.serial??0} data-note-at={signal.event?.at??0} data-play-request-at={requestAt} data-frequency={signal.frequency??''}>
    <header className="jb-deck-header">
      <div className="jb-record-heading"><h2 id="jb-record-title" tabIndex={-1}>{t(record.title)}</h2></div>
      <span className="jb-state" role="status"><i className={active?'is-on':''}/>{t(!ready?(error?'Visual unavailable':'Loading…'):starting?'Starting…':playing?'Now playing':completed?'Finished':'Ready to play')}</span>
    </header>
    <div className="jb-transport"><button className="jb-play" type="button" disabled={!ready} onClick={onPlay}>{active?<Square size={17} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}<span>{t(active?'Stop':playLabel??'Play record')}</span></button><label className="jb-volume"><Volume2 size={18}/><span className="sr-only">{t('Jukebox volume')}</span><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>onVolume(Number(e.target.value))}/></label></div>
    <div className="jb-progress-row"><progress aria-label={t(manual?'Scan position':'Record progress')} max="1" value={progress}/><span>{t(completed?'Complete':labels?.count??(record.kind==='visual'?'48 visual strips':'12 observations'))}<b>{manual?t('Your pace'):<>{labels?.duration??<>~25 {t('seconds')}</>}</>}</b></span></div>
    {sideControls}
    <div className={`jb-artwork${recordObject?' jb-artwork-paired':''}`}>{recordObject}<div className="jb-science-window">{artwork}</div></div>
    {performanceControls}
    <dl className="jb-readout"><div><dt>{t(labels?.input??(record.kind==='visual'?'PIXEL INPUT':'OBSERVATION'))}</dt><dd>{input}</dd></div><div><dt>{t('GENERATED NOTE')}</dt><dd className="jb-note">{note}<small>{frequency}</small></dd></div><div><dt>{t(labels?.position??(record.kind==='visual'?'SCAN POSITION':'RECORD POSITION'))}</dt><dd>{position}</dd></div></dl>
    {recordNote}
    {extra}
    <div className="jb-source"><div className="jb-source-line"><span>{t(record.kind==='visual'?'Visual sound':'Measurement sound')}</span>{record.sourceUrl?<a href={record.sourceUrl} target="_blank" rel="noreferrer">{t(record.source)} <ArrowUpRight size={13}/></a>:<span>{t(record.source)}</span>}</div><p>{t(record.meaning)}</p>{side&&<p className="jb-side-provenance">{t('Related sources, different transformations. The image and observations are not matched frame by frame.')}</p>}</div>
    {error&&<p className="jb-error" role="alert">{t(error)}</p>}
  </article>;
}

