// Loads NASA SVS 5313's change map and its twelve annual frames and analyses them in the
// browser. The change map is ready first; the decade follows without blocking it.
import {useEffect,useState} from 'react';
import {analyzePixels,computeCells,insetSummaries,regionStats,type Cell,type InsetSummary,type RegionStats} from './analyze.ts';
import {analyzeYear,frameUrl,YEARS,type YearField} from './decade.ts';
import {IMAGE_HEIGHT,IMAGE_WIDTH} from './layout.ts';
import {extractRamp,type RampSample} from './legend.ts';

export const CHANGE_MAP_URL='/nasa/svs5313/svs5313_eic_02599_print.jpg';

export type NightLightsModel={
  status:'loading'|'ready'|'error';
  error?:string;
  cells:readonly Cell[];
  insets:readonly InsetSummary[];
  overall:RegionStats|null;
  ramp:readonly RampSample[];
  decade:readonly YearField[]|null;
  decadeStatus:'loading'|'ready'|'error';
};

/** img.decode(), but never waits more than 2 s: hidden or background pages may defer decoding. */
function decoded(img:HTMLImageElement):Promise<unknown>{
  return Promise.race([img.decode?img.decode():Promise.resolve(),new Promise(r=>setTimeout(r,2000))]);
}

async function loadImage(src:string):Promise<HTMLImageElement>{
  const img=new Image();
  img.decoding='async';
  await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error(`${src} failed to load`));img.src=src;});
  await decoded(img).catch(()=>undefined);
  return img;
}

function pixels(img:HTMLImageElement):ImageData{
  const canvas=document.createElement('canvas');
  canvas.width=IMAGE_WIDTH;canvas.height=IMAGE_HEIGHT;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  ctx.drawImage(img,0,0,IMAGE_WIDTH,IMAGE_HEIGHT);
  return ctx.getImageData(0,0,IMAGE_WIDTH,IMAGE_HEIGHT);
}

/** Orange at the left end of NASA's legend, purple at the right: proof the pixels are real. */
function legendLooksRight(ramp:readonly RampSample[]):boolean{
  if(ramp.length<10)return false;
  const [r0,,b0]=ramp[0].rgb,[,g1,b1]=ramp[ramp.length-1].rgb;
  return r0>b0+60&&b1>g1+40;
}

const empty:NightLightsModel={status:'loading',cells:[],insets:[],overall:null,ramp:[],decade:null,decadeStatus:'loading'};

export function useNightLightsModel():NightLightsModel{
  const [model,setModel]=useState<NightLightsModel>(empty);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const img=await loadImage(CHANGE_MAP_URL);
        let raster:ImageData|null=null,ramp:RampSample[]=[];
        for(let attempt=0;attempt<5&&!raster;attempt++){
          const data=pixels(img);ramp=extractRamp(data);
          if(legendLooksRight(ramp))raster=data;else await new Promise(r=>setTimeout(r,150));
        }
        if(!raster)throw new Error('NASA’s legend could not be read from the decoded image.');
        const field=analyzePixels(raster,ramp);
        if(!alive)return;
        setModel({status:'ready',cells:computeCells(field),insets:insetSummaries(field),overall:regionStats(field,{x0:0,y0:0,x1:IMAGE_WIDTH-1,y1:IMAGE_HEIGHT-1}),ramp,decade:null,decadeStatus:'loading'});
        // The decade: one frame at a time, yielding between frames so the page stays responsive.
        const images=await Promise.all(YEARS.map(year=>loadImage(frameUrl(year))));
        const fields:YearField[]=[];
        for(let i=0;i<images.length;i++){
          fields.push(analyzeYear(pixels(images[i]),YEARS[i]));
          await new Promise(r=>setTimeout(r,0));
          if(!alive)return;
        }
        setModel(m=>({...m,decade:fields,decadeStatus:'ready'}));
      }catch(err){
        if(!alive)return;
        setModel(m=>m.status==='ready'?{...m,decadeStatus:'error'}:{...empty,status:'error',decadeStatus:'error',error:(err as Error).message});
      }
    })();
    return()=>{alive=false;};
  },[]);
  return model;
}
