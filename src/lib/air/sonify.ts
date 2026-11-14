// Fixed sound rules for The Air We Share. Style, tempo and the mixer never rescale a note:
// the same map always produces the same score.
import { AEROSOLS, type Aerosol, type Mix, type Step } from './analyze.ts';

/** D minor pentatonic, the scale shared by TerraJuke's visual records, so the four tracks always harmonise. */
const PENTATONIC = [0, 3, 5, 7, 10];
/** Seven notes per voice: latitude −60° (lowest) to 75° (highest), 19.3° per note. */
export const NOTES_PER_VOICE = 7;
export const LAT_LOW = -60;
export const LAT_HIGH = 75;
/** Mean strength at which a track reaches full loudness (same fixed scale everywhere on the map). */
export const FULL_AMOUNT = 0.3;
/** Below this mean strength a track rests: where there is no aerosol there is no note. */
export const REST_AMOUNT = 0.004;

export type Voice = { aerosol: Aerosol; instrument: string; wave: OscillatorType; baseMidi: number; colour: string; vibration: number[] };
export const VOICES: Record<Aerosol, Voice> = {
  seaSalt: { aerosol: 'seaSalt', instrument: 'Ocean bed', wave: 'sine', baseMidi: 38, colour: '#85a9a9', vibration: [60] },
  blackCarbon: { aerosol: 'blackCarbon', instrument: 'Smoky brass', wave: 'sawtooth', baseMidi: 45, colour: '#d25e45', vibration: [20, 30, 20, 30, 20] },
  dust: { aerosol: 'dust', instrument: 'Desert strings', wave: 'triangle', baseMidi: 50, colour: '#c19adc', vibration: [40, 20, 40] },
  sulfate: { aerosol: 'sulfate', instrument: 'Glass bells', wave: 'sine', baseMidi: 62, colour: '#53dc34', vibration: [10, 25, 10] },
};

export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const midiName = (midi: number) => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** Scale degree 0–6 for a latitude: north is higher. */
export function degreeFor(lat: number): number {
  const t = (Math.min(LAT_HIGH, Math.max(LAT_LOW, lat)) - LAT_LOW) / (LAT_HIGH - LAT_LOW);
  return Math.min(NOTES_PER_VOICE - 1, Math.floor(t * NOTES_PER_VOICE));
}
/** Every D minor pentatonic MIDI note (D = pitch class 2). */
const SCALE = Array.from({ length: 128 }, (_, m) => m).filter((m) => PENTATONIC.includes((((m - 2) % 12) + 12) % 12));
/** The voice's lowest scale note is the first one at or above its base; latitude climbs the shared scale from there. */
export function midiFor(voice: Voice, lat: number): number {
  return SCALE[SCALE.findIndex((m) => m >= voice.baseMidi) + degreeFor(lat)];
}
/** 0–1 loudness on the fixed scale, gently compressed so faint air stays audible. */
export const loudnessFor = (amount: number) => (amount < REST_AMOUNT ? 0 : Math.min(1, amount / FULL_AMOUNT) ** 0.6);
/** West −0.85 … east +0.85. */
export const panFor = (lon: number) => Math.max(-0.85, Math.min(0.85, (lon / 180) * 0.85));

export type TrackNote = { aerosol: Aerosol; midi: number; hz: number; name: string; loudness: number; amount: number; lat: number };
export type Chord = { index: number; lon: number; pan: number; notes: TrackNote[] };

export function chordFor(mix: Mix, lon: number, index: number): Chord {
  const notes: TrackNote[] = [];
  for (const aerosol of AEROSOLS) {
    const { amount, lat } = mix[aerosol];
    const loudness = loudnessFor(amount);
    if (!loudness || lat === null) continue;
    const midi = midiFor(VOICES[aerosol], lat);
    notes.push({ aerosol, midi, hz: midiToHz(midi), name: midiName(midi), loudness, amount, lat });
  }
  return { index, lon, pan: panFor(lon), notes };
}
export const scoreFor = (steps: readonly Step[]): Chord[] => steps.map((s) => chordFor(s.mix, (s.lon0 + s.lon1) / 2, s.index));

export const DEFAULT_BPM = 96;
export const MIN_BPM = 60;
export const MAX_BPM = 160;
/** One step is an eighth note. */
export const stepSeconds = (bpm: number) => 30 / Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));

export const MAPPING_TABLE: readonly (readonly [string, string])[] = [
  ['Aerosol type (nearest hue on NASA’s colour bar)', 'Instrument: smoky brass, desert strings, ocean bed, glass bells'],
  ['How strongly a pixel reaches toward its swatch’s colour', 'Loudness, on one fixed scale; no aerosol, no note'],
  ['Latitude of that aerosol in the slice', 'Pitch within the instrument’s range: north is higher, D minor pentatonic'],
  ['Longitude of the slice (64 slices of 5.625°)', 'Time and stereo position: west to east'],
  ['Tempo, mute and solo', 'Your musical choice; they never change a note'],
];
