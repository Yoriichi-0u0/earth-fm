import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapData, PROFILE } from '../src/lib/symphony.ts';
const point = (anomaly: number | null) => ({year:2025,month:1,period:'2025-01',anomaly});
test('Studio ten-band boundaries are stable, ordered and independent of year',()=>{
  assert.equal(PROFILE.frequenciesHz.length,10);
  for(let i=0;i<10;i++) {
    const event=mapData(point(-1+i*.25)); assert.equal(event.kind,'note');
    if(event.kind==='note') { assert.equal(event.bandIndex,i); assert.equal(event.frequencyHz,PROFILE.frequenciesHz[i]); }
    assert.deepEqual(mapData({...point(-1+i*.25),year:1880}),event);
  }
  const final=mapData(point(1.5)); assert.equal(final.kind,'note'); if(final.kind==='note') assert.equal(final.bandIndex,9);
  for(const v of [null,NaN,Infinity,-1.01,1.51]) assert.equal(mapData(point(v)).kind,'rest');
});
