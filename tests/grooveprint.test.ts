import test from 'node:test';
import assert from 'node:assert/strict';
import {imageGrooveprint,measurementGrooveprint} from '../src/lib/grooveprint';
import {mapData,PROFILE} from '../src/lib/symphony';
import type {RecordPoint} from '../src/lib/jukeboxData';
const observation=(value:number|null,year=2000):RecordPoint=>({year,month:1,period:`${year}-01`,value});

test('image grooves are deterministic absolute geometry with clockwise equal sectors',()=>{
  const fixture=[{brightness:0},{brightness:.5},{brightness:1},{brightness:.25}];
  const before=structuredClone(fixture),segments=imageGrooveprint(fixture);
  assert.deepEqual(segments,imageGrooveprint(fixture));assert.deepEqual(fixture,before);
  assert.deepEqual(segments.map(s=>s.radius),[26,35,44,30.5]);
  assert.deepEqual(segments.map(s=>s.start),[1.25,91.25,181.25,271.25]);
  assert.equal(segments[0].path,'M50.524,26.006 L50.567,24.006 A26.000,26.000 0 0 1 75.994,49.433 L73.994,49.476 A24,24 0 0 0 50.524,26.006 Z');
  assert.equal(imageGrooveprint([{brightness:.5}])[0].radius,35,'a different frame must not rescale .5');
});
test('48 image strips and 12 selected observations have distinct, ordered geometry',()=>{
  const image=imageGrooveprint(Array.from({length:48},(_,i)=>({brightness:i/47})));
  const data=measurementGrooveprint(Array.from({length:12},(_,i)=>observation(-1+i*.2,1880+i*10)));
  assert.equal(image.length,48);assert.equal(data.length,12);
  assert.equal(image[1].start-image[0].start,7.5);assert.equal(data[1].start-data[0].start,30);
  assert.ok(image.every((s,i)=>s.index===i&&s.path&&!/NaN|Infinity/.test(s.path)));
});
test('measurement grooves use the existing ten fixed bands and keep their boundary behavior',()=>{
  const points=[-1,-.751,-.75,0,.249,.25,1.499,1.5].map(v=>observation(v));
  const segments=measurementGrooveprint(points);
  points.forEach((p,i)=>{const event=mapData({...p,anomaly:p.value});assert.equal(event.kind,'note');if(event.kind==='note'){
    assert.equal(segments[i].band,event.bandIndex);assert.equal(segments[i].radius,26+18*event.bandIndex/(PROFILE.frequenciesHz.length-1));
  }});
  assert.equal(segments[0].radius,26);assert.equal(segments.at(-1)!.radius,44);
  assert.equal(segments[3].radius,segments[4].radius,'different values in one audible band share a groove length');
  assert.notEqual(segments[4].radius,segments[5].radius);
});
test('equal observation angles encode order, not calendar gaps, and never reorder the source',()=>{
  const points=[observation(.1,1880),observation(.1,2000),observation(.1,2025)],before=structuredClone(points);
  const s=measurementGrooveprint(points);assert.deepEqual(s.map(p=>p.start),[1.25,121.25,241.25]);assert.deepEqual(points,before);
});
test('missing and out-of-range measurements leave gaps, distinct from a valid lowest value',()=>{
  const s=measurementGrooveprint([observation(null),observation(-1.01),observation(1.51),observation(NaN),observation(-1)]);
  assert.deepEqual(s.map(x=>x.status),['missing','outside-mapping','outside-mapping','outside-mapping','value']);
  assert.ok(s.slice(0,4).every(x=>x.path===null&&x.radius===null&&!/NaN|Infinity/.test(x.gapPath)));
  assert.equal(s[4].radius,26);assert.ok(s[4].path);
});
test('unavailable image values cannot become zero-brightness marks; empty sources have no fabricated sectors',()=>{
  const s=imageGrooveprint([{brightness:NaN},{brightness:Infinity},{brightness:-.1},{brightness:1.01},{brightness:0}]);
  assert.ok(s.slice(0,4).every(x=>x.path===null&&x.status==='outside-mapping'));assert.equal(s[4].radius,26);
  assert.deepEqual(imageGrooveprint([]),[]);assert.deepEqual(measurementGrooveprint([]),[]);
});
