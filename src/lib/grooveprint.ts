import type {FrameStep} from './imageSonification';
import type {RecordPoint} from './jukeboxData';
import {mapData,PROFILE,NOTES} from './symphony';
import {mapValueToNote} from './audio';

export type GrooveStatus='value'|'missing'|'outside-mapping';
type Input={value:number|null;level:number|null;status:GrooveStatus;band:number|null;note:string|null;frequencyHz:number|null;year:number|null};
export type GrooveSegment=Input&{index:number;start:number;end:number;radius:number|null;path:string|null;gapPath:string};
const INNER=24,BASE=26,SPAN=18;
const point=(radius:number,degrees:number)=>{
  const angle=degrees*Math.PI/180;
  return `${(50+radius*Math.sin(angle)).toFixed(3)},${(50-radius*Math.cos(angle)).toFixed(3)}`;
};

/** Clockwise, equal ordinal sectors. Pure geometry; never reads time or samples media. */
function engrave(input:readonly Input[]):GrooveSegment[]{
  if(!input.length)return [];
  const angle=360/input.length,gap=Math.min(2.5,angle*.15);
  return input.map((item,index)=>{
    const start=index*angle+gap/2,end=(index+1)*angle-gap/2,large=end-start>180?1:0;
    const radius=item.level===null?null:BASE+SPAN*item.level;
    const path=radius===null?null:`M${point(INNER,start)} L${point(radius,start)} A${radius.toFixed(3)},${radius.toFixed(3)} 0 ${large} 1 ${point(radius,end)} L${point(INNER,end)} A${INNER},${INNER} 0 ${large} 0 ${point(INNER,start)} Z`;
    return {...item,index,start,end,radius,path,gapPath:`M${point(BASE,index*angle+angle/2)} L${point(BASE+SPAN,index*angle+angle/2)}`};
  });
}

/** Absolute luma estimate 0..1 → outer radius 26..44; no per-image rescaling. */
export function imageGrooveprint(steps:readonly Pick<FrameStep,'brightness'>[]):GrooveSegment[]{
  return engrave(steps.map(({brightness})=>{
    const valid=Number.isFinite(brightness)&&brightness>=0&&brightness<=1;
    const mapped=valid?mapValueToNote(brightness,0,1):null;
    return {value:brightness,level:valid?brightness:null,status:valid?'value':'outside-mapping',band:null,note:mapped?.note??null,frequencyHz:mapped?.frequency??null,year:null};
  }));
}

/** The existing fixed GISTEMP event/profile, not a second temperature-to-note rule. */
export function measurementGrooveprint(points:readonly RecordPoint[]):GrooveSegment[]{
  return engrave(points.map(p=>{
    const event=mapData({...p,anomaly:p.value});
    return event.kind==='note'?{value:p.value,level:event.bandIndex/(PROFILE.frequenciesHz.length-1),status:'value',band:event.bandIndex,note:NOTES[event.bandIndex],frequencyHz:event.frequencyHz,year:p.year}:{value:p.value,level:null,status:event.reason,band:null,note:null,frequencyHz:null,year:p.year};
  }));
}
