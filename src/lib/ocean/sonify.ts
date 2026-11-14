// Fixed sound rules for Currents of Heat. Temperature alone sets pitch, on one scale for every band
// and every cell; tempo is a musical choice that never changes a note.
import { T_MAX, type Reading } from './analyze.ts';

/** 0–32 °C in sixteen 2 °C steps, climbing D minor pentatonic from D3: cold water low, warm water high. */
export const STEP_C = 2;
const PENTATONIC = [0, 3, 5, 7, 10];
const SCALE = Array.from({ length: 128 }, (_, m) => m).filter((m) => PENTATONIC.includes((((m - 2) % 12) + 12) % 12));
const BASE = SCALE.indexOf(50); // D3
export const NOTES = T_MAX / STEP_C;
export const degreeFor = (t: number) => Math.max(0, Math.min(NOTES - 1, Math.floor(t / STEP_C)));
export const midiFor = (t: number) => SCALE[BASE + degreeFor(t)];
export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const midiName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

export type OceanNote = { midi: number; hz: number; name: string; temp: number; shimmer: number; pan: number } | null;
/** One note per reading: pitch from its median temperature; a soft shimmer from how much of it NASA's current traces cover; pan toward where its warmest water sits. */
export function noteFor(r: Reading, minTraces = 30): OceanNote {
  if (r.n < minTraces || Number.isNaN(r.median)) return null;
  const midi = midiFor(r.median);
  return { midi, hz: midiToHz(midi), name: midiName(midi), temp: r.median, shimmer: Math.min(1, r.cover / 0.6), pan: r.warmLon === null ? 0 : Math.max(-0.85, Math.min(0.85, (r.warmLon / 180) * 0.85)) };
}

export const DEFAULT_BPM = 104;
/** One band per eighth note. */
export const stepSeconds = (bpm: number) => 30 / Math.max(60, Math.min(160, bpm));

export const MAPPING_TABLE: readonly (readonly [string, string])[] = [
  ['Colour of a current trace, matched to NASA’s 0–32 °C colour bar', 'Sea-surface temperature in °C (model, as rendered)'],
  ['Median temperature of a band or cell', 'Pitch: sixteen 2 °C steps of D minor pentatonic; cold low, warm high'],
  ['Share of the band covered by NASA’s current traces', 'Loudness of a soft shimmer above the note'],
  ['Where the band’s warmest tenth sits', 'Stereo position, and where the globe turns'],
  ['Tempo', 'Your musical choice; it never changes a note'],
];
