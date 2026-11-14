// Fixed sound rules for The Ice Year (NASA SVS 5046). Only NASA's rendered ice sets pitch; tempo is a
// musical choice that never changes a note.
import {MONTHS} from './analyze.ts';

const PENTATONIC = [0, 2, 4, 7, 9]; // C major pentatonic: open, bell-like, no wrong notes between layers
const SCALE = Array.from({length: 128}, (_, m) => m).filter(m => PENTATONIC.includes(m % 12));
export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const midiName = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

/** Side A: ice area north of 50°N, 0–16 million km² in sixteen 1-million-km² steps, from C3 upward. */
export const AREA_STEP_KM2 = 1e6, AREA_STEPS = 16;
const AREA_BASE = SCALE.indexOf(48); // C3
export const areaDegree = (km2: number) => Math.max(0, Math.min(AREA_STEPS - 1, Math.floor(km2 / AREA_STEP_KM2)));
export const areaMidi = (km2: number) => SCALE[AREA_BASE + areaDegree(km2)];

/** Side B: a place's ice months ring at a pitch set by its latitude (50–90°N in 2° steps, C4 upward): the farther north, the higher. */
const PLACE_BASE = SCALE.indexOf(60); // C4
export const placeMidi = (lat: number) => SCALE[PLACE_BASE + Math.max(0, Math.min(19, Math.floor((lat - 50) / 2)))];

export type IceNote = {midi: number; hz: number; name: string; ice: boolean; water: number; month: number};
/** One month of the Arctic year: a glass-bell note for the ice, and an ocean wash as loud as the open-water share. */
export function yearNote(month: number, iceKm2: number, seaKm2: number): IceNote {
  const midi = areaMidi(iceKm2);
  return {midi, hz: midiToHz(midi), name: midiName(midi), ice: iceKm2 > 0, water: Math.max(0, Math.min(1, 1 - iceKm2 / seaKm2)), month};
}
/** One month at one place: a bell if NASA drew ice there, otherwise only the ocean wash. */
export function placeNote(month: number, lat: number, iceMonths: number): IceNote {
  const midi = placeMidi(lat), ice = (iceMonths & (1 << month)) !== 0;
  return {midi, hz: midiToHz(midi), name: ice ? midiName(midi) : 'open water', ice, water: ice ? 0 : 1, month};
}

export const DEFAULT_BPM = 72;
/** One month per beat. */
export const stepSeconds = (bpm: number) => 60 / Math.max(48, Math.min(120, bpm));

export const MAPPING_TABLE: readonly (readonly [string, string])[] = [
  ['Blue-white ice NASA drew on its globe (AMSR2 concentration ≥ 15%)', 'Ice, counted pixel by pixel'],
  ['Ice area north of 50°N, using NASA’s own camera to size every pixel', 'Pitch: sixteen 1-million-km² steps of C major pentatonic; less ice, lower note'],
  ['Open water in the analysed sea', 'Loudness of a soft ocean wash under the note'],
  ['A place’s months with ice (Side B)', 'A bell in each ice month, only the wash in open-water months; farther north rings higher'],
  ['Tempo', 'Your musical choice; it never changes a note'],
];
export const monthName = (m: number) => MONTHS[m];
