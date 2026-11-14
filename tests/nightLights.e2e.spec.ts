// Night Lights record (NASA SVS 5313): the browser's own analysis, both sides, keyboard and
// touch exploration, and that every sound arrives with its ring, caption and announcement.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Note = { hz: number; type: string; t: number };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __nl: Note[] };
    w.__nl = [];
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, when?: number) {
      w.__nl.push({ hz: this.frequency.value, type: this.type, t: performance.now() });
      return start.call(this, when);
    };
  });
});

const notes = (page: Page) => page.evaluate(() => (window as unknown as { __nl: Note[] }).__nl);
const now = (page: Page) => page.evaluate(() => performance.now());
const caption = (page: Page) => page.getByTestId('nl-caption');

async function openNightLights(page: Page, decade = false): Promise<void> {
  await page.goto('/listen');
  await page.getByRole('button', { name: 'Select record: Night Lights' }).click();
  await expect(page.getByRole('heading', { name: 'Night Lights' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'India', exact: true })).toBeEnabled({ timeout: 15_000 });
  if (decade) await expect.poll(() => page.evaluate(() => window.terrajukeNightLights?.regions?.length ?? 0), { timeout: 20_000 }).toBe(5);
}

test('the browser reads NASA’s map and twelve yearly frames with the validated results', async ({ page }) => {
  await openNightLights(page, true);
  const regions = await page.evaluate(() => window.terrajukeNightLights!.regions!);
  const by = Object.fromEntries(regions.map((r) => [r.id, r]));
  expect(by.world.trend).toBe('more');
  expect(by.world.ratio).toBeGreaterThan(1.15);
  expect(by.world.ratio).toBeLessThan(1.35);
  expect(by.india.change).toBe('more');
  expect(by.india.ratio).toBeGreaterThan(1.6);
  expect(by['western-europe'].change).toBe('less');
  expect(by['western-europe'].ratio).toBeLessThan(0.95);
  expect(by.ukraine.small).toBe(true);
  await page.getByText('Liner notes: what you are hearing, and how we checked it').click();
  await expect(page.locator('.nl-compare tbody tr')).toHaveCount(5);
  await expect(page.locator('.nl-compare tbody tr').filter({ hasText: 'Ukraine' })).toContainText('weak: small box');
});

test('Side A: India plays a rising pair with its ring, caption and announcement together', async ({ page }) => {
  await openNightLights(page);
  const t0 = await now(page);
  await page.getByRole('button', { name: 'India', exact: true }).click();
  await expect(caption(page)).toContainText('India map region · more light');
  await expect(page.getByTestId('nl-announcer')).toContainText('India map region · more light');
  const n = (await notes(page)).filter((x) => x.t > t0);
  expect(n[0].type).toBe('sawtooth');
  expect(n[1].hz).toBeGreaterThan(n[0].hz);
  await expect(page.locator('.nl-ring')).toHaveAttribute('data-direction', 'more');
  const ev = await page.evaluate(() => window.terrajukeNightLights!.events.at(-1)!);
  expect(ev.audioAt).not.toBeNull();
  expect(Math.abs(ev.shownAt - ev.audioAt!)).toBeLessThan(50);
  await expect(page.locator('.jb-deck')).toContainText('India map region · more light');
});

