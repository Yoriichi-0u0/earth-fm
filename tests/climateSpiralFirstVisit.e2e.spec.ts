import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/**
 * The Climate Spiral A/B first-visit path from docs/EXPERIENCE-VALIDATION.md, driven by touch on each device screen.
 * Automated browser evidence only: it cannot show that a person understood or enjoyed the sound.
 */
type Audit={notes:number[]};
declare global{interface Window{firstVisit:Audit}}
const hz=(midi:number)=>440*2**((midi-69)/12);
// Fixed scales already used by the app: D-minor pentatonic D3–D5 (image) and symphony-ten-v1 (measurements).
const IMAGE_HZ=[50,53,55,57,60,62,65,67,69,72,74].map(hz);
const MEASUREMENT_HZ=[48,50,52,55,57,60,62,64,67,69].map(hz);
const inScale=(scale:number[],value:number)=>scale.some(f=>Math.abs(f-value)<.01);

// The default Chromium project is a desktop window, so it is narrowed to a phone. Device projects keep their own screens.
test.use({hasTouch:true});
test.beforeEach(async({page},testInfo)=>{if(['chromium','chrome','msedge'].includes(testInfo.project.name))await page.setViewportSize({width:390,height:844});});
const SPIRAL='**/frames/climate-spiral-svs5190-2026-10-18.jpg';
const spiralGrooves=(page:Page)=>page.locator('.jb-vinyl-fallback>.jb-grooveprint');

async function setup(page:Page){
  await page.addInitScript(()=>{
    const audit:Audit={notes:[]};window.firstVisit=audit;
    const Context=window.AudioContext;
    window.AudioContext=class extends Context{
      createOscillator(){
        const oscillator=super.createOscillator();
        const set=oscillator.frequency.setValueAtTime.bind(oscillator.frequency),start=oscillator.start.bind(oscillator);
        let mapped:number|undefined;
        oscillator.frequency.setValueAtTime=(value,at)=>{mapped=value;return set(value,at);};
        oscillator.start=when=>{start(when);audit.notes.push(mapped??oscillator.frequency.value);};
        return oscillator;
      }
    };
  });
  await page.goto('/listen');
}
const notes=(page:Page)=>page.evaluate(()=>window.firstVisit.notes.slice());
const heard=async(page:Page,value:number)=>(await notes(page)).some(note=>Math.abs(note-value)<.01);

test('the first scan waits for decoded pixels instead of reading a not-yet-decoded image as black',async({page})=>{
  // Reproduce WebKit's race deterministically: the <img> reports loaded, but drawing it yields nothing until decode() settles.
  await page.addInitScript(()=>{
    let decoded=false;
    const decode=HTMLImageElement.prototype.decode,draw=CanvasRenderingContext2D.prototype.drawImage;
    HTMLImageElement.prototype.decode=function(){return new Promise<void>(resolve=>setTimeout(resolve,400)).then(()=>decode.call(this)).then(()=>{decoded=true;});};
    CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:unknown[]){
      if(args[0] instanceof HTMLImageElement&&!decoded)return;
      return (draw as (...values:unknown[])=>void).apply(this,args);
    } as typeof draw;
  });
  await page.goto('/listen');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  const values=await page.locator('.jb-vinyl-fallback>.jb-grooveprint [data-groove-sector]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-groove-value'))));
  expect(values).toHaveLength(48);
  // The pinned spiral is dark at its edges and bright through its centre; an undecoded read is black everywhere.
  expect(Math.max(...values)).toBeGreaterThan(.3);
  expect(values.filter(value=>value===0).length).toBeLessThanOrEqual(4);
});

test('a rejected decode never becomes a ready scan with invented grooves',async({page})=>{
  await page.addInitScript(()=>{
    HTMLImageElement.prototype.decode=function(){return Promise.reject(new DOMException('The source image cannot be decoded.','EncodingError'));};
  });
  await page.goto('/listen');
  await expect(page.locator('.jb-error')).toHaveText('This visual could not be read. Choose another frame or upload a local image.');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeDisabled();
  await expect(page.locator('.jb-state')).toHaveText('Visual unavailable');
  await expect(spiralGrooves(page)).toHaveCount(0);
  // Measurements are independent of the picture and stay available.
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).tap();
  await expect(spiralGrooves(page)).toHaveAttribute('data-groove-count','12');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
});

