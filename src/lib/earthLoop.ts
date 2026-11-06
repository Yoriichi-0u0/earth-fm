export const LOOP_MAX_MS=15_000;
export const LOOP_MAX_NOTES=64;
export type ScanEvent={strip:number;atMs:number};
export type ScanTake={sourceImage:string;stripCount:number;durationMs:number;events:readonly ScanEvent[]};
type Timer=ReturnType<typeof setTimeout>;
export type ReplayClock={now:()=>number;later:(callback:()=>void,delay:number)=>Timer;cancel:(timer:Timer)=>void};
export type ReplayEnd='complete'|'late'|'audio';
const clock:ReplayClock={now:()=>performance.now(),later:(fn,delay)=>setTimeout(fn,delay),cancel:timer=>clearTimeout(timer)};

/** Validate local interaction metadata; it never becomes an Earth observation. */
export function validateTake(take:ScanTake){
  if(!take.sourceImage||!Number.isInteger(take.stripCount)||take.stripCount<1||take.stripCount>256)throw new RangeError('The original image and strip count are required.');
  if(!Number.isFinite(take.durationMs)||take.durationMs<0||take.durationMs>LOOP_MAX_MS||!take.events.length||take.events.length>LOOP_MAX_NOTES)throw new RangeError('Choose a take of at most 15 seconds and 64 notes.');
  let previous=0;
  for(const event of take.events){
    if(!Number.isInteger(event.strip)||event.strip<0||event.strip>=take.stripCount||!Number.isFinite(event.atMs)||event.atMs<previous||event.atMs>take.durationMs)throw new RangeError('Recorded positions and times must remain valid and ordered.');
    previous=event.atMs;
  }
}

/** One anchored timer, one replay. Never bursts old notes after a stalled tab. */
export class ScanReplay{
  private generation=0;
  private timer:Timer|null=null;
  constructor(private play:(event:ScanEvent)=>Promise<boolean>,private onEnd:(reason:ReplayEnd)=>void,private time:ReplayClock=clock){}
  start(take:ScanTake){
    validateTake(take);this.stop();
    const token=this.generation,start=this.time.now();
    const finish=(reason:ReplayEnd)=>{if(token!==this.generation)return;this.stop();this.onEnd(reason);};
    const schedule=(index:number)=>{
      if(token!==this.generation)return;
      const event=take.events[index];
      if(!event){this.timer=this.time.later(()=>finish('complete'),Math.max(0,Math.max(take.durationMs,take.events.at(-1)!.atMs+220)-(this.time.now()-start)));return;}
      this.timer=this.time.later(()=>{this.timer=null;void tick(index);},Math.max(0,event.atMs-(this.time.now()-start)));
    };
    const tick=async(index:number)=>{
      if(token!==this.generation)return;
      const event=take.events[index];
      if(this.time.now()-start-event.atMs>120){finish('late');return;}
      try{
        const played=await this.play(event);
        if(token!==this.generation)return;
        if(!played){finish('audio');return;}
        schedule(index+1);
      }catch{finish('audio');}
    };
    schedule(0);
  }
  stop(){this.generation++;if(this.timer!==null)this.time.cancel(this.timer);this.timer=null;}
}
