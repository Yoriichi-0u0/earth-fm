import {expect,test} from '@playwright/test';
import {appearanceButton,appearanceGroup,chooseAppearance} from './appearanceControl';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const appearance=appearanceGroup;
const pages=['/','/listen?station=all','/listen','/create','/data','/data?station=arctic','/about','/?legacy=1'];
const palette=async(page:Page)=>page.evaluate(()=>({
  effective:document.documentElement.dataset.theme,
  native:getComputedStyle(document.documentElement).colorScheme,
  browser:document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
}));

test('Auto resolves before the app appears and follows live system appearance without changing the preference',async({page})=>{
  await page.emulateMedia({colorScheme:'light'});
  await page.addInitScript(()=>{
    const observer=new MutationObserver(()=>{
      if(document.getElementById('root')){
        (window as unknown as {appearanceAtRoot:string|undefined}).appearanceAtRoot=document.documentElement.dataset.theme;
        observer.disconnect();
      }
    });
    observer.observe(document,{childList:true,subtree:true});
  });
  await page.goto('/');await expect(appearanceButton(page,'auto')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>(window as unknown as {appearanceAtRoot?:string}).appearanceAtRoot)).toBe('light');
  const light=await palette(page);expect(light.native).toBe('light');expect(light.browser).toMatch(/^#[a-f\d]{6}$/i);
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const dark=await palette(page);expect(dark.native).toBe('dark');expect(dark.browser).not.toBe(light.browser);
  await expect(appearanceButton(page,'auto')).toHaveAttribute('aria-pressed','true');
  await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('explicit appearance survives navigation, refresh and Legacy while overriding the system',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});await page.goto('/');
  await chooseAppearance(page,'light');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  expect(await page.evaluate(()=>localStorage.getItem('terrajuke-appearance'))).toBe('light');
  await page.getByRole('link',{name:'Create',exact:true}).click();await expect(appearanceButton(page,'light')).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(appearanceButton(page,'light')).toHaveAttribute('aria-pressed','true');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.goto('/?legacy=1');await expect(appearanceButton(page,'light')).toHaveAttribute('aria-pressed','true');
  await chooseAppearance(page,'dark');await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.goto('/data');await expect(appearanceButton(page,'dark')).toHaveAttribute('aria-pressed','true');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await chooseAppearance(page,'auto');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();await expect(appearanceButton(page,'auto')).toHaveAttribute('aria-pressed','true');
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('invalid or unavailable preference storage leaves the appearance controls usable',async({browser})=>{
  for(const blocked of [false,true]){
    const context=await browser.newContext({colorScheme:'light'}),page=await context.newPage();
    try{
      await page.addInitScript((blocked)=>{
        if(blocked){
          Storage.prototype.getItem=function(){throw new DOMException('Blocked for test','SecurityError');};
          Storage.prototype.setItem=function(){throw new DOMException('Blocked for test','SecurityError');};
        }else localStorage.setItem('terrajuke-appearance','unrecognised-choice');
      },blocked);
      await page.goto(new URL('/',test.info().project.use.baseURL).href);await expect(appearanceButton(page,'auto')).toHaveAttribute('aria-pressed','true');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
      await chooseAppearance(page,'dark');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(appearanceButton(page,'dark')).toHaveAttribute('aria-pressed','true');
      await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
      await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
      await page.getByRole('button',{name:'Stop',exact:true}).click();
    }finally{await context.close();}
  }
});

test('theme changes preserve active audio, source pixels, mapped strip values and the saved take',async({page})=>{
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL),'Imports /src modules that only the Vite dev server serves.');
  await page.addInitScript(()=>{
    const audit={contexts:[] as AudioContext[]};(window as unknown as {appearanceAudio:typeof audit}).appearanceAudio=audit;
    const Original=AudioContext;window.AudioContext=class extends Original{constructor(){super();audit.contexts.push(this);}};
  });
  await page.goto('/');await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  const contexts=await page.evaluate(()=>(window as unknown as {appearanceAudio:{contexts:AudioContext[]}}).appearanceAudio.contexts.length);
  await chooseAppearance(page,'light');await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await chooseAppearance(page,'dark');await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  expect(await page.evaluate(()=>(window as unknown as {appearanceAudio:{contexts:AudioContext[]}}).appearanceAudio.contexts.length)).toBe(contexts);
  expect(await page.evaluate(()=>(window as unknown as {appearanceAudio:{contexts:AudioContext[]}}).appearanceAudio.contexts.every(c=>c.state==='running'))).toBe(true);
  await page.getByRole('button',{name:'Stop',exact:true}).click();await page.getByRole('button',{name:'Play with Earth',exact:true}).click();
  const loop=page.getByRole('region',{name:'Earth Looper',exact:true}),slider=page.getByRole('slider',{name:'Image scan position',exact:true});
  await loop.getByRole('button',{name:'Record',exact:true}).click();await slider.fill('12');await expect(loop).toHaveAttribute('data-loop-count','1');
  await chooseAppearance(page,'light');await expect(loop).toHaveAttribute('data-loop-phase','recording');await expect(loop).toHaveAttribute('data-loop-count','1');
  await slider.fill('31');await expect(loop).toHaveAttribute('data-loop-count','2');await loop.getByRole('button',{name:'Finish recording',exact:true}).click();
  const take=await loop.getAttribute('data-loop-duration');
  const sample=()=>page.evaluate(async()=>{
    const image=document.querySelector<HTMLImageElement>('.jb-media img')!,canvas=document.createElement('canvas');canvas.width=384;canvas.height=Math.round(image.naturalHeight/image.naturalWidth*384);
    const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0,canvas.width,canvas.height);
    const path='/src/lib/imageSonification.ts',module=await import(path);
    return {src:image.currentSrc,steps:module.imageToSequence(context.getImageData(0,0,canvas.width,canvas.height),48)};
  });
  const before=await sample(),brightness=await page.locator('.jb-scratch').getAttribute('data-scratch-brightness'),frequency=await page.locator('.jb-deck').getAttribute('data-frequency');
  await chooseAppearance(page,'dark');await expect(loop).toHaveAttribute('data-loop-count','2');await expect(loop).toHaveAttribute('data-loop-duration',take!);
  expect(await sample()).toEqual(before);await expect(page.locator('.jb-scratch')).toHaveAttribute('data-scratch-brightness',brightness!);await expect(page.locator('.jb-deck')).toHaveAttribute('data-frequency',frequency!);
  await expect(loop.getByRole('button',{name:'Replay take',exact:true})).toBeEnabled();
  await loop.getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop).toHaveAttribute('data-loop-phase','replaying');
  await chooseAppearance(page,'light');await expect(loop).toHaveAttribute('data-loop-count','2');await expect(loop).toHaveAttribute('data-loop-phase','idle');await expect(loop.getByRole('status')).toHaveText('Your take has finished.');
  await test.info().attach('theme-science-invariance',{body:JSON.stringify({notice:'Chromium test fixture; no physical-device or acoustic-latency claim',source:before.src,stripCount:before.steps.length,samePixelsAndMapping:true,preservedTakeDurationMs:take}),contentType:'application/json'});
});

