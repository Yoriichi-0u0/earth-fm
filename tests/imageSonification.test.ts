import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { FrameAudio, imageToSequence, imageSequenceWav } from '../src/lib/imageSonification.ts'
import { EarthAudio, mapValueToNote, type SonificationOptions } from '../src/lib/audio.ts'

test('a generated RGB image produces the documented luma and left-to-right pan', () => {
  const image = {
    width: 3, height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
  }
  const steps = imageToSequence(image, 3)
  assert.deepEqual(steps.map(step => [step.red, step.green, step.blue]), [[1, 0, 0], [0, 1, 0], [0, 0, 1]])
  assert.deepEqual(steps.map(step => step.brightness), [0.2126, 0.7152, 0.0722])
  assert.deepEqual(steps.map(step => step.column), [0, 1, 2])
  assert.ok(Math.abs(steps[0]!.pan + 2 / 3) < 1e-10)
  assert.equal(steps[1]!.pan, 0)
  assert.ok(Math.abs(steps[2]!.pan - 2 / 3) < 1e-10)
  assert.ok(steps.every(step => step.value === step.brightness))
})

test('vertical aggregation includes all pixels and handles transparency over black', () => {
  const image = {
    width: 2, height: 2,
    data: new Uint8ClampedArray([
      255, 255, 255, 255, 255, 0, 0, 255,
      255, 255, 255, 0, 0, 0, 255, 255,
    ]),
  }
  const steps = imageToSequence(image, 2)
  assert.equal(steps[0]!.red, 0.5)
  assert.equal(steps[0]!.green, 0.5)
  assert.equal(steps[0]!.blue, 0.5)
  assert.ok(Math.abs(steps[0]!.brightness - 0.5) < 1e-10)
  assert.equal(steps[1]!.red, 0.5)
  assert.equal(steps[1]!.green, 0)
  assert.equal(steps[1]!.blue, 0.5)
  const oneStrip = imageToSequence(image, 1)[0]!
  assert.equal(oneStrip.red, 0.5)
  assert.equal(oneStrip.green, 0.25)
  assert.equal(oneStrip.blue, 0.5)
  assert.equal(oneStrip.pan, 0)
})

test('brightness produces monotonically increasing pitches using a fixed absolute range', () => {
  const grayscale = [0, 64, 128, 192, 255]
  const data = grayscale.flatMap(value => [value, value, value, 255])
  const sequence = imageToSequence({ width: 5, height: 1, data }, 5)
  const pitches = sequence.map(step => mapValueToNote(step.brightness, 0, 1).midi)
  assert.equal(pitches[0], 50)
  assert.equal(pitches[4], 74)
  assert.ok(pitches.every((pitch, index) => index === 0 || pitch >= pitches[index - 1]!))
  assert.equal(imageToSequence({ width: 1, height: 1, data: [0, 0, 0, 255] })[0]!.brightness, 0)
  assert.ok(Math.abs(imageToSequence({ width: 1, height: 1, data: [255, 255, 255, 255] })[0]!.brightness - 1) < 1e-10)
})

test('non-divisible image widths include each column and narrow images avoid repeated strips', () => {
  const data = Array.from({ length: 5 }, (_, column) => [column * 50, 0, 0, 255]).flat()
  const sequence = imageToSequence({ width: 5, height: 1, data }, 2)
  assert.equal(sequence.length, 2)
  assert.equal(sequence[0]!.red, 25 / 255)
  assert.ok(Math.abs(sequence[1]!.red - 150 / 255) < 1e-10)
  assert.equal(imageToSequence({ width: 5, height: 1, data }, 48).length, 5)
})

test('invalid dimensions, RGBA buffers, scan counts and channel values are rejected', () => {
  assert.throws(() => imageToSequence({ width: 0, height: 1, data: [] }), /positive integer/)
  assert.throws(() => imageToSequence({ width: 1, height: 1, data: [0, 0, 0] }), /four RGBA/)
  assert.throws(() => imageToSequence({ width: 1, height: 1, data: [0, 0, 0, 255] }, 0), /1 and 256/)
  assert.throws(() => imageToSequence({ width: 1, height: 1, data: [NaN, 0, 0, 255] }), /finite numbers/)
})

test('frame WAV responds to RGB timbre and stereo pan independently of brightness', async () => {
  const base = imageToSequence({ width: 1, height: 1, data: [128, 128, 128, 255] })[0]!
  const options = { tempo: 180, volume: 0.8 }
  const red = await imageSequenceWav([{ ...base, brightness: 0.5, red: 1, green: 0, blue: 0 }], options)
  const blue = await imageSequenceWav([{ ...base, brightness: 0.5, red: 0, green: 0, blue: 1 }], options)
  const fingerprint = async (blob: Blob) => createHash('sha256').update(new Uint8Array(await blob.arrayBuffer())).digest('hex')
  assert.notEqual(await fingerprint(red), await fingerprint(blue))
  const left = await imageSequenceWav([{ ...base, pan: -1 }], options)
  const right = await imageSequenceWav([{ ...base, pan: 1 }], options)
  assert.notEqual(await fingerprint(left), await fingerprint(right))
  assert.equal(red.type, 'audio/wav')
})

test('FrameAudio forwards a live frame provider with fixed brightness bounds and current RGB/pan', async () => {
  const originalStart = EarthAudio.prototype.start
  let captured: SonificationOptions | undefined
  EarthAudio.prototype.start = async (_points, options) => { captured = options }
  const frame = imageToSequence({ width: 1, height: 1, data: [0, 0, 0, 255] })[0]!
  let current = frame
  const player = new FrameAudio()
  try {
    await player.start([frame], {
      tempo: 120, volume: 0.7, onStep() {}, onEnd() {},
      sampleStep: () => current,
    })
    assert.deepEqual(captured!.pitchRange, { min: 0, max: 1 })
    assert.equal(captured!.samplePoint!(0).value, 0)
    current = { ...frame, brightness: 0.8, red: 1, green: 0.5, blue: 0, pan: 0.75 }
    const sampled = captured!.samplePoint!(0)
    assert.equal(sampled.value, 0.8)
    assert.equal(sampled.pan, 0.75)
    assert.deepEqual(sampled.color, { red: 1, green: 0.5, blue: 0 })
  } finally {
    EarthAudio.prototype.start = originalStart
    player.dispose()
  }
})
