// Currents of Heat (NASA SVS 3912): the browser's own reading, pole to pole, touch and keyboard, accessibility.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const events = (page: Page) => page.evaluate(() => window.terrajukeOcean?.events ?? []);
const announcer = (page: Page) => page.getByTestId('ocean-announcer');

async function openOcean(page: Page): Promise<void> {
  await page.goto('/listen');
  await page.getByRole('button', { name: 'Select record: Currents of Heat' }).click();
  await expect(page.getByRole('heading', { name: 'Currents of Heat', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play pole to pole' })).toBeEnabled({ timeout: 20_000 });
}

test('pole to pole plays 48 bands north to south; the tropics play warmest and highest', async ({ page }) => {
  await openOcean(page);
  await page.getByRole('button', { name: 'Play pole to pole' }).click();
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/);
  await expect.poll(async () => (await events(page)).length, { timeout: 12_000 }).toBeGreaterThan(24);
  const log = await events(page);
  expect(log.slice(0, 5).map((e) => e.index)).toEqual([0, 1, 2, 3, 4]);
  const temps = log.filter((e) => e.temp !== null).map((e) => e.temp!);
  expect(Math.max(...temps)).toBeGreaterThan(27);
  expect(temps[0]).toBeLessThan(8);
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});

test('touch the ocean: arrows and taps read a place’s temperature; land is silent', async ({ page }) => {
  await openOcean(page);
  await page.getByRole('button', { name: 'Side B: touch the ocean' }).click();
  const map = page.getByRole('application', { name: /Ocean map/ });
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * ((150 + 180) / 360), box.y + box.height * ((90 - 2) / 180)); // equatorial western Pacific
  await expect(announcer(page)).toContainText(/°N, 1[45]\d°E: 2[7-9]\.\d °C, tropical/);
  await page.mouse.click(box.x + box.width * ((10 + 180) / 360), box.y + box.height * ((90 - 22) / 180)); // the Sahara
  await expect(announcer(page)).toContainText('land, ice or no current traces');
  await map.focus(); await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await events(page)).at(-1)?.kind).toBe('cell');
});

test('the liner notes show the regional readings, and axe finds no violations', async ({ page }) => {
  await openOcean(page);
  await page.getByText('Liner notes: reading the ocean’s temperature from NASA’s colours').click();
  await expect(page.locator('.ocean-notes .nl-compare tbody tr')).toHaveCount(6);
  await expect(page.locator('.ocean-notes')).toContainText('Western Pacific warm pool');
  const scan = await new AxeBuilder({ page }).include('.jb-player').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) test(`${theme}: Currents of Heat fits phones and tablets without sideways scrolling`, { tag: '@full' }, async ({ page }) => {
  await page.emulateMedia({ colorScheme: theme });
  await openOcean(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${viewport.width}px`).toBe(true);
    const map = (await page.getByRole('application', { name: /Ocean map/ }).boundingBox())!;
    if (viewport.width <= 768) expect(map.width, 'on phones and tablets the map spans most of the screen').toBeGreaterThan(viewport.width * 0.5);
  }
  const scan = await new AxeBuilder({ page }).include('.jb-player').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});
