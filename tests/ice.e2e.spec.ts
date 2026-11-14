import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {chooseAppearance} from './appearanceControl';

// The Ice Year (record 06): NASA SVS 5046. Emulated browsers; audio renders to Chromium's silent fake output.
const events=(page:Page)=>page.evaluate(()=>window.terrajukeIce?.events??[]);
async function open(page:Page){
  await page.goto('/listen?record=ice');
  await expect(page.getByRole('heading',{name:'The Ice Year',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Play the ice year',exact:true})).toBeEnabled();
}

test('the shelf opens The Ice Year with NASA’s frame, source and the 5W1H explanation',async({page})=>{
  await open(page);
  await expect(page.getByRole('button',{name:'Select record: The Ice Year',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('img',{name:/NASA globe of the Arctic seen from above the North Pole on 15 September 2024/})).toBeVisible();
  const shown=page.locator('.ice-globe img.is-shown');await expect(shown).toHaveAttribute('src','/nasa/svs5046/2024-09-15.webp');
  expect(await shown.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth)).toBe(1600);
  const story=page.getByRole('region',{name:/The Ice Year: what you are hearing/});
  await expect(story.locator('dt')).toHaveText(['What is this sound?','Who made the data and the picture?','When is it from?','Where on Earth?','Why listen?','How does it become sound?']);
  await expect(story).toContainText('GCOM-W1');await expect(story).toContainText('at least 15% of the sea is frozen');
  await expect(story.getByRole('link',{name:/NASA SVS 5046/})).toHaveAttribute('href','https://svs.gsfc.nasa.gov/5046/');
  await expect(page.getByRole('list',{name:'Ice area each month, north of 50°N'}).getByRole('button')).toHaveCount(12);
});

test('Side A plays the twelve months in order, then reports completion; Escape stops',{tag:'@timing'},async({page})=>{
  test.setTimeout(40_000);await open(page);
  await page.getByLabel('Tempo',{exact:true}).fill('120');
  await page.getByRole('button',{name:'Play the ice year',exact:true}).click();
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await expect(page.getByTestId('ice-announcer')).toHaveText('The ice year is complete: from the March peak to the September low and back.',{timeout:15_000});
  expect((await events(page)).map(e=>e.month)).toEqual([0,1,2,3,4,5,6,7,8,9,10,11]);
  await expect(page.getByTestId('ice-caption')).toContainText('15 December 2024');
  await page.getByRole('button',{name:'Play the ice year',exact:true}).click();await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await page.getByRole('application',{name:/Arctic globe, the year of ice/}).press('Escape');
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);await expect(page.getByTestId('ice-announcer')).toHaveText('Stopped.');
});

test('months can be heard one at a time by button or arrow key',async({page})=>{
  await open(page);
  await page.getByRole('button',{name:/^March: 13\.\d million km²$/}).click();
  await expect(page.getByTestId('ice-caption')).toHaveText(/^15 March 2024: 13\.\d million km² of sea ice north of 50°N, the year’s peak$/);
  await expect(page.locator('.ice-globe img.is-shown')).toHaveAttribute('src','/nasa/svs5046/2024-03-15.webp');
  const globe=page.getByRole('application',{name:/Arctic globe, the year of ice/});
  await globe.focus();await globe.press('End');await expect(page.getByTestId('ice-caption')).toContainText('15 December 2024');
  await globe.press('ArrowRight');await expect(page.getByTestId('ice-caption')).toContainText('15 January 2024');
});

test('Side B: touching the Pole and moving by keyboard play each place’s ice season',async({page})=>{
  await open(page);
  await page.getByRole('button',{name:'Side B: touch the ice',exact:true}).click();
  const globe=page.getByRole('application',{name:/Arctic globe\. Arrow keys/});
  await globe.click();
  await expect(page.getByTestId('ice-announcer')).toHaveText(/^the Central Arctic Ocean, 89°N \d+°[EW]?: ice in all 12 months of 2024$/);
  await expect(page.locator('.ice-marker')).toBeVisible();
  for(let k=0;k<12;k++)await globe.press('ArrowDown');
  await expect(page.getByTestId('ice-announcer')).toHaveText(/(\d+ of 12 months|open water all year|all 12 months|too little open sea)/);
  await globe.press('Escape');await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

for(const theme of ['dark','light'])test(`The Ice Year fits phones and passes axe (${theme})`,{tag:'@full'},async({page})=>{
  test.setTimeout(60_000);
  for(const size of [{width:320,height:640},{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(size);await open(page);await chooseAppearance(page,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const month=(await page.getByRole('button',{name:/^January:/}).boundingBox())!;expect(month.height).toBeGreaterThanOrEqual(44);
    await page.locator('.ice-notes summary').click();
    const scan=await new AxeBuilder({page}).include('.jb-player').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(scan.violations.map(v=>({size:size.width,id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  }
});
