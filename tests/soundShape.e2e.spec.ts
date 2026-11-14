import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

// Sound: Note by note (struck notes) vs Continuous (one gliding line). Counts what the audio graph does;
// Chromium renders to a silent fake output, so this checks behaviour, not how it sounds to a listener.
type Audit={osc:number;glides:number};
declare global{interface Window{shapeAudit:Audit}}
async function audit(page:Page){
  await page.addInitScript(()=>{
    // Count on the prototypes: WebKit may recreate an AudioParam's JS wrapper, dropping per-instance patches.
    // A glide is a target of 20 Hz or more; gains and pans never go above 1.
    window.shapeAudit={osc:0,glides:0};const P=AudioContext.prototype,create=P.createOscillator,target=AudioParam.prototype.setTargetAtTime;
    P.createOscillator=function(){window.shapeAudit.osc++;return create.call(this);};
    AudioParam.prototype.setTargetAtTime=function(v:number,t:number,c:number){if(v>=20)window.shapeAudit.glides++;return target.call(this,v,t,c);};
  });
}
const shape=(page:Page)=>page.getByRole('group',{name:'Sound: note by note or continuous'});
const reset=(page:Page)=>page.evaluate(()=>{window.shapeAudit.osc=0;window.shapeAudit.glides=0;});
const read=(page:Page)=>page.evaluate(()=>({...window.shapeAudit}));
async function perform(page:Page,mode:'Note by note'|'Continuous',ms:number){
  await shape(page).getByRole('button',{name:mode,exact:true}).click();
  await reset(page);await page.locator('.jb-play').click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  // Engines start on the audio clock, which can take a moment to begin (WebKit cold start): wait for real progress.
  if(mode==='Continuous')await expect.poll(async()=>(await read(page)).glides,{timeout:10_000}).toBeGreaterThanOrEqual(2);
  else{await expect.poll(async()=>(await read(page)).osc,{timeout:10_000}).toBeGreaterThan(0);await page.waitForTimeout(ms);}
  const result=await read(page);
  await page.locator('.jb-play').click();await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
  return result;
}

test('the Sound setting is one shared, remembered choice with an accessible control',async({page})=>{
  await page.goto('/listen');
  const notes=shape(page).getByRole('button',{name:'Note by note',exact:true}),flow=shape(page).getByRole('button',{name:'Continuous',exact:true});
  await expect(notes).toHaveAttribute('aria-pressed','true');await expect(flow).toHaveAttribute('aria-pressed','false');
  expect((await flow.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await flow.click();await expect(flow).toHaveAttribute('aria-pressed','true');
  await expect(shape(page).locator('[aria-live=polite]')).toHaveText('Sound: Continuous. One line that glides from value to value.');
  expect(await page.evaluate(()=>localStorage.getItem('terrajuke-articulation'))).toBe('flow');
  await page.getByRole('button',{name:'Select record: The Ice Year',exact:true}).click();
  await expect(shape(page).getByRole('button',{name:'Continuous',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(shape(page).getByRole('button',{name:'Continuous',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('blocked storage falls back to Note by note and still switches for the visit',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/listen');await expect(shape(page).getByRole('button',{name:'Note by note',exact:true})).toHaveAttribute('aria-pressed','true');
  await shape(page).getByRole('button',{name:'Continuous',exact:true}).click();await expect(shape(page).getByRole('button',{name:'Continuous',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});

const records=[
  {title:'Climate Spiral',ms:3000},{title:'Night Lights',ms:5000},{title:'The Air We Share',ms:2500},
  {title:'Currents of Heat',ms:2500},{title:'Moving Earth',ms:3000},{title:'The Ice Year',ms:3500},{title:'Temperature Through Time',ms:4500},
];
for(const r of records)test(`${r.title}: Continuous glides one voice; Note by note strikes new notes`,{tag:'@timing'},async({page})=>{
  test.setTimeout(45_000);await audit(page);await page.goto('/listen');
  await page.getByRole('button',{name:`Select record: ${r.title}`,exact:true}).click();
  await expect(page.locator('.jb-play')).toBeEnabled({timeout:15_000});
  const notes=await perform(page,'Note by note',r.ms),flow=await perform(page,'Continuous',r.ms);
  expect(notes.glides,'struck notes never glide').toBe(0);
  expect(flow.glides,'continuous glides between values').toBeGreaterThanOrEqual(2);
  expect(flow.osc,'continuous reuses its voices').toBeLessThan(notes.osc);
  await shape(page).getByRole('button',{name:'Note by note',exact:true}).click();
});
