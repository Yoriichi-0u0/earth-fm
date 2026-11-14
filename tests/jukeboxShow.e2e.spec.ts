// Jukebox Show: the jukebox plays every NASA record in turn, announces each one, and stops on request.
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const announcer = (page: import('@playwright/test').Page) => page.getByTestId('show-announcer');

test('Play the whole jukebox starts record 1 by itself, and Stop, Escape or choosing a record ends the show', async ({ page }) => {
  await page.goto('/listen');
  const start = page.getByRole('button', { name: 'Play the whole jukebox' });
  await start.click();
  await expect(announcer(page)).toHaveText('Now playing record 1 of 7: Climate Spiral, NASA SVS 5190.');
  const bar = page.getByRole('group', { name: 'Jukebox show' });
  await expect(bar).toContainText('01 / 07');
  await expect(page.getByRole('button', { name: 'Stop the show' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/, { timeout: 15_000 });
  const scan = await new AxeBuilder({ page }).include('.jb-show-bar').include('.jb-intro').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
  await bar.getByRole('button', { name: 'Stop' }).click();
  await expect(bar).toHaveCount(0);
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
  await expect(announcer(page)).toHaveText('Show stopped.');

  await start.click();
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/, { timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(bar).toHaveCount(0);
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);

  await start.click();
  await expect(bar).toBeVisible();
  await page.getByRole('button', { name: 'Select record: The Ice Year' }).click();
  await expect(bar).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The Ice Year', exact: true })).toBeVisible();
});

test('when a record finishes, the show hands over to the next one and plays it', { tag: ['@full', '@timing'] }, async ({ page }) => {
  test.setTimeout(75_000);
  await page.goto('/listen');
  await page.getByRole('button', { name: 'Play the whole jukebox' }).click();
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/, { timeout: 15_000 });
  await expect(announcer(page)).toHaveText('Now playing record 2 of 7: Night Lights, NASA SVS 5313 · EIC Version.', { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Night Lights', exact: true })).toBeVisible();
  await expect(page.locator('.jb-deck')).toHaveClass(/is-playing/, { timeout: 20_000 });
  await expect(page.getByRole('group', { name: 'Jukebox show' })).toContainText('02 / 07');
  await page.getByRole('button', { name: 'Stop the show' }).click();
  await expect(page.locator('.jb-deck')).not.toHaveClass(/is-playing/);
});
