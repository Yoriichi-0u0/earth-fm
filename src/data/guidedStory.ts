import { climateSnapshot, getClimateMonth } from './climateSpiral';
import type { EarthFrame } from './frames';
import { mapData, NOTES } from '../lib/symphony';
export const STORY_YEARS = [1880,1900,1920,1940,1960,1980,1990,2000,2010,2015,2020,2025] as const;
export const storyPoints = STORY_YEARS.map(year=>getClimateMonth(year,1));
const visual=climateSnapshot.provenance.visual;
export const storyFrame: EarthFrame = {
  id:'nasa-climate-spiral', title:'NASA Climate Spiral', source:'NASA SVS 5190', sourceUrl:visual.sourcePage,
  imageUrl:visual.localSource, description:'NASA Climate Spiral overview showing monthly global temperature anomalies into 2026. The image is a reference overview, not the selected observation.',
  date:'Source update recorded: 2026-09-11; downloaded 2026-10-18', kind:'image',credit:visual.credit,
  originalUrl:visual.sourceUrl, mirrorUrl:visual.sourcePage,
};
export function storyCsv() {
  return ['period,global_anomaly_c,baseline,note,fundamental_hz',...storyPoints.map(point=>{const event=mapData(point);return [point.period,point.anomaly??'','1951-1980',event.kind==='note'?NOTES[event.bandIndex]:'',event.kind==='note'?event.frequencyHz:''].join(',');})].join('\n')+'\n';
}
