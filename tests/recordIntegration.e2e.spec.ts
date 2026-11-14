import {test,expect} from '@playwright/test';
import {warmInstrument} from './instrumentWarmup';
import {appearanceButton,appearanceGroup,chooseAppearance} from './appearanceControl';
import type {Page} from '@playwright/test';
import {resolve} from 'node:path';
import AxeBuilder from '@axe-core/playwright';

type Audit={contexts:AudioContext[];notes:number;holdAudio:boolean;resumes:(()=>void)[];holdImages:boolean;loads:(()=>void)[];created:string[];revoked:string[]};
declare global{interface Window{integrationAudit:Audit}}
const image=(extension='png')=>resolve(`tests/fixtures/personal-gradient.${extension}`);
const mystery=(page:Page)=>page.getByRole('region',{name:'Mystery Record',exact:true});
const loop=(page:Page)=>page.getByRole('region',{name:'Earth Looper',exact:true});
const selectImage=(page:Page,extension='png')=>page.getByLabel('Choose a personal image',{exact:true}).setInputFiles(image(extension));
async function upload(page:Page,extension='png'){
  await selectImage(page,extension);
  await expect(page.getByRole('heading',{name:'Your Record',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
}
async function openMystery(page:Page){
  await page.getByRole('button',{name:'Open Mystery Record',exact:true}).click();
  await expect(mystery(page).getByRole('button',{name:'Play mystery',exact:true})).toBeEnabled();
}
async function setup(page:Page,draw=.6){
  await page.addInitScript(draw=>{
    Math.random=()=>draw;
    const audit:Audit={contexts:[],notes:0,holdAudio:false,resumes:[],holdImages:false,loads:[],created:[],revoked:[]};window.integrationAudit=audit;
    const Context=AudioContext;
    window.AudioContext=class extends Context{
      constructor(){super();audit.contexts.push(this);}
      get state():AudioContextState{return audit.holdAudio&&super.state!=='closed'?'suspended':super.state;}
      async resume(){await super.resume();if(audit.holdAudio)await new Promise<void>(resolve=>audit.resumes.push(resolve));}
      createOscillator(){const osc=super.createOscillator(),start=osc.start.bind(osc);osc.start=when=>{audit.notes++;start(when);};return osc;}
    };
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=value=>{const url=create(value);audit.created.push(url);return url;};
    URL.revokeObjectURL=url=>{audit.revoked.push(url);revoke(url);};
    const NativeImage=Image;
    window.Image=class extends NativeImage{
      get src(){return super.src;}
      set src(value:string){if(value.startsWith('blob:')&&audit.holdImages){const callback=this.onload;audit.loads.push(()=>callback?.call(this,new Event('load')));return;}super.src=value;}
    };
  },draw);
  await page.goto('/listen');
}
async function closed(page:Page){await expect.poll(()=>page.evaluate(()=>window.integrationAudit.contexts.every(c=>c.state==='closed'))).toBe(true);}
async function noLateNotes(page:Page){const count=await page.evaluate(()=>window.integrationAudit.notes);await page.waitForTimeout(650);expect(await page.evaluate(()=>window.integrationAudit.notes)).toBe(count);}
async function releaseAudio(page:Page){await page.evaluate(()=>{window.integrationAudit.holdAudio=false;window.integrationAudit.resumes.splice(0).forEach(resolve=>resolve());});}

test('normal → mystery → personal → mystery → original keeps exactly one owner and correct attribution',async({page})=>{
  await setup(page);
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await openMystery(page);await closed(page);await noLateNotes(page);
  await mystery(page).getByRole('button',{name:'Play mystery',exact:true}).click();
  await expect(mystery(page).getByRole('status')).toContainText('Listening');
  await upload(page);await closed(page);await noLateNotes(page);
  const url=await page.locator('.jb-media img').getAttribute('src');
  await expect(page.locator('.jb-deck')).toContainText('not NASA imagery or scientific measurements');
  await expect(page.locator('.jb-deck .jb-source a')).toHaveCount(0);
  await page.getByRole('button',{name:'Play record',exact:true}).click();
  await openMystery(page);await closed(page);await noLateNotes(page);
  // The accepted image stays in Home memory; its previous transport is gone.
  await expect(page.locator('.jb-personal-heading img')).toHaveAttribute('src',url!);
  await mystery(page).getByRole('button',{name:'Play mystery',exact:true}).click();
  await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();
  await expect(mystery(page)).toContainText('Measurement sound');
  await expect(mystery(page).getByRole('link',{name:/NSIDC/})).toHaveAttribute('href','https://doi.org/10.7265/N5K072F8');
  await mystery(page).getByRole('button',{name:'Open full record',exact:true}).click();
  await closed(page);await noLateNotes(page);
  await expect(page.getByRole('heading',{name:'Arctic September',exact:true})).toBeVisible();
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
  await expect(page.locator('.jb-record')).toHaveCount(7);
  await page.getByRole('button',{name:'Your Record',exact:true}).click();
  await expect(page.locator('.jb-media img')).toHaveAttribute('src',url!);
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

test('opening a mystery cancels pending personal decoding and ignores its late callback',async({page})=>{
  await setup(page);await upload(page);const accepted=await page.locator('.jb-media img').getAttribute('src');
  await page.evaluate(()=>{window.integrationAudit.holdImages=true;});await selectImage(page,'jpg');
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.loads.length)).toBe(1);
  await openMystery(page);
  await page.evaluate(()=>{window.integrationAudit.holdImages=false;window.integrationAudit.loads.splice(0).forEach(fn=>fn());});
  await expect(mystery(page)).toHaveAttribute('data-mystery-phase','concealed');
  await expect(page.locator('.jb-personal-heading img')).toHaveAttribute('src',accepted!);
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.created.filter(url=>url!==document.querySelector<HTMLImageElement>('.jb-personal-heading img')?.src).every(url=>window.integrationAudit.revoked.includes(url)))).toBe(true);
  await page.getByRole('button',{name:'Your Record',exact:true}).click();await expect(page.locator('.jb-media img')).toHaveAttribute('src',accepted!);
});

test('replacement during audio initialization and pending startup in both directions cannot revive an owner',async({page})=>{
  await setup(page);await upload(page);
  await page.evaluate(()=>{window.integrationAudit.holdAudio=true;});await page.getByRole('button',{name:'Play record',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.resumes.length)).toBe(1);
  await upload(page,'jpg');await releaseAudio(page);await closed(page);expect(await page.evaluate(()=>window.integrationAudit.notes)).toBe(0);
  await page.evaluate(()=>{window.integrationAudit.holdAudio=true;});await page.getByRole('button',{name:'Play record',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.resumes.length)).toBe(1);
  await openMystery(page);await releaseAudio(page);await closed(page);expect(await page.evaluate(()=>window.integrationAudit.notes)).toBe(0);
  await page.evaluate(()=>{window.integrationAudit.holdAudio=true;});await mystery(page).getByRole('button',{name:'Play mystery',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.resumes.length)).toBe(1);
  await page.getByRole('button',{name:'Your Record',exact:true}).click();await releaseAudio(page);await closed(page);await noLateNotes(page);
  expect(await page.evaluate(()=>window.integrationAudit.notes)).toBe(0);
});

for(const mode of ['playback','replay'])test(`Remove during personal ${mode} cancels sound and releases the image before Mystery`,{tag:'@timing'},async({page})=>{
  await setup(page);await upload(page);
  if(mode==='playback')await page.getByRole('button',{name:'Play record',exact:true}).click();
  else{
    await page.getByRole('button',{name:'Scratch your image',exact:true}).click();
    await warmInstrument(page);await loop(page).getByRole('button',{name:'Record',exact:true}).click();
    for(const [i,position] of ['12','31','7'].entries()){
      await page.getByRole('slider',{name:'Image scan position',exact:true}).fill(position);
      await expect(loop(page)).toHaveAttribute('data-loop-count',String(i+1));await page.waitForTimeout(180);
    }
    await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
    await loop(page).getByRole('button',{name:'Replay take',exact:true}).click();
    await expect(loop(page)).toHaveAttribute('data-loop-phase','replaying');
  }
  await page.getByRole('button',{name:'Remove',exact:true}).click();await closed(page);await noLateNotes(page);
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.created.every(url=>window.integrationAudit.revoked.includes(url)))).toBe(true);
  await expect(page.getByRole('heading',{name:'Climate Spiral',exact:true})).toBeVisible();
  await openMystery(page);await expect(page.getByRole('button',{name:'Your Record',exact:true})).toHaveCount(0);
});

