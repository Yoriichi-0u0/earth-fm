import { compileClimateEvent } from './climateMapping';
import type { MonthlyObservation } from './climateMapping';
export type Style = 'Ambient' | 'Electronic Pulse' | 'Cinematic';
export const TIMBRES = ['Warm Keys', 'Velvet Pad', 'Soft Pluck', 'Mellow Reed', 'Soft Glass'] as const;
export type Timbre = typeof TIMBRES[number];
export const NOTES = ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4'];
export const PROFILE = { id: 'symphony-ten-v1', frequenciesHz: [48,50,52,55,57,60,62,64,67,69].map(m => 440 * 2 ** ((m - 69) / 12)) };
export const mapData = (point: MonthlyObservation) => compileClimateEvent(point, PROFILE);
export type Settings = { style: Style; timbre: Timbre; dataOnly: boolean; drums: boolean; harmony: boolean; tempo: number; volume: number; space: number; brightness: number };
export const defaults: Settings = { style: 'Electronic Pulse', timbre: 'Warm Keys', dataOnly: false, drums: true, harmony: true, tempo: 60, volume: .6, space: .25, brightness: 2200 };

/** All sounds are synthesized. The scientific fundamental is never transposed by style. */
export function renderScore(context: BaseAudioContext, destination: AudioNode, points: MonthlyObservation[], settings: Settings, start: number) {
  const step = 120 / settings.tempo;
  const bus = context.createGain(); bus.gain.value = settings.volume * .65;
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -12; compressor.ratio.value = 4;
  bus.connect(compressor); compressor.connect(destination);
  const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = settings.brightness; filter.connect(bus);
  const delay = context.createDelay(1); delay.delayTime.value = .27;
  const wet = context.createGain(); wet.gain.value = settings.dataOnly ? 0 : settings.space * .3;
  filter.connect(delay); delay.connect(wet); wet.connect(bus);
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [bus, compressor, filter, delay, wet];
  function tone(hz: number, time: number, length: number, level: number, type: OscillatorType = 'sine', target: AudioNode = filter, attack = .018) {
    const osc = context.createOscillator(), gain = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(hz, time);
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level, time + attack);
    gain.gain.exponentialRampToValueAtTime(.00001, time + length);
    osc.connect(gain); gain.connect(target); osc.start(time); osc.stop(time + length + .02);
    sources.push(osc); nodes.push(osc, gain);
  }
  // Harmonic-only additive voices: the first partial always carries the exact mapped frequency.
  const voices: Record<Timbre, { partials: number[]; attack: number; length: number }> = {
    'Warm Keys': { partials: [1,.24,.075,.025], attack: .018, length: .78 },
    'Velvet Pad': { partials: [1,.12,.045], attack: .11, length: .96 },
    'Soft Pluck': { partials: [1,.29,.10,.035], attack: .009, length: .48 },
    'Mellow Reed': { partials: [1,.04,.18,.025,.045], attack: .045, length: .82 },
    'Soft Glass': { partials: [1,.10,.035,.065], attack: .022, length: .9 },
  };
  function melody(hz: number, time: number, length: number, level: number) {
    const voice = voices[settings.timbre ?? 'Warm Keys'];
    const total = voice.partials.reduce((a,b)=>a+b,0);
    voice.partials.forEach((weight,index) => tone(hz * (index+1),time,length * voice.length,level * weight / total,'sine',filter,Math.min(voice.attack,length*.2)));
  }
  // A fixed seeded noise buffer makes percussion reproducible without recording dependencies.
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * .2), context.sampleRate);
  const samples = noise.getChannelData(0); let seed = 20261101;
  for(let i=0;i<samples.length;i++) { seed = (Math.imul(seed,1664525)+1013904223)>>>0; samples[i] = seed / 2147483648 - 1; }
  function percussion(time: number, snare: boolean, level: number) {
    const source = context.createBufferSource(), gain = context.createGain(), hp = context.createBiquadFilter();
    source.buffer = noise; hp.type = 'highpass'; hp.frequency.value = snare ? 1200 : 5700;
    gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(level,time+.003);
    gain.gain.exponentialRampToValueAtTime(.00001,time+(snare ? .14 : .045));
    source.connect(hp); hp.connect(gain); gain.connect(bus); source.start(time); source.stop(time+.2);
    sources.push(source); nodes.push(source,hp,gain);
  }
  function kick(time: number, level: number) {
    const osc=context.createOscillator(), gain=context.createGain();
    osc.frequency.setValueAtTime(115,time); osc.frequency.exponentialRampToValueAtTime(48,time+.12);
    gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(level,time+.005); gain.gain.exponentialRampToValueAtTime(.00001,time+.22);
    osc.connect(gain); gain.connect(bus); osc.start(time); osc.stop(time+.23); sources.push(osc); nodes.push(osc,gain);
  }
  const pulse = settings.style === 'Electronic Pulse';
  const cinematic = settings.style === 'Cinematic';
  points.forEach((point, i) => {
    const event = mapData(point), time = start + i * step;
    if (event.kind === 'rest') return;
    melody(event.frequencyHz,time,step,.42);
    if (settings.dataOnly) return;
    // Soft syncopated repeats articulate the same measurement; they never invent pitches.
    melody(event.frequencyHz,time+step*.375,step*.32,.13);
    melody(event.frequencyHz,time+step*.75,step*.22,.09);
    if (settings.harmony) {
      const chords = [[130.8128,164.8138,195.9977],[110,130.8128,164.8138],[87.3071,130.8128,174.6141],[97.9989,146.8324,195.9977]];
      const chord = chords[Math.floor(i/2)%chords.length];
      for(const hz of chord) tone(hz,time,step*.94,cinematic ? .022 : .014,'sine',filter,.08);
      tone(chord[0]/2,time,step*.42,.055);
      tone(chord[0]/2,time+step*.5,step*.35,.035);
    }
    if (settings.drums) {
      const strength = pulse ? 1 : cinematic ? .78 : .60;
      for(let beat=0;beat<4;beat++) {
        const t=time+beat*step/4;
        if(beat%2===0) kick(t,.20*strength);
        else percussion(t,true,.075*strength);
        percussion(t,false,.023*strength);
        // Deterministic offbeat hats provide momentum even in Ambient.
        percussion(t+step/8+(beat%2 ? step*.012 : 0),false,.013*strength);
      }
      if(pulse) kick(time+step*.875,.07);
    }
  });
  return { duration: points.length * step + .8, setVolume: (value: number) => bus.gain.setTargetAtTime(Math.max(0, Math.min(1, value)) * .65, context.currentTime, .015), stop: () => { bus.gain.cancelScheduledValues(context.currentTime); bus.gain.setTargetAtTime(0, context.currentTime, .008); setTimeout(() => { for (const source of sources) { try { source.stop(); } catch {} } for (const node of nodes) node.disconnect(); }, 50); } };
}