test('optional 3D stays lazy and mounted through appearance changes',async({page})=>{
  const sceneRequests:string[]=[];page.on('request',request=>{if(request.url().includes('RecordScene'))sceneRequests.push(request.url());});
  await page.goto('/');await expect(appearance(page)).toBeVisible();
  await expect(page.locator('.jb-earth-record')).toHaveAttribute('data-record-renderer','2d');expect(sceneRequests).toEqual([]);
  await page.getByRole('button',{name:'Try 3D record',exact:true}).click();
  await expect(page.locator('.jb-earth-record')).toHaveAttribute('data-record-renderer','three',{timeout:15_000});expect(sceneRequests.length).toBeGreaterThan(0);
  await page.locator('.jb-three-canvas canvas').evaluate(canvas=>{(window as unknown as {themeCanvas:Element}).themeCanvas=canvas;});
  await chooseAppearance(page,'dark');await chooseAppearance(page,'light');
  expect(await page.locator('.jb-three-canvas canvas').evaluate(canvas=>canvas===(window as unknown as {themeCanvas:Element}).themeCanvas)).toBe(true);
  await page.getByRole('button',{name:'Use 2D record',exact:true}).click();await expect(page.locator('.jb-three-canvas canvas')).toHaveCount(0);
});

test('a missing WebGL context leaves the 2D instrument and audio usable in Light',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(id:string,...args:unknown[]){if(id==='webgl'||id==='webgl2'||id==='experimental-webgl')return null;return Reflect.apply(original,this,[id,...args]);} as typeof original;});
  await page.goto('/');await chooseAppearance(page,'light');await page.getByRole('button',{name:'Try 3D record',exact:true}).click();
  await expect(page.getByText('2D active · 3D unavailable',{exact:true})).toBeVisible();await expect(page.locator('.jb-earth-record')).toHaveAttribute('data-record-renderer','2d');
  await page.getByRole('button',{name:'Play record',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);await page.getByRole('button',{name:'Stop',exact:true}).click();
});

