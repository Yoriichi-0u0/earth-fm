import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type GrooveAudit={contexts:AudioContext[];notes:number[];reads:number;hold:boolean;resumes:(()=>void)[];replayed:number[]};
declare global{interface Window{grooveAudit:GrooveAudit}}
const print=(page:Page)=>page.locator('.jb-vinyl-fallback>.jb-grooveprint');
const loop=(page:Page)=>page.getByRole('region',{name:'Earth Looper',exact:true});
async function setup(page:Page){
  await page.addInitScript(()=>{
    const audit:GrooveAudit={contexts:[],notes:[],reads:0,hold:false,resumes:[],replayed:[]};window.grooveAudit=audit;
    const Context=AudioContext;
    window.AudioContext=class extends Context{
      constructor(){super();audit.contexts.push(this);}
      get state():AudioContextState{return audit.hold&&super.state!=='closed'?'suspended':super.state;}
      async resume(){await super.resume();if(audit.hold)await new Promise<void>(resolve=>audit.resumes.push(resolve));}
      createOscillator(){const oscillator=super.createOscillator(),set=oscillator.frequency.setValueAtTime.bind(oscillator.frequency),start=oscillator.start.bind(oscillator);let mapped:number|undefined;oscillator.frequency.setValueAtTime=(hz,at)=>{mapped=hz;return set(hz,at);};oscillator.start=when=>{audit.notes.push(mapped??oscillator.frequency.value);start(when);};return oscillator;}
    };
    const read=CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData=function(...args:Parameters<typeof read>){audit.reads++;return read.apply(this,args);};
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
}

for(const theme of ['light','dark'] as const)test(`${theme} Climate vinyl visual comparison on desktop and phone`,async({page})=>{
  await page.goto('/');await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    for(const side of ['a','b']){
      await page.getByRole('button',{name:side==='a'?'Side A: hear the picture':'Side B: hear the measurements',exact:true}).click();
      await expect(page.locator('.jb-deck')).toHaveAttribute('data-record-side',side);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.evaluate(()=>scrollTo(0,0));
      for(const detail of ['page','vinyl']){
        const path=test.info().outputPath(`${theme}-${viewport.width}-side-${side}-${detail}.png`);
        if(detail==='page')await page.screenshot({path,fullPage:true});else await page.locator('.jb-earth-record').screenshot({path});
        await test.info().attach(`${theme}-${viewport.width}-side-${side}-${detail}`,{path,contentType:'image/png'});
      }
    }
  }
});

test('both patterns reuse the source values and fixed sound mapping without extra image reads',async({page})=>{
  await setup(page);await expect(print(page)).toHaveAttribute('data-groove-count','48');
  const data=await print(page).locator('[data-groove-sector]').evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-groove-value'))));
  expect(data).toHaveLength(48);expect(data.every(n=>n>=0&&n<=1)).toBe(true);
  const expected=await page.evaluate(async value=>{const path='/src/lib/audio.ts';return (await import(path)).mapValueToNote(value,0,1).frequency;},data[0]);
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.grooveAudit.notes.length)).toBeGreaterThan(0);
  // The unchanged ambient engine starts two artistic drone oscillators before the data melody.
  await expect.poll(()=>page.evaluate(()=>window.grooveAudit.notes.length)).toBeGreaterThanOrEqual(3);
  expect(await page.evaluate(()=>window.grooveAudit.notes[2])).toBeCloseTo(expected,3);
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  const reads=await page.evaluate(()=>window.grooveAudit.reads);
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).click();
  await expect(print(page)).toHaveAttribute('data-groove-count','12');
  const actual=await print(page).locator('[data-groove-sector]').evaluateAll(nodes=>nodes.map(n=>({value:Number(n.getAttribute('data-groove-value')),band:Number(n.getAttribute('data-groove-band'))})));
  const sequence=await page.evaluate(async()=>{const path='/src/lib/jukeboxData.ts',mapping='/src/lib/symphony.ts';const {points,pitches}=(await import(path)).measurementSequence('temperature');const {mapData}=await import(mapping);return{pitches,values:points.map((p:{value:number})=>p.value),bands:points.map((p:{value:number})=>mapData({...p,anomaly:p.value}).bandIndex)};});
  expect(actual.map(p=>p.value)).toEqual(sequence.values);expect(actual.map(p=>p.band)).toEqual(sequence.bands);
  await page.locator('.jb-groove-key summary').click();await expect(page.getByRole('img',{name:'Enlarged measurement grooveprint',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.grooveAudit.reads)).toBe(reads);
  await page.getByRole('checkbox',{name:'Hear Data Only',exact:true}).check();await page.evaluate(()=>{window.grooveAudit.notes=[];});
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.grooveAudit.notes.length)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.grooveAudit.notes[0])).toBeCloseTo(sequence.pitches[0]!,4);
  // Hiding the SVG does not stop the original observation/audio clock.
  await page.evaluate(()=>{document.querySelector<SVGElement>('.jb-vinyl-fallback>.jb-grooveprint')!.style.visibility='hidden';});
  await expect(print(page)).toHaveAttribute('data-groove-index','1',{timeout:3500});
  await page.getByRole('button',{name:'Stop',exact:true}).click();await expect(print(page)).toHaveAttribute('data-groove-index','0');
});

