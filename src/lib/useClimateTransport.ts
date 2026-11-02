import {useCallback,useEffect,useRef,useState} from 'react';
import type {MonthlyObservation} from './climateMapping';
import {SymphonyPlayer} from './symphony';
import type {Settings} from './symphony';
export function useClimateTransport(){
  const engine=useRef<SymphonyPlayer|null>(null),session=useRef(0);
  const [playing,setPlaying]=useState(false),[audible,setAudible]=useState<MonthlyObservation|null>(null),[status,setStatus]=useState('Ready when you are.');
  const stop=useCallback(()=>{session.current++;engine.current?.stop();setPlaying(false);setAudible(null);setStatus('Stopped.');},[]);
  useEffect(()=>{const audio=new SymphonyPlayer();engine.current=audio;const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{session.current++;audio.dispose();engine.current=null;document.removeEventListener('visibilitychange',hide);};},[stop]);
  async function play(points:MonthlyObservation[],settings:Settings){
    stop();const token=session.current;setPlaying(true);setStatus('Starting audio…');
    try{await engine.current?.play(points,settings,index=>{if(token===session.current){setAudible(points[index]);setStatus('Playing');}},()=>{if(token===session.current){setPlaying(false);setAudible(null);setStatus('Complete. Explore another mix or compare years.');}});}
    catch{if(token===session.current){stop();setStatus('Audio could not start. Press play to try again.');}}
  }
  return {playing,audible,status,stop,play,setVolume:(value:number)=>engine.current?.setVolume(value)};
}
