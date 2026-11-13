import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/**
 * The Climate Spiral A/B first-visit path from docs/EXPERIENCE-VALIDATION.md, driven by touch at phone size.
 * Automated browser evidence only: it cannot show that a person understood or enjoyed the sound.
 */
type Audit={notes:number[]};
declare global{interface Window{firstVisit:Audit}}
const hz=(midi:number)=>440*2**((midi-69)/12);
// Fixed scales already used by the app: D-minor pentatonic D3–D5 (image) and symphony-ten-v1 (measurements).
const IMAGE_HZ=[50,53,55,57,60,62,65,67,69,72,74].map(hz);
const MEASUREMENT_HZ=[48,50,52,55,57,60,62,64,67,69].map(hz);
const inScale=(scale:number[],value:number)=>scale.some(f=>Math.abs(f-value)<.01);

test.use({viewport:{width:390,height:844},hasTouch:true});

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
  await page.goto('/');
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
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  const values=await page.locator('.jb-vinyl-fallback>.jb-grooveprint [data-groove-sector]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-groove-value'))));
  expect(values).toHaveLength(48);
  // The pinned spiral is dark at its edges and bright through its centre; an undecoded read is black everywhere.
  expect(Math.max(...values)).toBeGreaterThan(.3);
  expect(values.filter(value=>value===0).length).toBeLessThanOrEqual(4);
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
  const bounds=await play.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(844);
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
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await test.info().attach('first-visit-evidence',{contentType:'application/json',body:JSON.stringify({
    notice:'Automated browser evidence. Not a human comprehension, screen-reader or listening result.',
    browser:test.info().project.name,sideAStripTwentyHz:stripHz,firstSideANoteHz:imageNote,
    sideBFirstTwo:[first,second],
  })});
});