export class SymphonyPlayer {
  private context: AudioContext | null = null;
  private score: ReturnType<typeof renderScore> | null = null;
  private frame = 0;
  private generation = 0;
  async play(points: MonthlyObservation[], settings: Settings, onPoint: (index: number) => void, onEnd: () => void) {
    this.stop(); const token = this.generation;
    this.context ??= new AudioContext();
    await this.context.resume();
    if (token !== this.generation) return;
    if (this.context.state !== 'running') throw new Error('Audio is unavailable. Try playing again.');
    const start = this.context.currentTime + .05;
    this.score = renderScore(this.context, this.context.destination, points, settings, start);
    let previous = -1;
    const tick = () => {
      if (token !== this.generation || !this.context) return;
      const elapsed = this.context.currentTime - start;
      const index = Math.min(points.length - 1, Math.floor(elapsed / (120 / settings.tempo)));
      if (index >= 0 && index !== previous) { previous = index; onPoint(index); }
      if (elapsed >= this.score!.duration) { this.stop(); onEnd(); return; }
      this.frame = requestAnimationFrame(tick);
    };
    tick();
  }
  setVolume(value: number) { this.score?.setVolume(value); }
  stop() { this.generation++; cancelAnimationFrame(this.frame); this.score?.stop(); this.score = null; }
  dispose() { this.stop(); void this.context?.close(); this.context = null; }
}

export function wav(buffer: AudioBuffer) {
  const bytes = new ArrayBuffer(44 + buffer.length * 2), view = new DataView(bytes);
  const str = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  str(0,'RIFF'); view.setUint32(4,36 + buffer.length * 2,true); str(8,'WAVE'); str(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,buffer.sampleRate,true); view.setUint32(28,buffer.sampleRate * 2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); str(36,'data'); view.setUint32(40,buffer.length * 2,true);
  buffer.getChannelData(0).forEach((v,i) => view.setInt16(44+i*2,Math.max(-1,Math.min(1,v))*32767,true));
  return new Blob([bytes],{type:'audio/wav'});
}