test('Scratch and Looper move the same sector; switching sources removes the old pattern and take',async({page})=>{
  await setup(page);const initial=await print(page).locator('.gg-mark').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
  await page.getByRole('button',{name:'Play with Earth',exact:true}).click();
  await loop(page).getByRole('button',{name:'Record',exact:true}).click();
  for(const [i,position] of [12,37,5].entries()){
    await page.getByRole('slider',{name:'Image scan position',exact:true}).fill(String(position));
    await expect(loop(page)).toHaveAttribute('data-loop-count',String(i+1));await expect(print(page)).toHaveAttribute('data-groove-index',String(position-1));await page.waitForTimeout(180);
    const brightness=Number(await page.locator('.jb-scratch').getAttribute('data-scratch-brightness'));
    expect(Number(await print(page).locator(`[data-groove-sector="${position-1}"]`).getAttribute('data-groove-value'))).toBeCloseTo(brightness,5);
  }
  await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
  await page.evaluate(()=>{const svg=document.querySelector('.jb-vinyl-fallback>.jb-grooveprint')!;new MutationObserver(()=>window.grooveAudit.replayed.push(Number(svg.getAttribute('data-groove-index')))).observe(svg,{attributes:true,attributeFilter:['data-groove-index']});});
  await loop(page).getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop(page).getByRole('status')).toHaveText('Your take has finished.');
  expect(await page.evaluate(()=>window.grooveAudit.replayed)).toEqual([11,36,4]);
  await page.getByRole('button',{name:'Open Mystery Record',exact:true}).click();await expect(print(page)).toHaveCount(0);
  await page.getByRole('button',{name:'Select record: Climate Spiral',exact:true}).click();
  await expect(print(page)).toHaveAttribute('data-groove-index','0');expect(await print(page).locator('.gg-mark').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))).toEqual(initial);
  await page.getByRole('button',{name:'Select record: Temperature Through Time',exact:true}).click();await expect(print(page)).toHaveCount(0);
});

test('late audio startup, hidden tabs and navigation cannot drive a stale engraving',async({page})=>{
  await setup(page);await page.evaluate(()=>{window.grooveAudit.hold=true;});await page.getByRole('button',{name:'Play record',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.grooveAudit.resumes.length)).toBe(1);
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).click();
  await page.evaluate(()=>{window.grooveAudit.hold=false;window.grooveAudit.resumes.splice(0).forEach(resolve=>resolve());});
  expect(await page.evaluate(()=>window.grooveAudit.notes)).toEqual([]);await expect(print(page)).toHaveAttribute('data-groove-kind','measurement');
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(print(page)).toHaveAttribute('data-groove-index','1',{timeout:3500});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);await expect(print(page)).toHaveAttribute('data-groove-index','0');
  await page.waitForTimeout(650);await expect(print(page)).toHaveAttribute('data-groove-index','0');
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.getByRole('navigation').getByRole('link',{name:'Create',exact:true}).click();await expect(print(page)).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.grooveAudit.contexts.every(c=>c.state==='closed'))).toBe(true);
});

