/** Local, dependency-free sonification. No recordings or observations leave the browser. */
export type SonificationColor = { red: number; green: number; blue: number }
export type SonificationPoint = { year: number; value: number; pan?: number; color?: SonificationColor }
export type Soundscape = 'ambient' | 'piano' | 'pulse'
export type SonificationOptions = {
  soundscape: Soundscape
  tempo: number
  volume: number
  onStep: (index: number) => void
  onEnd: () => void
  pitchRange?: { min: number; max: number }
  /** Optional live observation provider, sampled at each note's scheduling boundary. */
  samplePoint?: (index: number) => SonificationPoint
}
export type MappedNote = {
  midi: number
  frequency: number
  note: string
  normalized: number
  velocity: number
}

// Quantize the selected series' min–max range onto D minor pentatonic, D3–D5.
// Higher values always produce higher/equal pitches. A constant series uses D4.
// Velocity changes gently with value; time is one observation per 60/BPM seconds.
const SCALE = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74] as const
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const SAMPLE_RATE = 24_000
const MAX_EXPORT_SECONDS = 300

export function mapValueToNote(value: number, min: number, max: number): MappedNote {
  const normalized = Number.isFinite(value) && Number.isFinite(min) && Number.isFinite(max) && max > min
    ? Math.max(0, Math.min(1, (value - min) / (max - min)))
    : 0.5
  const midi = SCALE[Math.round(normalized * (SCALE.length - 1))]!
  return {
    midi,
    frequency: 440 * 2 ** ((midi - 69) / 12),
    note: `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`,
    normalized,
    velocity: 0.65 + normalized * 0.2,
  }
}

export function sonify(values: number[], index: number): MappedNote {
  const finite = values.filter(Number.isFinite)
  return mapValueToNote(values[index] ?? NaN, Math.min(...finite), Math.max(...finite))
}

function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7
}

function stepSeconds(tempo: number): number {
  return 60 / (Number.isFinite(tempo) ? Math.max(30, Math.min(240, tempo)) : 80)
}

function checkPoints(points: SonificationPoint[]): void {
  if (points.some(point => !Number.isFinite(point.value) || !Number.isFinite(point.year))) {
    throw new TypeError('Every observation must have a finite year and value.')
  }
}

function checkSoundscape(soundscape: Soundscape): void {
  if (!['ambient', 'piano', 'pulse'].includes(soundscape)) {
    throw new TypeError('Choose the ambient, piano, or pulse soundscape.')
  }
}

function noteDuration(soundscape: Soundscape, step: number): number {
  if (soundscape === 'ambient') return Math.max(0.65, Math.min(2.6, step * 2.6))
  if (soundscape === 'piano') return Math.max(0.7, Math.min(2.2, step * 2.8))
  return Math.max(0.12, Math.min(0.9, step * 0.72))
}

function attackSeconds(soundscape: Soundscape): number {
  return soundscape === 'ambient' ? 0.07 : soundscape === 'piano' ? 0.004 : 0.008
}

function noteAmplitude(soundscape: Soundscape): number {
  return soundscape === 'ambient' ? 0.24 : 0.3
}

function sustainSeconds(soundscape: Soundscape, duration: number): number {
  return soundscape === 'ambient' ? duration * 0.35 : attackSeconds(soundscape)
}

type Partial = { multiplier: number; weight: number; type: OscillatorType; cents: number }
function partials(soundscape: Soundscape): Partial[] {
  if (soundscape === 'ambient') return [
    { multiplier: 1, weight: 1, type: 'sine', cents: -3 },
    { multiplier: 2, weight: 0.24, type: 'sine', cents: 3 },
    { multiplier: 1.5, weight: 0.11, type: 'sine', cents: 0 },
  ]
  if (soundscape === 'piano') return [
    { multiplier: 1, weight: 1, type: 'sine', cents: 0 },
    { multiplier: 2, weight: 0.27, type: 'sine', cents: 1 },
    { multiplier: 3, weight: 0.1, type: 'sine', cents: -1 },
  ]
  return [
    { multiplier: 1, weight: 1, type: 'triangle', cents: 0 },
    { multiplier: 0.5, weight: 0.24, type: 'sine', cents: 0 },
    { multiplier: 2, weight: 0.1, type: 'sine', cents: 0 },
  ]
}