test('an image failure that lands before the player resets shows an error instead of loading forever',async({page})=>{
  // Deterministic version of the WebKit race: the failed image is already complete when the transport resets,
  // and the browser's own error event was consumed before the reset cleared its message.
  await page.route(SPIRAL,route=>route.abort());
  await page.addInitScript(()=>{
    const spiral=(image:HTMLImageElement)=>image.getAttribute('src')?.includes('climate-spiral-svs5190')??false;
    const complete=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'complete')!;
    Object.defineProperty(HTMLImageElement.prototype,'complete',{configurable:true,get(){return spiral(this)||complete.get!.call(this);}});
    window.addEventListener('error',event=>{
      if(event.isTrusted&&event.target instanceof HTMLImageElement&&spiral(event.target))event.stopImmediatePropagation();
    },true);
  });
  await page.goto('/listen');
  await expect(page.locator('.jb-error')).toHaveText('The image could not load. Try another frame.');
  await expect(page.locator('.jb-state')).toHaveText('Visual unavailable');
  await expect(page.locator('.jb-media-loading')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeDisabled();
  await expect(spiralGrooves(page)).toHaveCount(0);
});

test('a first visit plays Side A, hears one silent-inspected groove, flips and plays Side B by touch',async({page})=>{
  test.setTimeout(45_000);
  await setup(page);
  const deck=page.locator('.jb-deck'),readout=page.locator('.jb-readout');
  const play=page.getByRole('button',{name:'Play record',exact:true});
  const sideA=page.getByRole('button',{name:'Side A: hear the picture',exact:true});
  const sideB=page.getByRole('button',{name:'Side B: hear the measurements',exact:true});

  // 1. Discover and play Side A: one Play control, inside the first phone screen, labelled as picture sound.
  await expect(play).toHaveCount(1);await expect(play).toBeEnabled();
  const screen=page.viewportSize()!,bounds=await play.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(screen.height);
  await expect(sideA).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.jb-science-cue')).toContainText('Brightness → pitch. Not temperature.');
  await expect(readout).toContainText('PIXEL INPUT');
  expect(await notes(page)).toEqual([]);
  await play.tap();
  await expect(deck).toHaveClass(/is-playing/);
  await expect.poll(async()=>Number(await deck.getAttribute('data-note-serial'))).toBeGreaterThan(0);
  const imageNote=Number(await deck.getAttribute('data-frequency'));
  expect(inScale(IMAGE_HZ,imageNote)).toBe(true);expect(await heard(page,imageNote)).toBe(true);
  await page.getByRole('button',{name:'Stop',exact:true}).tap();
  await expect(deck).not.toHaveClass(/is-playing/);

  // 2. Inspect a groove silently, then audition exactly the mapped note shown.
  await page.getByText('Read the grooves',{exact:true}).tap();
  const slider=page.getByRole('slider',{name:'Inspect sector (silent)',exact:true});
  const before=(await notes(page)).length;
  await slider.fill('20');
  await expect(slider).toHaveAttribute('aria-valuetext',/^Image strip 20 \/ 48, .+% brightness, .+ Hz/);
  await expect(page.locator('.jb-groove-context')).toContainText('Image brightness, not temperature');
  await page.waitForTimeout(300);expect((await notes(page)).length).toBe(before);
  const stripHz=Number(await page.locator('.jb-groove-selected dd').last().textContent());
  expect(inScale(IMAGE_HZ,stripHz)).toBe(true);
  await page.getByRole('button',{name:'Hear selected strip',exact:true}).tap();
  await expect.poll(async()=>(await notes(page)).length).toBeGreaterThan(before);
  expect((await notes(page))[before]).toBeCloseTo(stripHz,2);

  // 3. Flip during Side A playback: the picture stops, then Side B plays fixed-band January observations.
  await play.tap();await expect(deck).toHaveClass(/is-playing/);
  await sideB.tap();
  await expect(sideB).toHaveAttribute('aria-pressed','true');await expect(deck).not.toHaveClass(/is-playing/);
  const afterFlip=(await notes(page)).length;await page.waitForTimeout(700);
  expect((await notes(page)).length).toBe(afterFlip);

  // 4. The on-screen distinction between image-derived and measurement-derived notes.
  await expect(page.locator('.jb-science-cue')).toContainText('January anomaly (°C) · relative to 1951–1980.');
  await expect(page.locator('.jb-side-provenance')).toContainText('not matched frame by frame');
  await expect(readout).toContainText('OBSERVATION');
  // Read the first two January notes silently, then confirm Play sounds those exact notes in order.
  if(!await slider.isVisible())await page.getByText('Read the grooves',{exact:true}).tap();
  const january=async(position:number)=>{
    const silent=(await notes(page)).length;await slider.fill(String(position));
    const text=await slider.getAttribute('aria-valuetext');
    expect((await notes(page)).length).toBe(silent);
    return {text,frequencyHz:Number(await page.locator('.jb-groove-selected dd').last().textContent())};
  };
  const first=await january(1),second=await january(2);
  expect(first.text).toMatch(/^January \d{4}, .+°C, .+ Hz/);
  await play.tap();
  await expect(deck).toHaveClass(/is-playing/);
  await expect.poll(()=>heard(page,first.frequencyHz)).toBe(true);
  await expect(readout).toContainText('02 / 12',{timeout:4_000});
  await expect.poll(()=>heard(page,second.frequencyHz)).toBe(true);
  expect(inScale(MEASUREMENT_HZ,first.frequencyHz)&&inScale(MEASUREMENT_HZ,second.frequencyHz)).toBe(true);
  await page.getByRole('button',{name:'Stop',exact:true}).tap();
  await expect(deck).not.toHaveClass(/is-playing/);

  // The phone layout never needs horizontal page scrolling along this path.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(screen.width);
  await test.info().attach('first-visit-evidence',{contentType:'application/json',body:JSON.stringify({
    notice:'Automated browser evidence. Not a human comprehension, screen-reader or listening result.',
    browser:test.info().project.name,screen,sideAStripTwentyHz:stripHz,firstSideANoteHz:imageNote,
    sideBFirstTwo:[first,second],
  })});
});

