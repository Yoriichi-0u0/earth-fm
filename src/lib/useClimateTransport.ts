import type {MonthlyObservation} from './climateMapping';
import {mapData} from './symphony';
import type {Settings} from './symphony';
import {useSequenceTransport} from './useSequenceTransport';
export function useClimateTransport(){
  const audio=useSequenceTransport<MonthlyObservation>();
  return {...audio,play:(points:MonthlyObservation[],settings:Settings)=>audio.play(points,points.map(point=>{const note=mapData(point);return note.kind==='note'?note.frequencyHz:null;}),settings)};
}
