/**
 * Sound shape, one setting for every record: "notes" strikes each value as its own note (• • • •);
 * "flow" joins them into one continuous line that glides from pitch to pitch (━━━━).
 * Articulation is a musical choice only: every value still makes exactly the pitch its record's fixed rule
 * gives it, at the same moment. Engines read the setting when Play is pressed; single taps always strike.
 */
import {useSyncExternalStore} from 'react';

export type Articulation = 'notes' | 'flow';
export const ARTICULATION_KEY = 'terrajuke-articulation';
const listeners = new Set<() => void>();
let current: Articulation | null = null;

function read(): Articulation {
  try { return globalThis.localStorage?.getItem(ARTICULATION_KEY) === 'flow' ? 'flow' : 'notes'; } catch { return 'notes'; }
}
export function getArticulation(): Articulation { return (current ??= read()); }
export function setArticulation(next: Articulation): void {
  if (next !== 'notes' && next !== 'flow') return;
  current = next;
  try { globalThis.localStorage?.setItem(ARTICULATION_KEY, next); } catch { /* private mode: keep it for this visit */ }
  for (const listener of listeners) listener();
}
/** Test hook: forget the cached value so the next read comes from storage again. */
export function resetArticulationCache(): void { current = null; }
export function subscribeArticulation(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function useArticulation(): Articulation { return useSyncExternalStore(subscribeArticulation, getArticulation, () => 'notes'); }

export type Partial = {ratio: number; weight: number; type?: OscillatorType; detune?: number};
export type FlowSpec = {partials: readonly Partial[]; lowpassHz?: number; pan?: boolean};
export type FlowNote = {glide?: number; weights?: readonly number[]; pan?: number; holdUntil?: number};

/**
 * One sustained voice for "flow": its oscillators run for the whole performance; each note glides the
 * frequency (time constant `glide`, default 45 ms) and sets the level; a rest fades out; if no note follows
 * by `holdUntil`, it fades on its own. Every partial is a fixed ratio of the mapped frequency.
 */
export class FlowVoice {
  readonly sources: OscillatorNode[] = [];
  private readonly out: GainNode;
  private readonly panner: StereoPannerNode | null = null;
  private readonly parts: {osc: OscillatorNode; gain: GainNode; ratio: number}[] = [];
  private soundingUntil = -Infinity;

  constructor(private readonly ctx: BaseAudioContext, destination: AudioNode, spec: FlowSpec, start: number) {
    this.out = ctx.createGain(); this.out.gain.setValueAtTime(0, start);
    let tail: AudioNode = this.out;
    if (spec.pan && ctx.createStereoPanner) { this.panner = ctx.createStereoPanner(); this.out.connect(this.panner); tail = this.panner; }
    tail.connect(destination);
    let into: AudioNode = this.out;
    if (spec.lowpassHz) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = spec.lowpassHz; f.connect(this.out); into = f; }
    const total = spec.partials.reduce((sum, p) => sum + p.weight, 0) || 1;
    for (const p of spec.partials) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = p.type ?? 'sine'; osc.frequency.setValueAtTime(220 * p.ratio, start); if (p.detune) osc.detune.value = p.detune;
      gain.gain.setValueAtTime(p.weight / total, start);
      osc.connect(gain); gain.connect(into); osc.start(start);
      this.parts.push({osc, gain, ratio: p.ratio}); this.sources.push(osc);
    }
  }

  note(hz: number, when: number, level: number, options: FlowNote = {}): void {
    const g = this.out.gain, joined = when < this.soundingUntil, glide = options.glide ?? 0.045;
    g.cancelScheduledValues(when);
    for (const p of this.parts) {
      if (joined) p.osc.frequency.setTargetAtTime(hz * p.ratio, when, glide);
      else p.osc.frequency.setValueAtTime(hz * p.ratio, when);
    }
    options.weights?.forEach((w, i) => this.parts[i]?.gain.gain.setTargetAtTime(w, when, 0.04));
    if (this.panner && options.pan !== undefined) this.panner.pan.setTargetAtTime(options.pan, when, 0.06);
    g.setTargetAtTime(level, when, joined ? 0.04 : 0.015);
    const hold = options.holdUntil ?? Infinity;
    if (Number.isFinite(hold)) g.setTargetAtTime(0, hold, 0.08);
    this.soundingUntil = hold;
  }
  rest(when: number): void { this.out.gain.cancelScheduledValues(when); this.out.gain.setTargetAtTime(0, when, 0.05); this.soundingUntil = -Infinity; }
  end(when: number): void {
    this.rest(when);
    for (const p of this.parts) { try { p.osc.stop(when + 0.6); } catch { /* already stopped */ } }
  }
}
