import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const fixture=(extension='png')=>resolve('tests/fixtures/personal-gradient.'+extension);
const input=(page:Page)=>page.getByLabel('Choose a personal image',{exact:true});
const loop=(page:Page)=>page.getByRole('region',{name:'Earth Looper',exact:true});
const slider=(page:Page)=>page.getByRole('slider',{name:'Image scan position',exact:true});
const upload=async(page:Page,path=fixture())=>{await input(page).setInputFiles(path);await expect(page.getByRole('heading',{name:'Your Record',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();};
const scratch=async(page:Page)=>{await page.getByRole('button',{name:'Scratch your image',exact:true}).click();await expect(slider(page)).toBeVisible();};
type Audit={created:string[];revoked:string[];contexts:AudioContext[];notes:number[];holdImages:boolean;late:(()=>void)[];delayAudio:boolean;resume:(()=>void)[]};
declare global{interface Window{personalAudit:Audit}}
async function audit(page:Page){
  await page.addInitScript(()=>{
    const audit:Audit={created:[],revoked:[],contexts:[],notes:[],holdImages:false,late:[],delayAudio:false,resume:[]};window.personalAudit=audit;
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=value=>{const url=create(value);audit.created.push(url);return url;};URL.revokeObjectURL=url=>{audit.revoked.push(url);revoke(url);};
    const Context=AudioContext;window.AudioContext=class extends Context{
      constructor(){super();audit.contexts.push(this);}
      get state():AudioContextState{return audit.delayAudio&&super.state!=='closed'?'suspended':super.state;}
      async resume(){await super.resume();if(audit.delayAudio)await new Promise<void>(resolve=>audit.resume.push(resolve));}
      createOscillator(){const osc=super.createOscillator(),set=osc.frequency.setValueAtTime.bind(osc.frequency);osc.frequency.setValueAtTime=(hz,at)=>{audit.notes.push(hz);return set(hz,at);};return osc;}
    };
    const NativeImage=Image;
    window.Image=class extends NativeImage{
      get src(){return super.src;}
      set src(value:string){
        if(value.startsWith('blob:')&&audit.holdImages){const callback=this.onload;audit.late.push(()=>callback?.call(this,new Event('load')));return;}
        super.src=value;
      }
    };
  });
}

test('PNG, JPEG and WebP make an explicitly personal record; native chooser remains single-file',async({page})=>{
  await page.goto('/');
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose image',exact:true}).click();const fileChooser=await chooser;expect(fileChooser.isMultiple()).toBe(false);await fileChooser.setFiles(fixture());
  await expect(page.getByRole('heading',{name:'Your Record',exact:true})).toBeVisible();
  await expect(page.locator('.jb-deck .jb-art-label')).toContainText('YOUR IMAGE');
  await expect(page.locator('.jb-deck .jb-art-label')).not.toContainText('NASA');
  await expect(page.locator('.jb-source')).toContainText('not NASA imagery or scientific measurements');
  await expect(page.locator('.jb-source a')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Select record:/})).toHaveCount(5);
  await expect(page.getByRole('button',{name:/Side B:/})).toHaveCount(0);
  for(const extension of ['jpg','webp'])await upload(page,fixture(extension));
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await expect.poll(()=>page.locator('.jb-deck').getAttribute('data-note-serial')).not.toBe('0');
  await page.getByRole('button',{name:'Stop',exact:true}).click();await scratch(page);
  await slider(page).focus();await slider(page).press('Home');const low=Number(await page.locator('.jb-deck').getAttribute('data-frequency'));
  await slider(page).press('End');await expect(slider(page)).toHaveValue('48');const high=Number(await page.locator('.jb-deck').getAttribute('data-frequency'));expect(high).toBeGreaterThan(low);
});

test('bad signatures, size, geometry, animation and native decode errors recover without replacing the old image',async({page})=>{
  await audit(page);await page.goto('/');await upload(page);const original=await page.locator('.jb-media img').getAttribute('src');
  const huge=Buffer.from(readFileSync(fixture()));huge.writeUInt32BE(20000,16);
  const animated=Buffer.from(readFileSync(fixture()));animated.write('acTL',37);
  const invalid=Buffer.alloc(57);Buffer.from([137,80,78,71,13,10,26,10]).copy(invalid);invalid.writeUInt32BE(13,8);invalid.write('IHDR',12);invalid.writeUInt32BE(32,16);invalid.writeUInt32BE(32,20);invalid.write('IDAT',37);invalid.write('IEND',49);
  for(const [name,mimeType,buffer,message] of [
    ['wrong.png','image/png',Buffer.from('not an image'),'Choose a PNG'],
    ['mismatch.jpg','image/jpeg',readFileSync(fixture()),'Choose a PNG'],
    ['huge.png','image/png',huge,'4096 pixels'],
    ['large.png','image/png',Buffer.alloc(10*1024*1024+1),'over 10 MB'],
    ['animation.png','image/png',animated,'Choose a still image'],
    ['broken.png','image/png',invalid,'could not be opened'],
  ] as const){
    await input(page).setInputFiles({name,mimeType,buffer});await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.locator('.jb-media img')).toHaveAttribute('src',original!);await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  }
  await upload(page,fixture('jpg'));await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'Remove',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.personalAudit.created.every(url=>window.personalAudit.revoked.includes(url)))).toBe(true);
});

