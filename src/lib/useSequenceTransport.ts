import {useCallback,useEffect,useRef,useState} from 'react';
import {SymphonyPlayer} from './symphony';
import type {Settings} from './symphony';
import type {NoteEvent} from './recordSignal';
/** One owner per mounted page; observations remain in their original scientific units. */
export function useSequenceTransport<T>(){
  const engine=useRef<SymphonyPlayer|null>(null),session=useRef(0);
  const [playing,setPlaying]=useState(false),[audible,setAudible]=useState<T|null>(null),[status,setStatus]=useState('Ready when you are.');
  const serial=useRef(0),[noteEvent,setNoteEvent]=useState<NoteEvent|null>(null);
  const stop=useCallback(()=>{session.current++;engine.current?.stop();setPlaying(false);setAudible(null);setNoteEvent(null);setStatus('Stopped.');},[]);
  useEffect(()=>{const audio=new SymphonyPlayer();engine.current=audio;const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{session.current++;audio.dispose();engine.current=null;document.removeEventListener('visibilitychange',hide);};},[stop]);
  async function play(points:readonly T[],pitches:readonly(number|null)[],settings:Settings){
    if(points.length!==pitches.length)throw new RangeError('Every observation needs a mapped note or rest.');
    stop();const token=session.current;setPlaying(true);setStatus('Starting audio…');
    try{await engine.current?.playPitches(pitches,settings,index=>{if(token===session.current){setNoteEvent({serial:++serial.current,at:performance.now(),index});setAudible(points[index]);setStatus('Playing');}},()=>{if(token===session.current){setPlaying(false);setAudible(null);setStatus('Complete. Explore another mix or compare years.');}});}
    catch{if(token===session.current){stop();setStatus('Audio could not start. Press play to try again.');}}
  }
  return {playing,audible,status,noteEvent,stop,play,setVolume:(value:number)=>engine.current?.setVolume(value)};
}
