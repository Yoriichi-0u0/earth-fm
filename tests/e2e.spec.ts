import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('playback moves the observation and chart; pause and seeking preserve control', async ({ page }) => {
  await page.goto('/?tempo=120');
  const position = page.getByRole('slider', { name: 'Playback position' });
  await expect(position).toHaveValue('0');
  await page.getByRole('button', { name: 'Play track', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause track', exact: true })).toBeVisible();
  await expect.poll(async () => Number(await position.inputValue())).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause track', exact: true }).click();
  const pausedPosition = await position.inputValue();
  const observation = await position.getAttribute('aria-valuetext');
  await expect(page.locator('.data-chart')).toHaveAttribute('aria-label', new RegExp(observation!.split(',')[0]));
  // Two full note intervals verify that pause cancels pending audio-clock updates.
  await page.waitForTimeout(1_100);
  await expect(position).toHaveValue(pausedPosition);
  await position.focus();
  await position.press('ArrowRight');
  await expect(position).toHaveValue(String(Number(pausedPosition) + 1));
  await expect(page.getByRole('button', { name: 'Play track', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart track' }).click();
  await expect(position).toHaveValue('0');
});

test('all four recordings update the player, coverage, and original measurements', async ({ page }) => {
  await page.goto('/');
  const recordings = [
    { title: 'A warmer world', chart: 'Global temperature', coverage: 'Global land and ocean average' },
    { title: 'The carbon rhythm', chart: 'Atmospheric CO₂', coverage: 'Mauna Loa atmospheric reference record, Hawaiʻi' },
    { title: 'Oceans on the rise', chart: 'Sea level rise', coverage: 'Global mean sea level from satellite altimetry' },
    { title: 'The vanishing ice', chart: 'Arctic sea ice', coverage: 'Northern Hemisphere sea ice extent' },
  ];
  for (const recording of recordings) {
    const card = page.locator('.track-select').filter({ has: page.getByRole('heading', { name: recording.title, exact: true }) });
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.track-select[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('#listen').getByRole('heading', { name: recording.title, exact: true })).toBeVisible();
    await expect(page.locator('.player-heading')).toContainText(recording.coverage);
    await expect(page.locator('.data-chart')).toHaveAttribute('aria-label', new RegExp(recording.chart));
    await expect(page.getByRole('slider', { name: 'Playback position' })).toHaveValue('0');
  }
});

test('a custom mix can be shared through the address-bar fallback and reopened', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new DOMException('Clipboard denied for fallback test', 'NotAllowedError'); } },
    });
  });
  await page.goto('/?track=co2&sound=piano&tempo=120&from=2000&to=2005');
  await page.getByRole('button', { name: 'Make it your own' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your signal. Your sound.' });
  await expect(dialog.getByRole('button', { name: /Keys/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: /Pulse/ }).click();
  await expect(dialog.getByRole('button', { name: /Pulse/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('slider', { name: 'TEMPO' }).focus();
  await page.keyboard.press('End');
  await expect(dialog.getByRole('slider', { name: 'TEMPO' })).toHaveValue('160');
  await dialog.getByRole('combobox', { name: 'Start year' }).selectOption('2002');
  await dialog.getByRole('combobox', { name: 'End year' }).selectOption('2004');
  await dialog.getByRole('button', { name: 'Copy mix link' }).click();
  await expect(page.getByRole('status')).toContainText('Mix saved in the address bar');
  const sharedUrl = new URL(page.url());
  expect(Object.fromEntries(sharedUrl.searchParams)).toEqual({ track: 'co2', sound: 'pulse', tempo: '160', from: '2002', to: '2004' });
  await page.reload();
  await expect(page.locator('#listen').getByRole('heading', { name: 'The carbon rhythm' })).toBeVisible();
  await expect(page.locator('.data-chart')).toHaveAttribute('aria-label', /3 annual observations from 2002 to 2004/);
  await page.getByRole('button', { name: 'Make it your own' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Pulse/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog').getByRole('slider', { name: 'TEMPO' })).toHaveValue('160');
});

test('saved recordings survive reload and can be played from the collection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Save A warmer world', exact: true }).click();
  await page.getByRole('button', { name: 'Save The vanishing ice', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('earth-fm-saved') ?? '[]'))).toEqual(['temperature', 'sea-ice']);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove A warmer world', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Remove The vanishing ice', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /My collection/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Your collection.' });
  await expect(dialog).toContainText('A warmer world');
  await expect(dialog).toContainText('The vanishing ice');
  await dialog.getByRole('button', { name: /^The vanishing ice/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#listen').getByRole('heading', { name: 'The vanishing ice' })).toBeVisible();
});

test('the explanation dialog traps focus and Escape returns to its trigger', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'How it works' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'A planet you can listen to.' });
  const close = dialog.getByRole('button', { name: 'Close dialog' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator('a').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('audio export downloads a playable stereo PCM WAV with real sample data', async ({ page }) => {
  await page.goto('/?track=temperature&sound=piano&tempo=160&from=2000&to=2002');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download your track' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('earth-fm-temperature-2000-2002.wav');
  expect(await download.failure()).toBeNull();
  const wav = await readFile((await download.path())!);
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
  expect(wav.readUInt16LE(20)).toBe(1);
  expect(wav.readUInt16LE(22)).toBe(2);
  expect(wav.readUInt32LE(24)).toBe(24_000);
  expect(wav.readUInt16LE(34)).toBe(16);
  expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
  expect(wav.subarray(44).some(byte => byte !== 0)).toBeTruthy();
  await expect(page.getByRole('status')).toContainText('Your WAV is ready');
});

test('mobile layout fits the viewport, navigation works, and the globe rotates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Visual radio' }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.locator('.earth-globe').scrollIntoViewIfNeeded();
  const coordinates = page.locator('.earth-globe__coordinates');
  const before = await coordinates.textContent();
  const globe = await page.locator('.earth-globe__drag-surface').boundingBox();
  expect(globe).not.toBeNull();
  const x = globe!.x + globe!.width * 0.64;
  const y = globe!.y + globe!.height * 0.62;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 45, y - 16, { steps: 8 });
  await page.mouse.up();
  await expect(coordinates).not.toHaveText(before!);
  await expect(page.locator('.earth-globe')).not.toHaveClass(/earth-globe--dragging/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test('a static NASA visual scans 48 strips and pauses at the current strip', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('#visual-radio');
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  await expect(visual.locator('.visual-spectrum i')).toHaveCount(48);
  await expect(visual.locator('.visual-scan')).toHaveText('01 / 48');
  const initialActiveStrip = await visual.locator('.visual-spectrum i').evaluateAll(elements => elements.findIndex(element => element.classList.contains('active')));
  await visual.getByRole('button', { name: 'Hear this visual' }).click();
  await expect(visual.getByRole('button', { name: 'Pause visual' })).toBeVisible();
  await expect.poll(() => visual.locator('.visual-spectrum i').evaluateAll(elements => elements.findIndex(element => element.classList.contains('active')))).toBeGreaterThan(initialActiveStrip);
  await expect(visual.locator('.visual-scan')).not.toHaveText('01 / 48');
  await visual.getByRole('button', { name: 'Pause visual' }).click();
  const pausedScan = await visual.locator('.visual-scan').textContent();
  await page.waitForTimeout(1_100);
  await expect(visual.locator('.visual-scan')).toHaveText(pausedScan!);
  await visual.getByRole('button', { name: 'Restart visual scan' }).click();
  await expect(visual.locator('.visual-scan')).toHaveText('01 / 48');
  await visual.getByRole('button', { name: /Inside the Earth Information Center/ }).click();
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  await expect(visual.locator('.visual-screen-caption')).toContainText('Inside the Earth Information Center');
});

test('animated visual playback advances the video and samples changing frame pixels', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('#visual-radio');
  await visual.getByRole('button', { name: /Untethered: an Earth perspective/ }).click();
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  const animation = visual.getByRole('checkbox', { name: /Follow the animation/ });
  await expect(animation).not.toBeChecked();
  await animation.check();
  const video = visual.locator('video');
  const initialSpectrum = await visual.locator('.visual-spectrum i').evaluateAll(elements => elements.map(element => (element as HTMLElement).style.height).join(','));
  await visual.getByRole('button', { name: 'Hear this visual' }).click();
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.25);
  await expect.poll(() => visual.locator('.visual-spectrum i').evaluateAll(elements => elements.map(element => (element as HTMLElement).style.height).join(',')), { timeout: 10_000 }).not.toBe(initialSpectrum);
  await visual.getByRole('button', { name: 'Pause visual' }).click();
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBeTruthy();
});

test('visual and climate recordings stop one another before starting', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('#visual-radio');
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  await visual.getByRole('button', { name: 'Hear this visual' }).click();
  await expect(visual.getByRole('button', { name: 'Pause visual' })).toBeVisible();
  await page.getByRole('button', { name: 'Play track', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause track', exact: true })).toBeVisible();
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeVisible();
  await visual.getByRole('button', { name: 'Hear this visual' }).click();
  await expect(visual.getByRole('button', { name: 'Pause visual' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play track', exact: true })).toBeVisible();
  const stoppedClimatePosition = await page.getByRole('slider', { name: 'Playback position' }).inputValue();
  await page.waitForTimeout(800);
  await expect(page.getByRole('slider', { name: 'Playback position' })).toHaveValue(stoppedClimatePosition);
});

test('a local white image maps to D5; unsupported and broken files recover gracefully', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('#visual-radio');
  const whitePng = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await visual.locator('#upload-visual').setInputFiles({ name: 'white-planet.png', mimeType: 'image/png', buffer: Buffer.from(whitePng, 'base64') });
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  await expect(visual.locator('.visual-screen-caption')).toContainText('white-planet.png');
  await expect(visual.getByRole('img', { name: 'Uploaded visualization: white-planet.png' })).toBeVisible();
  await expect(visual.locator('.visual-note strong')).toHaveText('D5');
  await expect(visual.locator('.visual-note span')).toHaveText('100% LUMA');
  await expect(visual.locator('.frame-options button[aria-pressed="true"]')).toHaveCount(0);
  await visual.getByRole('button', { name: 'Hear this visual' }).click();
  await expect(visual.getByRole('button', { name: 'Pause visual' })).toBeVisible();
  await visual.getByRole('button', { name: 'Pause visual' }).click();
  await visual.locator('#upload-visual').setInputFiles({ name: 'not-a-picture.txt', mimeType: 'text/plain', buffer: Buffer.from('Not an image') });
  await expect(visual.getByRole('alert')).toContainText('Choose a PNG, JPEG, WebP, GIF, MP4, or WebM file');
  await expect(visual.locator('.visual-note strong')).toHaveText('D5');
  await visual.locator('#upload-visual').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('A broken PNG') });
  await expect(visual.getByRole('alert')).toContainText('The image could not load');
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeDisabled();
  await visual.getByRole('button', { name: /Earth after dark/ }).click();
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  await expect(visual.getByRole('alert')).toHaveCount(0);
});

test('a visual soundtrack downloads a nonempty stereo RIFF WAV', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('#visual-radio');
  await expect(visual.getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  await visual.getByRole('slider', { name: 'SCAN TEMPO' }).focus();
  await page.keyboard.press('End');
  const downloadEvent = page.waitForEvent('download');
  await visual.getByRole('button', { name: 'Download visual soundtrack' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('earth-fm-visual-night-lights.wav');
  expect(await download.failure()).toBeNull();
  const wav = await readFile((await download.path())!);
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
  expect(wav.readUInt16LE(20)).toBe(1);
  expect(wav.readUInt16LE(22)).toBe(2);
  expect(wav.readUInt32LE(24)).toBe(24_000);
  expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
  expect(wav.subarray(44).some(byte => byte !== 0)).toBeTruthy();
  await expect(visual.getByRole('status')).toContainText('Visual soundtrack downloaded');
});

test('the page and mix dialog have no automated WCAG A or AA violations', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#visual-radio').getByRole('button', { name: 'Hear this visual' })).toBeEnabled();
  for (const state of ['page', 'mix-dialog']) {
    if (state === 'mix-dialog') await page.getByRole('button', { name: 'Make it your own' }).click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await testInfo.attach(`accessibility-${state}.json`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    expect.soft(result.violations.map(violation => ({ id: violation.id, impact: violation.impact, targets: violation.nodes.map(node => node.target) })), `Accessibility violations in ${state}`).toEqual([]);
  }
});