function pointPartials(soundscape: Soundscape, color?: SonificationColor): Partial[] {
  if (!color) return partials(soundscape)
  // RGB is an artistic timbre mapping: red = warm fundamental, green = octave,
  // blue = bright third harmonic. Display colors do not imply temperatures.
  return [
    { multiplier: 1, weight: 0.55 + clampVolume(color.red) * 0.35, type: 'sine', cents: -2 },
    { multiplier: 2, weight: 0.08 + clampVolume(color.green) * 0.24, type: 'sine', cents: 2 },
    { multiplier: 3, weight: 0.04 + clampVolume(color.blue) * 0.3, type: 'sine', cents: 0 },
  ]
}

function panForIndex(index: number): number {
  return ((index % 5) - 2) * 0.15
}

type Playback = {
  nodes: Set<AudioNode>
  oscillators: Set<OscillatorNode>
  timers: Set<ReturnType<typeof setTimeout>>
  master: GainNode
  dry: GainNode
  send: GainNode
  active: boolean
}

/** A fresh start always starts the supplied sequence at index 0; pause silences it. */
export class EarthAudio {
  private context: AudioContext | null = null
  private current: Playback | null = null
  private runs = new Set<Playback>()
  private cleanupTimers = new Set<ReturnType<typeof setTimeout>>()
  private generation = 0
  private disposed = false
  private volume = 0.7

