import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(root, process.env.PACIFIC_EVIDENCE_DIR ?? 'project-library/pacific-listening-lab/evidence')
let origin
const route = '/research/pacific/'
const manifest = JSON.parse(await readFile(new URL('./provenance.json', import.meta.url), 'utf8'))
await mkdir(output, { recursive: true })
for (const asset of [manifest.source, ...Object.values(manifest.panels)]) {
  const bytes = await readFile(new URL('./assets/' + asset.file, import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256)
}
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 } })
let browser
const report = { checks: [], pageErrors: [], externalRequests: [] }

async function openPage(options) {
  const context = await browser.newContext({ reducedMotion: 'reduce', ...options })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) {
      report.externalRequests.push(request.url())
    }
  })
  await page.addInitScript(() => {
    const start = OscillatorNode.prototype.start
    const connect = AudioNode.prototype.connect
    window.pacificAudit = { notes: [], analysers: [] }
    OscillatorNode.prototype.start = function (at) {
      window.pacificAudit.notes.push({ hz: this.frequency.value, cents: this.detune.value, at })
      return start.call(this, at)
    }
    AudioNode.prototype.connect = function (destination, ...args) {
      if (destination === this.context.destination && this.context instanceof AudioContext) {
        const analyser = this.context.createAnalyser()
        connect.call(this, analyser)
        window.pacificAudit.analysers.push(analyser)
      }
      return connect.call(this, destination, ...args)
    }
  })
  return { page, context }
}

const notes = page => page.evaluate(() => window.pacificAudit.notes.slice())
const rms = page => page.evaluate(() => Math.max(0, ...window.pacificAudit.analysers.map(analyser => {
  const values = new Float32Array(analyser.fftSize)
  analyser.getFloatTimeDomainData(values)
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)
})))
const check = name => {
  report.checks.push(name)
  console.log('PASS', name)
}

async function samplePanels(page, wav) {
  return page.evaluate(async generateWav => {
    const { imageToSequence, imageSequenceWav } = await import('/src/lib/imageSonification.ts')
    const { mapValueToNote } = await import('/src/lib/audio.ts')
    const result = {}
    for (const year of ['2025', '2026']) {
      const image = document.querySelector(`[data-year="${year}"] img`)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 384
      const context = canvas.getContext('2d', { willReadFrequently: true })
      function sample() {
        context.drawImage(image, 0, 0, 384, 384)
        return imageToSequence(context.getImageData(0, 0, 384, 384), 48)
      }
      const steps = sample()
      const readings = Array.from({ length: 20 }, () => {
        const before = performance.now()
        sample()
        return performance.now() - before
      }).sort((a, b) => a - b)
      result[year] = {
        decodedSize: [image.naturalWidth, image.naturalHeight],
        medianSampleMs: readings[10],
        maxSampleMs: readings.at(-1),
        strips: steps.map(step => ({ ...step, ...mapValueToNote(step.brightness, 0, 1) })),
      }
      if (generateWav) {
        const audio = await imageSequenceWav(steps, { tempo: 120, volume: .55 })
        result[year].wav = Array.from(new Uint8Array(await audio.arrayBuffer()))
      }
    }
    return result
  }, wav)
}

function assertNoteGroup(group, strip) {
  assert.equal(group.length, 3)
  for (const [index, oscillator] of group.entries()) {
    assert.ok(Math.abs(oscillator.hz - strip.frequency * (index + 1)) < .001)
    assert.equal(oscillator.cents, [-2, 2, 0][index])
  }
}