test('Side B opens on the 3D Climate Coil, keeps the observation readout, and switches to the 2D chart',async({page})=>{
  await page.goto('/listen');
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).tap();
  const art=page.locator('.jb-side-content:not([hidden]) .jb-data-art');
  await expect(art).toHaveAttribute('data-data-renderer','three',{timeout:15_000});
  await expect(art.getByRole('img',{name:/^Climate Coil: every monthly GISTEMP v4 anomaly/})).toBeVisible();
  const readout=await art.locator('.jb-data-value').innerText();
  await art.getByRole('button',{name:'2D chart',exact:true}).tap();
  await expect(art).toHaveAttribute('data-data-renderer','2d');
  await expect(art.locator('svg[role=img]')).toBeVisible();
  await expect(art.locator('canvas')).toHaveCount(0);
  expect(await art.locator('.jb-data-value').innerText()).toBe(readout);
  await expect(art.getByRole('button',{name:'3D coil',exact:true})).toHaveAttribute('aria-pressed','false');
});

test('without WebGL, Side B shows the 2D chart and never offers a broken 3D view',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,id:string,...args:unknown[]){
      if(id==='webgl'||id==='webgl2'||id==='experimental-webgl')return null;
      return Reflect.apply(original,this,[id,...args]);
    } as typeof original;
  });
  await page.goto('/listen');
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).tap();
  const art=page.locator('.jb-side-content:not([hidden]) .jb-data-art');
  await expect(art).toHaveAttribute('data-data-renderer','2d');
  await expect(art.locator('svg[role=img]')).toBeVisible();
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
});

