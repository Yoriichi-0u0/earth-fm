import {arcticStory,mapArctic} from '../data/earthStations';
import {storyPoints} from '../data/guidedStory';
import {mapData,NOTES} from './symphony';

export type RecordPoint={year:number;month:number;period:string;value:number|null};
export function mapRecordPoint(point:RecordPoint,arctic:boolean){
  if(arctic){const note=mapArctic(point);return note?{frequencyHz:note.frequencyHz,note:note.note}:null;}
  const event=mapData({...point,anomaly:point.value});
  return event.kind==='note'?{frequencyHz:event.frequencyHz,note:NOTES[event.bandIndex]}:null;
}
/** The same reviewed observation selection and mapping feed both listening experiences. */
export function measurementSequence(id:'arctic'|'temperature'){
  const points:RecordPoint[]=id==='arctic'?[...arcticStory]:storyPoints.map(p=>({...p,value:p.anomaly}));
  const pitches=points.map(p=>mapRecordPoint(p,id==='arctic')?.frequencyHz??null);
  return {points,pitches};
}
