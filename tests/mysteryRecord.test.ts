import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseMysteryRecord} from '../src/lib/mysteryRecord';
import {mysteryRecords as jukeboxRecords} from '../src/data/jukeboxRecords';
import {measurementSequence,mapRecordPoint} from '../src/lib/jukeboxData';
import {arcticStory,mapArctic} from '../src/data/earthStations';
import {storyPoints} from '../src/data/guidedStory';
import {mapData} from '../src/lib/symphony';

test('the first mystery can select every curated record without inventing a new source',()=>{
  const n=jukeboxRecords.length;
  assert.deepEqual(jukeboxRecords.map((_,k)=>chooseMysteryRecord(undefined,()=>(k+.5)/n)),jukeboxRecords);
  for(const value of [NaN,Infinity,-.1,1])assert.throws(()=>chooseMysteryRecord(undefined,()=>value),RangeError);
});
test('another mystery never immediately repeats the previous record, including selection boundaries',()=>{
  for(const previous of jukeboxRecords){
    const others=jukeboxRecords.length-1;
    const chosen=Array.from({length:others},(_,k)=>chooseMysteryRecord(previous.id,()=>(k+.5)/others));
    assert.equal(new Set(chosen.map(record=>record.id)).size,others);
    assert.ok(chosen.every(record=>record!==previous));
  }
});
test('mystery measurements retain the exact reviewed observation selection and compiled frequencies',()=>{
  const arctic=measurementSequence('arctic'),temperature=measurementSequence('temperature');
  assert.deepEqual(arctic.points,arcticStory);
  assert.deepEqual(arctic.pitches,arcticStory.map(point=>mapArctic(point)?.frequencyHz??null));
  assert.deepEqual(temperature.points,storyPoints.map(p=>({...p,value:p.anomaly})));
  assert.deepEqual(temperature.pitches,storyPoints.map(p=>{const event=mapData(p);return event.kind==='note'?event.frequencyHz:null;}));
  const missing={year:2026,month:1,period:'2026-01',value:null};
  assert.equal(mapRecordPoint(missing,true),null);assert.equal(mapRecordPoint(missing,false),null);
});