test('tapping a January bead on the Climate Coil selects it silently and keeps readout, inspector and coil in step',async({page})=>{
  test.setTimeout(45_000);
  await setup(page);
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).tap();
  const coil=page.locator('.jb-side-content:not([hidden]) .jb-coil');
  await expect(coil.locator('xpath=..')).toHaveAttribute('data-data-renderer','three',{timeout:15_000});
  await expect(coil).toHaveAttribute('data-coil-beads',/\d+,\d+/);
  await page.waitForTimeout(300);
  const spots=(await coil.getAttribute('data-coil-beads'))!.split(';').map(s=>s.split(',').map(Number));
  const target=4,[x,y]=spots[target];
  const before=(await notes(page)).length;
  await coil.locator('canvas').click({position:{x,y}});
  await expect(page.locator('.jb-readout')).toContainText('05 / 12');
  const value=page.locator('.jb-side-content:not([hidden]) .jb-data-value>span');
  const year=Number((await value.innerText()).match(/\d{4}/)![0]);
  await expect(coil).toHaveAttribute('data-coil-cursor-year',String(year));
  if(!await page.locator('.jb-groove-key input[type=range]').isVisible())await page.getByText('Read the grooves',{exact:true}).tap();
  await expect(page.locator('.jb-groove-key input[type=range]')).toHaveAttribute('aria-valuetext',new RegExp(`^January ${year}, `));
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
  expect((await notes(page)).length).toBe(before);
});

test('on a phone the visual is full width, the record row sits below it, navigation is one line and Play stays reachable',async({page})=>{
  test.skip((page.viewportSize()?.width??1000)>640,'Phone layout only.');
  await page.goto('/listen');await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  const box=(selector:string)=>page.locator(selector).first().boundingBox().then(b=>b!);
  const deck=await box('.jb-deck'),science=await box('.jb-artwork-paired .jb-science-window'),record=await box('.jb-artwork-paired .jb-earth-record');
  expect(science.width).toBeGreaterThan(deck.width*.95);
  expect(record.y).toBeGreaterThanOrEqual(science.y+science.height-1);
  expect(record.height).toBeLessThan(200);
  const tops=await page.locator('.sp-nav a').evaluateAll(links=>links.map(link=>Math.round(link.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await page.locator('.jb-groove-key').scrollIntoViewIfNeeded();
  const transport=await box('.jb-transport');
  expect(transport.y).toBeGreaterThanOrEqual(-1);expect(transport.y).toBeLessThan(12);
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});

test('hovering a bead shows its January, anomaly and note, and the tip never outlives a switch to 2D',async({page})=>{
  test.skip(test.info().project.use.hasTouch===true&&test.info().project.name!=='chromium','Hover needs a fine pointer.');
  await page.goto('/listen');
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).click();
  const coil=page.locator('.jb-side-content:not([hidden]) .jb-coil');
  await coil.scrollIntoViewIfNeeded();
  await expect(coil).toHaveAttribute('data-coil-beads',/\d+,\d+/,{timeout:15_000});await page.waitForTimeout(300);
  const [x,y]=(await coil.getAttribute('data-coil-beads'))!.split(';')[8].split(',').map(Number);
  const canvas=(await coil.locator('canvas').boundingBox())!;
  await page.mouse.move(canvas.x+x,canvas.y+y);
  await expect(coil.locator('.jb-coil-tip')).toHaveText(/^January \d{4} [+−-]\d\.\d\d°C · [A-G]\d$/);
  const art=page.locator('.jb-side-content:not([hidden]) .jb-data-art');
  await art.getByRole('button',{name:'2D chart',exact:true}).click();
  await page.mouse.move(0,0);
  await art.getByRole('button',{name:'3D coil',exact:true}).click();
  await expect(art).toHaveAttribute('data-data-renderer','three',{timeout:15_000});
  await expect(art.locator('.jb-coil-tip')).toHaveCount(0);
});
