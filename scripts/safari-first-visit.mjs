// Real Safari first-visit check via safaridriver (W3C WebDriver over HTTP). No dependencies.
// One-time setup: Safari → Settings → Advanced → Show features for web developers, then Developer → Allow remote automation.
// Run: npm run build && npx vite preview --port 4173, then `safaridriver -p 4444`, then `node scripts/safari-first-visit.mjs`.
// Evidence (screenshots + results JSON) goes to test-results/safari/. This is real Safari on macOS, not iPhone Safari.
import {mkdirSync,writeFileSync} from 'node:fs';
const W=process.env.SAFARIDRIVER_URL||'http://127.0.0.1:4444',APP=process.argv[2]||'http://127.0.0.1:4173/';
const OUT='test-results/safari/';mkdirSync(OUT,{recursive:true});
const ELEMENT='element-6066-11e4-a52e-4f735466cecf';
async function wd(method,path,body){
  const r=await fetch(W+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json();if(j.value&&j.value.error)throw new Error(`${path}: ${j.value.error} ${j.value.message}`);return j.value;
}
const hz=m=>440*2**((m-69)/12),IMAGE_HZ=[50,53,55,57,60,62,65,67,69,72,74].map(hz),MEAS_HZ=[48,50,52,55,57,60,62,64,67,69].map(hz);
const inScale=(s,v)=>s.some(f=>Math.abs(f-v)<.01);
const results=[];const check=(name,pass,detail)=>{results.push({name,pass:Boolean(pass),detail});console.log(`${pass?'PASS':'FAIL'}  ${name}${detail!==undefined?'  '+JSON.stringify(detail):''}`);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const session=await wd('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});
const S=`/session/${session.sessionId}`;
const js=(script,args=[])=>wd('POST',`${S}/execute/sync`,{script,args});
const find=async css=>(await wd('POST',`${S}/element`,{using:'css selector',value:css}))[ELEMENT];
const click=async css=>{const id=await find(css);await js(`arguments[0].scrollIntoView({block:'center'});`,[{[ELEMENT]:id}]);await sleep(150);try{return await wd('POST',`${S}/element/${id}/click`,{});}catch(e){throw new Error(css+' :: '+e.message);}};
const keys=async (css,text)=>wd('POST',`${S}/element/${await find(css)}/value`,{text});
const shot=async name=>{const b64=await wd('GET',`${S}/screenshot`);writeFileSync(`${OUT}safari-${name}.png`,Buffer.from(b64,'base64'));};
async function until(script,ms=8000,args=[]){const end=Date.now()+ms;let v;while(Date.now()<end){v=await js(script,args);if(v)return v;await sleep(120);}return v;}
const deck=()=>js(`const d=document.querySelector('.jb-deck');return {playing:d.classList.contains('is-playing'),serial:Number(d.dataset.noteSerial),hz:Number(d.dataset.frequency||0),readout:document.querySelector('.jb-readout').innerText,state:document.querySelector('.jb-state').innerText};`);
const grooves=()=>js(`return [...document.querySelectorAll('.jb-vinyl-fallback>.jb-grooveprint [data-groove-sector]')].map(n=>Number(n.getAttribute('data-groove-value')));`);

try{
  const ua=await js('return navigator.userAgent');console.log('UA',ua);
  await wd('POST',`${S}/window/rect`,{width:1280,height:900,x:40,y:40});
  // Cold loads: the first scan must never be all black.
  const loads=Number(process.argv[3]||10);let black=0,first=null;
  for(let i=0;i<loads;i++){
    await wd('POST',`${S}/url`,{url:APP+'?cold='+i+'-'+Date.now()});
    await until(`const b=document.querySelector('.jb-play');return b&&!b.disabled;`,15000);
    const v=await grooves();if(!first)first=v;if(Math.max(...v)<=.3||v.filter(x=>x===0).length>4)black++;
  }
  check(`first scan decoded on ${loads} cold loads`,black===0,{blackScans:black,loads});
  const ref='0.000 0.000 0.004 0.007 0.005 0.055 0.072 0.108 0.115 0.145 0.175 0.243 0.300 0.332 0.364 0.337 0.293 0.255 0.254 0.242 0.230 0.232 0.223 0.229 0.227 0.226 0.228 0.223 0.234 0.252 0.252 0.289 0.330 0.340 0.330 0.300 0.244 0.181 0.139 0.126 0.117 0.090 0.047 0.007 0.008 0.004 0.000 0.000'.split(' ').map(Number);
  const band=v=>Math.round(Math.max(0,Math.min(1,v))*10);
  const maxDelta=Math.max(...first.map((v,i)=>Math.abs(v-ref[i])));const crossings=first.map((v,i)=>band(v)!==band(ref[i])?i+1:null).filter(Boolean);
  check('Safari luma matches Playwright WebKit within one pitch band',crossings.length===0,{maxDelta:+maxDelta.toFixed(5),bandCrossings:crossings});

  await wd('POST',`${S}/url`,{url:APP});await until(`const b=document.querySelector('.jb-play');return b&&!b.disabled;`,15000);
  check('title is TerraJuke',(await wd('GET',`${S}/title`)).startsWith('TerraJuke'));
  await shot('1-home');
  // A1 Play / Stop on Side A.
  await click('.jb-play');
  const started=await until(`const d=document.querySelector('.jb-deck');return d.classList.contains('is-playing')&&Number(d.dataset.noteSerial)>0;`,8000);
  const a1=await deck();check('A1 Side A plays in real Safari audio',started&&inScale(IMAGE_HZ,a1.hz),a1);
  await sleep(2600);const a1b=await deck();check('A1 notes keep advancing on the audio clock',a1b.serial>a1.serial,{from:a1.serial,to:a1b.serial});
  await shot('2-side-a-playing');
  await click('.jb-play');await sleep(300);check('A1 Stop silences Side A',!(await deck()).playing);
  // A2 silent inspection then audition.
  try{await keys('.jb-groove-key>details>summary','\uE007');}catch{await js(`document.querySelector('.jb-groove-key>details>summary').click();`);}await sleep(300);
  if(!(await js(`return document.querySelector('.jb-groove-key>details').open;`)))await js(`document.querySelector('.jb-groove-key>details>summary').click();`);await sleep(200);
  const before=(await deck()).serial;
  const sliderCss='.jb-groove-key input[type=range]';
  await js(`document.querySelector(arguments[0]).focus();`,[sliderCss]);
  await wd('POST',`${S}/actions`,{actions:[{type:'key',id:'k',actions:[{type:'keyDown',value:'\uE010'},{type:'keyUp',value:'\uE010'}]}]});await sleep(400);
  const valuetext=await js(`return document.querySelector('.jb-groove-key input[type=range]')?.getAttribute('aria-valuetext');`);
  check('A2 inspector reads strip 48 silently',/^Image strip 48 \/ 48, .+% brightness, .+ Hz/.test(valuetext||'')&&(await deck()).serial===before,{valuetext});
  await click('.jb-groove-audition');
  const heard=await until(`const b=document.querySelector('.jb-groove-audition');const n=document.querySelector('.jb-scratch-notice,.jb-error');return b&&b.textContent.includes('Stop audition')?'playing':(n&&n.textContent.trim())||'';`,3000);
  check('A2 Hear selected strip starts one note',heard==='playing',{result:heard});
  await sleep(1200);
  // A3 flip during playback.
  await click('.jb-play');await until(`return document.querySelector('.jb-deck').classList.contains('is-playing');`,6000);
  await click('.jb-side-selector button:nth-child(2)');await sleep(500);
  const flipped=await js(`return {pressed:document.querySelector('.jb-side-selector button:nth-child(2)').getAttribute('aria-pressed'),playing:document.querySelector('.jb-deck').classList.contains('is-playing'),cue:document.querySelector('.jb-science-cue').innerText,provenance:document.querySelector('.jb-side-provenance')?.innerText};`);
  check('A3 flip stops Side A and selects Side B',flipped.pressed==='true'&&!flipped.playing,flipped);
  check('A4 measurement distinction is on screen',flipped.cue.includes('1951–1980')&&/not matched frame by frame/.test(flipped.provenance||''));
  const coil=await until(`return document.querySelector('.jb-side-content:not([hidden]) .jb-data-art')?.dataset.dataRenderer==='three';`,10000);
  check('Climate Coil renders with Safari WebGL',coil);
  await sleep(800);await shot('3-side-b-coil');
  await click('.jb-play');
  const b0=await until(`const d=document.querySelector('.jb-deck');return d.classList.contains('is-playing')&&Number(d.dataset.noteSerial)>0;`,8000);
  const b1=await deck();check('A3 Side B plays fixed-band January notes',b0&&inScale(MEAS_HZ,b1.hz),b1);
  const advanced=await until(`return document.querySelector('.jb-readout').innerText.includes('02 / 12');`,4500);
  check('A3 Side B advances to the second January',advanced);
  await sleep(600);await shot('4-side-b-playing');
  await click('.jb-play');
  await click('.jb-coil-toggle');await sleep(300);
  check('2D chart toggle works',await js(`const a=document.querySelector('.jb-side-content:not([hidden]) .jb-data-art');return a.dataset.dataRenderer==='2d'&&!!a.querySelector('svg[role=img]');`));
  const overflow=await js('return document.documentElement.scrollWidth-innerWidth');check('no sideways scroll at desktop width',overflow<=0,{overflow});
  // Narrow window, as close to a phone as Safari allows.
  await wd('POST',`${S}/window/rect`,{width:430,height:900});await sleep(600);
  const narrow=await js('return {innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,playBottom:Math.round(document.querySelector(".jb-play").getBoundingClientRect().bottom),innerHeight}');
  check('narrow Safari window has no sideways scroll',narrow.overflow<=0,narrow);
  await wd('POST',`${S}/url`,{url:APP});await until(`const b=document.querySelector('.jb-play');return b&&!b.disabled;`,15000);await sleep(400);await shot('5-narrow');
}catch(error){check('script error',false,String(error.message||error));}
finally{await wd('DELETE',S).catch(()=>{});}
writeFileSync(OUT+'safari-results.json',JSON.stringify(results,null,1));
const failed=results.filter(r=>!r.pass).length;console.log(`\n${results.length-failed} passed, ${failed} failed`);process.exit(failed?1:0);
