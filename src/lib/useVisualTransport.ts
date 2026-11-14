import {useCallback, useEffect, useRef, useState} from 'react';
import {FrameAudio, imageToSequence} from './imageSonification';
import type {FrameStep} from './imageSonification';
import type {NoteEvent} from './recordSignal';

export const VISUAL_SCAN_STEPS = 48;
type Options = {
  imageUrl: string; videoUrl?: string; animate: boolean; motionAllowed: boolean;
  tempo: number; volume: number; onStart: () => void; onPlayingChange?: (playing:boolean) => void;
};

/** Shared decoded-media and audio-clock transport for the deck and existing visual players. */
export function useVisualTransport(options:Options) {
  const {imageUrl,videoUrl,animate,motionAllowed,tempo,volume}=options;
  const imageRef=useRef<HTMLImageElement>(null),videoRef=useRef<HTMLVideoElement>(null),screenRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement|null>(null),audioRef=useRef<FrameAudio|null>(null),session=useRef(0);
  const callbacks=useRef(options);
  useEffect(()=>{callbacks.current=options;});
  const [steps,setSteps]=useState<FrameStep[]>([]),[scanIndex,setScanIndex]=useState(0);
  const [playing,setPlaying]=useState(false),[starting,setStarting]=useState(false),[ready,setReady]=useState(false),[completed,setCompleted]=useState(false);
  const [error,setError]=useState(''),[sampledTime,setSampledTime]=useState(0),[frameFit,setFrameFit]=useState({left:0,width:100});
  const scheduled=useRef<Array<{steps:FrameStep[];time:number}>>([]);
  const serial=useRef(0);
  const [noteEvent,setNoteEvent]=useState<NoteEvent|null>(null);

  const stop=useCallback(()=>{
    session.current++;audioRef.current?.stop();videoRef.current?.pause();setPlaying(false);setStarting(false);setCompleted(false);setNoteEvent(null);callbacks.current.onPlayingChange?.(false);
  },[]);
  useEffect(()=>{
    const audio=new FrameAudio();audioRef.current=audio;canvasRef.current=document.createElement('canvas');
    const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);
    return()=>{session.current++;audio.dispose();videoRef.current?.pause();audioRef.current=null;document.removeEventListener('visibilitychange',hide);};
  },[stop]);
  useEffect(()=>{audioRef.current?.setVolume(volume);},[volume]);
  useEffect(()=>{if(!motionAllowed){stop();videoRef.current?.pause();}},[motionAllowed,stop]);

  const sample=useCallback(()=>{
    const source=videoUrl?videoRef.current:imageRef.current;
    const width=videoUrl?videoRef.current?.videoWidth:imageRef.current?.naturalWidth;
    const height=videoUrl?videoRef.current?.videoHeight:imageRef.current?.naturalHeight;
    const canvas=canvasRef.current;
    if(!source||!canvas||!width||!height)throw new Error('The visual has not finished loading.');
    canvas.width=384;canvas.height=Math.max(1,Math.round(height/width*384));
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('This browser does not support reading image pixels.');
    context.drawImage(source,0,0,canvas.width,canvas.height);
    return imageToSequence(context.getImageData(0,0,canvas.width,canvas.height),VISUAL_SCAN_STEPS);
  },[videoUrl]);
  const fitFrame=useCallback(()=>{
    const screen=screenRef.current;
    const width=videoUrl?videoRef.current?.videoWidth:imageRef.current?.naturalWidth;
    const height=videoUrl?videoRef.current?.videoHeight:imageRef.current?.naturalHeight;
    if(!screen||!width||!height||!screen.clientWidth)return;
    const visibleWidth=Math.min(screen.clientWidth,screen.clientHeight*width/height);
    setFrameFit({left:(screen.clientWidth-visibleWidth)/2/screen.clientWidth*100,width:visibleWidth/screen.clientWidth*100});
  },[videoUrl]);
  const prepareRun=useRef(0);
  const read=useCallback(()=>{
    try{setSteps(sample());setScanIndex(0);setReady(true);setError('');fitFrame();}
    catch{setReady(false);setError('This visual could not be read. Choose another frame or upload a local image.');}
  },[sample,fitFrame]);
  const prepare=useCallback(()=>{
    const run=++prepareRun.current,image=videoUrl?null:imageRef.current;
    // WebKit can report a loaded <img> before its pixels are decoded; drawing it then reads transparent black.
    // A rejected decode means the pixels are unusable, so it must never become a ready scan.
    if(image&&typeof image.decode==='function')image.decode().then(
      ()=>{if(run===prepareRun.current)read();},
      ()=>{if(run===prepareRun.current){setSteps([]);setReady(false);setError('This visual could not be read. Choose another frame or upload a local image.');}},
    );
    else read();
  },[videoUrl,read]);
  useEffect(()=>{
    prepareRun.current++;stop();setReady(false);setSteps([]);setScanIndex(0);setSampledTime(0);setError('');
    const video=videoRef.current;let prepared=false;
    const decoded=()=>{if(!prepared&&video&&video.readyState>=2){prepare();prepared=true;}};
    if(video){video.addEventListener('loadeddata',decoded);video.addEventListener('canplay',decoded);decoded();}
    else if(imageRef.current?.complete&&imageRef.current.naturalWidth)prepare();
    // A fast failure (seen in WebKit) can land before this reset clears it; replay it for the player's own error handler.
    else if(imageRef.current?.complete&&imageRef.current.getAttribute('src'))imageRef.current.dispatchEvent(new Event('error'));
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fitFrame);
    if(screenRef.current)observer?.observe(screenRef.current);
    return()=>{observer?.disconnect();video?.pause();video?.removeEventListener('loadeddata',decoded);video?.removeEventListener('canplay',decoded);};
  },[imageUrl,videoUrl,prepare,fitFrame,stop]);

  async function start(){
    stop();callbacks.current.onStart();const token=++session.current;
    setError('');setScanIndex(0);setStarting(true);scheduled.current=[];
    try{
      const initial=sample();
      if(videoRef.current&&animate&&motionAllowed)void videoRef.current.play().catch(()=>{if(token===session.current)setError('Animation playback was blocked. The visible frame can still be heard.');});
      await audioRef.current?.start(initial,{tempo,volume,
        sampleStep:i=>{const next=sample();scheduled.current[i]={steps:next,time:videoRef.current?.currentTime??0};return next[i];},
        onStep:i=>{if(token===session.current){setNoteEvent({serial:++serial.current,at:performance.now(),index:i});setScanIndex(i);setSteps(scheduled.current[i]?.steps??initial);setSampledTime(scheduled.current[i]?.time??0);}},
        onEnd:()=>{if(token===session.current){setPlaying(false);setStarting(false);setCompleted(true);callbacks.current.onPlayingChange?.(false);videoRef.current?.pause();}},
      });
      if(token===session.current){setStarting(false);setPlaying(true);callbacks.current.onPlayingChange?.(true);}
    }catch{if(token===session.current){stop();setError('Could not start this visual. Check that it has loaded, then try again.');}}
  }
  return {imageRef,videoRef,screenRef,steps,scanIndex,setScanIndex,playing,starting,ready,setReady,completed,error,setError,sampledTime,frameFit,stop,start,sample,prepare,noteEvent};
}
