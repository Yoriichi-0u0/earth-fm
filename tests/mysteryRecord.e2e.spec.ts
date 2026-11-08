import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const recordTitles=['Climate Spiral','Moving Earth','Arctic September','Temperature Through Time'];

type Audit={contexts:AudioContext[];notes:number[];hold:boolean;fail:boolean;resumes:(()=>void)[]};
declare global{interface Window{mysteryAudit:Audit}}
const mystery=(page:Page)=>page.getByRole('region',{name:'Mystery Record',exact:true});
const play=(page:Page)=>mystery(page).getByRole('button',{name:/^(Play mystery|Replay)$/});
async function setup(page:Page,draw=0){
  await page.addInitScript(draw=>{
    Math.random=()=>draw;
    const audit:Audit={contexts:[],notes:[],hold:false,fail:false,resumes:[]};window.mysteryAudit=audit;
    const Context=AudioContext;window.AudioContext=class extends Context{
      constructor(){super();audit.contexts.push(this);}
      get state():AudioContextState{return audit.hold&&super.state!=='closed'?'suspended':super.state;}
      async resume(){if(audit.fail){audit.fail=false;throw new Error('Test: initialization denied');}await super.resume();if(audit.hold)await new Promise<void>(resolve=>audit.resumes.push(resolve));}
      createOscillator(){const osc=super.createOscillator(),start=osc.start.bind(osc),set=osc.frequency.setValueAtTime.bind(osc.frequency);let mapped:number|undefined;
        osc.frequency.setValueAtTime=(hz,at)=>{mapped=hz;return set(hz,at);};osc.start=(when)=>{audit.notes.push(mapped??osc.frequency.value);start(when);};return osc;}
    };
  },draw);
  await page.goto('/');
}
async function open(page:Page){await page.getByRole('button',{name:'Open Mystery Record',exact:true}).click();await expect(mystery(page)).toHaveAttribute('data-mystery-phase','concealed');await expect(play(page)).toBeEnabled();}
async function noPrematureIdentity(page:Page){
  const scene=mystery(page);
  await expect(scene.getByRole('img')).toHaveCount(0);await expect(scene.getByRole('link')).toHaveCount(0);
  const snapshot=await scene.ariaSnapshot();expect(snapshot).not.toMatch(/NASA|NSIDC|GISTEMP|January|September mean|brightness|temperature measurements|196\.00|million km/);
  await expect(scene.getByRole('radio')).toHaveCount(4);await expect(scene.getByRole('radio',{checked:true})).toHaveCount(0);
}

for(const [index,title] of recordTitles.entries())test(`${title} stays concealed, uses the original audio and reveals the exact source`,async({page})=>{
  const chunks:string[]=[];page.on('request',r=>{if(r.url().includes('/MysteryRecord'))chunks.push(r.url());});
  await setup(page,(index+.1)/4);await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();expect(chunks).toEqual([]);
  const record=await page.evaluate(async index=>{const path='/src/data/jukeboxRecords.ts';return (await import(path)).jukeboxRecords[index];},index);
  await page.getByRole('button',{name:'Select record: '+record.title,exact:true}).click();await page.getByRole('button',{name:'Play record',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.notes.length)).toBeGreaterThanOrEqual(5);
  const normal=await page.evaluate(()=>window.mysteryAudit.notes.slice(0,5));await page.getByRole('button',{name:'Stop',exact:true}).click();
  await open(page);expect(chunks.length).toBeGreaterThan(0);await noPrematureIdentity(page);
  await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.contexts.every(c=>c.state==='closed'))).toBe(true);
  await page.evaluate(()=>{window.mysteryAudit.notes=[];});await play(page).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.notes.length)).toBeGreaterThanOrEqual(5);
  expect(await page.evaluate(()=>window.mysteryAudit.notes.slice(0,5))).toEqual(normal);
  await expect(mystery(page).getByRole('status')).toContainText('Listening');
  const text=await mystery(page).innerText();expect(text).not.toMatch(/NSIDC|GISTEMP|NASA|January|°C|brightness/);
  await mystery(page).getByRole('radio',{name:record.title,exact:true}).check();await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();
  await expect(mystery(page)).toHaveAttribute('data-mystery-phase','revealed');await expect(mystery(page).getByRole('heading',{name:record.title,exact:true})).toBeFocused();
  await expect(mystery(page)).toContainText('Your pick matched this round.');await expect(mystery(page)).toContainText(record.kind==='visual'?'Visual sound':'Measurement sound');
  await expect(mystery(page).getByRole('link',{name:record.source,exact:false})).toHaveAttribute('href',record.sourceUrl);
  await expect(mystery(page)).toContainText(record.meaning);await expect(mystery(page).locator('.mr-media img,.mr-media video,.jb-data-art>svg[role=img]')).toBeVisible();await expect(mystery(page).getByRole('status')).toContainText('Ready to replay');
  const count=await page.evaluate(()=>window.mysteryAudit.notes.length);await page.waitForTimeout(650);expect(await page.evaluate(()=>window.mysteryAudit.notes.length)).toBe(count);
  await mystery(page).getByRole('button',{name:'Open full record',exact:true}).click();await expect(page.getByRole('heading',{name:record.title,exact:true})).toBeVisible();await expect(page.locator('.mr-record')).toHaveCount(0);await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

