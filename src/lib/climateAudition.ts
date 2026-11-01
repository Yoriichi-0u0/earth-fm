import type { ClimateEvent } from './climateMapping';

type Voice = { oscillators: OscillatorNode[]; envelope: GainNode; nodes: AudioNode[]; active: boolean };

/** One short, data-only audition; no recordings, backing track, or random events. */
export class ClimateAuditionPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private cleanups = new Set<ReturnType<typeof setTimeout>>();
  private generation = 0;
  private disposed = false;
  private volume = 0.55;

  async play(event: ClimateEvent, onEnd: () => void): Promise<boolean> {
    if (this.disposed) throw new Error('This audio player has been disposed.');
    this.stop();
    const generation = this.generation;
    if (event.kind === 'rest') return false;
    if (!Number.isFinite(event.frequencyHz) || event.frequencyHz <= 0) throw new Error('A valid mapped frequency is required.');
    const Context = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) throw new Error('Web Audio is unavailable.');
    if (!this.context) {
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    const context = this.context;
    if (context.state !== 'running') await context.resume();
    if (this.disposed || generation !== this.generation) return false;
    if (context.state !== 'running') throw new Error('Audio could not resume.');
    const start = context.currentTime + 0.015;
    const duration = 0.9;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.27, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.00001, start + duration);
    envelope.connect(this.master!);
    const voice: Voice = { oscillators: [], envelope, nodes: [envelope], active: true };
    this.voices.add(voice);
    // Fundamental carries the mapped pitch. A quiet harmonic gives it warmth.
    let remaining = 2;
    for (const [multiple, weight] of [[1, 1], [2, 0.13]]) {
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(event.frequencyHz * multiple!, start);
      partial.gain.value = weight!;
      oscillator.connect(partial);
      partial.connect(envelope);
      voice.oscillators.push(oscillator);
      voice.nodes.push(oscillator, partial);
      oscillator.onended = () => {
        if (--remaining > 0) return;
        const completed = voice.active && !this.disposed && generation === this.generation;
        this.disconnect(voice);
        if (completed) onEnd();
      };
      oscillator.start(start);
      oscillator.stop(start + duration);
    }
    return true;
  }

  setVolume(value: number): void {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.55;
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015);
  }

  stop(): void {
    this.generation++;
    const now = this.context?.currentTime ?? 0;
    for (const voice of this.voices) {
      if (!voice.active) continue;
      voice.active = false;
      voice.envelope.gain.cancelScheduledValues(now);
      voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, now);
      voice.envelope.gain.linearRampToValueAtTime(0, now + 0.025);
      for (const oscillator of voice.oscillators) {
        try { oscillator.stop(now + 0.03); } catch { /* A completed voice needs no second stop. */ }
      }
      const cleanup = setTimeout(() => { this.cleanups.delete(cleanup); this.disconnect(voice); }, 45);
      this.cleanups.add(cleanup);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    for (const timer of this.cleanups) clearTimeout(timer);
    this.cleanups.clear();
    for (const voice of this.voices) this.disconnect(voice);
    this.master?.disconnect();
    this.master = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  private disconnect(voice: Voice): void {
    voice.active = false;
    for (const oscillator of voice.oscillators) oscillator.onended = null;
    for (const node of voice.nodes) node.disconnect();
    voice.nodes = [];
    this.voices.delete(voice);
  }
}
