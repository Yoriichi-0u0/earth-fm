import test from 'node:test';
import assert from 'node:assert/strict';
import {IMAGE_LIMITS,ImageSelection,PersonalImageError,checkImageDimensions,checkImageFile,inspectImage} from '../src/lib/personalImage';

const png=(width=4032,height=3024)=>{
  // Header-only fixture: preflight is intentionally not a replacement for decoding/CRC checks.
  const bytes=new Uint8Array(57),view=new DataView(bytes.buffer);
  bytes.set([137,80,78,71,13,10,26,10]);view.setUint32(8,13);bytes.set(Buffer.from('IHDR'),12);view.setUint32(16,width);view.setUint32(20,height);bytes.set(Buffer.from('IDAT'),37);bytes.set(Buffer.from('IEND'),49);return bytes;
};
const problem=(kind:string)=>(error:unknown)=>error instanceof PersonalImageError&&error.problem===kind;
test('common phone images fit; decoded geometry and encoded bytes are bounded independently',()=>{
  assert.deepEqual(inspectImage(png()),{format:'image/png',width:4032,height:3024});
  assert.doesNotThrow(()=>checkImageDimensions(4096,3072));
  for(const size of [[4097,1],[4096,4096],[9,1],[1,9]])assert.throws(()=>checkImageDimensions(...size as [number,number]),problem('dimensions'));
  assert.throws(()=>checkImageDimensions(0,2),problem('invalid'));
  assert.throws(()=>checkImageFile({size:IMAGE_LIMITS.bytes+1,type:'image/png'}),problem('bytes'));
  assert.throws(()=>checkImageFile({size:0,type:''}),problem('invalid'));
});
test('signature, MIME, truncated chunks and animated PNG are rejected before decoding',()=>{
  assert.throws(()=>inspectImage(png(),'image/jpeg'),problem('format'));
  assert.throws(()=>inspectImage(new Uint8Array([1,2,3]),'image/png'),problem('format'));
  assert.throws(()=>inspectImage(png().subarray(0,50)),problem('invalid'));
  const animated=png();animated.set(Buffer.from('acTL'),37);assert.throws(()=>inspectImage(animated),problem('animated'));
  assert.throws(()=>checkImageFile({size:100,type:'image/svg+xml'}),problem('format'));
});
test('JPEG SOF dimensions work with metadata segments; huge or truncated SOFs fail',()=>{
  const jpeg=Uint8Array.from([255,216,255,225,0,4,0,0,255,194,0,8,8,0,80,0,100,1,255,218]);
  assert.deepEqual(inspectImage(jpeg,'image/jpeg'),{format:'image/jpeg',width:100,height:80});
  jpeg[15]=0x20;assert.throws(()=>inspectImage(jpeg),problem('dimensions'));
  assert.throws(()=>inspectImage(jpeg.subarray(0,12)),problem('invalid'));
});
const webp=(extended=false)=>{
  const bytes=new Uint8Array(extended?48:30),v=new DataView(bytes.buffer);bytes.set(Buffer.from('RIFF'));v.setUint32(4,bytes.length-8,true);bytes.set(Buffer.from('WEBP'),8);
  let at=12;if(extended){bytes.set(Buffer.from('VP8X'),at);v.setUint32(at+4,10,true);bytes[at+12]=99;bytes[at+15]=79;at+=18;}
  bytes.set(Buffer.from('VP8 '),at);v.setUint32(at+4,10,true);bytes.set([157,1,42],at+11);v.setUint16(at+14,100,true);v.setUint16(at+16,80,true);return bytes;
};
test('WebP validates actual frame dimensions as well as the extended canvas and rejects animation',()=>{
  for(const bytes of [webp(),webp(true)])assert.deepEqual(inspectImage(bytes),{format:'image/webp',width:100,height:80});
  const animated=webp(true);animated[20]=2;assert.throws(()=>inspectImage(animated),problem('animated'));
  const huge=webp(true);new DataView(huge.buffer).setUint16(44,8192,true);assert.throws(()=>inspectImage(huge),problem('dimensions'));
  const mismatch=webp(true);mismatch[24]=98;assert.throws(()=>inspectImage(mismatch),problem('invalid'));
  assert.throws(()=>inspectImage(webp().subarray(0,29)),problem('invalid'));
  const lossless=new Uint8Array(26),v=new DataView(lossless.buffer);lossless.set(Buffer.from('RIFF'));v.setUint32(4,18,true);lossless.set(Buffer.from('WEBPVP8L'),8);v.setUint32(16,5,true);lossless[20]=47;v.setUint32(21,99|(79<<14),true);
  assert.deepEqual(inspectImage(lossless),{format:'image/webp',width:100,height:80});
});
test('latest source wins even when a decoder ignores cancellation; superseded resources are released',async()=>{
  const selection=new ImageSelection(),released:string[]=[];let finish!:(value:string)=>void,oldSignal:AbortSignal|undefined;
  const first=selection.load(signal=>{oldSignal=signal;return new Promise(resolve=>{finish=resolve;});},value=>released.push(value));
  assert.equal(await selection.load(async()=> 'new',value=>released.push(value)),'new');assert.equal(oldSignal?.aborted,true);
  finish('old');assert.equal(await first,null);assert.deepEqual(released,['old']);
  const removed=selection.load(()=>new Promise(resolve=>{finish=resolve as typeof finish;}),value=>released.push(String(value)));
  selection.cancel();finish('removed');assert.equal(await removed,null);assert.deepEqual(released,['old','removed']);
});