test('reveal can skip listening/guessing; another mystery resets the round and a different hunch has neutral feedback',async({page})=>{
  await setup(page);await open(page);expect(await page.evaluate(()=>window.mysteryAudit.contexts.length)).toBe(0);
  await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();await expect(mystery(page)).toContainText("Here's the source. Curiosity is the point.");expect(await page.evaluate(()=>window.mysteryAudit.contexts.length)).toBe(0);
  await mystery(page).getByRole('button',{name:'Try another mystery',exact:true}).click();await expect(mystery(page).getByRole('heading',{name:'Mystery Record',exact:true})).toBeFocused();await noPrematureIdentity(page);
  await mystery(page).getByRole('radio',{name:'Arctic September',exact:true}).check();await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();await expect(mystery(page).getByRole('heading',{name:'Moving Earth',exact:true})).toBeVisible();await expect(mystery(page)).toContainText('Another record was in the grooves. Meet its source.');await expect(mystery(page)).not.toContainText('incorrect');
});

test('Stop and Replay stay in the same round; another mystery, record switch and navigation close the old owner',async({page})=>{
  await setup(page,.6);await open(page);await play(page).click();await expect(mystery(page).getByRole('button',{name:'Stop mystery',exact:true})).toBeVisible();
  await mystery(page).getByRole('button',{name:'Stop mystery',exact:true}).click();await expect(mystery(page).getByRole('button',{name:'Replay',exact:true})).toBeEnabled();
  const first=await page.evaluate(()=>window.mysteryAudit.notes.slice(0,5));await page.evaluate(()=>{window.mysteryAudit.notes=[];});await mystery(page).getByRole('button',{name:'Replay',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.notes.length)).toBeGreaterThanOrEqual(5);expect(await page.evaluate(()=>window.mysteryAudit.notes.slice(0,5))).toEqual(first);
  await mystery(page).getByRole('button',{name:'Try another mystery',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.contexts.every(c=>c.state==='closed'))).toBe(true);await noPrematureIdentity(page);
  await play(page).click();await page.getByRole('button',{name:'Select record: Arctic September',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.contexts.every(c=>c.state==='closed'))).toBe(true);
  await open(page);await play(page).click();await page.getByRole('navigation').getByRole('link',{name:'Create',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.contexts.every(c=>c.state==='closed'))).toBe(true);
});

for(const draw of [0,.6])test(`pending ${draw===0?'visual':'measurement'} startup cannot revive after reveal, reroll or leaving Home`,async({page})=>{
  await setup(page,draw);await open(page);await page.evaluate(()=>{window.mysteryAudit.hold=true;});await play(page).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.resumes.length)).toBe(1);
  await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();await page.evaluate(()=>{window.mysteryAudit.hold=false;window.mysteryAudit.resumes.splice(0).forEach(resolve=>resolve());});await expect(mystery(page).getByRole('status')).toContainText('Ready to replay');expect(await page.evaluate(()=>window.mysteryAudit.notes)).toEqual([]);
  await mystery(page).getByRole('button',{name:'Try another mystery',exact:true}).click();await expect(play(page)).toBeEnabled();await page.evaluate(()=>{window.mysteryAudit.hold=true;});await play(page).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.resumes.length)).toBe(1);
  await mystery(page).getByRole('button',{name:'Try another mystery',exact:true}).click();await page.evaluate(()=>{window.mysteryAudit.hold=false;window.mysteryAudit.resumes.splice(0).forEach(resolve=>resolve());});await expect(play(page)).toBeEnabled();expect(await page.evaluate(()=>window.mysteryAudit.notes)).toEqual([]);
  await page.evaluate(()=>{window.mysteryAudit.hold=true;});await play(page).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.resumes.length)).toBe(1);await page.getByRole('navigation').getByRole('link',{name:'Explore Data',exact:true}).click();await page.evaluate(()=>window.mysteryAudit.resumes.splice(0).forEach(resolve=>resolve()));await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.contexts.every(c=>c.state==='closed'))).toBe(true);expect(await page.evaluate(()=>window.mysteryAudit.notes)).toEqual([]);
});