for(const theme of ['light','dark'] as const)test(`${theme} theme has no automated accessibility or contrast findings across the main pages and Legacy`,async({page})=>{
  test.setTimeout(90_000);await page.goto('/');await chooseAppearance(page,theme);
  const results=[];
  for(const route of pages){
    await page.goto(route);await expect(appearanceButton(page,theme)).toHaveAttribute('aria-pressed','true');await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    results.push({route,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),contrast:scan.passes.filter(p=>p.id==='color-contrast').map(p=>({id:p.id,nodes:p.nodes.map(n=>({target:n.target,checks:n.any.map(c=>c.data)}))})),incomplete:scan.incomplete.filter(p=>p.id==='color-contrast').map(p=>({id:p.id,targets:p.nodes.map(n=>n.target)}))});
  }
  await test.info().attach(`appearance-contrast-${theme}`,{body:JSON.stringify({notice:'Automated Chromium/Axe rule checks, not complete WCAG certification or participant evidence',results}),contentType:'application/json'});
  expect(results.filter(r=>r.violations.length)).toEqual([]);
});

for(const theme of ['light','dark'] as const)test(`${theme} expanded scientific explanations and disabled controls retain contrast`,async({page})=>{
  test.setTimeout(90_000);await page.goto('/');await chooseAppearance(page,theme);const results=[];
  for(const route of ['/about','/create','/data','/listen']){
    await page.goto(route);
    if(route==='/create')await page.getByRole('checkbox',{name:/Hear Data Only/}).check();
    if(route==='/data')await page.getByRole('checkbox',{name:'Compare another year',exact:true}).check();
    if(route==='/listen'){
      await page.getByRole('button',{name:'Continue to the real data →',exact:true}).click();
      await page.getByRole('button',{name:'Continue to the discovery →',exact:true}).click();
    }
    // Re-resolve after every expansion: opening a parent changes the matching
    // collection and makes nested disclosures available.
    for(let expanded=0;expanded<25;expanded++){
      const summaries=page.locator('details:not([open])>summary:visible');if(!await summaries.count())break;await summaries.first().click();
    }
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    results.push({route,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),contrastIncomplete:scan.incomplete.filter(v=>v.id==='color-contrast').length});
  }
  await test.info().attach(`expanded-contrast-${theme}`,{body:JSON.stringify(results),contentType:'application/json'});expect(results.filter(r=>r.violations.length)).toEqual([]);
});

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:844,height:390}])test(`responsive appearance and keyboard controls fit ${viewport.width} × ${viewport.height}`,async({page})=>{
  test.setTimeout(60_000);await page.setViewportSize(viewport);
  for(const theme of ['light','dark']){
    await page.goto('/');await chooseAppearance(page,theme);
    for(const route of ['/','/listen?station=all','/create','/data','/about']){
      if(route!=='/')await page.goto(route);
      await expect(appearanceButton(page,theme)).toHaveAttribute('aria-pressed','true');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme} ${route}: no document overflow`).toBe(true);
      if(route==='/'){
        const disc=await page.locator('.jb-vinyl-fallback').boundingBox(),toggle=await page.getByRole('button',{name:'Try 3D record',exact:true}).boundingBox();
        // Phones place the record beside its 3D action; any layout must keep them from overlapping.
        const separate=disc!.x+disc!.width<=toggle!.x||toggle!.x+toggle!.width<=disc!.x||disc!.y+disc!.height<=toggle!.y||toggle!.y+toggle!.height<=disc!.y;
        expect(separate,'vinyl must not cover its 3D action').toBe(true);
      }
      const bounds=await appearance(page).boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width);
      if(route==='/'&&[320,390,768].includes(viewport.width)){
        const play=page.getByRole('button',{name:'Play record',exact:true});await expect(play).toBeVisible();const box=await play.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
      }
      if(route==='/create'){
        const play=page.getByRole('button',{name:/Play my mix/});await expect(play).toHaveCount(1);await expect(page.locator('.sp-create-transport')).toBeVisible();
        await page.getByRole('button',{name:'Mellow Reed',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Soft Glass',exact:true})).toBeFocused();
        const focused=await page.getByRole('button',{name:'Soft Glass',exact:true}).boundingBox(),dock=await page.locator('.sp-create-transport').boundingBox();
        expect(focused!.y).toBeGreaterThanOrEqual(0);expect(focused!.y+focused!.height).toBeLessThanOrEqual(viewport.height);
        const overlap=Math.max(0,Math.min(focused!.x+focused!.width,dock!.x+dock!.width)-Math.max(focused!.x,dock!.x))*Math.max(0,Math.min(focused!.y+focused!.height,dock!.y+dock!.height)-Math.max(focused!.y,dock!.y));expect(overlap).toBe(0);
      }
    }
  }
});

test('the Appearance buttons, reduced motion and enlarged-text stress preserve usable controls',async({page})=>{
  await page.setViewportSize({width:768,height:1024});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/create');
  await expect(appearanceGroup(page)).toBeVisible();
  // Keyboard: the last navigation link is followed by the three Appearance buttons, each one press.
  await page.getByRole('navigation').getByRole('link',{name:'About',exact:true}).focus();await page.keyboard.press('Tab');await expect(appearanceButton(page,'auto')).toBeFocused();
  await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(appearanceButton(page,'dark')).toHaveAttribute('aria-pressed','true');await expect(appearanceButton(page,'light')).toHaveAttribute('aria-pressed','false');
  await chooseAppearance(page,'auto');await expect(appearanceButton(page,'auto')).toHaveAttribute('aria-pressed','true');await chooseAppearance(page,'light');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.getByRole('checkbox',{name:'Motion effects',exact:true})).not.toBeChecked();
  // Explicit text-enlargement stress fixture; not a claim of native browser zoom or physical OS text testing.
  await page.evaluate(()=>{const elements=[...document.querySelectorAll<HTMLElement>('.sp-page button,.sp-page label,.sp-page p,.sp-header a,.sp-header button')].map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize)}));for(const {e,size} of elements)e.style.fontSize=`${size*2}px`;});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Mellow Reed',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Soft Glass',exact:true})).toBeFocused();
  const tone=await page.getByRole('button',{name:'Soft Glass',exact:true}).boundingBox(),dock=await page.locator('.sp-create-transport').boundingBox();expect(tone!.y).toBeGreaterThanOrEqual(dock!.y+dock!.height);expect(tone!.y+tone!.height).toBeLessThanOrEqual(1024);
  await test.info().attach('enlarged-text-Chromium-fixture',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('provisional identity and the primary Play action work at phone width', async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page).toHaveTitle('TerraJuke — The Earth Information Jukebox');
  const brand=page.getByRole('link',{name:'TerraJuke home',exact:true});
  await expect(brand).toBeVisible();
  await expect.poll(()=>brand.locator('img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBe(128);

  const player=page.getByRole('region',{name:'Record player',exact:true});
  const play=page.getByRole('button',{name:'Play record',exact:true});
  await expect(play).toHaveCount(1);
  await expect(play).toBeEnabled();
  const playBounds=await play.boundingBox();
  expect(playBounds!.y+playBounds!.height).toBeLessThanOrEqual(568);
  await page.getByRole('link',{name:'Browse records',exact:true}).press('Enter');
  await page.getByRole('button',{name:'Select record: Arctic September',exact:true}).press('Enter');
  await expect(player).toBeFocused();
  await expect(player.getByRole('heading',{name:'Arctic September',exact:true})).toBeVisible();
  await expect(player.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();

  
  
  await page.getByRole('navigation').getByRole('link',{name:'About',exact:true}).press('Enter');
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('link',{name:'About',exact:true})).toHaveAttribute('aria-current','page');
  await page.goto('/?legacy=1');
  await expect(page.getByRole('link',{name:'TerraJuke home',exact:true})).toBeVisible();
});

test('an appearance saved under the Earth FM key carries over to TerraJuke; an old language choice is ignored',async({page})=>{
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
    localStorage.clear();localStorage.setItem('earth-fm-appearance','dark');localStorage.setItem('earth-fm-studio-language','zh');
  });
  await page.emulateMedia({colorScheme:'light'});await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(appearanceButton(page,'dark')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.getByRole('heading',{level:1})).toContainText('Your planet.');
  await chooseAppearance(page,'light');await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(appearanceButton(page,'light')).toHaveAttribute('aria-pressed','true');
});
