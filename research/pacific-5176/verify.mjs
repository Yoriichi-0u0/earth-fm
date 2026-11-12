import assert from 'node:assert/strict'
import {mkdir, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium, expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {createServer} from 'vite'

const output = resolve(process.env.PACIFIC_5176_EVIDENCE ?? 'project-library/pacific-5176/evidence')
const server = await createServer({server: {host: '127.0.0.1', port: 0}})
await mkdir(output, {recursive: true})
await server.listen()
const origin = 'http://127.0.0.1:' + server.httpServer.address().port
const route = origin + '/research/pacific-5176/'
let browser
let fallbackBrowser

try {
  browser = await chromium.launch({args: ['--enable-unsafe-swiftshader']})
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'})
  const page = await context.newPage()
  const errors = []
  const requests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {if (!request.url().startsWith(origin)) requests.push(request.url())})
  await page.addInitScript(() => {
    window.oscillators = []
    const Native = AudioContext
    window.AudioContext = class extends Native {
      createOscillator() {
        const osc = super.createOscillator()
        const start = osc.start.bind(osc)
        const stop = osc.stop.bind(osc)
        const event = {hz: 0, stopped: 0}
        osc.start = when => {event.hz = osc.frequency.value; window.oscillators.push(event); start(when)}
        osc.stop = when => {event.stopped++; stop(when)}
        return osc
      }
    }
  })
  await page.goto(route)
  await page.getByRole('combobox', {name: 'Appearance'}).selectOption('dark')
  const slider = page.getByRole('slider', {name: 'Shared strip', exact: true})
  const hear = year => page.getByRole('button', {name: 'Hear ' + year, exact: true})
  const globe = page.getByRole('button', {name: 'Paired 3D globes'})
  const stop = page.getByRole('button', {name: 'Stop', exact: true})
  await expect(hear(2025)).toBeEnabled()
  await expect(page.locator('canvas')).toHaveCount(0)
  await slider.press('ArrowRight')
  await slider.press('ArrowLeft')
  await expect(slider).toHaveValue('24')
  await expect(slider).toHaveAttribute('aria-valuetext', /Strip 24 of 48.*2025.*brightness.*2026.*brightness/)
  assert.deepEqual(await page.evaluate(() => window.oscillators), [])
  const frequencies = await page.locator('[data-frequency]').evaluateAll(elements => elements.map(el => Number(el.dataset.frequency)))
  for (const [i, year] of [2025, 2026].entries()) {
    await page.evaluate(() => {window.oscillators = []})
    await hear(year).press('Enter')
    await expect.poll(() => page.evaluate(() => window.oscillators.length)).toBe(3)
    const notes = await page.evaluate(() => window.oscillators.map(event => event.hz))
    notes.forEach((note, harmonic) => assert.ok(Math.abs(note - frequencies[i] * (harmonic + 1)) < .01))
    await stop.press('Enter')
    await expect(stop).toBeDisabled()
    assert.ok(await page.evaluate(() => window.oscillators.every(event => event.stopped > 0)))
  }
  await expect(slider).toHaveValue('24')
  assert.equal(await page.locator('.lab-strip').evaluateAll(elements => new Set(elements.map(el => el.style.left)).size), 1)
  await page.screenshot({path: resolve(output, 'pacific-5176-2d.png'), fullPage: true})
  const audio = await page.evaluate(async () => {
    const {scanMap} = await import('/research/pacific-5176/scanMap.ts')
    const {imageSequenceWav} = await import('/src/lib/imageSonification.ts')
    return Promise.all([...document.querySelectorAll('.pacific-map-frame img')].map(async image => {
      const steps = scanMap(image)
      const wav = await imageSequenceWav([steps[23]], {tempo: 120, volume: .55})
      return {strip: steps[23], bytes: [...new Uint8Array(await wav.arrayBuffer())]}
    }))
  })
  for (const [i, year] of [2025, 2026].entries()) {
    const bytes = Buffer.from(audio[i].bytes)
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
    assert.ok(bytes.length > 44)
    await writeFile(resolve(output, 'pacific-' + year + '-strip24.wav'), bytes)
  }
  await page.evaluate(() => {window.oscillators = []})
  await globe.press('Enter')
  await expect(page.locator('.pacific-globe-view canvas')).toBeVisible()
  await expect.poll(() => page.locator('.pacific-globe-view canvas').evaluate(canvas =>
    canvas.getContext('webgl2')?.getParameter(0x1f02) ?? '')).toContain('WebGL')
  await page.screenshot({path: resolve(output, 'pacific-5176-paired-globes.png'), fullPage: true})
  const renderedStrip = await page.locator('.pacific-globe-view canvas').screenshot()
  await slider.press('ArrowRight')
  await expect(slider).toHaveValue('25')
  await expect.poll(async () => renderedStrip.equals(await page.locator('.pacific-globe-view canvas').screenshot())).toBe(false)
  assert.deepEqual(await page.evaluate(() => window.oscillators), [])
  await globe.press('Enter')
  await expect(page.locator('.pacific-globe-view canvas')).toHaveCount(0)
  await page.setViewportSize({width: 390, height: 844})
  await page.getByRole('combobox',{name:'Appearance'}).selectOption('light')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  await page.screenshot({path: resolve(output, 'pacific-5176-phone-light.png'), fullPage: true})
  await globe.press('Enter')
  await expect(page.locator('.pacific-globe-view canvas')).toBeVisible()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  await page.screenshot({path: resolve(output, 'pacific-5176-phone-globes.png'), fullPage: true})
  await globe.press('Enter')
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  assert.deepEqual(axe.violations.map(item => item.id), [])
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [])
  fallbackBrowser = await chromium.launch({args: ['--disable-webgl']})
  const fallback = await fallbackBrowser.newPage()
  await fallback.goto(route)
  await fallback.getByRole('button', {name: 'Paired 3D globes'}).click()
  await expect(fallback.getByText('3D is unavailable. The maps and sound are ready below.')).toBeVisible()
  await expect(fallback.getByRole('button', {name: 'Hear 2026'})).toBeEnabled()
  await writeFile(resolve(output, 'browser-check.json'), JSON.stringify({
    browser: browser.version(), strip: 24, frequencies, inputs: audio.map(a => a.strip),
    webgl2: true, webglDisabledFallback: true, phoneViewport: [390, 844], axeViolations: [], errors, requests,
  }, null, 2))
  console.log('PASS shared silent strip, both mapped notes, Stop, WAV exports, paired WebGL, 2D fallback, phone layout, axe, local requests')
} finally {
  await fallbackBrowser?.close()
  await browser?.close()
  await server.close()
}
