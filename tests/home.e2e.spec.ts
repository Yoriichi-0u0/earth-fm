import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {chooseAppearance} from './appearanceControl';

// Home introduces TerraJuke and guides the eye; Listen holds every player. Emulated screens, not physical devices.
const axe=async(page:Page)=>(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
const fitsWidth=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);

test('Home introduces the project without a player and sends visitors to Listen',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toHaveAccessibleName('Hear NASA’s view of our planet.');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'A jukebox for Earth information.'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Pictures and measurements sound different on purpose.'})).toBeVisible();
  const shelf=page.locator('.hi-shelf a');await expect(shelf).toHaveCount(7);
  await expect(shelf.first()).toHaveAttribute('href','/listen?record=spiral');
  await page.getByRole('link',{name:/Currents of Heat/}).click();
  await expect(page).toHaveURL(/\/listen\?record=ocean$/);
  await expect(page.getByRole('button',{name:'Select record: Currents of Heat',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.goBack();await expect(page.getByRole('heading',{level:1})).toHaveAccessibleName('Hear NASA’s view of our planet.');
  await page.getByRole('link',{name:'How it works',exact:true}).click();await expect(page).toHaveURL(/#how-it-works$/);
  expect(errors).toEqual([]);
});

test('the Home guide steps by button with reduced motion and never advances on its own',async({page})=>{
  await page.goto('/');
  const steps=page.locator('.hi-steps li');await expect(steps.nth(0)).toHaveAttribute('aria-current','step');
  await expect(page.getByRole('button',{name:'Auto guide'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Pause guide'})).toHaveCount(0);
  await page.getByRole('button',{name:'Next step',exact:true}).click();await expect(steps.nth(1)).toHaveAttribute('aria-current','step');
  await expect(page.locator('.hi-zone-play')).toHaveAttribute('data-lit','true');await expect(page.locator('.hi-zone-shelf')).toHaveAttribute('data-lit','false');
  await page.getByRole('button',{name:/Explore by hand/}).click();await expect(steps.nth(3)).toHaveAttribute('aria-current','step');
  await page.getByRole('button',{name:'Next step',exact:true}).click();await expect(steps.nth(0)).toHaveAttribute('aria-current','step');
  await page.getByRole('button',{name:'Previous step',exact:true}).click();await expect(steps.nth(3)).toHaveAttribute('aria-current','step');
  await expect(page.locator('.hi-tour [aria-live=polite]')).toContainText('Step 4: Explore by hand.');
  await page.waitForTimeout(4800);await expect(steps.nth(3)).toHaveAttribute('aria-current','step');
});

test('with motion on, the Home guide moves the light by itself and can be paused',{tag:'@timing'},async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  await page.locator('#how-it-works').scrollIntoViewIfNeeded();
  const steps=page.locator('.hi-steps li');
  await expect(steps.nth(1)).toHaveAttribute('aria-current','step',{timeout:7000});
  await page.getByRole('button',{name:'Pause guide'}).click();
  await expect(page.getByRole('button',{name:'Auto guide'})).toHaveAttribute('aria-pressed','false');
  const lit=await page.locator('.hi-steps li[aria-current=step]').innerText();await page.waitForTimeout(4800);
  expect(await page.locator('.hi-steps li[aria-current=step]').innerText()).toBe(lit);
});

test('Guide me rings the real controls on Listen, stays silent and returns focus',async({page})=>{
  await page.addInitScript(()=>{const w=window as unknown as {contexts:number};w.contexts=0;const C=window.AudioContext;window.AudioContext=class extends C{constructor(){super();w.contexts++;}};});
  await page.goto('/');await page.getByRole('link',{name:'Try it on the real player, with the guide'}).click();
  await expect(page).toHaveURL(/\/listen\?guide=1$/);
  const card=page.getByRole('dialog',{name:'Choose a record'});await expect(card).toBeVisible();await expect(card).toBeFocused();
  // Phones held sideways hide the intro (and its Play-all button) to keep Play on the first screen; the guide skips hidden controls.
  const showAll=await page.locator('.jb-show-start').isVisible(),total=showAll?5:4;
  await expect(card).toContainText(`Guide · 1 / ${total}`);
  for(const title of ['Press Play','Pick a side','Read what you hear',...(showAll?['Or play them all']:[])]){await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('dialog',{name:title})).toBeVisible();}
  const last=showAll?'.jb-show-start':'.jb-readout';await page.waitForTimeout(500);
  const ring=await page.locator('.lg-ring').boundingBox(),target=await page.locator(last).boundingBox();
  expect(Math.abs(ring!.x+8-target!.x)).toBeLessThan(3);expect(Math.abs(ring!.y+8-target!.y)).toBeLessThan(3);
  const card2=(await page.locator('.lg-card').boundingBox())!,size=page.viewportSize()!;
  expect(card2.y).toBeGreaterThanOrEqual(0);expect(card2.y+card2.height).toBeLessThanOrEqual(size.height+1);expect(card2.x+card2.width).toBeLessThanOrEqual(size.width+1);
  await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByRole('dialog',{name:showAll?'Read what you hear':'Pick a side'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('.lg-card')).toHaveCount(0);
  if(showAll)await expect(page.getByRole('button',{name:'Guide me',exact:true})).toBeFocused();
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {contexts:number}).contexts)).toBe(0);
  if(!showAll)return;
  // Records without sides skip that stop rather than pointing at nothing.
  await page.getByRole('button',{name:'Select record: Moving Earth',exact:true}).click();
  await page.getByRole('button',{name:'Guide me',exact:true}).click();await expect(page.locator('.lg-card')).toContainText('/ 4');
});

const screens=[
  {name:'small phone',width:320,height:568},{name:'phone',width:390,height:844},{name:'phone landscape',width:844,height:390},
  {name:'tablet',width:768,height:1024},{name:'tablet landscape',width:1180,height:820},{name:'laptop',width:1280,height:800},{name:'desktop',width:1920,height:1080},
];
for(const theme of ['dark','light'])test(`Home and the Listen guide fit every screen, keep touch targets and pass axe (${theme})`,{tag:'@full'},async({page})=>{
  test.setTimeout(120_000);
  for(const screen of screens){
    await page.setViewportSize({width:screen.width,height:screen.height});
    await page.goto('/');await chooseAppearance(page,theme);await page.locator('h1').waitFor();
    expect(await fitsWidth(page),`${screen.name}: Home has no sideways scroll`).toBe(true);
    for(const control of [page.locator('.hi-hero .hi-primary'),page.getByRole('button',{name:'Next step',exact:true}),page.getByRole('button',{name:'Previous step',exact:true}),page.locator('.hi-shelf a').first()]){
      const box=(await control.boundingBox())!;expect(box.height,`${screen.name}: touch target`).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);
    }
    expect(await axe(page),`${screen.name}: Home axe`).toEqual([]);
    await page.goto('/listen?guide=1');const card=page.locator('.lg-card');await expect(card).toBeVisible();
    await page.waitForTimeout(500);const box=(await card.boundingBox())!;
    expect(box.x,`${screen.name}: guide card inside the window`).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(screen.width+1);
    expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(screen.height+1);
    expect(await fitsWidth(page),`${screen.name}: Listen has no sideways scroll`).toBe(true);
    expect(await axe(page),`${screen.name}: Listen with the guide open`).toEqual([]);
  }
});
