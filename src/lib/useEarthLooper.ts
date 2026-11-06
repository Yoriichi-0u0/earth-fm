import {useCallback,useEffect,useRef,useState} from 'react';
import {LOOP_MAX_MS,LOOP_MAX_NOTES,ScanReplay} from './earthLoop';
import type {ScanTake,ScanEvent} from './earthLoop';
import type {NoteEvent} from './recordSignal';

type Phase='idle'|'recording'|'preparing'|'replaying';
type Options={enabled:boolean;sourceImage:string;stripCount:number;prepare:()=>Promise<boolean>;play:(index:number)=>Promise<NoteEvent|null>;stopAudio:()=>void;onSelect:(index:number)=>void};

/** Session memory only. No microphone, persistence, upload, or data adapter. */
export function useEarthLooper(options:Options){
  const callbacks=useRef(options);useEffect(()=>{callbacks.current=options;});
  const [phase,setPhase]=useState<Phase>('idle'),[events,setEvents]=useState<readonly ScanEvent[]>([]),[take,setTake]=useState<ScanTake|null>(null),[message,setMessage]=useState('Record your scan, then replay it.');
  const phaseRef=useRef<Phase>('idle'),buffer=useRef<ScanEvent[]>([]),recordAt=useRef<number|null>(null),session=useRef(0);
  const recordingTimer=useRef<ReturnType<typeof setTimeout>|null>(null),replayEngine=useRef<ScanReplay|null>(null);
  const clearTimer=useCallback(()=>{if(recordingTimer.current!==null)clearTimeout(recordingTimer.current);recordingTimer.current=null;},[]);
  const stop=useCallback(()=>{
    session.current++;clearTimer();replayEngine.current?.stop();callbacks.current.stopAudio();
    if(recordAt.current!==null){
      const durationMs=Math.min(LOOP_MAX_MS,Math.max(0,performance.now()-recordAt.current));recordAt.current=null;
      setTake(buffer.current.length?{sourceImage:callbacks.current.sourceImage,stripCount:callbacks.current.stripCount,durationMs,events:[...buffer.current]}:null);
      setMessage(buffer.current.length?'Take saved on this page.':'No notes recorded. Record and move the scan.');
    }else if(phaseRef.current!=='idle')setMessage('Replay stopped.');
    phaseRef.current='idle';setPhase('idle');
  },[clearTimer]);
  useEffect(()=>{
    replayEngine.current=new ScanReplay(async event=>{
      callbacks.current.onSelect(event.strip);return (await callbacks.current.play(event.strip))!==null;
    },reason=>{
      callbacks.current.stopAudio();phaseRef.current='idle';setPhase('idle');
      setMessage(reason==='complete'?'Your take has finished.':reason==='late'?'Replay paused because this tab fell behind. Press Replay to try again.':'Replay could not start. Press Replay to try again.');
    });
    const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);window.addEventListener('blur',stop);
    return()=>{session.current++;recordAt.current=null;clearTimer();replayEngine.current?.stop();replayEngine.current=null;document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',stop);};
  },[clearTimer,stop]);
  useEffect(()=>{if(!options.enabled)stop();},[options.enabled,stop]);

  function record(){
    if(!callbacks.current.enabled)return;
    stop();buffer.current=[];setEvents([]);setTake(null);recordAt.current=performance.now();phaseRef.current='recording';setPhase('recording');setMessage('Recording your scan.');
    recordingTimer.current=setTimeout(()=>{stop();setMessage(buffer.current.length?'15-second limit reached. Your take is ready.':'No notes recorded. Record and move the scan.');},LOOP_MAX_MS);
  }
  function capture(event:NoteEvent){
    if(recordAt.current===null||phaseRef.current!=='recording')return;
    const atMs=event.at-recordAt.current;
    if(atMs>LOOP_MAX_MS){stop();setMessage('15-second limit reached. Your take is ready.');return;}
    if(atMs<0||!Number.isInteger(event.index)||event.index<0||event.index>=callbacks.current.stripCount)return;
    buffer.current.push({strip:event.index,atMs});setEvents([...buffer.current]);
    if(buffer.current.length>=LOOP_MAX_NOTES){stop();setMessage('64-note limit reached. Your take is ready.');}
  }
  async function replay(){
    if(!take||!callbacks.current.enabled)return;
    stop();const token=++session.current;
    if(take.sourceImage!==callbacks.current.sourceImage||take.stripCount!==callbacks.current.stripCount){setMessage('The source changed. Record a new take.');return;}
    phaseRef.current='preparing';setPhase('preparing');setMessage('Preparing audio. You can stop at any time.');
    try{
      const ready=await callbacks.current.prepare();
      if(token!==session.current)return;
      if(!ready){stop();setMessage('Replay could not start. Press Replay to try again.');return;}
      phaseRef.current='replaying';setPhase('replaying');setMessage('Replaying your take.');replayEngine.current?.start(take);
    }catch{if(token===session.current){stop();setMessage('Replay could not start. Press Replay to try again.');}}
  }
  function clear(){stop();buffer.current=[];setEvents([]);setTake(null);setMessage('Record your scan, then replay it.');}
  function cancelReplay(){if(phaseRef.current==='preparing'||phaseRef.current==='replaying')stop();}
  return {phase,events,take,message,record,capture,replay,clear,stop,cancelReplay};
}
