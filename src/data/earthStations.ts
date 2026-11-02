import {tracks} from './earth';
import {NOTES, PROFILE} from '../lib/symphony';
export type StationId = 'climate' | 'arctic';
export type StationPoint = {year:number; month:number; period:string; value:number|null};
export const arcticTrack = tracks.find(track=>track.id==='sea-ice')!;
export const arcticPoints:StationPoint[] = arcticTrack.observations.map(point=>({...point,month:9,period:`${point.year}-09`}));
export const ARCTIC_MAPPING = Object.freeze({id:'arctic-september-fixed-v1',minimum:3,maximum:8,bandWidth:.5,unit:'million km²'});
export const ARCTIC_STORY_YEARS = [1987,1990,1993,1996,1999,2002,2005,2008,2012,2015,2018,2022];
export const arcticStory = ARCTIC_STORY_YEARS.map(year=>arcticPoints.find(point=>point.year===year)!);
export const arcticPair = [arcticPoints[0],arcticPoints.at(-1)!];
export function mapArctic(point:StationPoint){
  const value=point.value;
  if(value===null || !Number.isFinite(value) || value<ARCTIC_MAPPING.minimum || value>ARCTIC_MAPPING.maximum)return null;
  const band=Math.min(9,Math.floor((value-ARCTIC_MAPPING.minimum)/ARCTIC_MAPPING.bandWidth));
  return {frequencyHz:PROFILE.frequenciesHz[band],note:NOTES[band],band,lower:3+band*.5,upper:3+(band+1)*.5};
}
export const arcticPitches=(points:readonly StationPoint[])=>points.map(point=>mapArctic(point)?.frequencyHz??null);
export function arcticCsv(points:readonly StationPoint[]=arcticPoints){
  return ['period,september_mean_extent_million_km2,band,note,fundamental_hz,mapping,status',...points.map(point=>{const note=mapArctic(point);return [point.period,point.value??'',note?note.band+1:'',note?.note??'',note?.frequencyHz??'',ARCTIC_MAPPING.id,note?'note':point.value===null?'missing':'outside-mapping'].join(',');})].join('\n')+'\n';
}
export function stationFromSearch(search:string):StationId|'all'{const value=new URLSearchParams(search).get('station');return value==='arctic'||value==='all'?value:'climate';}
export function saveStationFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
