import {mapValueToNote,pointPartials} from './audio';
import type {FrameStep} from './imageSonification';

type Voice={oscillators:OscillatorNode[];partials:GainNode[];envelope:GainNode;panner:StereoPannerNode;nodes:AudioNode[]};
const bounded=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):.55;

/** A short, dry pixel audition. Three shared partials; at most one retiring bank.
 * Pitch/RGB/pan use the automatic visual player's existing mapping functions.
 * The short envelope and absence of drone/echo are interaction choices, not data.
 */
export class FrameScrubAudio{
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private voice:Voice|null=null;
  private retiring:Voice|null=null;
  private retirement:ReturnType<typeof setTimeout>|null=null;
  private idle:ReturnType<typeof setTimeout>|null=null;
  private resumeTask:Promise<void>|null=null;
  private generation=0;
  private disposed=false;
  private volume=.55;

  async play(step:FrameStep,onEnd:()=>void):Promise<number|null>{
    if(this.disposed)throw new Error('This instrument has been disposed.');
    if(![step.brightness,step.red,step.green,step.blue,step.pan].every(Number.isFinite))throw new Error('A valid pixel strip is required.');
    const request=++this.generation,requestedAt=performance.now();
    if(!this.context){
      const Context=globalThis.AudioContext??(globalThis as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Context)throw new Error('Web Audio is unavailable.');
      this.context=new Context();this.master=this.context.createGain();
      this.master.gain.value=this.volume;this.master.connect(this.context.destination);
    }
    const context=this.context;
    if(context.state!=='running'){
      const task=this.resumeTask??(this.resumeTask=context.resume());
      try{await task;}finally{if(this.resumeTask===task)this.resumeTask=null;}
    }
    if(this.disposed||request!==this.generation)return null;
    if(context.state!=='running')throw new Error('Audio could not resume.');
    // A late permission/device resume must not replay an old touch unexpectedly.
    if(performance.now()-requestedAt>250){this.stop();onEnd();return null;}
    if(this.idle!==null)clearTimeout(this.idle);
    const partials=pointPartials('ambient',{red:step.red,green:step.green,blue:step.blue});
    const note=mapValueToNote(step.brightness,0,1),at=context.currentTime;
    if(!this.voice){
      const envelope=context.createGain(),panner=context.createStereoPanner();
      envelope.gain.value=0;envelope.connect(panner);panner.connect(this.master!);
      const voice:Voice={oscillators:[],partials:[],envelope,panner,nodes:[envelope,panner]};
      for(const partial of partials){
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.type=partial.type;oscillator.detune.value=partial.cents;
        oscillator.frequency.value=note.frequency*partial.multiplier;gain.gain.value=partial.weight;
        oscillator.connect(gain);gain.connect(envelope);oscillator.start(at);
        voice.oscillators.push(oscillator);voice.partials.push(gain);voice.nodes.push(oscillator,gain);
      }
      this.voice=voice;
    }
    const voice=this.voice;
    partials.forEach((partial,index)=>{
      voice.oscillators[index].frequency.setValueAtTime(note.frequency*partial.multiplier,at);
      voice.partials[index].gain.cancelScheduledValues(at);
      voice.partials[index].gain.setTargetAtTime(partial.weight,at,.008);
    });
    voice.panner.pan.setTargetAtTime(Math.max(-1,Math.min(1,step.pan)),at,.008);
    const envelope=voice.envelope.gain;
    envelope.cancelScheduledValues(at);envelope.setValueAtTime(envelope.value,at);
    envelope.linearRampToValueAtTime(.24*note.velocity,at+.012);
    envelope.exponentialRampToValueAtTime(.00001,at+.18);
    // Rapid movement retunes this bank, rather than allocating voices per event.
    this.idle=setTimeout(()=>{this.idle=null;if(request===this.generation){this.stop();onEnd();}},220);
    return performance.now();
  }

  setVolume(value:number){
    this.volume=bounded(value);
    if(this.context&&this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.015);
  }

  stop(){
    this.generation++;
    if(this.idle!==null)clearTimeout(this.idle);this.idle=null;
    if(this.retirement!==null)clearTimeout(this.retirement);this.retirement=null;
    this.disconnect(this.retiring);this.retiring=null;
    const voice=this.voice;this.voice=null;
    if(!voice||!this.context)return;
    const at=this.context.currentTime,gain=voice.envelope.gain;
    gain.cancelScheduledValues(at);gain.setValueAtTime(gain.value,at);gain.linearRampToValueAtTime(0,at+.02);
    for(const oscillator of voice.oscillators)oscillator.stop(at+.025);
    this.retiring=voice;
    this.retirement=setTimeout(()=>{this.retirement=null;this.disconnect(voice);if(this.retiring===voice)this.retiring=null;},35);
  }

  dispose(){
    if(this.disposed)return;
    this.stop();this.disposed=true;
    if(this.retirement!==null)clearTimeout(this.retirement);this.retirement=null;
    this.disconnect(this.retiring);this.retiring=null;
    this.master?.disconnect();this.master=null;
    const context=this.context;this.context=null;
    if(context&&context.state!=='closed')void context.close().catch(()=>{});
  }

  private disconnect(voice:Voice|null){
    if(!voice)return;
    for(const oscillator of voice.oscillators){try{oscillator.stop();}catch{/* Already ended. */}}
    for(const node of voice.nodes)node.disconnect();
  }
}
