// Web Audio for The Ice Year: a glass-bell note for ice, a filtered-noise ocean wash for open water.
// Lookahead scheduling on the audio clock; the UI hears about each step when it sounds.
import type {IceNote} from './sonify.ts';
import {FlowVoice, getArticulation} from '../articulation.ts';

const MASTER = 0.5;
export type IcePlay = {getStepSeconds: () => number; onStep: (index: number) => void; onEnd: () => void};

export class IceEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private timers: number[] = [];
  private ticker: number | undefined;
  private level = 1;

  setVolume(v: number): void { this.level = Math.max(0, Math.min(1, v)); if (this.master) this.master.gain.value = MASTER * this.level; }

  unlock(): AudioContext | null {
    const Ctor: typeof AudioContext | undefined = globalThis.AudioContext ?? (globalThis as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      const session = (navigator as unknown as {audioSession?: {type: string}}).audioSession;
      if (session) { try { session.type = 'playback'; } catch { /* keep the default */ } }
      this.ctx = new Ctor(); this.master = this.ctx.createGain(); this.master.gain.value = MASTER * this.level; this.master.connect(this.ctx.destination);
      // Deterministic noise (a fixed linear congruential sequence), so the wash sounds the same every time.
      const length = this.ctx.sampleRate * 2, buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
      let seed = 5046; for (let i = 0; i < length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = seed / 2 ** 31 - 1; }
      this.noise = buffer;
    }
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  private track<T extends AudioScheduledSourceNode>(node: T): T { this.sources.add(node); node.onended = () => this.sources.delete(node); return node; }

  private note(n: IceNote, when: number, dur: number): void {
    const ctx = this.ctx!;
    if (n.ice) {
      // Glass bell: a sine with two inharmonic partials, struck and left to ring.
      for (const [ratio, peak, decay] of [[1, 0.3, 2.4], [2.76, 0.07, 1.1], [5.4, 0.035, 0.6]] as const) {
        const o = this.track(ctx.createOscillator()), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = n.hz * ratio;
        const end = when + Math.max(0.6, dur * decay);
        g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g); g.connect(this.master!); o.start(when); o.stop(end + 0.05);
      }
    }
    if (n.water > 0.02 && this.noise) {
      // Ocean wash: low-passed noise that swells and recedes within the step.
      const s = this.track(ctx.createBufferSource()), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = this.noise; s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.4;
      const peak = 0.16 * n.water, end = when + dur * 0.95;
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + dur * 0.4); g.gain.linearRampToValueAtTime(0, end);
      s.connect(f); f.connect(g); g.connect(this.master!); s.start(when, (n.month * 0.13) % 1.5); s.stop(end + 0.05);
    }
  }

  playOne(n: IceNote, stepSeconds: number): void { this.stop(); const ctx = this.unlock(); if (ctx) this.note(n, ctx.currentTime + 0.02, stepSeconds); }

  play(score: readonly IceNote[], opts: IcePlay): void {
    this.stop(); const ctx = this.unlock();
    if (!ctx || !score.length) { opts.onEnd(); return; }
    let index = 0, when = ctx.currentTime + 0.06;
    // Continuous: one gliding glass tone for the ice and one unbroken sea under it.
    const flow = getArticulation() === 'flow' ? this.flow(ctx, when) : null;
    const tick = () => {
      while (when < ctx.currentTime + 0.12) {
        if (index >= score.length) { flow?.end(when); this.timers.push(window.setTimeout(opts.onEnd, Math.max(0, (when - ctx.currentTime) * 1000))); window.clearInterval(this.ticker); this.ticker = undefined; return; }
        const i = index, dur = opts.getStepSeconds(), n = score[i];
        if (flow) flow.step(n, when, dur); else this.note(n, when, dur);
        this.timers.push(window.setTimeout(() => opts.onStep(i), Math.max(0, (when - ctx.currentTime) * 1000)));
        when += dur; index++;
      }
      if (this.timers.length > 64) this.timers.splice(0, this.timers.length - 64);
    };
    tick(); this.ticker = window.setInterval(tick, 25);
  }

  private flow(ctx: AudioContext, start: number) {
    const bell = new FlowVoice(ctx, this.master!, {partials: [{ratio: 1, weight: 0.3}, {ratio: 2, weight: 0.05}, {ratio: 3, weight: 0.02}]}, start);
    for (const o of bell.sources) this.track(o);
    const sea = this.track(ctx.createBufferSource()), f = ctx.createBiquadFilter(), g = ctx.createGain();
    sea.buffer = this.noise; sea.loop = true; f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.4; g.gain.setValueAtTime(0, start);
    sea.connect(f); f.connect(g); g.connect(this.master!); sea.start(start);
    return {
      step: (n: IceNote, when: number, dur: number) => {
        if (n.ice) bell.note(n.hz, when, 0.24, {holdUntil: when + dur * 1.02}); else bell.rest(when);
        g.gain.setTargetAtTime(0.16 * n.water, when, dur * 0.3);
      },
      end: (when: number) => { bell.end(when); g.gain.setTargetAtTime(0, when, 0.15); try { sea.stop(when + 1); } catch { /* stopped */ } },
    };
  }

  stop(): void {
    window.clearInterval(this.ticker); this.ticker = undefined;
    for (const t of this.timers) window.clearTimeout(t); this.timers = [];
    const now = this.ctx?.currentTime ?? 0;
    for (const s of this.sources) { try { s.stop(now + 0.05); } catch { /* already stopped */ } }
    this.sources.clear();
  }

  dispose(): void { this.stop(); void this.ctx?.close().catch(() => undefined); this.ctx = null; this.master = null; }
}
