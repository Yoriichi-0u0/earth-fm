// The Air We Share (NASA SVS 5669): the browser's own analysis, both sides, the mixer, keyboard
// exploration, the record journey and accessibility.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const events = (page: Page) => page.evaluate(() => window.terrajukeAir?.events ?? []);
const announcer = (page: Page) => page.getByTestId('air-announcer');
const caption = (page: Page) => page.getByTestId('air-caption');

async function openAir(page: Page): Promise<void> {
  await page.goto('/listen');
  await page.getByRole('button', { name: 'Select record: The Air We Share' }).click();
  await expect(page.getByRole('heading', { name: 'The Air We Share', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play the world' })).toBeEnabled({ timeout: 20_000 });
}

test('the browser reads NASA’s aerosol map with the same coverage the unit tests pin', async ({ page }) => {
  await openAir(page);
  const shares = await page.evaluate(() => window.terrajukeAir!.shares!);
  expect(shares.sulfate).toBeCloseTo(0.164, 2);
  expect(shares.seaSalt).toBeCloseTo(0.0665, 2);
  expect(shares.dust).toBeCloseTo(0.0308, 2);
  expect(shares.blackCarbon).toBeCloseTo(0.011, 2);
  await expect(page.locator('.air-strip')).toHaveCount(4);
  await expect(page.locator('.air-strip').first()).toContainText('of the map');
});

test('Side A turns the whole world under the needle, west to east, and stops cleanly', async ({ page }) => {
  await openAir(page);
  await page.getByRole('button', { name: 'Play the world' }).click();
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await expect.poll(async () => (await events(page)).length, { timeout: 10_000 }).toBeGreaterThan(4);
  const log = await events(page);
  expect(log.every((e) => e.scope === 'world')).toBe(true);
  expect(log.map((e) => e.index).slice(0, 5)).toEqual([0, 1, 2, 3, 4]);
  expect(log.every((e) => e.aerosols.length > 0)).toBe(true);
  await expect(caption(page)).toContainText('°W');
  await expect(page.locator('.air-needle')).toHaveCount(1);
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
  const stoppedAt = (await events(page)).length;
  await page.waitForTimeout(900);
  expect((await events(page)).length).toBe(stoppedAt);
});

test('keyboard and touch: arrows hear one slice at a time and wrap around the world; a tap jumps; Escape stops', async ({ page }) => {
  test.setTimeout(45_000);
  await openAir(page);
  const map = page.getByRole('application', { name: /Aerosol map/ });
  await map.focus();
  await page.keyboard.press('Home');
  await expect(announcer(page)).toContainText('177°W');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await events(page)).at(-1)?.index).toBe(1);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await events(page)).at(-1)?.index).toBe(63);
  await expect(announcer(page)).toContainText('177°E');
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * (32.5 / 64), box.y + box.height * 0.5); // the slice just east of 0°, over the Sahara
  await expect.poll(async () => (await events(page)).at(-1)?.index).toBe(32);
  await expect(announcer(page)).toContainText(/dust near \d+°N/);
  await map.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

test('mixer: Solo keeps only that track audible, Mute silences one, and neither changes the score', async ({ page }) => {
  await openAir(page);
  await page.getByRole('button', { name: 'Solo Dust' }).click();
  await expect(page.getByRole('button', { name: 'Solo Dust' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.terrajukeAir!.audible)).toEqual({ blackCarbon: false, dust: true, seaSalt: false, sulfate: false });
  await page.getByRole('button', { name: 'Solo Dust' }).click();
  await page.getByRole('button', { name: 'Mute Sulfate' }).click();
  expect(await page.evaluate(() => window.terrajukeAir!.audible)).toEqual({ blackCarbon: true, dust: true, seaSalt: true, sulfate: false });
  await page.getByRole('button', { name: 'Play the world' }).click();
  await expect.poll(async () => (await events(page)).length, { timeout: 10_000 }).toBeGreaterThan(2);
  expect((await events(page)).some((e) => e.aerosols.includes('sulfate'))).toBe(true);
  await page.getByRole('button', { name: 'Stop' }).click();
});

test('Side B: a NASA story plays its own box and tells NASA’s story', async ({ page }) => {
  await openAir(page);
  await page.getByRole('button', { name: 'The Saharan dust journey' }).click();
  await expect(announcer(page)).toContainText('Desert dust from the Sahara');
  await expect.poll(async () => (await events(page)).filter((e) => e.scope === 'sahara').length, { timeout: 10_000 }).toBeGreaterThan(2);
  expect((await events(page)).filter((e) => e.scope === 'sahara').every((e) => e.aerosols.includes('dust'))).toBe(true);
  await expect(page.locator('.air-story-box.is-on')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Side B: NASA’s six stories' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'The Saharan dust journey' }).click();
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

test('every NASA record shows where it comes from, ending with the listener', async ({ page }) => {
  await openAir(page);
  const journey = page.locator('[data-journey="air"]');
  await expect(journey).toContainText('NASA GEOS model, Goddard');
  await expect(journey.locator('.rj-you')).toContainText('Listening at');
  await page.getByRole('button', { name: 'Select record: Climate Spiral' }).click();
  await expect(page.locator('[data-journey="spiral"]')).toContainText('NASA GISS, New York');
});

test('axe finds no violations on The Air We Share with its liner notes open', async ({ page }) => {
  await openAir(page);
  await page.getByText('Liner notes: four aerosols, four instruments, and how we checked them').click();
  await expect(page.locator('.air-story-list li')).toHaveCount(6);
  const results = await new AxeBuilder({ page }).include('.jb-player').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) test(`${theme}: The Air We Share fits phones and tablets without sideways scrolling`,{tag:'@full'}, async ({ page }) => {
  await page.emulateMedia({ colorScheme: theme });
  await openAir(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${viewport.width}px`).toBe(true);
    for (const button of await page.locator('.air-strip-buttons button, .air-stories button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(36);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  }
  const scan = await new AxeBuilder({ page }).include('.jb-player').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});

test('Meet the four instruments plays each aerosol alone, in turn, and names it for the screen reader', async ({ page }) => {
  await openAir(page);
  await page.getByRole('button', { name: 'Meet the four instruments' }).click();
  await expect(announcer(page)).toContainText('Black carbon (smoke): Smoky brass. Low in the south, high in the north.');
  await expect(page.getByRole('button', { name: 'Meet the four instruments' })).toBeVisible({ timeout: 15_000 });
  await expect(announcer(page)).toContainText('Those are the four instruments.');
  const voices = (await events(page)).filter((e) => e.scope === 'meet' && e.aerosols.length).map((e) => e.aerosols);
  expect(voices).toEqual([...Array(3).fill(['blackCarbon']), ...Array(3).fill(['dust']), ...Array(3).fill(['seaSalt']), ...Array(3).fill(['sulfate'])]);
});
