/** Still-image preflight. Native decoding remains the final validity check. */
export const IMAGE_LIMITS={bytes:10*1024*1024,edge:4096,pixels:12_600_000,aspect:8,decodeMs:10_000} as const;
export type ImageFormat='image/png'|'image/jpeg'|'image/webp';
export type ImageInfo={format:ImageFormat;width:number;height:number};
export type ImageProblem='format'|'bytes'|'dimensions'|'animated'|'invalid'|'decode';
export class PersonalImageError extends Error{
  constructor(public readonly problem:ImageProblem){super(problem);this.name='PersonalImageError';}
}
function fail(problem:ImageProblem):never{throw new PersonalImageError(problem);}
export function checkImageDimensions(width:number,height:number){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)fail('invalid');
  if(Math.max(width,height)>IMAGE_LIMITS.edge||width*height>IMAGE_LIMITS.pixels||Math.max(width/height,height/width)>IMAGE_LIMITS.aspect)fail('dimensions');
}
const supported=new Set<string>(['image/png','image/jpeg','image/webp']);
export function checkImageFile(file:Pick<Blob,'size'|'type'>){
  if(file.size>IMAGE_LIMITS.bytes)fail('bytes');
  if(!file.size)fail('invalid');
  if(file.type&&!supported.has(file.type))fail('format');
}
export function inspectImage(bytes:Uint8Array,mime=''):ImageInfo{
  checkImageFile({size:bytes.length,type:mime});
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const text=(at:number,size:number)=>String.fromCharCode(...bytes.subarray(at,at+size));
  const geometry=(width:number,height:number)=>{checkImageDimensions(width,height);return {width,height};};
  let result:ImageInfo;
  if(bytes.length>=24&&bytes[0]===137&&text(1,3)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10){
    if(view.getUint32(8)!==13||text(12,4)!=='IHDR')fail('invalid');
    result={format:'image/png',...geometry(view.getUint32(16),view.getUint32(20))};
    let at=8,data=false,end=false;
    while(at+12<=bytes.length){
      const length=view.getUint32(at),kind=text(at+4,4),next=at+12+length;
      if(next>bytes.length)fail('invalid');
      if(kind==='acTL')fail('animated');
      if(kind==='IDAT')data=true;
      if(kind==='IEND'){if(length!==0)fail('invalid');end=true;break;}
      at=next;
    }
    if(!data||!end)fail('invalid');
  }else if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216){
    let at=2,found:ImageInfo|undefined;
    while(at<bytes.length){
      if(bytes[at++]!==255)fail('invalid');
      while(bytes[at]===255)at++;
      const marker=bytes[at++];
      if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if(at+2>bytes.length)fail('invalid');
      const length=view.getUint16(at);
      if(length<2||at+length>bytes.length)fail('invalid');
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
        if(length<8)fail('invalid');
        found={format:'image/jpeg',...geometry(view.getUint16(at+5),view.getUint16(at+3))};
      }
      at+=length;
    }
    if(!found)fail('invalid');result=found;
  }else if(bytes.length>=20&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
    const end=view.getUint32(4,true)+8;if(end!==bytes.length)fail('invalid');
    let at=12,canvas:ReturnType<typeof geometry>|undefined,picture:ReturnType<typeof geometry>|undefined;
    const uint24=(offset:number)=>bytes[offset]+bytes[offset+1]*256+bytes[offset+2]*65536;
    while(at+8<=end){
      const kind=text(at,4),length=view.getUint32(at+4,true),start=at+8,next=start+length+(length%2);
      if(next>end)fail('invalid');
      if(kind==='ANIM'||kind==='ANMF')fail('animated');
      if(kind==='VP8X'){
        if(length!==10)fail('invalid');if(bytes[start]&2)fail('animated');
        canvas=geometry(1+uint24(start+4),1+uint24(start+7));
      }else if(kind==='VP8 '){
        if(length<10||text(start+3,3)!=='\x9d\x01\x2a')fail('invalid');
        picture=geometry(view.getUint16(start+6,true)&0x3fff,view.getUint16(start+8,true)&0x3fff);
      }else if(kind==='VP8L'){
        if(length<5||bytes[start]!==0x2f)fail('invalid');const packed=view.getUint32(start+1,true);
        picture=geometry(1+(packed&0x3fff),1+((packed>>>14)&0x3fff));
      }
      at=next;
    }
    if(at!==end||!picture)fail('invalid');
    if(canvas&&(canvas.width!==picture.width||canvas.height!==picture.height))fail('invalid');
    result={format:'image/webp',...(canvas??picture)};
  }else return fail('format');
  if(mime&&mime!==result.format)fail('format');
  return result;
}

/** Latest-wins ownership is also checked after an uncancellable browser callback. */
export class ImageSelection{
  private generation=0;
  private controller:AbortController|null=null;
  cancel(){this.generation++;this.controller?.abort();this.controller=null;}
  async load<T>(load:(signal:AbortSignal)=>Promise<T>,release:(value:T)=>void):Promise<T|null>{
    this.cancel();const token=this.generation,controller=new AbortController();this.controller=controller;
    try{
      const value=await load(controller.signal);
      if(token!==this.generation){release(value);return null;}
      return value;
    }catch(error){if(token!==this.generation)return null;throw error;}
    finally{if(token===this.generation)this.controller=null;}
  }
}

function readFile(file:File,signal:AbortSignal):Promise<ArrayBuffer>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    const abort=()=>reader.abort();
    const finish=()=>{signal.removeEventListener('abort',abort);reader.onload=reader.onerror=reader.onabort=null;};
    reader.onload=()=>{const value=reader.result;finish();if(value instanceof ArrayBuffer)resolve(value);else reject(new PersonalImageError('invalid'));};
    reader.onerror=()=>{finish();reject(new PersonalImageError('invalid'));};
    reader.onabort=()=>{finish();reject(new DOMException('Cancelled','AbortError'));};
    if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
    signal.addEventListener('abort',abort,{once:true});reader.readAsArrayBuffer(file);
  });
}
export type PersonalImage=ImageInfo&{id:number;url:string};
let identity=0;
export async function decodePersonalImage(file:File,signal:AbortSignal):Promise<PersonalImage>{
  checkImageFile(file);
  const info=inspectImage(new Uint8Array(await readFile(file,signal)),file.type);
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  const url=URL.createObjectURL(file);
  try{
    await new Promise<void>((resolve,reject)=>{
      const image=new Image();
      const finish=(error?:unknown)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=image.onerror=null;image.removeAttribute('src');if(error)reject(error);else resolve();};
      const abort=()=>finish(new DOMException('Cancelled','AbortError'));
      const timer=setTimeout(()=>finish(new PersonalImageError('decode')),IMAGE_LIMITS.decodeMs);
      image.onload=()=>{try{checkImageDimensions(image.naturalWidth,image.naturalHeight);finish();}catch(error){finish(error);}};
      image.onerror=()=>finish(new PersonalImageError('decode'));
      signal.addEventListener('abort',abort,{once:true});image.src=url;
    });
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    return {...info,id:++identity,url};
  }catch(error){URL.revokeObjectURL(url);throw error;}
}