async function desktopCheck() {
  const { page, context } = await openPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' })
  try {
    const started = performance.now()
    await page.goto(origin + route)
    const play = page.getByRole('button', { name: 'Listen to scan', exact: true })
    const hear2025 = page.getByRole('button', { name: 'Hear 2025', exact: true })
    const hear2026 = page.getByRole('button', { name: 'Hear 2026', exact: true })
    const stop = page.getByRole('button', { name: 'Stop', exact: true })
    const strip = page.getByRole('slider', { name: 'Image strip', exact: true })
    await expect(play).toBeEnabled()
    report.desktopReadyMs = performance.now() - started
    const panels = await samplePanels(page, true)
    for (const year of ['2025', '2026']) {
      assert.equal(panels[year].strips.length, 48)
      assert.deepEqual(panels[year].decodedSize, Array(2).fill(manifest.panels[year].size))
      await writeFile(join(output, `Pacific-${year}-48-strips.wav`), Buffer.from(panels[year].wav))
      delete panels[year].wav
    }
    report.panels = panels
    const index = 23
    await expect(strip).toHaveValue('24')
    await strip.focus()
    await strip.press('ArrowRight')
    await expect(strip).toHaveValue('25')
    await strip.press('ArrowLeft')
    await expect(strip).toHaveValue(String(index + 1))
    assert.equal((await notes(page)).length, 0)
    assert.equal(await page.locator('.lab-strip').evaluateAll(markers =>
      new Set(markers.map(marker => marker.style.left)).size), 1)
    await page.screenshot({ path: join(output, 'pacific-desktop-dark.png'), fullPage: true })
    await expect(strip).toHaveAccessibleDescription(/same relative position.*cannot measure ocean temperature/)
    await hear2026.click()
    await expect.poll(() => notes(page).then(events => events.length)).toBe(3)
    assertNoteGroup(await notes(page), panels['2026'].strips[index])
    await expect(page.getByRole('radio', { name: /2026/ })).toBeChecked()
    await expect(strip).toHaveValue(String(index + 1))
    await hear2025.press('Enter')
    await expect.poll(() => notes(page).then(events => events.length)).toBe(6)
    assertNoteGroup((await notes(page)).slice(3), panels['2025'].strips[index])
    await expect(page.getByRole('radio', { name: /2025/ })).toBeChecked()
    await expect(strip).toHaveValue(String(index + 1))
    check('Direct A/B buttons and keyboard activation audition the same strip with the correct tuning')

    let before = (await notes(page)).length
    await play.click()
    await expect.poll(() => rms(page)).toBeGreaterThan(.001)
    await expect.poll(async () => Number(await strip.inputValue())).toBeGreaterThan(1)
    await page.getByRole('radio', { name: /2026/ }).check()
    await expect(stop).toBeDisabled()
    await expect.poll(() => rms(page)).toBeLessThan(.0001)
    const cancelledCount = (await notes(page)).length
    await page.waitForTimeout(650)
    assert.equal((await notes(page)).length, cancelledCount)
    assert.ok(cancelledCount > before)
    check('Year selection cancels the active scan without starting the other year')

    await play.click()
    await expect.poll(() => rms(page)).toBeGreaterThan(.001)
    await expect.poll(async () => Number(await strip.inputValue())).toBeGreaterThan(1)
    await hear2025.click()
    await expect(page.getByRole('status')).toContainText('Playing the selected strip')
    const auditionIndex = Number(await strip.inputValue()) - 1
    const auditionNotes = await notes(page)
    assertNoteGroup(auditionNotes.slice(-3), panels['2025'].strips[auditionIndex])
    await expect.poll(() => rms(page)).toBeLessThan(.0001)
    await page.waitForTimeout(650)
    assert.equal((await notes(page)).length, auditionNotes.length)
    await page.getByRole('radio', { name: /2026/ }).check()
    check('A direct audition stops the scan and leaves no scheduled notes behind')

    before = (await notes(page)).length
    await play.click()
    await expect(page.getByRole('status')).toContainText('Scan complete', { timeout: 32_000 })
    const scheduled = (await notes(page)).slice(before)
    assert.equal(scheduled.length, 146)
    const scan = scheduled.slice(2)
    for (const [i, step] of panels['2026'].strips.entries()) {
      const group = scan.slice(i * 3, i * 3 + 3)
      assertNoteGroup(group, step)
      assert.ok(Math.abs(group[0].at - scan[0].at - i * .5) < 1e-6)
    }
    await expect.poll(() => rms(page)).toBeLessThan(.0001)
    report.completed2026Scan = scan
    report.comparedStrip = index + 1
    check('All 48 live 2026 note groups match the unchanged engine and finish silently')

    await page.getByText('Original NASA image and legend', { exact: true }).click()
    const image = page.getByRole('img', { name: 'Full NASA SVS comparison with the original legend and both dates' })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate(img => img.naturalWidth)).toBe(1670)
    assert.equal(await image.evaluate(img => img.naturalHeight), 835)
    await image.screenshot({ path: join(output, 'pacific-original-in-lab.png') })
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [])
    check('Full-size original and legend, with zero automated WCAG A/AA violations in desktop dark')
  } finally {
    await context.close()
  }
}

