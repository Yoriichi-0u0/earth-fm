import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storyPoints,storyCsv,storyFrame,STORY_YEARS} from '../src/data/guidedStory.ts';
import {getClimateMonth} from '../src/data/climateSpiral.ts';
import {mapData} from '../src/lib/symphony.ts';
import {isLegacyEntry} from '../src/lib/entry.ts';
test('guided January selection uses exact published observations and unchanged fixed pitches',()=>{
  assert.equal(storyPoints.length,12);
  assert.equal(storyPoints[0].year,1880);assert.equal(storyPoints.at(-1)!.year,2025);
  const frequencies=new Set();
  storyPoints.forEach((point,i)=>{assert.equal(point.month,1);assert.equal(point.year,STORY_YEARS[i]);assert.deepEqual(point,getClimateMonth(point.year,1));const e=mapData(point);assert.equal(e.kind,'note');if(e.kind==='note')frequencies.add(e.frequencyHz);});
  assert.ok(frequencies.size>=4,'The introduction must reveal across-year differences without per-year rescaling.');
  assert.ok(STORY_YEARS.some((year,i)=>i>0&&year-STORY_YEARS[i-1]!==1));
  assert.ok(storyCsv().includes('1880-01,-0.19,1951-1980,G3,'));
  assert.ok(storyCsv().includes('2025-01,1.37,1951-1980,A4,440'));
  assert.equal(storyFrame.sourceUrl,'https://svs.gsfc.nasa.gov/5190/');
  assert.equal(storyFrame.imageUrl,'/frames/climate-spiral-svs5190-2026-10-18.jpg');
});
test('Studio is canonical while legacy URLs, anchors and shared mixes remain recoverable',()=>{
  assert.equal(isLegacyEntry('',''),false);
  assert.equal(isLegacyEntry('?studio=1',''),false);
  assert.equal(isLegacyEntry('?legacy=1',''),true);
  assert.equal(isLegacyEntry('','#climate-spiral'),true);
  assert.equal(isLegacyEntry('?track=co2&sound=ambient',''),true);
  assert.equal(isLegacyEntry('?studio=1&track=co2','#climate-spiral'),false);
  assert.equal(isLegacyEntry('','#experience'),false);
});
