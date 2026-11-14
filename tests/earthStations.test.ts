import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tracks} from '../src/data/earth.ts';
import {arcticPoints,arcticStory,arcticPitches,mapArctic,arcticCsv,ARCTIC_MAPPING} from '../src/data/earthStations.ts';
import {pageUrl} from '../src/lib/studioRouter.ts';

test('Arctic station uses exact reviewed September means and an explicit twelve-year selection',()=>{
 const original=tracks.find(track=>track.id==='sea-ice')!;
 assert.deepEqual(arcticPoints.map(({year,value})=>({year,value})),original.observations);
 assert.equal(arcticPoints.length,36);assert.equal(arcticPoints[0].value,7.2787);assert.equal(arcticPoints.at(-1)!.value,4.8969);
 assert.equal(arcticStory.length,12);assert.ok(arcticPoints.every(point=>point.month===9&&point.period===`${point.year}-09`));
 assert.ok(arcticStory.every(point=>arcticPoints.includes(point)));
});
test('Arctic mapping uses physical fixed bands, monotonic notes and no year-dependent rescaling',()=>{
 const point=(value:number|null,year=1987)=>({year,month:9,period:`${year}-09`,value});
 for(let band=0;band<10;band++){
  const lower=3+band*.5,note=mapArctic(point(lower))!;
  assert.equal(note.band,band);assert.equal(note.lower,lower);assert.equal(note.upper,lower+.5);
  assert.deepEqual(note,mapArctic(point(lower,2022)));assert.equal(mapArctic(point(lower+.499999))!.band,band);
 }
 assert.equal(mapArctic(point(8))!.band,9);assert.equal(mapArctic(arcticPoints[0])!.note,'G4');assert.equal(mapArctic(arcticPoints.at(-1)!)!.note,'G3');
 const ordered=[...arcticPoints].sort((a,b)=>a.value!-b.value!);const notes=arcticPitches(ordered) as number[];
 assert.ok(notes.every((value,i)=>i===0||value>=notes[i-1]));assert.equal(ARCTIC_MAPPING.bandWidth,.5);
});
test('Missing, invalid and out-of-range ice values are rests, never clipped observations',()=>{
 for(const value of [null,NaN,Infinity,2.999999,8.000001])assert.equal(mapArctic({year:2022,month:9,period:'2022-09',value}),null);
});
test('Arctic trace preserves full source precision and exports the exact mapped fundamentals',()=>{
 const lines=arcticCsv().trim().split('\n');assert.equal(lines.length,37);assert.match(lines[0],/extent_million_km2/);
 assert.match(lines[1],/^1987-09,7\.2787,9,G4,391\.995/);assert.match(lines.at(-1)!,/^2022-09,4\.8969,4,G3,195\.997/);
 const missing=arcticCsv([{year:2023,month:9,period:'2023-09',value:null}]);assert.match(missing,/2023-09,,,,,arctic-september-fixed-v1,missing/);
});
test('Station deep links remain inside the existing five pages',()=>{
 assert.equal(pageUrl('listen','arctic'),'/listen?station=arctic');assert.equal(pageUrl('listen','all'),'/listen');assert.equal(pageUrl('listen'),'/listen');assert.equal(pageUrl('listen','climate'),'/listen?station=climate');
 assert.equal(pageUrl('listen','climate','motion'),'/listen?station=climate&visual=motion');assert.equal(pageUrl('data','arctic'),'/data?station=arctic');assert.equal(pageUrl('home','arctic'),'/');
});