test('a hidden tab stops sound without resuming; appearance/language preserve the current round and active owner',async({page})=>{
  await setup(page,.6);await open(page);await mystery(page).getByRole('radio',{name:'Climate Spiral',exact:true}).check();await play(page).click();
  const contexts=await page.evaluate(()=>window.mysteryAudit.contexts.length);
  await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption('light');await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption('dark');await expect(mystery(page).getByRole('button',{name:'Stop mystery',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.mysteryAudit.contexts.length)).toBe(contexts);
  await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('zh');const zh=page.getByRole('region',{name:'神秘唱片',exact:true});await expect(zh.getByRole('button',{name:'停止神秘唱片',exact:true})).toBeVisible();await expect(zh.getByRole('radio',{name:'气候螺旋',exact:true})).toBeChecked();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(zh.getByRole('button',{name:'重播',exact:true})).toBeVisible();const count=await page.evaluate(()=>window.mysteryAudit.notes.length);
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(600);expect(await page.evaluate(()=>window.mysteryAudit.notes.length)).toBe(count);await zh.getByRole('button',{name:'揭晓来源',exact:true}).click();await expect(zh).toContainText('NSIDC');
});

test('audio initialization and missing imagery fail neutrally and keep Reveal available',async({page})=>{
  await setup(page,.6);await open(page);await page.evaluate(()=>{window.mysteryAudit.fail=true;});await play(page).click();await expect(mystery(page).getByRole('alert')).toContainText('could not play');expect(await mystery(page).getByRole('alert').innerText()).not.toMatch(/NSIDC|sea.ice|Arctic/);await play(page).click();await expect(mystery(page).getByRole('button',{name:'Stop mystery',exact:true})).toBeVisible();
  await page.route('**/frames/climate-spiral-svs5190-2026-10-18.jpg',route=>route.abort());await page.evaluate(()=>{Math.random=()=>0;});await mystery(page).getByRole('button',{name:'Try another mystery',exact:true}).click();await expect(mystery(page).getByRole('alert')).toBeVisible();await expect(play(page)).toBeDisabled();await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();await expect(mystery(page).getByRole('link',{name:'NASA SVS 5190',exact:false})).toBeVisible();
});

test('a stalled initialization is bounded by the 30-second guard and late resolution stays cancelled',async({page})=>{
  await setup(page);await open(page);await page.clock.install();await page.evaluate(()=>{window.mysteryAudit.hold=true;});await play(page).click();await expect.poll(()=>page.evaluate(()=>window.mysteryAudit.resumes.length)).toBe(1);await page.clock.runFor(30_050);await expect(mystery(page).getByRole('status')).toContainText('Excerpt stopped');await page.evaluate(()=>{window.mysteryAudit.hold=false;window.mysteryAudit.resumes.splice(0).forEach(resolve=>resolve());});expect(await page.evaluate(()=>window.mysteryAudit.notes)).toEqual([]);
});

test('the generated measurement performance ends naturally and can be replayed',async({page})=>{
  test.setTimeout(35_000);await setup(page,.9);await open(page);await play(page).click();await expect(mystery(page).getByRole('status')).toContainText('Ready to replay',{timeout:27_000});await expect(mystery(page).getByRole('button',{name:'Replay',exact:true})).toBeEnabled();
  await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();await expect(mystery(page).locator('.mr-observation-label')).toHaveText('Last heard observation');await expect(mystery(page).locator('.jb-data-value>span')).toHaveText('January 2025');
});

test('guesses, rerolls and reveals stay in session memory without score or network writes',async({page})=>{
  const posts:string[]=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))posts.push(r.url());});await setup(page);await open(page);
  const storage=()=>page.evaluate(async()=>({local:{...localStorage},session:{...sessionStorage},databases:await indexedDB.databases(),caches:await caches.keys()}));const before=await storage();
  await mystery(page).getByRole('radio',{name:'Moving Earth',exact:true}).check();await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();await mystery(page).getByRole('button',{name:'Try another mystery',exact:true}).click();expect(await storage()).toEqual(before);expect(posts).toEqual([]);await expect(mystery(page).getByRole('radio',{checked:true})).toHaveCount(0);
});

for(const theme of ['light','dark'] as const)test(`${theme} mystery is accessible, keyboard usable and responsive before and after reveal`,async({page})=>{
  test.setTimeout(60_000);await setup(page,.6);await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);await open(page);
  for(const phase of ['concealed','revealed']){
    if(phase==='revealed')await mystery(page).getByRole('button',{name:'Reveal source',exact:true}).click();
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:844,height:390}]){
      await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(const b of await mystery(page).getByRole('button').all()){const bounds=await b.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);}
      if([390,768,1440].includes(viewport.width))await test.info().attach(`mystery-${phase}-${viewport.width}-${theme}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
    }
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    await test.info().attach(`mystery-axe-${phase}-${theme}`,{body:JSON.stringify({violations:scan.violations,contrastIncomplete:scan.incomplete.filter(v=>v.id==='color-contrast').map(v=>v.nodes.map(n=>n.target))}),contentType:'application/json'});
    if(phase==='concealed'){
      await mystery(page).getByRole('radio',{name:'Climate Spiral',exact:true}).focus();await page.keyboard.press('ArrowDown');await expect(mystery(page).getByRole('radio',{name:'Moving Earth',exact:true})).toBeChecked();
      expect(await mystery(page).locator('.mr-grooves').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
    }
  }
});