test('an unavailable image has no invented grooves while Side B keeps real observations',async({page})=>{
  await page.route('**/frames/climate-spiral-svs5190-2026-10-18.jpg',route=>route.abort());await page.goto('/');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeDisabled();await expect(page.locator('.jb-error')).toBeVisible();await expect(print(page)).toHaveCount(0);
  await expect(page.locator('.jb-groove-key')).toContainText('when the decoded strips are ready');
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).click();await expect(print(page)).toHaveAttribute('data-groove-count','12');
});

for(const theme of ['light','dark'] as const)test(`${theme} expanded grooves remain bilingual, keyboard usable and accessible at six viewports`,async({page})=>{
  test.setTimeout(60_000);await setup(page);await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);
  await page.locator('.jb-groove-key summary').focus();await page.keyboard.press('Enter');await expect(page.locator('.jb-groove-key details')).toHaveAttribute('open','');
  const paths=await print(page).locator('.gg-mark').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),reads=await page.evaluate(()=>window.grooveAudit.reads);
  await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme==='light'?'dark':'light');
  await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('zh');await expect(page.locator('.jb-groove-key')).toContainText('0–100%');
  expect(await print(page).locator('.gg-mark').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))).toEqual(paths);expect(await page.evaluate(()=>window.grooveAudit.reads)).toBe(reads);
  await page.getByRole('button',{name:'翻到 B 面：聆听科学测量',exact:true}).press('Enter');await expect(print(page)).toHaveAttribute('data-groove-count','12');
  await expect(page.locator('.jb-groove-key')).toContainText('相等角度并不代表相等的年份间隔');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:844,height:390}]){
    await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const box=(await page.locator('.jb-groove-detail').boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(160);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
  }
  await page.getByRole('combobox',{name:'语言',exact:true}).selectOption('en');await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  await test.info().attach(`grooveprint-axe-${theme}`,{body:JSON.stringify({violations:scan.violations,contrastIncomplete:scan.incomplete.filter(v=>v.id==='color-contrast').map(v=>v.nodes.map(n=>n.target))}),contentType:'application/json'});
  expect(await print(page).evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  const path=test.info().outputPath(`${theme}-390-expanded.png`);await page.screenshot({path,fullPage:true});await test.info().attach(`${theme}-390-expanded`,{path,contentType:'image/png'});
});

test('read-only groove geometry stays small and does not create another audio context',async({page})=>{
  await setup(page);
  const result=await page.evaluate(async()=>{
    const path='/src/lib/grooveprint.ts',source=Array.from(document.querySelectorAll('.jb-vinyl-fallback [data-groove-sector]'),n=>({brightness:Number(n.getAttribute('data-groove-value'))}));
    const {imageGrooveprint}=await import(path);for(let i=0;i<30;i++)imageGrooveprint(source);
    const times=[];for(let i=0;i<100;i++){const start=performance.now();imageGrooveprint(source);times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);return{stripCount:source.length,iterations:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[94],maxMs:times.at(-1),svgNodes:document.querySelector('.jb-vinyl-fallback>.jb-grooveprint')!.querySelectorAll('*').length,contexts:window.grooveAudit.contexts.length};
  });
  expect(result.stripCount).toBe(48);expect(result.p95Ms).toBeLessThan(10);expect(result.svgNodes).toBeLessThan(110);expect(result.contexts).toBe(0);
  await test.info().attach('grooveprint-performance',{body:JSON.stringify({notice:'Local Chromium pure-transform benchmark, not physical-mobile GPU or acoustic latency',...result}),contentType:'application/json'});
});