  async start(points: SonificationPoint[], options: SonificationOptions): Promise<void> {
    if (this.disposed) throw new Error('This audio player has been disposed.')
    checkPoints(points)
    checkSoundscape(options.soundscape)
    this.stop()
    const generation = this.generation
    this.volume = clampVolume(options.volume)
    if (points.length === 0) {
      options.onEnd()
      return
    }
    const AudioContextClass = globalThis.AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) throw new Error('Your browser does not support Web Audio. Try a recent Chrome, Firefox, or Safari browser.')
    this.context ??= new AudioContextClass()
    const context = this.context
    // Called directly from the Play gesture; resume fulfils browser autoplay rules.
    if (context.state !== 'running') await context.resume()
    if (this.disposed || generation !== this.generation) return
    const run = this.createGraph(context)
    this.current = run
    this.runs.add(run)
    const step = stepSeconds(options.tempo)
    const duration = noteDuration(options.soundscape, step)
    const values = points.map(point => point.value)
    const min = options.pitchRange?.min ?? Math.min(...values)
    const max = options.pitchRange?.max ?? Math.max(...values)
    const startAt = context.currentTime + 0.025
    const endAt = startAt + (points.length - 1) * step + Math.max(step, duration) + 0.12
    if (options.soundscape === 'ambient') this.addDrone(context, run, startAt, endAt)
    let nextIndex = 0
    const schedule = () => {
      if (!run.active || generation !== this.generation) return
      // Schedule against the audio clock, so UI timer jitter cannot detune timing.
      while (nextIndex < points.length && startAt + nextIndex * step < context.currentTime + 0.15) {
        const index = nextIndex++
        const at = startAt + index * step
        let point: SonificationPoint
        try {
          point = options.samplePoint ? options.samplePoint(index) : points[index]!
          checkPoints([point])
        } catch {
          // A canvas may become unavailable or cross-origin while a video loads.
          // End this run cleanly rather than throwing from a future timer callback.
          if (run.active && generation === this.generation) {
            this.stop()
            options.onEnd()
          }
          return
        }
        if (!run.active || generation !== this.generation) return
        const note = mapValueToNote(point.value, min, max)
        this.addNote(context, run, note, options.soundscape, at, duration, index, point)
        this.timer(run, () => {
          if (run.active && generation === this.generation) options.onStep(index)
        }, Math.max(0, (at - context.currentTime) * 1000))
      }
      if (nextIndex < points.length) {
        this.timer(run, schedule, 25)
      } else {
        this.timer(run, () => {
          if (!run.active || generation !== this.generation) return
          this.stop()
          options.onEnd()
        }, Math.max(0, (endAt - context.currentTime) * 1000))
      }
    }
    schedule()
  }

  pause(): void { this.stop() }

  stop(): void {
    this.generation++
    const run = this.current
    this.current = null
    if (!run || !run.active) return
    run.active = false
    for (const timer of run.timers) clearTimeout(timer)
    run.timers.clear()
    const now = this.context?.currentTime ?? 0
    run.master.gain.cancelScheduledValues(now)
    run.master.gain.setValueAtTime(run.master.gain.value, now)
    run.master.gain.linearRampToValueAtTime(0, now + 0.035)
    for (const oscillator of run.oscillators) {
      try { oscillator.stop(now + 0.04) } catch { /* An already ended voice is harmless. */ }
    }
    // Keep the tiny fade connected, then release every node. Dispose also clears it.
    const cleanup = setTimeout(() => {
      this.cleanupTimers.delete(cleanup)
      this.disconnect(run)
    }, 65)
    this.cleanupTimers.add(cleanup)
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume)
    if (!this.context || !this.current) return
    const now = this.context.currentTime
    const gain = this.current.master.gain
    gain.cancelScheduledValues(now)
    gain.setTargetAtTime(this.volume, now, 0.025)
  }

  dispose(): void {
    if (this.disposed) return
    this.stop()
    this.disposed = true
    for (const timer of this.cleanupTimers) clearTimeout(timer)
    this.cleanupTimers.clear()
    for (const run of this.runs) this.disconnect(run)
    const context = this.context
    this.context = null
    if (context && context.state !== 'closed') void context.close().catch(() => {})
  }

  private timer(run: Playback, callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      run.timers.delete(timer)
      callback()
    }, delay)
    run.timers.add(timer)
  }

  private disconnect(run: Playback): void {
    for (const timer of run.timers) clearTimeout(timer)
    run.timers.clear()
    for (const node of run.nodes) {
      if ('onended' in node) (node as OscillatorNode).onended = null
      node.disconnect()
    }
    run.nodes.clear()
    run.oscillators.clear()
    this.runs.delete(run)
  }

  private createGraph(context: AudioContext): Playback {
    const master = context.createGain()
    const dry = context.createGain()
    const send = context.createGain()
    const delay = context.createDelay(1)
    const feedback = context.createGain()
    const wet = context.createGain()
    const filter = context.createBiquadFilter()
    const compressor = context.createDynamicsCompressor()
    master.gain.setValueAtTime(0, context.currentTime)
    master.gain.linearRampToValueAtTime(this.volume, context.currentTime + 0.04)
    dry.gain.value = 1
    send.gain.value = 0.2
    delay.delayTime.value = 0.31
    feedback.gain.value = 0.22
    wet.gain.value = 0.8
    filter.type = 'lowpass'
    filter.frequency.value = 2400
    compressor.threshold.value = -16
    compressor.knee.value = 18
    compressor.ratio.value = 3
    compressor.attack.value = 0.01
    compressor.release.value = 0.22
    dry.connect(master)
    send.connect(delay)
    delay.connect(filter)
    filter.connect(wet)
    wet.connect(master)
    filter.connect(feedback)
    feedback.connect(delay)
    master.connect(compressor)
    compressor.connect(context.destination)
    return {
      nodes: new Set([master, dry, send, delay, feedback, wet, filter, compressor]),
      oscillators: new Set(), timers: new Set(), master, dry, send, active: true,
    }
  }

  private addNote(context: AudioContext, run: Playback, note: MappedNote, soundscape: Soundscape, at: number, duration: number, index: number, point?: SonificationPoint): void {
    const envelope = context.createGain()
    const panner = context.createStereoPanner()
    const attack = attackSeconds(soundscape)
    const peak = noteAmplitude(soundscape) * note.velocity
    envelope.gain.setValueAtTime(0.00001, at)
    envelope.gain.linearRampToValueAtTime(peak, at + attack)
    if (soundscape === 'ambient') envelope.gain.linearRampToValueAtTime(peak * 0.7, at + sustainSeconds(soundscape, duration))
    envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration)
    panner.pan.value = point?.pan !== undefined && Number.isFinite(point.pan) ? Math.max(-1, Math.min(1, point.pan)) : panForIndex(index)
    envelope.connect(panner)
    panner.connect(run.dry)
    panner.connect(run.send)
    run.nodes.add(envelope)
    run.nodes.add(panner)
    let remaining = 0
    for (const partial of pointPartials(soundscape, point?.color)) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = partial.type
      oscillator.frequency.value = note.frequency * partial.multiplier
      oscillator.detune.value = partial.cents
      gain.gain.value = partial.weight
      oscillator.connect(gain)
      gain.connect(envelope)
      run.nodes.add(oscillator)
      run.nodes.add(gain)
      run.oscillators.add(oscillator)
      remaining++
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
        run.nodes.delete(oscillator)
        run.nodes.delete(gain)
        run.oscillators.delete(oscillator)
        if (--remaining === 0) {
          envelope.disconnect()
          panner.disconnect()
          run.nodes.delete(envelope)
          run.nodes.delete(panner)
        }
      }
      oscillator.start(at)
      oscillator.stop(at + duration)
    }
  }

  private addDrone(context: AudioContext, run: Playback, at: number, endAt: number): void {
    for (const [frequency, amplitude] of [[73.416, 0.024], [110, 0.012]]) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency!
      envelope.gain.setValueAtTime(0.00001, at)
      envelope.gain.linearRampToValueAtTime(amplitude!, Math.min(at + 0.7, endAt - 0.1))
      envelope.gain.setValueAtTime(amplitude!, Math.max(at + 0.7, endAt - 0.8))
      envelope.gain.linearRampToValueAtTime(0.00001, endAt)
      oscillator.connect(envelope)
      envelope.connect(run.dry)
      run.nodes.add(oscillator)
      run.nodes.add(envelope)
      run.oscillators.add(oscillator)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
        run.nodes.delete(oscillator)
        run.nodes.delete(envelope)
        run.oscillators.delete(oscillator)
      }
      oscillator.start(at)
      oscillator.stop(endAt)
    }
  }
}