test('a first-image error has a direct retry; empty MIME is sniffed and the new record receives keyboard focus',async({page})=>{
  await page.goto('/');await input(page).setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});
  await expect(page.locator('.jb-player').getByRole('alert')).toContainText('Choose a PNG');await expect(page.getByRole('button',{name:'Choose another image',exact:true})).toBeVisible();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose another image',exact:true}).click();await (await chooser).setFiles(fixture());
  await expect(page.getByRole('heading',{name:'Your Record',exact:true})).toBeFocused();await expect(page.getByRole('alert')).toHaveCount(0);
  await input(page).setInputFiles({name:'no-mime',mimeType:'',buffer:readFileSync(fixture())});await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  await expect(page.getByRole('link',{name:'Browse Earth stories',exact:true})).toHaveAttribute('href','/listen?station=all');
});

test('a failed replacement preserves the image but deliberately clears the old take',async({page})=>{
  await page.goto('/');await upload(page);const source=await page.locator('.jb-media img').getAttribute('src');await scratch(page);await loop(page).getByRole('button',{name:'Record',exact:true}).click();await slider(page).fill('20');await expect(loop(page)).toHaveAttribute('data-loop-count','1');await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
  await input(page).setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await expect(page.getByRole('alert')).toContainText('Its take has been cleared.');await expect(page.locator('.jb-media img')).toHaveAttribute('src',source!);
  await scratch(page);await expect(loop(page)).toHaveAttribute('data-loop-count','0');await expect(loop(page).getByRole('button',{name:'Replay take',exact:true})).toBeDisabled();
});

test('record and replay use the same notes; replacing even the same file cancels the take and closes the old audio',async({page})=>{
  await audit(page);await page.goto('/');await upload(page);await scratch(page);
  await loop(page).getByRole('button',{name:'Record',exact:true}).click();
  for(const [i,position] of ['12','31','7'].entries()){await slider(page).fill(position);await expect(loop(page)).toHaveAttribute('data-loop-count',String(i+1));await page.waitForTimeout(160);}
  await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
  const notes=await page.evaluate(()=>window.personalAudit.notes.splice(0));expect(notes.length).toBe(9);
  await loop(page).getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop(page).getByRole('status')).toHaveText('Your take has finished.');expect(await page.evaluate(()=>window.personalAudit.notes.splice(0))).toEqual(notes);
  const previousUrl=await page.locator('.jb-media img').getAttribute('src');
  await loop(page).getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop(page)).toHaveAttribute('data-loop-phase','replaying');await upload(page);
  const nextUrl=await page.locator('.jb-media img').getAttribute('src');expect(nextUrl).not.toBe(previousUrl);
  await expect.poll(()=>page.evaluate(url=>window.personalAudit.revoked.includes(url!),previousUrl)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.personalAudit.contexts.every(context=>context.state==='closed'))).toBe(true);
  await scratch(page);await expect(loop(page)).toHaveAttribute('data-loop-count','0');await expect(loop(page).getByRole('button',{name:'Replay take',exact:true})).toBeDisabled();await page.waitForTimeout(650);await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
  await page.getByRole('button',{name:'Back to playback',exact:true}).click();await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await upload(page,fixture('webp'));await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);await expect.poll(()=>page.evaluate(()=>window.personalAudit.contexts.every(context=>context.state==='closed'))).toBe(true);
});

