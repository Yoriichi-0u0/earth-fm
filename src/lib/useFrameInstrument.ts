import {useCallback,useEffect,useRef,useState} from 'react';
import {FrameAudioStartupExpired,FrameScrubAudio} from './FrameScrubAudio';
import type {FrameStep} from './imageSonification';
import type {NoteEvent} from './recordSignal';

export function useFrameInstrument(steps:readonly FrameStep[],volume:number,enabled:boolean){
  const engine=useRef<FrameScrubAudio|null>(null),session=useRef(0),serial=useRef(0);
  const [playing,setPlaying]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[noteEvent,setNoteEvent]=useState<NoteEvent|null>(null);
  const stop=useCallback(()=>{session.current++;engine.current?.stop();setPlaying(false);setStarting(false);setNoteEvent(null);},[]);
  useEffect(()=>{
    const audio=new FrameScrubAudio();engine.current=audio;
    const hide=()=>{if(document.hidden)stop();};
    document.addEventListener('visibilitychange',hide);window.addEventListener('blur',stop);
    return()=>{session.current++;audio.dispose();engine.current=null;document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',stop);};
  },[stop]);
  useEffect(()=>{engine.current?.setVolume(volume);},[volume]);
  useEffect(()=>{if(!enabled)stop();},[enabled,stop]);
  async function play(index:number):Promise<NoteEvent|null>{
    const step=steps[index];if(!enabled||document.hidden||!step)return null;
    const token=++session.current;setStarting(true);setError('');setNotice('');
    try{
      const at=await engine.current?.play(step,()=>{if(token===session.current){setPlaying(false);setStarting(false);setNoteEvent(null);}});
      if(token!==session.current)return null;
      setStarting(false);
      if(at!==null&&at!==undefined){const event={serial:++serial.current,at,index};setPlaying(true);setNoteEvent(event);return event;}
    }catch(error){if(token===session.current){stop();if(error instanceof FrameAudioStartupExpired)setNotice('Audio is ready. Move again or press Hear this position.');else setError('The instrument could not start. Press Hear this position to try again.');}}
    return null;
  }
  async function prepare():Promise<boolean>{
    stop();const token=++session.current;setStarting(true);setError('');setNotice('');
    try{const ready=await engine.current?.prepare();if(token!==session.current)return false;setStarting(false);return Boolean(ready);}
    catch{if(token===session.current){stop();setError('The instrument could not start. Press Hear this position to try again.');}return false;}
  }
  return {playing,starting,error,notice,noteEvent,play,prepare,stop};
}