function triangle(phase: number): number {
  // A short band-limited harmonic sum avoids the aliasing of a raw triangle wave.
  let value = 0
  for (let harmonic = 1; harmonic <= 9; harmonic += 2) {
    value += ((harmonic - 1) % 4 === 0 ? 1 : -1) * Math.sin(phase * harmonic) / (harmonic * harmonic)
  }
  return value * 8 / (Math.PI * Math.PI)
}

/** Stereo 24 kHz / 16-bit PCM. Same scale, voices, tempo and volume as playback. */
export async function exportWav(points: SonificationPoint[], options: Pick<SonificationOptions, 'soundscape' | 'tempo' | 'volume' | 'pitchRange'>): Promise<Blob> {
  checkPoints(points)
  checkSoundscape(options.soundscape)
  if (points.length === 0) throw new RangeError('Add at least one observation before exporting audio.')
  const step = stepSeconds(options.tempo)
  const duration = noteDuration(options.soundscape, step)
  const totalSeconds = (points.length - 1) * step + Math.max(step, duration) + 0.12
  if (totalSeconds > MAX_EXPORT_SECONDS) throw new RangeError('Please select a sequence shorter than five minutes for WAV export.')
  const samples = Math.ceil(totalSeconds * SAMPLE_RATE)
  const left = new Float32Array(samples)
  const right = new Float32Array(samples)
  const values = points.map(point => point.value)
  const min = options.pitchRange?.min ?? Math.min(...values)
  const max = options.pitchRange?.max ?? Math.max(...values)
  const volume = clampVolume(options.volume)
  const attack = attackSeconds(options.soundscape)
  const sustain = sustainSeconds(options.soundscape, duration)
  const amplitude = noteAmplitude(options.soundscape)
  for (let index = 0; index < points.length; index++) {
    const note = mapValueToNote(values[index]!, min, max)
    const voices = pointPartials(options.soundscape, points[index]!.color)
    const startSample = Math.round(index * step * SAMPLE_RATE)
    const noteSamples = Math.ceil(duration * SAMPLE_RATE)
    const pointPan = points[index]!.pan
    const pan = pointPan !== undefined && Number.isFinite(pointPan) ? Math.max(-1, Math.min(1, pointPan)) : panForIndex(index)
    const leftGain = Math.sqrt((1 - pan) / 2)
    const rightGain = Math.sqrt((1 + pan) / 2)
    const peak = amplitude * note.velocity
    const tailPeak = options.soundscape === 'ambient' ? peak * 0.7 : peak
    const decay = Math.log(tailPeak / 0.00001)
    for (let offset = 0; offset < noteSamples; offset++) {
      const position = startSample + offset
      if (position >= samples) break
      const time = offset / SAMPLE_RATE
      const envelope = time < attack
        ? peak * time / attack
        : time < sustain
          ? peak * (1 - 0.3 * (time - attack) / (sustain - attack))
          : tailPeak * Math.exp(-decay * (time - sustain) / (duration - sustain))
      let wave = 0
      for (const partial of voices) {
        const phase = 2 * Math.PI * note.frequency * partial.multiplier * 2 ** (partial.cents / 1200) * time
        wave += partial.weight * (partial.type === 'triangle' ? triangle(phase) : Math.sin(phase))
      }
      const sample = wave * envelope
      left[position]! += sample * leftGain
      right[position]! += sample * rightGain
    }
    // Yield between chunks so an export does not freeze the application.
    if (index % 6 === 5) await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  // Two quiet, cross-channel echoes provide space without relying on browser DSP.
  const echo = Math.round(0.31 * SAMPLE_RATE)
  for (let index = samples - 1; index >= echo; index--) {
    left[index]! += right[index - echo]! * 0.16
    right[index]! += left[index - echo]! * 0.16
    if (index >= echo * 2) {
      left[index]! += left[index - echo * 2]! * 0.0352
      right[index]! += right[index - echo * 2]! * 0.0352
    }
  }
  if (options.soundscape === 'ambient') {
    for (let index = 0; index < samples; index++) {
      const time = index / SAMPLE_RATE
      const fade = Math.min(1, time / 0.7, (totalSeconds - time) / 0.8)
      const drone = (Math.sin(2 * Math.PI * 73.416 * time) * 0.024 + Math.sin(2 * Math.PI * 110 * time) * 0.012) * fade
      left[index]! += drone
      right[index]! += drone
    }
  }
  const buffer = new ArrayBuffer(44 + samples * 4)
  const view = new DataView(buffer)
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index))
  }
  writeText(0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 2, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 4, true)
  view.setUint16(32, 4, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, samples * 4, true)
  for (let index = 0; index < samples; index++) {
    // Smooth saturation preserves headroom; never wrap or hard-clip PCM samples.
    const leftSample = Math.tanh(left[index]! * volume * 1.1) * 0.95
    const rightSample = Math.tanh(right[index]! * volume * 1.1) * 0.95
    view.setInt16(44 + index * 4, Math.round(leftSample * 32767), true)
    view.setInt16(46 + index * 4, Math.round(rightSample * 32767), true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
