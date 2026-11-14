// Web Audio for Currents of Heat: a warm mallet note per step (temperature) with a soft shimmer an
// octave and a fifth above (how much of the band NASA's current traces cover). Lookahead scheduling
// on the audio clock; the UI hears about each step when it sounds.
import type { OceanNote } from './sonify.ts';
import { FlowVoice, getArticulation } from '../articulation.ts';

const MASTER = 0.5;
export type OceanPlay = { getStepSeconds: () => number; onStep: (index: number) => void; onEnd: () => void };

export class OceanEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private timers: number[] = [];
  private ticker: number | undefined;
  private level = 1;

  setVolume(v: number): void { this.level = Math.max(0, Math.min(1, v)); if (this.master) this.master.gain.value = MASTER * this.level; }

  unlock(): AudioContext | null {
    const Ctor: typeof AudioContext | undefined = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) { try { session.type = 'playback'; } catch { /* keep the default */ } }
      this.ctx = new Ctor(); this.master = this.ctx.createGain(); this.master.gain.value = MASTER * this.level; this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  private note(n: NonNullable<OceanNote>, when: number, dur: number): void {
    const ctx = this.ctx!, pan = ctx.createStereoPanner(); pan.pan.value = n.pan; pan.connect(this.master!);
    const voice = (hz: number, type: OscillatorType, peak: number, decay: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = hz;
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      o.connect(g); g.connect(pan); o.start(when); o.stop(when + decay + 0.05); this.sources.add(o); o.onended = () => this.sources.delete(o);
    };
    voice(n.hz, 'triangle', 0.32, Math.max(0.5, dur * 2.2));
    voice(n.hz * 2, 'sine', 0.08, Math.max(0.35, dur * 1.4));
    if (n.shimmer > 0.05) voice(n.hz * 3, 'sine', 0.05 * n.shimmer, Math.max(0.6, dur * 2.6));
  }

  playOne(n: OceanNote, stepSeconds: number): void {
    this.stop(); const ctx = this.unlock(); if (!ctx || !n) return;
    this.note(n, ctx.currentTime + 0.02, stepSeconds * 2);
  }

  play(score: readonly OceanNote[], opts: OceanPlay): void {
    this.stop(); const ctx = this.unlock();
    if (!ctx || !score.length) { opts.onEnd(); return; }
    let index = 0, when = ctx.currentTime + 0.06;
    // Continuous: one warm voice glides band to band; shimmer (trace coverage) and stereo still follow each band.
    const flow = getArticulation() === 'flow' ? new FlowVoice(ctx, this.master!, { partials: [{ ratio: 1, weight: 0.32, type: 'triangle' }, { ratio: 2, weight: 0.08 }, { ratio: 3, weight: 0.05 }], pan: true }, when) : null;
    if (flow) for (const o of flow.sources) { this.sources.add(o); o.onended = () => this.sources.delete(o); }
    const tick = () => {
      while (when < ctx.currentTime + 0.12) {
        if (index >= score.length) { flow?.end(when); this.timers.push(window.setTimeout(opts.onEnd, Math.max(0, (when - ctx.currentTime) * 1000))); window.clearInterval(this.ticker); this.ticker = undefined; return; }
        const i = index, dur = opts.getStepSeconds(), n = score[i];
        if (flow) { if (n) flow.note(n.hz, when, 0.3, { pan: n.pan, weights: [0.711, 0.178, 0.111 * n.shimmer], holdUntil: when + dur * 1.02 }); else flow.rest(when); }
        else if (n) this.note(n, when, dur);
        this.timers.push(window.setTimeout(() => opts.onStep(i), Math.max(0, (when - ctx.currentTime) * 1000)));
        when += dur; index++;
      }
      if (this.timers.length > 64) this.timers.splice(0, this.timers.length - 64);
    };
    tick(); this.ticker = window.setInterval(tick, 25);
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