test('appearance changes preserve a personal take, then preserve the active mystery and its guess',{tag:'@timing'},async({page})=>{
  await setup(page);await upload(page);await page.getByRole('button',{name:'Scratch your image',exact:true}).click();
  await loop(page).getByRole('button',{name:'Record',exact:true}).click();await page.getByRole('slider',{name:'Image scan position',exact:true}).fill('31');
  await expect(loop(page)).toHaveAttribute('data-loop-count','1');await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
  await chooseAppearance(page,'light');
  
  await expect(page.getByRole('region',{name:'Earth Looper',exact:true})).toHaveAttribute('data-loop-count','1');
  
  await openMystery(page);await closed(page);
  await mystery(page).getByRole('radio',{name:'Moving Earth',exact:true}).check();await mystery(page).getByRole('button',{name:'Play mystery',exact:true}).click();
  const contexts=await page.evaluate(()=>window.integrationAudit.contexts.length);
  await chooseAppearance(page,'dark');
  
  const zh=page.getByRole('region',{name:'Mystery Record',exact:true});await expect(zh.getByRole('button',{name:'Stop mystery',exact:true})).toBeVisible();
  await expect(zh.getByRole('radio',{name:'Moving Earth',exact:true})).toBeChecked();
  expect(await page.evaluate(()=>window.integrationAudit.contexts.length)).toBe(contexts);
  await page.getByRole('button',{name:'Your Record',exact:true}).click();await closed(page);await noLateNotes(page);
  await expect(page.getByRole('heading',{name:'Your Record',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Scratch your image',exact:true}).click();
  // Leaving a deck clears its take; changing the theme within it does not.
  await expect(page.getByRole('region',{name:'Earth Looper',exact:true})).toHaveAttribute('data-loop-count','0');
});

for(const owner of ['personal','mystery'])test(`leaving Home during ${owner} playback closes audio and forgets personal data`,async({page})=>{
  await setup(page);await upload(page);
  if(owner==='mystery'){await openMystery(page);await mystery(page).getByRole('button',{name:'Play mystery',exact:true}).click();}
  else await page.getByRole('button',{name:'Play record',exact:true}).click();
  await page.getByRole('link',{name:'About & sources',exact:true}).click();
  await closed(page);await noLateNotes(page);
  await expect.poll(()=>page.evaluate(()=>window.integrationAudit.created.every(url=>window.integrationAudit.revoked.includes(url)))).toBe(true);
  await page.getByRole('navigation').getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.getByRole('button',{name:'Your Record',exact:true})).toHaveCount(0);
  await expect(page.locator('.mr-record')).toHaveCount(0);
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

for(const [draw,second] of [[.6,'September 1990'],[.9,'January 1900']] as const)test(`measurement reveal retains ${second} on reveal/Stop; a silent reveal labels the starting point`,async({page})=>{
  await setup(page,draw);await openMystery(page);
  await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();
  await expect(mystery(page).locator('.mr-observation-label')).toHaveText('Starting observation · no note heard yet');
  expect(await page.evaluate(()=>window.integrationAudit.notes)).toBe(0);
  await page.reload();await openMystery(page);await mystery(page).getByRole('button',{name:'Play mystery',exact:true}).click();
  await expect(mystery(page).getByRole('status')).toContainText('Listening');
  // At 60 BPM the unchanged engine advances observations every two seconds.
  await page.waitForTimeout(2500);
  if(draw===.9)await mystery(page).getByRole('button',{name:'Stop mystery',exact:true}).click();
  await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();
  await expect(mystery(page).locator('.mr-observation-label')).toHaveText('Last heard observation');
  await expect(mystery(page).locator('.jb-data-value>span')).toHaveText(second);
  
  await expect(page.locator('.mr-observation-label')).toHaveText('Last heard observation');
});

for(const theme of ['light','dark'] as const)test(`${theme} integrated Home keeps both optional entries usable at six viewports`,{tag:'@full'},async({page})=>{
  test.setTimeout(60_000);await setup(page);
  await chooseAppearance(page,theme);
  for(const mode of ['curated','mystery','personal']){
    if(mode==='mystery')await openMystery(page);
    if(mode==='personal')await upload(page);
    for(const language of ['en']){
      
      for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:844,height:390}]){
        await page.setViewportSize(viewport);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        for(const button of await page.locator('.jb-mystery-entry,.jb-personal-actions button').all()){
          const bounds=(await button.boundingBox())!;
          expect(bounds.height).toBeGreaterThanOrEqual(44);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width+1);
        }
        if(language==='en'&&[390,768,1440].includes(viewport.width)){
          const path=test.info().outputPath(`integrated-${mode}-${viewport.width}-${theme}.png`);
          await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path,fullPage:true});await test.info().attach(`integrated-${mode}-${viewport.width}-${theme}`,{path,contentType:'image/png'});
        }
      }
      
    }
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    await test.info().attach(`integrated-axe-${mode}-${theme}`,{body:JSON.stringify({violations:scan.violations,contrastIncomplete:scan.incomplete.filter(v=>v.id==='color-contrast').map(v=>v.nodes.map(n=>n.target))}),contentType:'application/json'});
    await page.locator('.jb-mystery-entry').focus();await expect(page.locator('.jb-mystery-entry')).toBeFocused();
    if(mode!=='personal')await page.getByRole('button',{name:'Choose image',exact:true}).focus();
  }
});
