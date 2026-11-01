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

test('Climate Explore selects real monthly values and schedules the mapped electronic frequency', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { frequencies: [] as number[], active: 0, contexts: 0 };
    (window as typeof window & { climateAudioEvidence: typeof state }).climateAudioEvidence = state;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor() { super(); state.contexts++; }
      createOscillator() {
        const node = super.createOscillator();
        const start = node.start.bind(node);
        const setFrequency = node.frequency.setValueAtTime.bind(node.frequency);
        let scheduledFrequency = node.frequency.value;
        node.frequency.setValueAtTime = (value, when) => { scheduledFrequency = value; return setFrequency(value, when); };
        node.start = (when?: number) => { state.frequencies.push(scheduledFrequency); state.active++; start(when); };
        node.addEventListener('ended', () => { state.active--; });
        return node;
      }
    };
  });
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/#climate-spiral');
  const scene = page.locator('#climate-spiral');
  const measurement = scene.locator('.climate-measurement');
  await expect(measurement).toContainText('January 2025');
  await expect(measurement).toContainText('+1.37°C');
  await page.screenshot({ path: 'test-results/climate-explore-desktop.png', fullPage: false });
  await expect(scene.locator('.climate-months button[aria-pressed="true"]')).toHaveAccessibleName('January');
  await expect.poll(() => page.evaluate(() => (window as any).climateAudioEvidence.contexts)).toBe(0);
  await scene.getByRole('button', { name: 'Hear this month', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).climateAudioEvidence.frequencies)).toEqual([440, 880]);
  await scene.getByRole('button', { name: 'Stop note', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).climateAudioEvidence.active)).toBe(0);
  await scene.getByRole('combobox', { name: 'Choose a year' }).selectOption('2000');
  const beforeMarker = await scene.locator('.climate-month-marker circle').getAttribute('cx');
  await scene.getByRole('button', { name: 'February', exact: true }).click();
  await expect(measurement).toContainText('February 2000');
  await expect(measurement).toContainText('+0.56°C');
  await expect(scene.locator('.climate-band-readout')).toContainText('BAND 4 OF 5');
  await expect(scene.locator('.climate-month-marker circle')).not.toHaveAttribute('cx', beforeMarker!);
  await expect.poll(() => page.evaluate(() => Math.abs((window as any).climateAudioEvidence.frequencies.at(-2) - 391.995436))).toBeLessThan(0.001);
  await scene.getByRole('button', { name: 'Stop note', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).climateAudioEvidence.active)).toBe(0);
  await scene.getByRole('combobox', { name: 'Choose a year' }).selectOption('1880');
  await scene.getByRole('button', { name: 'January', exact: true }).click();
  await expect(measurement).toContainText('−0.19°C'.replace('−', '-'));
  await expect(scene.locator('.climate-band-readout')).toContainText('BAND 2 OF 5');
  await expect.poll(() => page.evaluate(() => Math.abs((window as any).climateAudioEvidence.frequencies.at(-2) - 293.664768))).toBeLessThan(0.001);
  expect(requests.every(url => url.startsWith('http://127.0.0.1:5173/') || url.startsWith('data:'))).toBeTruthy();
  await scene.locator('summary').click();
  await expect(scene.getByRole('link', { name: 'Fixed source CSV' })).toHaveAttribute('href', '/data/sources/gistemp-global-monthly-2026-10-18.csv');
});

