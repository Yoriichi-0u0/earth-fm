import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { EarthAudio, exportWav, mapValueToNote, sonify } from '../src/lib/audio.ts'

test('observations map monotonically across the documented D minor pentatonic scale', () => {
  const mapped = Array.from({ length: 11 }, (_, index) => mapValueToNote(index, 0, 10))
  assert.deepEqual(mapped.map(note => note.midi), [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74])
  assert.deepEqual(mapped.map(note => note.note), ['D3', 'F3', 'G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5'])
  assert.ok(Math.abs(mapped[8]!.frequency - 440) < 1e-10)
  for (let index = 1; index < mapped.length; index++) {
    assert.ok(mapped[index]!.frequency > mapped[index - 1]!.frequency)
  }
})

test('pitch is relative to the series, handles negative values, and safely clamps outliers', () => {
  assert.equal(mapValueToNote(-10, -10, 10).midi, 50)
  assert.equal(mapValueToNote(0, -10, 10).midi, 62)
  assert.equal(mapValueToNote(10, -10, 10).midi, 74)
  assert.equal(mapValueToNote(-100, -10, 10).midi, 50)
  assert.equal(mapValueToNote(100, -10, 10).midi, 74)
  assert.equal(mapValueToNote(5, 5, 5).midi, 62)
  assert.equal(mapValueToNote(NaN, 0, 10).midi, 62)
  assert.equal(sonify([-12, 0, 9], 2).midi, 74)
  assert.equal(sonify([3, NaN, 3], 0).midi, 62)
  assert.equal(sonify([], 0).midi, 62)
})

const points = [{ year: 2020, value: -0.2 }, { year: 2021, value: 0.4 }, { year: 2022, value: 1.2 }]

test('WAV export contains a complete interoperable stereo PCM header and audible unclipped samples', async () => {
  const blob = await exportWav(points, { soundscape: 'piano', tempo: 120, volume: 0.8 })
  assert.equal(blob.type, 'audio/wav')
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  const text = (start: number, length: number) => new TextDecoder().decode(buffer.slice(start, start + length))
  assert.equal(text(0, 4), 'RIFF')
  assert.equal(text(8, 4), 'WAVE')
  assert.equal(text(12, 4), 'fmt ')
  assert.equal(text(36, 4), 'data')
  assert.equal(view.getUint32(4, true), buffer.byteLength - 8)
  assert.equal(view.getUint16(20, true), 1)
  assert.equal(view.getUint16(22, true), 2)
  assert.equal(view.getUint32(24, true), 24_000)
  assert.equal(view.getUint32(28, true), 96_000)
  assert.equal(view.getUint16(32, true), 4)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(view.getUint32(40, true), buffer.byteLength - 44)
  assert.ok(Math.abs((buffer.byteLength - 44) / 96_000 - 2.52) < 0.001)
  let maximum = 0
  let energy = 0
  let stereoDifference = 0
  for (let offset = 44; offset < buffer.byteLength; offset += 4) {
    const left = view.getInt16(offset, true)
    const right = view.getInt16(offset + 2, true)
    maximum = Math.max(maximum, Math.abs(left), Math.abs(right))
    energy += left * left + right * right
    stereoDifference += Math.abs(left - right)
  }
  assert.ok(maximum > 1000, 'export should be audible')
  assert.ok(maximum < 32_000, 'export should retain headroom')
  assert.ok(energy > 1_000_000, 'export should contain sustained audio')
  assert.ok(stereoDifference > 0, 'notes should have a stereo position')
})

test('each soundscape is distinct, exports are repeatable, and zero volume is silent', async () => {
  const fingerprints = []
  for (const soundscape of ['ambient', 'piano', 'pulse'] as const) {
    const options = { soundscape, tempo: 180, volume: 0.7 }
    const first = await exportWav(points, options)
    const second = await exportWav(points, options)
    const firstBytes = new Uint8Array(await first.arrayBuffer())
    assert.deepEqual(new Uint8Array(await second.arrayBuffer()), firstBytes)
    fingerprints.push(createHash('sha256').update(firstBytes).digest('hex'))
  }
  assert.equal(new Set(fingerprints).size, 3)
  const muted = await exportWav(points, { soundscape: 'ambient', tempo: 180, volume: 0 })
  const samples = new Uint8Array(await muted.arrayBuffer()).subarray(44)
  assert.ok(samples.every(byte => byte === 0))
})

test('WAV rejects malformed observations and bounds memory for oversized exports', async () => {
  const options = { soundscape: 'piano' as const, tempo: 80, volume: 0.7 }
  await assert.rejects(exportWav([], options), /at least one observation/)
  await assert.rejects(exportWav([{ year: 2020, value: Infinity }], options), /finite year and value/)
  await assert.rejects(exportWav([{ year: NaN, value: 0 }], options), /finite year and value/)
  await assert.rejects(exportWav(Array.from({ length: 450 }, (_, year) => ({ year, value: year })), options), /five minutes/)
})

