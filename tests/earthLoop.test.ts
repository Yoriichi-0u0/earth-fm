import assert from 'node:assert/strict';
import {test} from 'node:test';
import {LOOP_MAX_MS,LOOP_MAX_NOTES,ScanReplay,validateTake} from '../src/lib/earthLoop.ts';
import type {ReplayClock,ReplayEnd,ScanTake} from '../src/lib/earthLoop.ts';

class Clock{
  now=0;next=0;tasks=new Map<number,{at:number;fn:()=>void}>();
  clock:ReplayClock={now:()=>this.now,later:(fn,delay)=>{const id=++this.next;this.tasks.set(id,{at:this.now+delay,fn});return id as unknown as ReturnType<typeof setTimeout>;},cancel:id=>{this.tasks.delete(id as unknown as number);}};
  async advance(to:number){this.now=to;for(let i=0;i<100;i++){const due=[...this.tasks].filter(([,task])=>task.at<=this.now).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;this.tasks.delete(due[0]);due[1].fn();await Promise.resolve();await Promise.resolve();}}
}
const take:ScanTake={sourceImage:'/frames/climate-spiral-svs5190-2026-10-18.jpg',stripCount:48,durationMs:1200,events:[{strip:11,atMs:200},{strip:30,atMs:500},{strip:6,atMs:900}]};

test('recorded interaction validation rejects invalid strips, reordered times and unbounded takes',()=>{
  validateTake(take);
  for(const invalid of [
    {...take,durationMs:LOOP_MAX_MS+1},
    {...take,events:Array.from({length:LOOP_MAX_NOTES+1},()=>({strip:0,atMs:0}))},
    {...take,events:[{strip:48,atMs:0}]},
    {...take,events:[{strip:1,atMs:-1}]},
    {...take,events:[{strip:1,atMs:500},{strip:2,atMs:499}]},
    {...take,events:[{strip:1,atMs:1201}]},
    {...take,events:[]},
  ])assert.throws(()=>validateTake(invalid),RangeError);
});

test('replay preserves lead-in, strip order, interaction intervals and trailing rest',async()=>{
  const time=new Clock(),heard:{strip:number;at:number}[]=[],ended:ReplayEnd[]=[];
  const replay=new ScanReplay(async event=>{heard.push({strip:event.strip,at:time.now});return true;},reason=>ended.push(reason),time.clock);
  replay.start(take);await time.advance(199);assert.equal(heard.length,0);
  for(const at of [200,500,900])await time.advance(at);
  assert.deepEqual(heard,[{strip:11,at:200},{strip:30,at:500},{strip:6,at:900}]);
  await time.advance(1199);assert.deepEqual(ended,[]);await time.advance(1200);assert.deepEqual(ended,['complete']);assert.equal(time.tasks.size,0);
});

test('stopping a replay while a note is pending prevents later notes and stale completion',async()=>{
  const time=new Clock(),heard:number[]=[],ended:ReplayEnd[]=[];let finish!:(value:boolean)=>void;
  const replay=new ScanReplay(event=>{heard.push(event.strip);return new Promise(resolve=>{finish=resolve;});},reason=>ended.push(reason),time.clock);
  replay.start({...take,events:[{strip:1,atMs:0},{strip:2,atMs:100}]});await time.advance(0);replay.stop();finish(true);await Promise.resolve();await time.advance(2000);
  assert.deepEqual(heard,[1]);assert.deepEqual(ended,[]);assert.equal(time.tasks.size,0);
});

test('a stalled replay ends without bursting overdue notes; audio failure also clears the schedule',async()=>{
  const time=new Clock(),heard:number[]=[],ended:ReplayEnd[]=[];
  const replay=new ScanReplay(async event=>{heard.push(event.strip);return true;},reason=>ended.push(reason),time.clock);
  replay.start(take);await time.advance(400);assert.deepEqual(heard,[]);assert.deepEqual(ended,['late']);assert.equal(time.tasks.size,0);
  const failed=new ScanReplay(async()=>{throw new Error('device unavailable');},reason=>ended.push(reason),time.clock);
  failed.start({...take,events:[{strip:1,atMs:0}]});await time.advance(400);assert.deepEqual(ended,['late','audio']);assert.equal(time.tasks.size,0);
});
