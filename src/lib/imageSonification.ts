import { EarthAudio, exportWav, type SonificationOptions, type SonificationPoint } from './audio'

export type FrameStep = {
  year: number
  value: number
  brightness: number
  red: number
  green: number
  blue: number
  pan: number
  column: number
}

export type FrameAudioOptions = Pick<SonificationOptions, 'tempo' | 'volume' | 'onStep' | 'onEnd'> & {
  /** Supply current canvas pixels at the scheduling boundary for live video scans. */
  sampleStep?: (index: number) => FrameStep
}
export type PixelFrame = { width: number; height: number; data: ArrayLike<number> }

/**
 * Scan displayed pixels in vertical strips, left to right. RGB channels are
 * alpha-composited over black and averaged within each strip. Brightness uses
 * 0.2126R + 0.7152G + 0.0722B (an sRGB luma estimate, not a physical retrieval).
 * Brightness controls pitch; RGB controls harmonic color; horizontal position
 * controls stereo pan. A visualization's palette is never treated as a measured
 * temperature, aerosol concentration, or other scientific variable.
 */
export function imageToSequence(imageData: PixelFrame, steps = 48): FrameStep[] {
  const { width, height, data } = imageData
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new RangeError('An image must have positive integer dimensions.')
  }
  if (!Number.isSafeInteger(steps) || steps < 1 || steps > 256) {
    throw new RangeError('Choose between 1 and 256 scan steps.')
  }
  if (data.length < width * height * 4) {
    throw new RangeError('The image pixel buffer must contain four RGBA channels per pixel.')
  }
  const count = Math.min(steps, width)
  const sequence: FrameStep[] = []
  const channel = (value: number) => {
    if (!Number.isFinite(value)) throw new TypeError('Image channels must be finite numbers.')
    return Math.max(0, Math.min(255, value)) / 255
  }
  for (let index = 0; index < count; index++) {
    const startColumn = Math.floor(index * width / count)
    const endColumn = Math.floor((index + 1) * width / count)
    let red = 0
    let green = 0
    let blue = 0
    for (let x = startColumn; x < endColumn; x++) {
      for (let y = 0; y < height; y++) {
        const offset = (y * width + x) * 4
        const alpha = channel(data[offset + 3]!)
        red += channel(data[offset]!) * alpha
        green += channel(data[offset + 1]!) * alpha
        blue += channel(data[offset + 2]!) * alpha
      }
    }
    const pixels = (endColumn - startColumn) * height
    red /= pixels
    green /= pixels
    blue /= pixels
    const brightness = red * 0.2126 + green * 0.7152 + blue * 0.0722
    const column = (startColumn + endColumn - 1) / 2
    sequence.push({
      year: index, value: brightness, brightness, red, green, blue,
      pan: ((column + 0.5) / width) * 2 - 1,
      column,
    })
  }
  return sequence
}

function framePoints(steps: FrameStep[]): SonificationPoint[] {
  return steps.map(framePoint)
}

function framePoint(step: FrameStep): SonificationPoint {
  return {
    year: step.year,
    value: step.brightness,
    pan: step.pan,
    color: { red: step.red, green: step.green, blue: step.blue },
  }
}

/** Brightness is absolute: black always maps to D3, white always maps to D5. */
export class FrameAudio {
  private player = new EarthAudio()

  start(steps: FrameStep[], options: FrameAudioOptions): Promise<void> {
    const { sampleStep, ...playbackOptions } = options
    return this.player.start(framePoints(steps), {
      ...playbackOptions,
      soundscape: 'ambient',
      pitchRange: { min: 0, max: 1 },
      samplePoint: sampleStep ? index => framePoint(sampleStep(index)) : undefined,
    })
  }

  stop(): void { this.player.stop() }
  pause(): void { this.player.pause() }
  setVolume(volume: number): void { this.player.setVolume(volume) }
  dispose(): void { this.player.dispose() }
}

/** Render precisely the same pixel mapping locally as a downloadable stereo WAV. */
export function imageSequenceWav(steps: FrameStep[], options: Pick<FrameAudioOptions, 'tempo' | 'volume'>): Promise<Blob> {
  return exportWav(framePoints(steps), {
    ...options,
    soundscape: 'ambient',
    pitchRange: { min: 0, max: 1 },
  })
}