// A minimal audio graph exercises cancellation and resume races without speakers.
class FakeParam {
  value = 0
  setValueAtTime(value: number) { this.value = value; return this }
  linearRampToValueAtTime(value: number) { this.value = value; return this }
  exponentialRampToValueAtTime(value: number) { this.value = value; return this }
  setTargetAtTime(value: number) { this.value = value; return this }
  cancelScheduledValues() { return this }
}
class FakeNode {
  gain = new FakeParam()
  delayTime = new FakeParam()
  frequency = new FakeParam()
  detune = new FakeParam()
  pan = new FakeParam()
  threshold = new FakeParam()
  knee = new FakeParam()
  ratio = new FakeParam()
  attack = new FakeParam()
  release = new FakeParam()
  type = ''
  onended: (() => void) | null = null
  connected = true
  connect() { return this }
  disconnect() { this.connected = false }
  start() {}
  stop() {}
}
class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static pendingResume: (() => Promise<void>) | null = null
  state = 'suspended'
  currentTime = 0
  destination = new FakeNode()
  nodes: FakeNode[] = []
  constructor() { FakeAudioContext.instances.push(this) }
  async resume() {
    if (FakeAudioContext.pendingResume) await FakeAudioContext.pendingResume()
    this.state = 'running'
  }
  async close() { this.state = 'closed' }
  private node() { const node = new FakeNode(); this.nodes.push(node); return node }
  createGain() { return this.node() }
  createDelay() { return this.node() }
  createBiquadFilter() { return this.node() }
  createDynamicsCompressor() { return this.node() }
  createOscillator() { return this.node() }
  createStereoPanner() { return this.node() }
}

async function withFakeContext(callback: () => Promise<void>) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  FakeAudioContext.instances = []
  FakeAudioContext.pendingResume = null
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeAudioContext })
  try { await callback() } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else delete (globalThis as { AudioContext?: unknown }).AudioContext
    FakeAudioContext.pendingResume = null
  }
}

test('pause cancels queued step/end callbacks, and dispose releases the audio graph', async () => {
  await withFakeContext(async () => {
    const player = new EarthAudio()
    const steps: number[] = []
    let ends = 0
    try {
      await player.start(points, {
        soundscape: 'piano', tempo: 240, volume: 0.8,
        onStep: index => steps.push(index), onEnd: () => ends++,
      })
      await new Promise(resolve => setTimeout(resolve, 45))
      assert.deepEqual(steps, [0])
      player.setVolume(0.2)
      player.pause()
      await new Promise(resolve => setTimeout(resolve, 90))
      assert.deepEqual(steps, [0])
      assert.equal(ends, 0)
      player.dispose()
      const context = FakeAudioContext.instances[0]!
      assert.equal(context.state, 'closed')
      assert.ok(context.nodes.every(node => !node.connected))
      await assert.rejects(player.start(points, {
        soundscape: 'pulse', tempo: 80, volume: 0.7, onStep() {}, onEnd() {},
      }), /disposed/)
    } finally { player.dispose() }
  })
})

test('stopping during a pending browser resume cannot resurrect playback', async () => {
  await withFakeContext(async () => {
    let finishResume: () => void = () => {}
    FakeAudioContext.pendingResume = () => new Promise<void>(resolve => { finishResume = resolve })
    const player = new EarthAudio()
    let calls = 0
    try {
      const starting = player.start(points, {
        soundscape: 'ambient', tempo: 80, volume: 0.7,
        onStep: () => calls++, onEnd: () => calls++,
      })
      player.stop()
      finishResume()
      await starting
      assert.equal(FakeAudioContext.instances[0]!.nodes.length, 0)
      assert.equal(calls, 0)
    } finally { player.dispose() }
  })
})

test('live samples are read at each scheduling boundary and control the new note pitch', async () => {
  await withFakeContext(async () => {
    const player = new EarthAudio()
    const observations: { index: number; value: number }[] = []
    let currentValue = 0
    try {
      await player.start(points.map(point => ({ ...point, value: 0 })), {
        soundscape: 'piano', tempo: 240, volume: 0.7,
        pitchRange: { min: 0, max: 1 },
        samplePoint(index) {
          observations.push({ index, value: currentValue })
          return { year: index, value: currentValue }
        },
        onStep() {}, onEnd() {},
      })
      assert.deepEqual(observations, [{ index: 0, value: 0 }])
      const context = FakeAudioContext.instances[0]!
      currentValue = 1
      context.currentTime = 0.2
      await new Promise(resolve => setTimeout(resolve, 35))
      assert.deepEqual(observations, [{ index: 0, value: 0 }, { index: 1, value: 1 }])
      const oscillatorFrequencies = context.nodes.filter(node => node.type === 'sine').map(node => node.frequency.value)
      assert.equal(oscillatorFrequencies.length, 6)
      assert.equal(oscillatorFrequencies[0], mapValueToNote(0, 0, 1).frequency)
      assert.equal(oscillatorFrequencies[3], mapValueToNote(1, 0, 1).frequency)
    } finally { player.dispose() }
  })
})

test('a failing live provider safely ends playback and cancels subsequent callbacks', async () => {
  await withFakeContext(async () => {
    const player = new EarthAudio()
    const sampled: number[] = []
    const heard: number[] = []
    let ends = 0
    try {
      await player.start(points, {
        soundscape: 'piano', tempo: 240, volume: 0.7,
        pitchRange: { min: 0, max: 1 },
        samplePoint(index) {
          sampled.push(index)
          if (index === 1) throw new Error('Canvas pixels unavailable')
          return { year: index, value: 0.5 }
        },
        onStep(index) { heard.push(index) }, onEnd() { ends++ },
      })
      await new Promise(resolve => setTimeout(resolve, 35))
      FakeAudioContext.instances[0]!.currentTime = 0.2
      await new Promise(resolve => setTimeout(resolve, 70))
      assert.deepEqual(sampled, [0, 1])
      assert.deepEqual(heard, [0])
      assert.equal(ends, 1)
    } finally { player.dispose() }
  })
})