async function phoneCheck() {
  const { page, context } = await openPage({ ...devices['iPhone 13'], colorScheme: 'light' })
  try {
    const before = performance.now()
    await page.goto(origin + route)
    await expect(page.getByRole('button', { name: 'Listen to scan' })).toBeEnabled()
    report.phoneReadyMs = performance.now() - before
    report.phoneViewport = page.viewportSize()
    const sampled = await samplePanels(page, false)
    for (const year of ['2025', '2026']) {
      assert.deepEqual(sampled[year].strips, report.panels[year].strips)
    }
    report.phoneSampling = Object.fromEntries(Object.entries(sampled).map(([year, { medianSampleMs, maxSampleMs }]) =>
      [year, { medianSampleMs, maxSampleMs }]))
    await page.getByLabel('Appearance').selectOption('light')
    await page.getByLabel('Language').selectOption('zh')
    await expect(page.getByRole('heading', { name: '太平洋聆听实验室' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0)
    await page.getByRole('slider', { name: '图像条带', exact: true }).fill(String(report.comparedStrip))
    await page.getByRole('button', { name: '试听 2026', exact: true }).tap()
    await expect(page.getByRole('radio', { name: /2026/ })).toBeChecked()
    await expect(page.getByRole('slider', { name: '图像条带', exact: true })).toHaveValue(String(report.comparedStrip))
    await expect.poll(() => rms(page)).toBeLessThan(.0001)
    await page.screenshot({ path: join(output, 'pacific-phone-light-zh.png'), fullPage: true })
    await page.getByRole('button', { name: '聆听扫描' }).click()
    await expect.poll(() => rms(page)).toBeGreaterThan(.001)
    await page.getByRole('button', { name: '停止', exact: true }).click()
    await expect.poll(() => rms(page)).toBeLessThan(.0001)
    const stopped = (await notes(page)).length
    await page.waitForTimeout(650)
    assert.equal((await notes(page)).length, stopped)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [])
    check('Phone-sized Chromium matches desktop pixels, switches language and theme, and stops audio')
  } finally {
    await context.close()
  }
}

async function motionCheck() {
  const { page, context } = await openPage({ ...devices['iPhone 13'] })
  try {
    await page.goto(origin + '/?legacy=1')
    const visual = page.locator('#visual-radio')
    const play = visual.getByRole('button', { name: 'Hear this visual' })
    const before = performance.now()
    await visual.locator('#upload-visual').setInputFiles(join(output, 'svs5688-motion-10s-15s-v1.mp4'))
    await expect(play).toBeEnabled()
    const readyMs = performance.now() - before
    const video = visual.locator('video')
    const follow = visual.getByRole('checkbox', { name: /Follow the animation/ })
    await expect(follow).not.toBeChecked()
    await follow.check()
    const spectrum = () => visual.locator('.visual-spectrum i').evaluateAll(strips => strips.map(strip => strip.style.height))
    const initial = await spectrum()
    await play.click()
    await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThan(4.65)
    await expect.poll(spectrum).not.toEqual(initial)
    const playback = await video.evaluate(element => {
      const { droppedVideoFrames, totalVideoFrames } = element.getVideoPlaybackQuality()
      return { width: element.videoWidth, height: element.videoHeight, duration: element.duration,
        mediaTime: element.currentTime, droppedVideoFrames, totalVideoFrames }
    })
    await visual.getByRole('button', { name: 'Pause visual' }).click()
    assert.ok(await video.evaluate(element => element.paused))
    await expect.poll(() => rms(page)).toBeLessThan(.0001)
    const stopped = (await notes(page)).length
    await page.waitForTimeout(650)
    assert.equal((await notes(page)).length, stopped)
    report.motion = { ...playback, readyMs, viewport: page.viewportSize() }
    check('Motion excerpt plays and updates the 48-strip spectrum, then pauses video and audio in phone emulation')
  } finally {
    await context.close()
  }
}

try {
  await server.listen()
  origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch()
  report.browser = browser.version()
  await desktopCheck()
  await phoneCheck()
  if (process.argv.includes('--motion')) await motionCheck()
  assert.deepEqual(report.pageErrors, [])
  assert.deepEqual(report.externalRequests, [])
  check('All selected paths run locally with zero uncaught browser errors')
} finally {
  await writeFile(join(output, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n')
  await browser?.close()
  await server.close()
}