test('rapid replacement, Remove, navigation and late image callbacks cannot restore a stale source',async({page})=>{
  await audit(page);await page.goto('/');await upload(page);
  await page.evaluate(()=>{window.personalAudit.holdImages=true;});
  await input(page).setInputFiles(fixture('jpg'));await expect(page.locator('.jb-personal-loading')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.personalAudit.late.length)).toBe(1);
  await page.evaluate(()=>{window.personalAudit.holdImages=false;});await upload(page,fixture('webp'));const winner=await page.locator('.jb-media img').getAttribute('src');
  await page.evaluate(()=>{window.personalAudit.late.splice(0).forEach(fn=>fn());});await expect(page.locator('.jb-media img')).toHaveAttribute('src',winner!);
  await page.evaluate(()=>{window.personalAudit.holdImages=true;});await input(page).setInputFiles(fixture('jpg'));await expect(page.locator('.jb-personal-loading')).toBeVisible();
  await page.getByRole('button',{name:'Remove',exact:true}).click();await page.evaluate(()=>{window.personalAudit.late.splice(0).forEach(fn=>fn());});await expect(page.getByRole('heading',{name:'Climate Spiral',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.personalAudit.created.every(url=>window.personalAudit.revoked.includes(url)))).toBe(true);
  await input(page).setInputFiles(fixture());await expect(page.locator('.jb-personal-loading')).toBeVisible();
  await page.getByRole('navigation').getByRole('link',{name:'Create',exact:true}).click();await page.evaluate(()=>{window.personalAudit.late.splice(0).forEach(fn=>fn());});
  await expect.poll(()=>page.evaluate(()=>window.personalAudit.created.every(url=>window.personalAudit.revoked.includes(url)))).toBe(true);
  await page.getByRole('navigation').getByRole('link',{name:'Home',exact:true}).click();await expect(page.getByRole('button',{name:'Your Record',exact:true})).toHaveCount(0);
});

test('a decode timeout releases its URL and choosing a curated record cancels pending decoding',async({page})=>{
  await audit(page);await page.goto('/');await page.clock.install();await page.evaluate(()=>{window.personalAudit.holdImages=true;});await input(page).setInputFiles(fixture());await expect.poll(()=>page.evaluate(()=>window.personalAudit.late.length)).toBe(1);
  await page.clock.runFor(10_050);await expect(page.getByRole('alert')).toContainText('could not be opened');await expect.poll(()=>page.evaluate(()=>window.personalAudit.created.every(url=>window.personalAudit.revoked.includes(url)))).toBe(true);
  await input(page).setInputFiles(fixture());await expect(page.locator('.jb-personal-loading')).toBeVisible();await page.getByRole('button',{name:'Select record: Arctic September',exact:true}).click();await page.evaluate(()=>{window.personalAudit.late.splice(0).forEach(fn=>fn());});
  await expect(page.getByRole('heading',{name:'Arctic September',exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.personalAudit.created.every(url=>window.personalAudit.revoked.includes(url)))).toBe(true);
});

test('pending audio startup and pending replay are cancelled when the personal source changes',async({page})=>{
  await audit(page);await page.goto('/');await upload(page);await scratch(page);
  await loop(page).getByRole('button',{name:'Record',exact:true}).click();await slider(page).fill('12');await expect(loop(page)).toHaveAttribute('data-loop-count','1');await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
  await page.evaluate(()=>{window.personalAudit.delayAudio=true;for(const context of window.personalAudit.contexts)if(context.state==='running')void context.suspend();});
  await loop(page).getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop(page)).toHaveAttribute('data-loop-phase','preparing');
  await upload(page,fixture('jpg'));await page.evaluate(()=>{window.personalAudit.delayAudio=false;window.personalAudit.resume.splice(0).forEach(resolve=>resolve());});await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
  await page.evaluate(()=>{window.personalAudit.delayAudio=true;});await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);await expect.poll(()=>page.evaluate(()=>window.personalAudit.resume.length)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Remove',exact:true}).click();await page.evaluate(()=>window.personalAudit.resume.splice(0).forEach(resolve=>resolve()));await expect(page.getByRole('heading',{name:'Climate Spiral',exact:true})).toBeVisible();await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
  await expect.poll(()=>page.evaluate(()=>window.personalAudit.contexts.every(context=>context.state==='closed'))).toBe(true);
});

