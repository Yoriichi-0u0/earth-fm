// Four-track Web Audio engine for The Air We Share. Each aerosol has its own track gain, so Mute
// and Solo act live without changing a note. Steps are scheduled ahead on the audio clock; the UI
// hears about each step when it actually sounds.
import { AEROSOLS, type Aerosol } from './analyze.ts';
import { VOICES, stepSeconds, type Chord, type TrackNote } from './sonify.ts';

const MASTER_LEVEL = 0.5;
const VOICE_LEVEL: Record<Aerosol, number> = { seaSalt: 0.32, blackCarbon: 0.22, dust: 0.3, sulfate: 0.2 };
const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;

type Ctx = AudioContext;
export type PlayOptions = { getBpm: () => number; onStep: (index: number, chord: Chord) => void; onEnd: () => void; loop?: boolean };

export class AirEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private tracks = new Map<Aerosol, GainNode>();
  private sources = new Set<AudioScheduledSourceNode>();
  private timers: number[] = [];
  private ticker: number | undefined;
  private level = 1;
  private audible: Record<Aerosol, boolean> = { blackCarbon: true, dust: true, seaSalt: true, sulfate: true };

  setVolume(value: number): void {
    this.level = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = MASTER_LEVEL * this.level;
  }

  /** Which tracks are heard (after Mute and Solo). Applied immediately, also to notes already sounding. */
  setAudible(audible: Record<Aerosol, boolean>): void {
    this.audible = { ...audible };
    if (!this.ctx) return;
    for (const a of AEROSOLS) this.tracks.get(a)?.gain.setTargetAtTime(audible[a] ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  get available(): boolean {
    return Boolean(globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  }

  /** Create or resume the context. Call from a user gesture. */
  unlock(): Ctx | null {
    const Ctor: typeof AudioContext | undefined = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) { try { session.type = 'playback'; } catch { /* keep the default */ } }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_LEVEL * this.level;
      this.master.connect(this.ctx.destination);
      for (const a of AEROSOLS) {
        const g = this.ctx.createGain();
        g.gain.value = this.audible[a] ? 1 : 0;
        g.connect(this.master);
        this.tracks.set(a, g);
      }
    }
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  private voice(note: TrackNote, pan: number, when: number, dur: number): void {
    const ctx = this.ctx!, track = this.tracks.get(note.aerosol)!, v = VOICES[note.aerosol];
    const env = ctx.createGain(), panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    env.connect(panner); panner.connect(track);
    const peak = VOICE_LEVEL[note.aerosol] * note.loudness;
    const oscs: OscillatorNode[] = [];
    const osc = (type: OscillatorType, hz: number, detune = 0, gain = 1, into: AudioNode = env) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz; o.detune.value = detune;
      if (gain === 1) o.connect(into); else { const g = ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(into); }
      oscs.push(o);
    };
    let attack = 0.03, release = dur * 1.5;
    if (note.aerosol === 'seaSalt') { attack = dur * 0.45; release = dur * 2.2; osc('sine', note.hz, -5); osc('sine', note.hz, 5, 0.7); }
    else if (note.aerosol === 'blackCarbon') {
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500 + 900 * note.loudness; filter.Q.value = 0.8; filter.connect(env);
      attack = 0.05; release = dur * 1.3; osc(v.wave, note.hz, 0, 1, filter); osc(v.wave, note.hz / 2, 7, 0.4, filter);
    } else if (note.aerosol === 'dust') { attack = dur * 0.25; release = dur * 1.8; osc('triangle', note.hz, -7); osc('triangle', note.hz, 7, 0.8); }
    else { attack = 0.004; release = 1.4; osc('sine', note.hz); osc('sine', note.hz * 2.76, 0, 0.18); osc('sine', note.hz * 5.4, 0, 0.06); }
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + attack);
    if (note.aerosol === 'sulfate') env.gain.exponentialRampToValueAtTime(0.0001, when + release);
    else { env.gain.setTargetAtTime(peak * 0.7, when + attack, dur * 0.4); env.gain.setTargetAtTime(0.0001, when + dur, release / 4); }
    const end = when + attack + release + 0.1;
    for (const o of oscs) { o.start(when); o.stop(end); this.sources.add(o); o.onended = () => this.sources.delete(o); }
  }

  private chordAt(chord: Chord, when: number, dur: number): void {
    for (const note of chord.notes) this.voice(note, chord.pan, when, dur);
  }

  /** One chord now, for keyboard and pointer exploration. */
  playOne(chord: Chord, bpm: number): void {
    this.stop();
    const ctx = this.unlock();
    if (!ctx) return;
    this.chordAt(chord, ctx.currentTime + 0.02, stepSeconds(bpm) * 2);
  }

  /** The score from `start`, one eighth note per step. Tempo is read before every step. */
  play(score: readonly Chord[], options: PlayOptions, start = 0): void {
    this.stop();
    const ctx = this.unlock();
    if (!ctx || !score.length) { options.onEnd(); return; }
    let index = start, when = ctx.currentTime + 0.06;
    const tick = () => {
      while (when < ctx.currentTime + LOOKAHEAD_S) {
        if (index >= score.length) {
          if (!options.loop) { const done = window.setTimeout(options.onEnd, Math.max(0, (when - ctx.currentTime) * 1000)); this.timers.push(done); window.clearInterval(this.ticker); this.ticker = undefined; return; }
          index = 0;
        }
        const i = index, chord = score[i], dur = stepSeconds(options.getBpm());
        this.chordAt(chord, when, dur);
        this.timers.push(window.setTimeout(() => options.onStep(i, chord), Math.max(0, (when - ctx.currentTime) * 1000)));
        when += dur; index++;
      }
      if (this.timers.length > 64) this.timers.splice(0, this.timers.length - 64);
    };
    tick();
    this.ticker = window.setInterval(tick, TICK_MS);
  }

  stop(): void {
    window.clearInterval(this.ticker); this.ticker = undefined;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    const now = this.ctx?.currentTime ?? 0;
    for (const s of this.sources) { try { s.stop(now + 0.05); } catch { /* already stopped */ } }
    this.sources.clear();
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null; this.master = null; this.tracks.clear();
  }
}
