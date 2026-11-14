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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  await page.goto('/?legacy=1');
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
  const origin = new URL(page.url()).origin; // local dev server or the deployed site under test
  expect(requests.every(url => url.startsWith(origin + '/') || url.startsWith('data:'))).toBeTruthy();
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

test('five real pages keep the homepage simple, support history and direct reloads, and preserve the original entry',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toHaveAccessibleName('Your planet. On the record.');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:/Select record:/})).toHaveCount(5);
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).click();
  await expect(page.locator('.jb-deck')).toHaveAttribute('data-record-kind','data');
  await expect(page.locator('.jb-deck')).toHaveAttribute('data-record-side','b');
  await expect(page.locator('.jb-data-value')).toContainText('-0.19°C');
  await expect(page.locator('.jb-note')).toContainText('196.00 Hz');
  await page.getByRole('button',{name:'Side A: hear the picture',exact:true}).click();
  await expect(page.locator('.jb-deck')).toHaveAttribute('data-record-kind','visual');

  await page.getByRole('button',{name:'Play record',exact:true}).click();
  await expect(page.getByRole('button',{name:'Stop',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  await expect(page.getByRole('group',{name:'Melody tone'})).toHaveCount(0);
  await expect(page.getByLabel('Choose a year',{exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Discover the story',exact:true}).click();
  await expect(page).toHaveURL(/\/listen$/);
  await expect(page.getByRole('heading',{name:'First, hear the picture.'})).toBeVisible();
  await page.getByRole('navigation').getByRole('link',{name:'Create',exact:true}).click();
  await expect(page).toHaveURL(/\/create$/);
  await page.reload();await expect(page.getByRole('heading',{name:'Make the music yours.'})).toBeVisible();
  await page.goBack();await expect(page).toHaveURL(/\/listen$/);
  await page.getByRole('navigation').getByRole('link',{name:'Explore Data',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Every note has a number.'})).toBeVisible();
  await page.getByRole('link',{name:'About & sources',exact:true}).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  // The legacy Earth FM view is no longer a front-door link; old bookmarks still open it.
  await expect(page.getByRole('link',{name:/Original experience/})).toHaveCount(0);
  await page.goto('/?legacy=1');
  await expect(page.getByRole('heading',{name:/A moment in time/})).toBeVisible();
  await page.goto('/#climate-spiral');await expect(page.locator('#climate-spiral .climate-measurement')).toContainText('+1.37°C');
});

test('Listen guides visual sound into real data with clean stops and optional honest learning records',async({page})=>{
  await page.addInitScript(()=>{
    const contexts:AudioContext[]=[];(window as unknown as {contexts:AudioContext[]}).contexts=contexts;
    const Context=window.AudioContext;window.AudioContext=class extends Context{constructor(){super();contexts.push(this);}};
  });
  await page.goto('/listen');
  await expect(page.getByRole('img',{name:/NASA Climate Spiral overview showing monthly/})).toBeVisible();
  await expect(page.getByText('Image brightness makes the notes',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Play visual sound',exact:true}).click();
  await expect(page.getByRole('button',{name:'Stop visual sound',exact:true})).toBeVisible();
  await expect.poll(async()=>Number((await page.locator('.visual-scan span').innerText()).split('/')[0])).toBeGreaterThan(1);
  await page.getByRole('button',{name:/Continue to the real data/}).click();
  await expect(page.getByRole('button',{name:'Stop visual sound',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/Play the data melody/}).click();
  await expect(page.locator('.ss-story-readout')).toContainText('January 1880');
  await expect(page.locator('.ss-story-readout')).toContainText('G3 · 196.00 Hz');
  await expect(page.locator('.ss-story-readout')).toContainText('January 1900',{timeout:5000});
  await page.getByRole('button',{name:/Continue to the discovery/}).click();
  await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Two sounds. Two different meanings.'})).toBeVisible();
  await expect(page.locator('.sp-optional-check')).not.toHaveAttribute('open');
  await page.getByText('Check your understanding (optional)',{exact:true}).click();
  await expect(page.getByRole('button',{name:'Download my learning-check record'})).toBeDisabled();
  const groups=page.locator('fieldset');
  await groups.nth(0).getByLabel('January 1880',{exact:true}).check();
  await groups.nth(1).getByLabel('No',{exact:true}).check();
  await groups.nth(2).getByLabel('The published temperature anomaly',{exact:true}).check();
  await groups.nth(3).getByLabel('A global anomaly relative to the January baseline',{exact:true}).check();
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('3 / 4');
  await groups.nth(0).getByLabel('January 2025',{exact:true}).check();
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('4 / 4');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download my learning-check record'}).click();
  const record=JSON.parse(await readFile((await(await pending).path())!,'utf8'));
  expect(record.attempts.map((a:{correct:number})=>a.correct)).toEqual([3,4]);
  expect(record.notice).toContain('not aggregate research evidence');
  await page.getByRole('button',{name:/Try your own sound/}).click();await expect(page).toHaveURL(/\/create$/);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {contexts:AudioContext[]}).contexts.every(c=>c.state==='closed'))).toBe(true);
});

test('Create separates musical choices, keeps volume live, stops on changes and exports a real WAV',async({page})=>{
  await page.goto('/create');
  await page.getByRole('button',{name:/Play my mix/}).click();
  await expect(page.getByRole('status')).toContainText('February 2025',{timeout:5000});
  await page.getByLabel('Master volume').fill('0.4');
  await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toBeVisible();
  await page.getByRole('group',{name:'Melody tone'}).getByRole('button',{name:'Soft Pluck',exact:true}).click();
  await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toHaveCount(0);
  await page.getByRole('group',{name:'Music style'}).getByRole('button',{name:/Cinematic/}).click();
  await page.getByRole('checkbox',{name:/Hear Data Only/}).check();
  await page.getByText('More sound controls',{exact:true}).click();
  await expect(page.getByLabel('Rhythm / drums')).toBeDisabled();await expect(page.getByLabel('Harmony',{exact:true})).toBeDisabled();
  await page.getByLabel('Tempo',{exact:true}).fill('96');
  await expect(page.getByRole('button',{name:/Play my mix · 16s/})).toBeVisible();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download 25-second WAV'}).click();
  const file=await pending;const data=await readFile((await file.path())!);
  expect(file.suggestedFilename()).toBe('Earth-FM-2025-Soft-Pluck-Data-Only.wav');
  expect(data.toString('ascii',0,4)).toBe('RIFF');expect(data.toString('ascii',8,12)).toBe('WAVE');expect(data.length).toBeGreaterThan(1000000);
  expect(data.some((value,i)=>i>44&&value!==0)).toBe(true);
  await page.getByRole('button',{name:'Reset sound',exact:true}).click();
  await expect(page.getByRole('group',{name:'Melody tone'}).getByRole('button',{name:'Warm Keys',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox',{name:/Hear Data Only/})).not.toBeChecked();
  await page.getByRole('button',{name:/Play my mix/}).click();
  await page.getByRole('navigation').getByRole('link',{name:'Explore Data',exact:true}).click();
  await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toHaveCount(0);
  await expect(page.locator('.sp-data-summary')).toContainText('+1.37°C');
});

test('Data compares complete A/B melodies in order with fixed settings and optional spiral geometry',async({page})=>{
  test.setTimeout(65000);await page.goto('/data');
  await page.getByRole('checkbox',{name:'Compare another year',exact:true}).check();
  await page.getByLabel('Year B',{exact:true}).selectOption('1880');
  await page.getByRole('button',{name:'Compare A → B · 49s',exact:true}).click();
  await expect(page.locator('.sp-data-summary')).toContainText('January 2025');
  await expect(page.locator('.sp-data-summary')).toContainText('January 1880',{timeout:27000});
  await expect(page.getByLabel('Year A',{exact:true})).toHaveValue('2025');
  await expect(page.getByRole('status')).toContainText('Complete.',{timeout:27000});
  await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toHaveCount(0);
  await page.getByText('Explore the Climate Spiral',{exact:true}).click();
  await page.getByRole('button',{name:'Explore 3D',exact:true}).click();await expect(page.getByLabel('Tilt spiral')).toBeVisible();
  await page.getByLabel('Tilt spiral').fill('55');await page.getByRole('button',{name:'Use 2D',exact:true}).click();await expect(page.getByLabel('Tilt spiral')).toHaveCount(0);
});

test('Data explains exact NASA mapping, auditions fixed frequencies, and exports missing observations honestly',async({page})=>{
  await page.addInitScript(()=>{
    const original=AudioContext.prototype.createOscillator;(window as unknown as {proofPitches:number[]}).proofPitches=[];
    AudioContext.prototype.createOscillator=function(){const osc=original.call(this),set=osc.frequency.setValueAtTime.bind(osc.frequency);osc.frequency.setValueAtTime=(value,time)=>{(window as unknown as {proofPitches:number[]}).proofPitches.push(value);return set(value,time);};return osc;};
  });
  await page.goto('/data');await page.getByText('How does this value become a note?',{exact:true}).click();
  const guide=page.locator('#data-to-sound');
  await expect(guide.locator('.ss-proof-chain')).toContainText('+1.37°C');await expect(guide.locator('.ss-proof-chain')).toContainText('+1.25 ≤ ΔT ≤ +1.50°C');
  await guide.getByRole('button',{name:/Hear 1880-01/}).click();
  await expect(guide.locator('.ss-proof-chain')).toContainText('G3 · 196.00 Hz');
  expect(await page.evaluate(()=>(window as unknown as {proofPitches:number[]}).proofPitches[0])).toBeCloseTo(195.997718,5);
  await page.getByRole('button',{name:'■ Stop',exact:true}).click();await page.evaluate(()=>(window as unknown as {proofPitches:number[]}).proofPitches=[]);
  await guide.getByRole('button',{name:/Hear 2025-01/}).click();await expect(guide.locator('.ss-proof-chain')).toContainText('A4 · 440.00 Hz');
  expect(await page.evaluate(()=>(window as unknown as {proofPitches:number[]}).proofPitches[0])).toBe(440);
  await page.getByRole('button',{name:'■ Stop',exact:true}).click();
  await guide.getByText('Show the full pitch scale',{exact:true}).click();await expect(guide.getByRole('table').first().getByRole('row')).toHaveCount(11);
  await page.getByLabel('Choose a year',{exact:true}).selectOption('2026');await page.getByLabel('Month',{exact:true}).selectOption('10');
  await expect(page.locator('.sp-data-summary')).toContainText('No observation');await expect(page.getByRole('button',{name:'▶ Hear this month',exact:true})).toBeDisabled();
  await expect(guide.locator('.ss-proof-chain')).toContainText('Silence');await guide.getByText(/Trace every month/).click();
  await expect(guide.getByRole('button',{name:'Hear data 2026-10',exact:true})).toBeDisabled();
  const pending=page.waitForEvent('download');await guide.getByRole('button',{name:/Download 2026 data/}).click();const csv=await readFile((await(await pending).path())!,'utf8');
  expect(csv).toContain('2026-10,,1951-1980,,,,gistemp-fixed-bands-v1,symphony-ten-v1,missing');
  await guide.getByRole('link',{name:'Full science & NASA credits ↓',exact:true}).click();await expect(page).toHaveURL(/\/about#sources$/);await expect(page.locator('#sources')).toBeInViewport();
});

test('language choice persists across the pages, keeps English clean and preserves selected tones',async({page})=>{
  await page.goto('/create');await expect(page.locator('html')).toHaveAttribute('lang','en');
  expect(await page.locator('main').textContent()).not.toMatch(/[\u3400-\u9fff]/);
  await page.getByRole('group',{name:'Melody tone'}).getByRole('button',{name:'Soft Pluck',exact:true}).click();
  await page.getByRole('button',{name:/Play my mix/}).click();await page.getByLabel('Language',{exact:true}).selectOption('zh');
  await expect(page.locator('html')).toHaveAttribute('lang','zh-Hans');await expect(page.getByRole('button',{name:'■ 停止',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toHaveText('创作你的地球旋律。');
  await expect(page.getByRole('group',{name:'主旋律音色'}).getByRole('button',{name:'柔和拨音',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('navigation').getByRole('link',{name:'探索数据',exact:true}).click();
  await expect(page.getByRole('button',{name:'■ 停止',exact:true})).toHaveCount(0);
  await expect(page.locator('.sp-data-summary')).toContainText('+1.37°C');
  await page.getByRole('navigation').getByRole('link',{name:'创作',exact:true}).click();
  await expect(page.getByRole('group',{name:'主旋律音色'}).getByRole('button',{name:'柔和拨音',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(page.getByLabel('语言',{exact:true})).toHaveValue('zh');
  await page.getByLabel('语言',{exact:true}).selectOption('en');await expect(page.getByRole('heading',{name:'Make the music yours.'})).toBeVisible();
});

test('five pages and expanded data are accessible and fit English and Chinese mobile screens',async({page})=>{
  test.setTimeout(90000);
  for(const language of ['en','zh']){
    for(const path of ['/','/listen','/create','/data','/about']){
      await page.setViewportSize({width:390,height:844});await page.goto(path);await page.locator('h1').waitFor();
      await page.locator('.sp-language select').selectOption(language);
      if(path==='/data'){
        await page.getByLabel(language==='en'?'Choose a year':'选择年份',{exact:true}).selectOption('2026');
        await page.getByLabel(language==='en'?'Month':'月份',{exact:true}).selectOption('10');
        await page.locator('.sp-page-data > details').nth(0).locator('summary').first().click();
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(scan.violations.map(v=>({page:path,language,id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
    }
  }
});

test('Chinese Listen is simple and sound controls recover with blocked preference storage',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByLabel('Language',{exact:true}).selectOption('zh');
  await page.getByRole('link',{name:'了解这段故事',exact:true}).click();
  await expect(page.getByRole('heading',{name:'先听听这幅画面。'})).toBeVisible();
  await page.getByRole('button',{name:/继续聆听真实数据/}).click();
  await page.getByRole('button',{name:/播放数据旋律/}).click();
  await expect(page.getByRole('status')).toContainText('1880 年 1 月');
  await page.getByRole('navigation').getByRole('link',{name:'创作',exact:true}).click();
  await page.getByRole('button',{name:/播放我的混音/}).click();await expect(page.getByRole('button',{name:'■ 停止',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'■ 停止',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('已停止。');expect(errors).toEqual([]);
});

test('all five melody tones retain mapped fundamentals, deterministic data-only output, and rhythmic style isolation', async ({page})=>{
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL),'Imports /src modules that only the Vite dev server serves.');
  await page.goto('/create');
  await expect(page.getByRole('group',{name:'Melody tone'})).toBeVisible();
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
  for(const tone of ['Warm Keys','Velvet Pad','Soft Pluck','Mellow Reed','Soft Glass']){
    await page.getByRole('group',{name:'Melody tone'}).getByRole('button',{name:tone,exact:true}).click();
    await expect(page.getByRole('group',{name:'Melody tone'}).getByRole('button',{name:tone,exact:true})).toHaveAttribute('aria-pressed','true');
  }
});

test('homepage globe rotates gently, pauses for interaction, and obeys motion preferences',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  await page.locator('.jb-earth-extra summary').click();
  const coordinates=page.locator('.jb-earth-extra .earth-globe__coordinates text');
  const initial=await coordinates.textContent();
  await expect.poll(()=>coordinates.textContent()).not.toBe(initial);
  await page.getByRole('button',{name:'Pause rotation',exact:true}).click();
  const paused=await coordinates.textContent();await page.waitForTimeout(300);expect(await coordinates.textContent()).toBe(paused);
  await page.getByRole('button',{name:'Resume rotation',exact:true}).click();
  await expect.poll(()=>coordinates.textContent()).not.toBe(paused);
  const surface=page.locator('.jb-earth-extra .earth-globe__drag-surface');await surface.scrollIntoViewIfNeeded();const box=await surface.boundingBox();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+25,box!.y+box!.height/2);
  await expect(page.locator('.jb-earth-extra .earth-globe')).toHaveClass(/earth-globe--dragging/);
  const held=await coordinates.textContent();await page.waitForTimeout(300);expect(await coordinates.textContent()).toBe(held);
  await page.mouse.up();await page.waitForTimeout(250);expect(await coordinates.textContent()).toBe(held);
  await expect.poll(()=>coordinates.textContent(),{timeout:3500}).not.toBe(held);
  await page.getByLabel('Motion effects').uncheck();await page.evaluate(()=>scrollTo(0,0));
  const disabled=await coordinates.textContent();await page.waitForTimeout(300);expect(await coordinates.textContent()).toBe(disabled);
  await expect(page.getByRole('button',{name:'Rotation paused',exact:true})).toBeDisabled();
  await page.getByLabel('Motion effects').check();await page.evaluate(()=>scrollTo(0,0));
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.getByRole('button',{name:'Rotation paused',exact:true})).toBeDisabled();
  const reduced=await coordinates.textContent();await page.waitForTimeout(300);expect(await coordinates.textContent()).toBe(reduced);
});

test('NASA surface renders the correct geographic texture, responds to the camera and keeps source credits visible',async({page})=>{
  await page.addInitScript(()=>{
    const original=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args){
      original.apply(this,args);
      const pixel=new Uint8Array(4);
      this.readPixels(384,384,1,1,this.RGBA,this.UNSIGNED_BYTE,pixel);
      (window as unknown as {surfacePixel:number[]}).surfacePixel=Array.from(pixel);
    };
  });
  await page.goto('/');await page.locator('.jb-earth-extra summary').click();await expect(page.locator('.earth-globe--photographic')).toBeVisible();
  await expect(page.getByRole('link',{name:'NASA Earth Observatory · Blue Marble ↗',exact:true})).toBeVisible();
  await expect(page.getByText('July 2004 composite.',{exact:false})).toBeVisible();
  const proof=await page.evaluate(async()=>{
    const image=new Image();image.src='/frames/blue-marble-july-2004-2048.jpg';await image.decode();
    const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
    const context=source.getContext('2d')!;context.drawImage(image,0,0);
    // Initial camera is 12°N, 22°E. A spherical projection must sample this location, not its mirror.
    const expected=Array.from(context.getImageData(Math.floor((.5+22/360)*image.width),Math.floor((.5-12/180)*image.height),1,1).data);
    return {expected,actual:(window as unknown as {surfacePixel:number[]}).surfacePixel};
  });
  expect(proof.actual[3]).toBe(255);
  for(let channel=0;channel<3;channel++)expect(Math.abs(proof.expected[channel]-proof.actual[channel])).toBeLessThan(15);
  const globe=page.locator('.jb-earth-extra svg.earth-globe__scene');await globe.focus();await globe.press('ArrowRight');
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {surfacePixel:number[]}).surfacePixel)).not.toEqual(proof.actual);
  await page.evaluate(()=>{
    const gl=document.querySelector<HTMLCanvasElement>('.earth-globe__surface')!.getContext('webgl')!;
    const extension=gl.getExtension('WEBGL_lose_context')!;
    extension.loseContext();setTimeout(()=>extension.restoreContext(),500);
  });
  await expect(page.locator('.earth-globe--photographic')).toHaveCount(0);
  await expect(page.locator('.earth-globe--photographic')).toBeVisible();
  await page.getByRole('link',{name:'Discover the story',exact:true}).click();await expect(page).toHaveURL(/\/listen$/);
  await page.getByRole('button',{name:'Play visual sound',exact:true}).click();await expect(page.getByRole('button',{name:'Stop visual sound',exact:true})).toBeVisible();
});

for(const failure of ['graphics unavailable','image unavailable']){
  test(`NASA globe preserves the introductory experience when ${failure}`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    if(failure==='graphics unavailable')await page.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){
        return type==='webgl'?null:Reflect.apply(original,this,[type,...args]);
      } as typeof original;
    });
    else await page.route('**/blue-marble-july-2004-2048.jpg',route=>route.abort());
    await page.goto('/');
    await page.locator('.jb-earth-extra summary').click();
    await expect(page.getByRole('link',{name:'Interactive Earth illustration ↗',exact:true})).toBeVisible();
    await expect(page.locator('.earth-globe--photographic')).toHaveCount(0);
    const coordinates=page.locator('.earth-globe__coordinates text'),initial=await coordinates.textContent();
    const globe=page.locator('.jb-earth-extra svg.earth-globe__scene');await globe.focus();await globe.press('ArrowRight');await expect(coordinates).not.toHaveText(initial!);
    await page.getByRole('link',{name:'Discover the story',exact:true}).click();await expect(page.getByRole('button',{name:'Play visual sound',exact:true})).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test('Earth Stations directory preserves the five-page layout and source-aware links',async({page})=>{
 await page.goto('/');await page.getByRole('navigation').getByRole('link',{name:'Listen',exact:true}).click();await expect(page).toHaveURL(/station=all/);
 await expect(page.getByRole('heading',{name:'One planet. Listen closely.'})).toBeVisible();await expect(page.locator('.st-station-card')).toHaveCount(2);
 await page.getByRole('link',{name:'Listen to Arctic September →',exact:true}).click();await expect(page).toHaveURL(/station=arctic/);
 await page.reload();await expect(page.getByRole('heading',{name:'Listen to the ice record.'})).toBeVisible();
 await page.getByRole('navigation').getByRole('link',{name:'Explore Data',exact:true}).click();await expect(page).toHaveURL(/\/data\?station=arctic$/);
 await expect(page.getByRole('heading',{name:'Every ice note has an observation.'})).toBeVisible();
 await page.getByLabel('Earth Station',{exact:true}).selectOption('climate');await expect(page.getByRole('heading',{name:'Every note has a number.'})).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{name:'Every ice note has an observation.'})).toBeVisible();
});

test('Arctic listening preserves real first and retry answers, evidence use and a private reflection',async({page})=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.goto('/listen?station=arctic');
 await expect(page.getByText('7.2787',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/Hear the two Septembers/}).click();await expect(page.getByRole('status')).toContainText('September 1987');
 await expect(page.getByRole('status')).toContainText('September 2022',{timeout:5000});
 await page.getByLabel('Arctic volume').fill('0.35');await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toBeVisible();await page.getByRole('button',{name:'■ Stop',exact:true}).click();
 await page.getByRole('radio',{name:'1987',exact:true}).check();await page.getByRole('button',{name:'Save my prediction',exact:true}).click();
 await page.getByRole('button',{name:'Inspect the observations →',exact:true}).click();await expect(page.locator('.st-pair-values')).toContainText('7.2787');await expect(page.locator('.st-pair-values')).toContainText('4.8969');
 await page.getByRole('button',{name:'← Back',exact:true}).click();await page.getByRole('radio',{name:'2022',exact:true}).check();await page.getByRole('button',{name:'Save my prediction',exact:true}).click();
 await page.getByRole('button',{name:'Inspect the observations →',exact:true}).click();await page.getByRole('button',{name:'Explain what changed →',exact:true}).click();
 const fields=page.locator('fieldset');await fields.nth(0).getByLabel('Sea ice thickness',{exact:true}).check();await fields.nth(1).getByLabel('No. Extent alone does not identify the cause.',{exact:true}).check();await page.getByRole('button',{name:'Check these ideas',exact:true}).click();await expect(page.getByRole('status')).toContainText('1 / 2');
 await fields.nth(0).getByLabel('September mean sea ice extent',{exact:true}).check();await page.getByRole('button',{name:'Check these ideas',exact:true}).click();await expect(page.getByRole('status')).toContainText('2 / 2');
 await page.getByLabel('My explanation (optional)',{exact:true}).fill('Automated fixture: 1987 was 7.2787 million km²; 2022 was 4.8969. Extent does not identify a cause.');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download my reflection',exact:true}).click();const record=JSON.parse(await readFile((await(await pending).path())!,'utf8'));
 expect(record.attempts.map((a:{correct:number})=>a.correct)).toEqual([0,1,1,2]);expect(record.attempts.slice(0,2).map((a:{evidenceViewed:boolean})=>a.evidenceViewed)).toEqual([false,true]);expect(record.firstAudioAt).toBeTruthy();expect(record.notice).toContain('not a participant study');expect(posts).toEqual([]);
 await page.getByRole('button',{name:'Shape this station’s sound →',exact:true}).click();await expect(page).toHaveURL(/\/create\?station=arctic$/);
});

test('Arctic data and mix compile the actual fixed frequencies and export a reproducible trace and WAV',async({page})=>{
 await page.addInitScript(()=>{const original=AudioContext.prototype.createOscillator;(window as unknown as {icePitches:number[]}).icePitches=[];AudioContext.prototype.createOscillator=function(){const osc=original.call(this),set=osc.frequency.setValueAtTime.bind(osc.frequency);osc.frequency.setValueAtTime=(value,time)=>{(window as unknown as {icePitches:number[]}).icePitches.push(value);return set(value,time);};return osc;};});
 await page.goto('/data?station=arctic');await expect(page.locator('.st-proof')).toContainText('4.8969');await page.getByRole('button',{name:'Hear this September',exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {icePitches:number[]}).icePitches[0])).toBeCloseTo(195.997718,5);
 await page.getByLabel('Choose a year',{exact:true}).selectOption('1987');await expect(page.getByRole('button',{name:'■ Stop',exact:true})).toHaveCount(0);await expect(page.locator('.st-proof')).toContainText('7.2787');await expect(page.locator('.st-proof')).toContainText('392.00 Hz');
 await page.getByText('Inspect all 36 observations and download the trace',{exact:true}).click();const trace=page.waitForEvent('download');await page.getByRole('button',{name:'Download data → notes CSV',exact:true}).click();const csv=await readFile((await(await trace).path())!,'utf8');expect(csv).toContain('1987-09,7.2787,9,G4,391.995');expect(csv.trim().split('\n')).toHaveLength(37);
 await page.getByText('Source and method · project-derived September means',{exact:true}).click();
 const source=page.getByRole('link',{name:'Pinned daily source CSV ↓',exact:true});expect(await source.getAttribute('href')).toBe('/data/sources/arctic-daily-extent.csv');
 await page.getByRole('navigation').getByRole('link',{name:'Create',exact:true}).click();await page.getByRole('checkbox',{name:/Hear Data Only/}).check();
 await page.evaluate(()=>(window as unknown as {icePitches:number[]}).icePitches=[]);await page.getByRole('button',{name:/Play my mix/}).click();expect(await page.evaluate(()=>(window as unknown as {icePitches:number[]}).icePitches[0])).toBeCloseTo(391.995436,5);
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();const filePromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download 25-second WAV',exact:true}).click();const file=await filePromise;expect(file.suggestedFilename()).toContain('Arctic-September');const wav=await readFile((await file.path())!);expect(wav.toString('ascii',0,4)).toBe('RIFF');expect(wav.length).toBe(2187404);
});

test('moving Earth sound samples video during playback and obeys still-frame and motion controls',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/listen?visual=motion');
 const video=page.locator('.visual-screen video');await expect(video).toBeVisible();await page.getByText('Inspect the pixel-to-sound mapping',{exact:true}).click();
 await page.getByRole('button',{name:'Play visual sound',exact:true}).click();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.3);
 const proof=page.locator('.st-live-proof');await expect.poll(async()=>parseFloat(await proof.locator('dd').nth(0).innerText())).toBeGreaterThan(0);
 await expect(proof).toContainText('Hz');await page.getByLabel('Follow the animation',{exact:true}).uncheck();expect(await video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 const paused=await video.evaluate((v:HTMLVideoElement)=>v.currentTime);await page.getByRole('button',{name:'Play visual sound',exact:true}).click();await page.waitForTimeout(400);expect(await video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBe(paused);
 await page.getByLabel('Motion effects',{exact:true}).uncheck();await expect(page.getByLabel('Follow the animation',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Continue to the real data →',exact:true}).click();await expect(page.getByRole('button',{name:'Stop visual sound',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Now, hear the measurements.'})).toBeVisible();
});

test('new stations and live proof remain bilingual, accessible and usable on mobile',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
 for(const language of ['en','zh'])for(const route of ['/listen?station=all','/listen?station=arctic','/data?station=arctic','/create?station=arctic','/listen?visual=motion']){
  await page.goto(route);await page.locator('h1').waitFor();await page.locator('.sp-language select').selectOption(language);
  if(route==='/data?station=arctic'){await page.locator('details').first().locator('summary').first().click();}
  if(route==='/listen?visual=motion'){await page.locator('.st-live-proof summary').click();await expect(page.getByLabel(language==='en'?'Follow the animation':'跟随动画',{exact:true})).toBeDisabled();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>({route,language,id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 }
});

test('Earth Looper replays mapped positions and rhythm locally, then clears without persisting a take',async({page})=>{
  const posts:string[]=[];page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
  await page.addInitScript(()=>{
    const audit={notes:[] as {hz:number;at:number}[],contexts:[] as AudioContext[]};(window as unknown as {loopAudit:typeof audit}).loopAudit=audit;
    const Original=AudioContext;let voices=0;window.AudioContext=class extends Original{constructor(){super();audit.contexts.push(this);}createOscillator(){const osc=super.createOscillator(),fundamental=voices++%3===0,set=osc.frequency.setValueAtTime.bind(osc.frequency);osc.frequency.setValueAtTime=(hz,at)=>{if(fundamental)audit.notes.push({hz,at:performance.now()});return set(hz,at);};return osc;}};
  });
  await page.goto('/');await page.getByRole('button',{name:'Play with Earth',exact:true}).click();
  const loop=page.getByRole('region',{name:'Earth Looper',exact:true}),slider=page.getByRole('slider',{name:'Image scan position',exact:true});
  const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
  await loop.getByRole('button',{name:'Record',exact:true}).click();
  for(const [index,position] of ['12','31','7'].entries()){
    await slider.fill(position);await expect(loop).toHaveAttribute('data-loop-count',String(index+1));if(index<2)await page.waitForTimeout(index===0?140:230);
  }
  await loop.getByRole('button',{name:'Finish recording',exact:true}).click();
  await expect(loop).toContainText('3 / 64 notes');
  await expect(loop.getByRole('button',{name:'Finish recording',exact:true})).toBeDisabled();
  const recorded=await page.evaluate(()=>(window as unknown as {loopAudit:{notes:{hz:number;at:number}[]}}).loopAudit.notes.splice(0));
  expect(recorded).toHaveLength(3);await loop.getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop).toHaveAttribute('data-loop-phase','replaying');await expect(loop.getByRole('button',{name:'Stop replay',exact:true})).toBeEnabled();await expect(loop).toHaveAttribute('data-loop-phase','idle');
  await expect(loop.getByRole('status')).toHaveText('Your take has finished.');
  const replayed=await page.evaluate(()=>(window as unknown as {loopAudit:{notes:{hz:number;at:number}[]}}).loopAudit.notes);
  expect(replayed.map(n=>n.hz)).toEqual(recorded.map(n=>n.hz));
  for(let i=1;i<3;i++)expect(Math.abs((replayed[i].at-replayed[i-1].at)-(recorded[i].at-recorded[i-1].at))).toBeLessThan(110);
  await test.info().attach('earth-loop-replay-proof',{body:JSON.stringify({notice:'Automated fixture, not participant or acoustic-latency evidence',recorded,replayed}),contentType:'application/json'});
  expect(await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}))).toEqual(storage);expect(posts).toEqual([]);
  await page.getByRole('button',{name:'Back to playback',exact:true}).click();
  await expect(page.locator('.jb-deck')).toHaveAttribute('data-play-mode','automatic');
  await expect(page.getByRole('button',{name:'Play record',exact:true})).toBeVisible();
  await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
  await page.getByRole('button',{name:'Play with Earth',exact:true}).click();
  await expect(loop).toHaveAttribute('data-loop-count','3');
  await loop.getByRole('button',{name:'Clear take',exact:true}).click();await expect(loop).toHaveAttribute('data-loop-count','0');await expect(loop.getByRole('button',{name:'Replay take',exact:true})).toBeDisabled();
  await loop.getByRole('button',{name:'Record',exact:true}).click();await slider.fill('20');await expect(loop).toHaveAttribute('data-loop-count','1');
  await page.getByRole('button',{name:'Select record: Moving Earth',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {loopAudit:{contexts:AudioContext[]}}).loopAudit.contexts.every(c=>c.state==='closed'))).toBe(true);
  await page.getByRole('button',{name:'Select record: Climate Spiral',exact:true}).click();await page.getByRole('button',{name:'Play with Earth',exact:true}).click();await expect(page.locator('.jb-looper')).toHaveAttribute('data-loop-count','0');
});

test('slow manual startup gives an explicit retry and a pending replay can be cancelled',async({page})=>{
  await page.addInitScript(()=>{
    const contexts:AudioContext[]=[];(window as unknown as {slowContexts:AudioContext[]}).slowContexts=contexts;
    const Original=AudioContext;window.AudioContext=class extends Original{delayed=true;constructor(){super();contexts.push(this);}get state():AudioContextState{return this.delayed?'suspended':super.state;}async resume(){await super.resume();if(this.delayed){await new Promise(resolve=>setTimeout(resolve,350));this.delayed=false;}}};
  });
  await page.goto('/');await page.getByRole('button',{name:'Play with Earth',exact:true}).click();const slider=page.getByRole('slider',{name:'Image scan position',exact:true}),loop=page.locator('.jb-looper');
  await slider.fill('12');await expect(page.getByText('Audio is ready. Move again or press Hear this position.',{exact:true})).toBeVisible();await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
  await loop.getByRole('button',{name:'Record',exact:true}).click();await slider.fill('13');await expect(loop).toHaveAttribute('data-loop-count','1');await loop.getByRole('button',{name:'Finish recording',exact:true}).click();
  await page.evaluate(()=>{for(const context of (window as unknown as {slowContexts:(AudioContext&{delayed:boolean})[]}).slowContexts)context.delayed=true;});
  await loop.getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop).toHaveAttribute('data-loop-phase','preparing');await loop.getByRole('button',{name:'Stop replay',exact:true}).click();await page.waitForTimeout(450);await expect(loop).toHaveAttribute('data-loop-phase','idle');await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
  await loop.getByRole('button',{name:'Replay take',exact:true}).click();await expect(loop).toHaveAttribute('data-loop-phase','replaying');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(loop).toHaveAttribute('data-loop-phase','idle');await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.getByRole('button',{name:'Side B: hear the measurements',exact:true}).click();await page.waitForTimeout(350);await expect(page.locator('.jb-deck')).toHaveAttribute('data-record-side','b');await expect(page.locator('.jb-deck')).toHaveAttribute('data-note-serial','0');
});

test('Earth Looper enforces the note limit and finishes an empty recording at the time limit',async({page})=>{
  test.setTimeout(35_000);await page.goto('/');await page.getByRole('button',{name:'Play with Earth',exact:true}).click();const loop=page.locator('.jb-looper'),slider=page.getByRole('slider',{name:'Image scan position',exact:true});
  await loop.getByRole('button',{name:'Record',exact:true}).click();
  for(let i=0;i<64;i++){await slider.fill(String(i%47+2));await expect(loop).toHaveAttribute('data-loop-count',String(i+1));}
  await expect(loop).toHaveAttribute('data-loop-phase','idle');await expect(loop.getByRole('status')).toHaveText('64-note limit reached. Your take is ready.');
  await loop.getByRole('button',{name:'Record again',exact:true}).click();await expect(loop).toHaveAttribute('data-loop-phase','recording');await expect(loop).toHaveAttribute('data-loop-phase','idle',{timeout:16_000});await expect(loop).toHaveAttribute('data-loop-count','0');await expect(loop.getByRole('button',{name:'Replay take',exact:true})).toBeDisabled();
});

test('short mobile viewports expose Play and touch scanning keeps vertical scrolling available',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  try{
    await page.goto('http://127.0.0.1:5173/');const play=page.getByRole('button',{name:'Play record',exact:true});await expect(play).toBeVisible();const playBounds=await play.boundingBox();expect(playBounds!.y+playBounds!.height).toBeLessThan(700);await play.tap();await page.getByRole('button',{name:'Stop',exact:true}).tap();
    await page.getByRole('button',{name:'Play with Earth',exact:true}).tap();const surface=page.locator('.jb-scratch-surface');await surface.scrollIntoViewIfNeeded();const bounds=(await surface.boundingBox())!;const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width*.2,y:bounds.y+bounds.height*.5,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.width*.75,y:bounds.y+bounds.height*.5,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.getByRole('slider',{name:'Image scan position',exact:true})).toHaveValue('37');
    const scrolled=await page.evaluate(()=>scrollY);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*.5,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*.5-110,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(scrolled);await expect.poll(()=>page.locator('.jb-deck').getAttribute('data-note-serial')).toBe('0');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('zh');await expect(page.getByRole('region',{name:'地球旋律录制',exact:true})).toBeVisible();
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  }finally{await context.close();}
});