test('the image, filename and take stay out of storage and outbound requests; navigation and reload forget them',async({page})=>{
  await audit(page);const requests:{url:string;method:string;body:string|null}[]=[];
  page.on('request',request=>{if(!request.url().startsWith('blob:'))requests.push({url:request.url(),method:request.method(),body:request.postData()});});
  await page.goto('/');await expect(page.getByRole('button',{name:'Choose image',exact:true})).toBeVisible();
  // The 3D jukebox fetches its public label images once; wait for them before the no-requests baseline.
  await expect(page.locator('.jb-stage')).toHaveAttribute('data-stage-labels','loaded',{timeout:15000});
  const storage=()=>page.evaluate(async()=>({local:{...localStorage},session:{...sessionStorage},databases:await indexedDB.databases(),caches:await caches.keys()}));const before=await storage();requests.length=0;
  await input(page).setInputFiles({name:'PRIVATE-family-name-do-not-send.png',mimeType:'image/png',buffer:readFileSync(fixture())});await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();await scratch(page);
  await loop(page).getByRole('button',{name:'Record',exact:true}).click();await slider(page).fill('21');await expect(loop(page)).toHaveAttribute('data-loop-count','1');await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();await loop(page).getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop(page).getByRole('status')).toHaveText('Your take has finished.');
  expect(await storage()).toEqual(before);expect(requests).toEqual([]);expect(await page.locator('body').innerText()).not.toContain('PRIVATE-family');
  await page.getByRole('navigation').getByRole('link',{name:'Explore Data',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.personalAudit.created.every(url=>window.personalAudit.revoked.includes(url)))).toBe(true);
  await page.getByRole('navigation').getByRole('link',{name:'Home',exact:true}).click();await expect(page.getByRole('button',{name:'Your Record',exact:true})).toHaveCount(0);
  await upload(page);await page.reload();await expect(page.getByRole('button',{name:'Your Record',exact:true})).toHaveCount(0);expect(await storage()).toEqual(before);
});

test('personal touch dragging scans the visible image while vertical gestures scroll and cancel audio',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  try{
    await page.goto('http://127.0.0.1:5173/');await upload(page);await scratch(page);
    const surface=page.locator('.jb-scratch-surface');await surface.scrollIntoViewIfNeeded();const bounds=(await surface.boundingBox())!,cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width*.3,y:bounds.y+bounds.height*.5,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.width*.7,y:bounds.y+bounds.height*.5,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    expect(Number(await slider(page).inputValue())).toBeGreaterThan(30);
    const before=await page.evaluate(()=>scrollY);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*.6,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*.6-100,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before);await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
  }finally{await context.close();}
});

for(const theme of ['light','dark'] as const)test(`${theme} personal record fits phone and tablet, remains bilingual and preserves a take through appearance changes`,async({page})=>{
  test.setTimeout(60_000);await audit(page);await page.goto('/');await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);await upload(page);
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  const count=await page.evaluate(()=>window.personalAudit.contexts.length);await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme==='light'?'dark':'light');await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);expect(await page.evaluate(()=>window.personalAudit.contexts.length)).toBe(count);await page.getByRole('button',{name:'Stop',exact:true}).click();await scratch(page);
  await loop(page).getByRole('button',{name:'Record',exact:true}).click();await slider(page).fill('31');await expect(loop(page)).toHaveAttribute('data-loop-count','1');await loop(page).getByRole('button',{name:'Finish recording',exact:true}).click();
  const source=await page.locator('.jb-media img').getAttribute('src'),brightness=await page.locator('.jb-scratch').getAttribute('data-scratch-brightness');
  await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme==='light'?'dark':'light');await expect(loop(page)).toHaveAttribute('data-loop-count','1');await expect(page.locator('.jb-media img')).toHaveAttribute('src',source!);await expect(page.locator('.jb-scratch')).toHaveAttribute('data-scratch-brightness',brightness!);
  await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption(theme);
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]){
    await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect.poll(()=>page.evaluate(()=>{
      const image=document.querySelector<HTMLImageElement>('.jb-media img')!,surface=document.querySelector('.jb-scratch-surface')!,scan=document.querySelector('.jb-scan')!;
      const imageBox=image.getBoundingClientRect(),surfaceBox=surface.getBoundingClientRect(),scanBox=scan.getBoundingClientRect();
      const visibleWidth=Math.min(imageBox.width,imageBox.height*image.naturalWidth/image.naturalHeight),left=imageBox.left+(imageBox.width-visibleWidth)/2;
      const index=Number(document.querySelector('.jb-scratch')!.getAttribute('data-scratch-index'));
      return Math.max(Math.abs(surfaceBox.x-left),Math.abs(surfaceBox.width-visibleWidth),Math.abs(scanBox.x-(left+(index+.5)/48*visibleWidth)));
    }),'scan and touch surface must align with the visible image after resizing').toBeLessThan(1);
    for(const button of await page.locator('.jb-personal-actions button').all()){const bounds=await button.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);}
    await page.evaluate(()=>window.scrollTo(0,0));
    await test.info().attach(`personal-${viewport.width}-${theme}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  }
  await slider(page).focus();await slider(page).press('Home');await slider(page).press('ArrowRight');await expect(slider(page)).toHaveValue('2');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('zh');await expect(page.getByRole('heading',{name:'你的唱片',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'更换图片',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'地球旋律录制',exact:true})).toHaveAttribute('data-loop-count','1');
});