test('Climate Explore handles unavailable months and remains usable with keyboard navigation', async ({ page }) => {
  await page.goto('/#climate-spiral');
  const scene = page.locator('#climate-spiral');
  const slider = scene.getByRole('slider', { name: 'Selected climate month' });
  await slider.focus();
  await slider.press('End');
  await expect(scene.locator('.climate-measurement')).toContainText('December 2025');
  await scene.getByRole('combobox', { name: 'Choose a year' }).selectOption('2026');
  await expect(scene.locator('.climate-measurement')).toContainText('Not available');
  await expect(scene.getByRole('button', { name: 'Hear this month' })).toBeDisabled();
  await expect(scene.getByRole('button', { name: 'October — no observation', exact: true })).toBeDisabled();
  await expect(scene.getByRole('button', { name: 'November — no observation', exact: true })).toBeDisabled();
  await expect(scene.getByRole('button', { name: 'December — no observation', exact: true })).toBeDisabled();
  await expect(scene.locator('.climate-partial')).toContainText('January–September');
  await slider.focus();
  await slider.press('Home');
  await expect(scene.locator('.climate-measurement')).toContainText('January 2026');
  await expect(scene.locator('.climate-measurement')).toContainText('+1.08°C');
  await expect(scene.getByRole('button', { name: 'January', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await scene.getByRole('button', { name: 'February', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(slider).toHaveValue('2');
  await expect(scene.locator('.climate-measurement')).toContainText('+1.23°C');
});

test('Climate Explore and existing players interrupt each other cleanly', async ({ page }) => {
  await page.goto('/#climate-spiral');
  const scene = page.locator('#climate-spiral');
  await page.getByRole('button', { name: 'Play track', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause track', exact: true })).toBeVisible();
  await scene.getByRole('button', { name: 'Hear this month', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play track', exact: true })).toBeVisible();
  await expect(scene.getByRole('button', { name: 'Stop note', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play track', exact: true }).click();
  await expect(scene.getByRole('button', { name: 'Hear this month', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause track', exact: true }).click();
  await page.getByRole('button', { name: 'Hear this visual', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause visual', exact: true })).toBeVisible();
  await scene.getByRole('button', { name: 'Hear this month', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hear this visual', exact: true })).toBeVisible();
});

test('Climate Explore recovers from blocked audio and image loading without losing scientific values', async ({ page }) => {
  await page.addInitScript(() => {
    const Context = window.AudioContext;
    window.AudioContext = class extends Context {
      private blockedOnce = true;
      get state(): AudioContextState { return this.blockedOnce ? 'suspended' : super.state; }
      async resume(): Promise<void> {
        if (this.blockedOnce) { this.blockedOnce = false; throw new Error('Test: autoplay denied'); }
        return super.resume();
      }
    };
  });
  await page.route('**/frames/climate-spiral-svs5190-2026-10-18.jpg', route => route.abort());
  await page.goto('/#climate-spiral');
  const scene = page.locator('#climate-spiral');
  await expect(scene.locator('.climate-image-error')).toBeVisible();
  await scene.getByRole('button', { name: 'Hear this month', exact: true }).click();
  await expect(scene.getByRole('alert')).toContainText('Sound could not start');
  await expect(scene.locator('.climate-measurement')).toContainText('+1.37°C');
  await expect(scene.getByRole('button', { name: 'Hear this month', exact: true })).toBeEnabled();
  await scene.getByRole('button', { name: 'Hear this month', exact: true }).click();
  await expect(scene.getByRole('button', { name: 'Stop note', exact: true })).toBeVisible();
  await expect(scene.getByRole('alert')).toHaveCount(0);
});

test('Climate Explore is accessible and fits a mobile screen in available and missing states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#climate-spiral');
  const scene = page.locator('#climate-spiral');
  for (const year of ['2025', '2026']) {
    await scene.getByRole('combobox', { name: 'Choose a year' }).selectOption(year);
    if (year === '2026') {
      const slider = scene.getByRole('slider', { name: 'Selected climate month' });
      await slider.focus(); await slider.press('End');
    }
    const results = await new AxeBuilder({ page }).include('#climate-spiral').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    expect(await scene.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  }
  await scene.screenshot({ path: 'test-results/climate-explore-mobile.png' });
});

test('Symphony Studio keeps scientific pitches independent of mix, cancels playback and handles missing months', async ({ page }) => {
  await page.goto('/?studio=1');
  await expect(page.getByRole('heading', { name: /See our Earth/ })).toBeVisible();
  await page.getByRole('button',{name:/Play year/}).click();
  await expect(page.getByRole('status')).toContainText('February', {timeout:5000});
  await page.getByLabel('Master volume').fill('0.4');
  await expect(page.getByRole('button',{name:'■ Stop'})).toBeVisible();
  await page.getByRole('button',{name:/Earth Remix Studio/}).click();
  await expect(page.getByRole('button',{name:'■ Stop'})).toHaveCount(0);
  const pitch = await page.locator('.ss-measure div').innerText();
  await page.getByRole('button',{name:'Cinematic',exact:true}).click();
  await expect(page.locator('.ss-measure div')).toHaveText(pitch);
  await page.getByRole('checkbox',{name:/Hear Data Only/}).check();
  await expect(page.getByLabel('Rhythm / drums')).toBeDisabled();
  await expect(page.getByLabel('Harmony',{exact:true})).toBeDisabled();
  await page.getByRole('button',{name:/Data Lab/}).click();
  await page.getByLabel(/Year A|Choose a year/).selectOption('2026');
  await page.getByRole('button',{name:'Oct',exact:true}).click();
  await expect(page.locator('.ss-measure')).toContainText('No observation');
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Symphony A/B completes in order without changing Year A and toggles geometric view', async ({page})=>{
  test.setTimeout(60000);
  await page.goto('/?studio=1');
  await page.getByRole('button',{name:/Data Lab/}).click();
  await page.getByLabel(/Year A|Choose a year/).selectOption('2025');
  await page.getByLabel('Year B').selectOption('1880');
  await page.getByRole('button',{name:/A → B/}).click();
  await expect(page.locator('.ss-measure')).toContainText('January 1880',{timeout:27000});
  await expect(page.getByLabel(/Year A|Choose a year/)).toHaveValue('2025');
  await expect(page.getByRole('status')).toContainText('Complete.',{timeout:27000});
  await expect(page.getByRole('button',{name:'■ Stop'})).toHaveCount(0);
  await page.getByRole('button',{name:'Explore 3D'}).click();
  await expect(page.getByLabel('Tilt spiral')).toBeVisible();
  await page.getByLabel('Tilt spiral').fill('55');
  await page.getByRole('button',{name:'Use 2D'}).click();
  await expect(page.getByLabel('Tilt spiral')).toHaveCount(0);
});

test('all five melody tones retain mapped fundamentals, deterministic data-only output, and rhythmic style isolation', async ({page})=>{
  await page.goto('/?studio=1');
  await page.getByText('Choose your sound',{exact:true}).click();
  await expect(page.getByLabel('Melody tone')).toBeVisible();
  const result=await page.evaluate(async()=>{
    const path='/src/lib/symphony.ts';
    const sound=await import(path);
    const point={year:2025,month:1,period:'2025-01',anomaly:1.37};
    const target=sound.mapData(point).frequencyHz;
    const results=[];
    for(const timbre of sound.TIMBRES){
      let reference: Float32Array | null = null;
      for(const style of ['Ambient','Electronic Pulse','Cinematic']){
        for(const dataOnly of [true,false]){
          const context=new OfflineAudioContext(1,Math.ceil(2.8*22050),22050);
          const pitches:number[]=[];
          const original=context.createOscillator.bind(context);
          context.createOscillator=()=>{const osc=original();const setter=osc.frequency.setValueAtTime.bind(osc.frequency);osc.frequency.setValueAtTime=(value,time)=>{pitches.push(value);return setter(value,time);};return osc;};
          sound.renderScore(context,context.destination,[point],{...sound.defaults,timbre,style,dataOnly},0);
          const buffer=await context.startRendering();
          let peak=0;for(const value of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(value));
          if(dataOnly){
            const samples=buffer.getChannelData(0);
            if(!reference) reference=new Float32Array(samples);
            else { let delta=0; for(let i=0;i<samples.length;i++)delta=Math.max(delta,Math.abs(samples[i]-reference[i])); if(delta>.00001)throw Error(`Style changed data-only sound: ${delta}`); }
          }
          results.push({timbre,style,dataOnly,first:pitches[0],voices:pitches.length,peak});
        }
      }
    }
    return {target,results};
  });
  for(const item of result.results){
    expect(item.first).toBe(result.target);
    expect(item.peak).toBeGreaterThan(.001);
    expect(item.peak).toBeLessThan(.95);
    if(item.dataOnly) expect(item.voices).toBeLessThanOrEqual(5);
    else expect(item.voices).toBeGreaterThan(10);
  }
  const readout=await page.locator('.ss-measure div').innerText();
  for(const tone of ['Warm Keys','Velvet Pad','Soft Pluck','Mellow Reed','Soft Glass']){
    await page.getByLabel('Melody tone').selectOption(tone);
    await expect(page.locator('.ss-measure div')).toHaveText(readout);
  }
});

test('data-to-sound guide explains actual NASA notes, auditions mapped fundamentals and exports missing values honestly', async ({page})=>{
  await page.addInitScript(()=>{
    const context=window.AudioContext;
    const original=context.prototype.createOscillator;
    (window as unknown as { proofPitches: number[] }).proofPitches=[];
    context.prototype.createOscillator=function(){
      const osc=original.call(this), setter=osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime=(value,time)=>{(window as unknown as { proofPitches: number[] }).proofPitches.push(value);return setter(value,time);};return osc;
    };
  });
  await page.goto('/?studio=1');
  await page.getByRole('link',{name:/Why this note/}).click();
  const guide=page.locator('#data-to-sound');
  await expect(guide.getByRole('heading',{name:'How does data become sound?'})).toBeVisible();
  await expect(guide.locator('.ss-proof-chain')).toContainText('+1.37°C');
  await expect(guide.locator('.ss-proof-chain')).toContainText('+1.25 ≤ ΔT ≤ +1.50°C');
  await expect(guide.locator('.ss-proof-chain')).toContainText('A4 · 440.00 Hz');
  await guide.getByRole('button',{name:/Hear 1880-01/}).click();
  await expect(guide.locator('.ss-proof-chain')).toContainText('−0.25 ≤ ΔT < +0.00°C');
  await expect(guide.locator('.ss-proof-chain')).toContainText('G3 · 196.00 Hz');
  expect(await page.evaluate(()=>(window as unknown as { proofPitches: number[] }).proofPitches[0])).toBeCloseTo(195.997718,5);
  await expect(page.locator('.ss-mix-state')).toHaveText('DATA ONLY');
  await page.getByRole('button',{name:'■ Stop'}).click();
  await page.evaluate(()=>(window as unknown as { proofPitches: number[] }).proofPitches=[]);
  await guide.getByRole('button',{name:/Hear 2025-01/}).click();
  await expect(guide.locator('.ss-proof-chain')).toContainText('A4 · 440.00 Hz');
  expect(await page.evaluate(()=>(window as unknown as { proofPitches: number[] }).proofPitches[0])).toBe(440);
  await page.getByRole('button',{name:'■ Stop'}).click();
  await guide.getByText(/Why can different values sound the same/).click();
  await expect(guide).toContainText('+1.10°C and +1.20°C');
  await guide.getByText(/Show the full pitch scale/).click();
  await expect(guide.getByRole('table').first().getByRole('row')).toHaveCount(11);
  await page.getByLabel(/Year A|Choose a year/).selectOption('2026');
  await page.getByRole('button',{name:'Oct',exact:true}).click();
  await expect(guide.locator('.ss-proof-chain')).toContainText('Silence');
  await guide.getByText(/Trace every month/).click();
  await expect(guide.getByRole('button',{name:'Hear data 2026-10',exact:true})).toBeDisabled();
  const downloadPromise=page.waitForEvent('download');
  await guide.getByRole('button',{name:/Download 2026 data/}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('Earth-Symphony-2026-data-to-notes.csv');
  const file=await download.path();
  const csv=await readFile(file!,'utf8');
  expect(csv).toContain('2026-10,,1951-1980,,,,gistemp-fixed-bands-v1,symphony-ten-v1,missing');
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Studio language choice keeps English clean, localizes Chinese, preserves audio settings and persists', async ({page})=>{
  await page.goto('/?studio=1');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByLabel('Language',{exact:true})).toHaveValue('en');
  const englishText=await page.locator('main.ss').evaluate(el=>{const copy=el.cloneNode(true) as HTMLElement;copy.querySelector('.ss-language')?.remove();return copy.textContent;});
  expect(englishText).not.toMatch(/[\u3400-\u9fff]/);
  await page.getByRole('button',{name:/Earth Remix Studio/}).click();
  await page.getByLabel('Melody tone').selectOption('Soft Pluck');
  await page.getByLabel(/Year A|Choose a year/).selectOption('1980');
  await page.getByRole('button',{name:'Mar',exact:true}).click();
  const value=await page.locator('.ss-measure strong').innerText();
  const pitch=(await page.locator('.ss-measure div').innerText()).split(' · ').slice(0,2).join(' · ');
  await page.getByLabel('Language',{exact:true}).selectOption('zh');
  await expect(page.locator('html')).toHaveAttribute('lang','zh-Hans');
  await expect(page.getByRole('heading',{name:'你的地球，你的音乐。'})).toBeVisible();
  await expect(page.getByLabel('主旋律音色')).toHaveValue('Soft Pluck');
  await expect(page.getByLabel(/年份 A|选择年份/)).toHaveValue('1980');
  await expect(page.locator('.ss-measure strong')).toHaveText(value);
  expect((await page.locator('.ss-measure div').innerText()).split(' · ').slice(0,2).join(' · ')).toBe(pitch);
  await expect(page.getByRole('heading',{name:'数据如何变成声音？'})).toBeVisible();
  await page.getByRole('button',{name:/播放全年/}).click();
  await expect(page.getByRole('status')).toHaveText('1980 年 1 月');
  await page.getByLabel('语言',{exact:true}).selectOption('en');
  await expect(page.getByRole('button',{name:'■ Stop'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('January 1980');
  await expect(page.getByLabel('Melody tone')).toHaveValue('Soft Pluck');
  await page.getByRole('button',{name:'■ Stop'}).click();
  await page.getByLabel('Language',{exact:true}).selectOption('zh');
  await page.reload();
  await expect(page.getByLabel('语言',{exact:true})).toHaveValue('zh');
  await page.getByRole('button',{name:/数据实验室/}).click();
  await page.getByLabel(/年份 A|选择年份/).selectOption('2026');
  await page.getByRole('button',{name:'10 月',exact:true}).click();
  await expect(page.locator('.ss-measure strong')).toHaveText('暂无观测数据');
  const guide=page.locator('#data-to-sound');
  await guide.getByText('查看完整十音映射',{exact:true}).click();
  await guide.getByText(/核对每个月的数据与音符/).click();
  await expect(guide.getByRole('button',{name:'试听数据 2026-10',exact:true})).toBeDisabled();
  const promise=page.waitForEvent('download');await guide.getByRole('button',{name:/下载 2026 数据/}).click();
  const download=await promise;const csv=await readFile((await download.path())!,'utf8');
  expect(csv).toContain('2026-10,,1951-1980,,,,gistemp-fixed-bands-v1,symphony-ten-v1,missing');
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('language controls remain usable when preference storage is blocked',async({page})=>{
  await page.addInitScript(()=>{
    Storage.prototype.getItem=()=>{throw new Error('Storage blocked');};
    Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};
  });
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?studio=1');
  await page.getByLabel('Language',{exact:true}).selectOption('zh');
  await expect(page.getByRole('heading',{name:'聆听变化中的地球。'})).toBeVisible();
  await page.getByRole('button',{name:/播放全年/}).click();
  await expect(page.getByRole('button',{name:'■ 停止'})).toBeVisible();
  await page.getByRole('button',{name:'■ 停止'}).click();
  await expect(page.getByRole('status')).toHaveText('已停止，可播放当前选择。');
  await page.getByLabel('语言',{exact:true}).selectOption('en');
  await expect(page.getByRole('heading',{name:'Listen to a changing world.'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('unified listening room explains two paths and safely switches between climate and visual sound',async({page})=>{
  await page.goto('/?studio=1');
  await expect(page.getByRole('heading',{name:/See our Earth/})).toBeVisible();
  await expect(page.getByText('No music or science experience needed.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Motion effects')).not.toBeChecked();
  const earth=page.locator('.ss-earth-scene svg');
  const before=await page.locator('.ss-earth-scene .earth-globe__coordinates text').textContent();
  await earth.focus(); await earth.press('ArrowRight');
  expect(await page.locator('.ss-earth-scene .earth-globe__coordinates text').textContent()).not.toBe(before);
  await page.getByRole('button',{name:/Start listening/}).click();
  await expect(page.getByRole('status')).toContainText('January 2025');
  await expect(page.getByRole('button',{name:'■ Stop'})).toBeVisible();
  await page.getByRole('button',{name:/Hear an Earth visual/}).click();
  await expect(page.getByRole('button',{name:'■ Stop'})).toHaveCount(0);
  await expect(page.getByText('You are hearing visual patterns.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Hear this visual',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Hear this visual',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause visual',exact:true})).toBeVisible();
  await page.waitForTimeout(650);
  expect(Number((await page.locator('.visual-scan span').innerText()).split('/')[0])).toBeGreaterThan(1);
  await page.getByRole('button',{name:/Hear climate change/}).click();
  await expect(page.getByRole('button',{name:'Pause visual',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Listen to a changing world.'})).toBeVisible();
  await expect(page.getByText('You are hearing measurements.',{exact:false})).toBeVisible();
  await expect(page.locator('.ss-sound-controls')).not.toHaveAttribute('open');
  await page.getByText('Choose your sound',{exact:true}).click();
  await expect(page.getByLabel('Melody tone')).toBeVisible();
});

test('integrated visual experience is bilingual, accessible, and respects the motion switch on mobile',async({page})=>{
  await page.goto('/?studio=1');
  await page.getByRole('button',{name:'Hear a NASA visual ↗',exact:true}).click();
  await expect(page.getByRole('button',{name:'Hear this visual',exact:true})).toBeEnabled();
  await page.locator('.frame-options button').nth(2).click();
  await expect(page.getByLabel('Follow the animation')).toBeDisabled();
  await page.getByLabel('Motion effects').check();
  await page.getByLabel('Follow the animation').check();
  await page.getByRole('button',{name:'Hear this visual',exact:true}).click();
  await expect.poll(()=>page.locator('.visual-screen video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.1);
  await page.getByLabel('Motion effects').uncheck();
  await expect(page.getByLabel('Follow the animation')).not.toBeChecked();
  expect(await page.locator('.visual-screen video').evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
  await page.getByRole('button',{name:'Pause visual',exact:true}).click();
  await page.getByLabel('Language',{exact:true}).selectOption('zh');
  await expect(page.getByRole('heading',{name:'不止看见地球，也听见它。'})).toBeVisible();
  await expect(page.getByRole('button',{name:'聆听这幅画面',exact:true})).toBeEnabled();
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:/带入你自己的 EIC 画面/})).toBeVisible();
});