test('Side A Play visits NASA’s four regions, then the whole map; Western Europe falls', async ({ page }) => {
  await openNightLights(page);
  await page.getByRole('button', { name: 'Play the four regions' }).click();
  await expect(caption(page)).toContainText('Western Europe map region · less light');
  await expect(page.locator('.nl-ring')).toHaveAttribute('data-direction', 'less');
  await expect(caption(page)).toContainText('The whole map', { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Play the four regions' })).toBeVisible({ timeout: 5_000 });
});

test('Side B: India’s decade plays 12 yearly notes in step with NASA’s frames, ending on the change map', async ({ page }) => {
  await openNightLights(page, true);
  await page.getByRole('button', { name: 'Side B: hear the decade' }).click();
  const t0 = await now(page);
  await page.getByRole('button', { name: 'India', exact: true }).click();
  await expect(page.locator('.nl-year-badge')).toHaveText('2016', { timeout: 5_000 });
  await expect(page.locator('img.nl-year-frame')).toHaveAttribute('src', '/nasa/svs5313/decade/2016.jpg');
  await expect(caption(page)).toContainText('2016 · India map region');
  await expect(caption(page)).toContainText('NASA’s change map · India map region', { timeout: 10_000 });
  await expect(page.locator('img.nl-year-frame')).toHaveCount(0);
  const years = (await notes(page)).filter((x) => x.t > t0 && x.type === 'triangle');
  expect(years).toHaveLength(12);
  expect(years[11].hz / years[0].hz).toBeGreaterThan(1.5);
  await expect(page.getByTestId('nl-announcer')).toContainText('India map region: brighter over the decade', { timeout: 5_000 });
});

test('the year slider shows any NASA year and plays it; its last position is the change map', async ({ page }) => {
  await openNightLights(page, true);
  await page.getByRole('button', { name: 'Side B: hear the decade' }).click();
  const slider = page.getByRole('slider', { name: 'NASA yearly frame' });
  await expect(slider).toHaveAttribute('aria-valuetext', 'Change map, 2012 to 2023');
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('img.nl-year-frame')).toHaveAttribute('src', '/nasa/svs5313/decade/2012.jpg');
  await expect(caption(page)).toContainText('2012 · The whole map');
  await page.keyboard.press('End');
  await expect(page.locator('img.nl-year-frame')).toHaveCount(0);
  await expect(caption(page)).toContainText('NASA’s change map · The whole map');
});

test('keyboard: arrows describe cells, Enter plays, End jumps to a NASA region, D plays the decade, Escape stops', async ({ page }) => {
  await openNightLights(page, true);
  const map = page.getByRole('application', { name: /Night-lights map/ });
  await map.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('nl-announcer')).toContainText('Column 26 of 32, row 4 of 9');
  await page.keyboard.press('End');
  await expect(caption(page)).toContainText('Western Europe map region');
  await page.keyboard.press('d');
  await expect(page.locator('.nl-year-badge')).toBeVisible({ timeout: 3_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.nl-year-badge')).toBeVisible();
  const count = (await notes(page)).length;
  await page.waitForTimeout(900);
  expect((await notes(page)).length).toBe(count);
  await expect(page.getByTestId('nl-announcer')).toHaveText('Stopped.');
});

test('a tap on the map plays the cell under it and moves the focus there', async ({ page }, info) => {
  await openNightLights(page);
  await page.locator('.nl-map').scrollIntoViewIfNeeded();
  const box = (await page.locator('.nl-map').boundingBox())!;
  // The centre of cell (column 28, row 4), inside India's box on NASA's map (x 847–881, y 94–129 of 1024 × 288).
  const x = box.x + ((27.5 * 32) / 1024) * box.width, y = box.y + ((3.5 * 32) / 288) * box.height;
  if (info.project.use.hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(caption(page)).toContainText('Column 28 of 32, row 4 of 9');
  await expect(page.locator('.nl-ring')).toHaveCount(1);
});

test('axe finds no violations on the Night Lights record with its liner notes open', async ({ page }) => {
  await openNightLights(page, true);
  await page.getByText('Liner notes: what you are hearing, and how we checked it').click();
  const results = await new AxeBuilder({ page }).include('.jb-player').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('tempo and beats per bar change timing and accents only: 60 BPM, 3 per bar, clicks on each downbeat', async ({ page }) => {
  await openNightLights(page, true);
  await page.getByRole('button', { name: 'Side B: hear the decade' }).click();
  const tempo = page.getByRole('slider', { name: 'Tempo' });
  await tempo.focus();
  await page.keyboard.press('Home');
  await expect(tempo).toHaveAttribute('aria-valuetext', '60 beats per minute');
  await page.getByRole('group', { name: 'Beats per bar' }).getByRole('button', { name: '3', exact: true }).click();
  await page.getByLabel('Metronome click').check();
  const t0 = await now(page);
  await page.getByRole('button', { name: 'India', exact: true }).click();
  await expect(caption(page)).toContainText('bar 2, beat 1', { timeout: 6_000 });
  await expect(caption(page)).toContainText('NASA’s change map · India map region', { timeout: 16_000 });
  const all = (await notes(page)).filter((n) => n.t > t0);
  const years = all.filter((n) => n.type === 'triangle');
  const accents = all.filter((n) => Math.round(n.hz) === 2093);
  const clicks = all.filter((n) => Math.round(n.hz) === 1568);
  expect(years).toHaveLength(12);
  expect(accents).toHaveLength(4); // years 1, 4, 7, 10
  expect(clicks).toHaveLength(8);
  const gaps = years.slice(1).map((n, i) => n.t - years[i].t);
  for (const g of gaps) expect(Math.abs(g - 1000)).toBeLessThan(200);
  // Pitch is unchanged by tempo: the same twelve notes as at the default tempo.
  expect(years[11].hz / years[0].hz).toBeGreaterThan(1.5);
});

test('the 3D jukebox follows the chosen record and knows when it plays; it is hidden from assistive technology', async ({ page }) => {
  await page.goto('/listen');
  const stage = page.locator('.jb-stage');
  await expect(stage).toHaveAttribute('data-stage-selected', 'spiral');
  await expect(stage).toHaveAttribute('aria-hidden', 'true');
  await expect(stage.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Select record: Night Lights' }).click();
  await expect(stage).toHaveAttribute('data-stage-selected', 'nightlights');
  await expect(page.getByRole('button', { name: 'India', exact: true })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Play the four regions' }).click();
  await expect(stage).toHaveAttribute('data-stage-playing', 'true');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(stage).toHaveAttribute('data-stage-playing', 'false');
});

test('Mystery Place conceals the place while it plays, then reveals it with the clue that was in the sound', async ({ page }) => {
  // Draw the last place in the pool (whole map, Western Europe, India): India.
  await page.addInitScript(() => { Math.random = () => 0.9; });
  await openNightLights(page, true);
  await page.getByRole('button', { name: 'Side B: hear the decade' }).click();
  await page.getByRole('button', { name: 'Play a Mystery Place' }).click();
  const panel = page.getByRole('region', { name: 'Mystery Place' });
  await expect(panel).toHaveAttribute('data-mystery-phase', 'playing');
  await expect(caption(page)).toContainText('Mystery place', { timeout: 5_000 });
  // Nothing gives the answer away while it plays.
  for (const where of [caption(page), page.getByTestId('nl-announcer'), page.locator('.jb-readout')]) await expect(where).not.toContainText('India');
  await expect(page.locator('.nl-place-box')).toHaveCount(0);
  await expect(page.locator('.nl-ring')).toHaveClass(/nl-area/);
  await expect(page.getByRole('button', { name: 'India', exact: true })).toBeDisabled();
  await expect(panel).toHaveAttribute('data-mystery-phase', 'guessing', { timeout: 15_000 });
  await expect(page.getByTestId('nl-announcer')).toContainText('Which place did you hear?');
  await expect(panel.getByRole('radio')).toHaveCount(3);
  await panel.getByRole('radio', { name: 'India map region' }).check();
  await panel.getByRole('button', { name: 'Reveal the place' }).click();
  await expect(page.getByTestId('nl-mystery-answer')).toHaveText(/^Yes: it was India map region\. Its brightness in 2023 was 1\.8× that of 2012, so you heard a melody that climbs\. NASA’s change map closes the record with more light\.$/);
  await expect(page.locator('.nl-place-box')).toHaveCount(1);
  await expect(caption(page)).toContainText('Revealed · India map region · more light');
});

test('a wrong Mystery Place guess is answered kindly, and the next round is a different place', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.4; }); // Western Europe first
  await openNightLights(page, true);
  await page.getByRole('button', { name: 'Side B: hear the decade' }).click();
  await page.getByRole('button', { name: 'Play a Mystery Place' }).click();
  const panel = page.getByRole('region', { name: 'Mystery Place' });
  await panel.getByRole('radio', { name: 'India map region' }).check();
  await panel.getByRole('button', { name: 'Reveal the place' }).click();
  await expect(page.getByTestId('nl-mystery-answer')).toContainText('It was Western Europe map region, not India map region.');
  await expect(page.getByTestId('nl-mystery-answer')).toContainText('a melody that steps down');
  await panel.getByRole('button', { name: 'Another Mystery Place' }).click();
  await expect(panel).toHaveAttribute('data-mystery-phase', 'playing');
  await panel.getByRole('button', { name: 'Reveal the place' }).click();
  await expect(page.getByTestId('nl-mystery-answer')).not.toContainText('Western Europe');
});
