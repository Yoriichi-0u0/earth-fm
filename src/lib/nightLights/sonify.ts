// Fixed sonification rules. No per-image rescaling: the same colour always sounds the same.
import { DIRECTION_THRESHOLD, type Direction, type RegionStats } from './analyze.ts';

/** Major pentatonic scale over two octaves from A3 (semitones above A3). */
export const BASE_HZ = 220;
export const SCALE_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24] as const;
export const RISE_SEMITONES = 4; // major third up
export const FALL_SEMITONES = -3; // minor third down
export const EVENT_SECONDS = 0.8;
/** litFraction thresholds for 2, 3 and 4 pulses (share of map pixels lit in the cell). */
export const PULSE_THRESHOLDS = [0.02, 0.04, 0.06] as const;
export const MIN_GAIN = 0.25;
export const MAX_GAIN = 1;
/** litFraction at which loudness reaches its maximum. */
export const FULL_LOUDNESS_FRACTION = 0.1;

export type Waveform = 'sawtooth' | 'triangle' | 'sine';

export interface Note {
  /** Seconds after the event start. */
  readonly at: number;
  readonly duration: number;
  readonly hz: number;
}

export interface NotePlan {
  readonly direction: Direction;
  readonly figure: 'rising' | 'falling' | 'single';
  readonly waveform: Waveform;
  readonly step: number;
  readonly pulses: number;
  /** 0–1 relative loudness. */
  readonly gain: number;
  /** −1 (west / left) … +1 (east / right). */
  readonly pan: number;
  readonly notes: readonly Note[];
}

export function semitonesToHz(semitones: number): number {
  return BASE_HZ * 2 ** (semitones / 12);
}

/** Position along the legend (|s|, 0–1) chooses the scale step. */
export function stepFor(meanChange: number): number {
  const m = Math.min(1, Math.abs(meanChange));
  return Math.round(m * (SCALE_SEMITONES.length - 1));
}

export function pulsesFor(litFraction: number): number {
  return 1 + PULSE_THRESHOLDS.filter((t) => litFraction >= t).length;
}

export function gainFor(litFraction: number): number {
  return MIN_GAIN + (MAX_GAIN - MIN_GAIN) * Math.min(1, litFraction / FULL_LOUDNESS_FRACTION);
}

/** x centre of the region in image pixels, image width → stereo pan. */
export function panFor(xCentre: number, width: number): number {
  return Math.max(-1, Math.min(1, (xCentre / width) * 2 - 1));
}

/** Note plan for a region, or null for a region with no lit map pixels (silence). */
export function planFor(stats: Pick<RegionStats, 'direction' | 'meanChange' | 'litFraction'>, xCentre: number, width: number): NotePlan | null {
  if (!stats.direction) return null;
  const direction = stats.direction;
  const step = stepFor(stats.meanChange);
  const root = SCALE_SEMITONES[step];
  const pulses = pulsesFor(stats.litFraction);
  const spacing = EVENT_SECONDS / pulses;
  const figure = direction === 'more' ? 'rising' : direction === 'less' ? 'falling' : 'single';
  const noteLen = Math.min(0.14, spacing / (figure === 'single' ? 1.6 : 2.4));
  const notes: Note[] = [];
  for (let p = 0; p < pulses; p++) {
    const t = p * spacing;
    notes.push({ at: t, duration: noteLen, hz: semitonesToHz(root) });
    if (figure !== 'single') {
      const interval = figure === 'rising' ? RISE_SEMITONES : FALL_SEMITONES;
      notes.push({ at: t + noteLen * 1.15, duration: noteLen, hz: semitonesToHz(root + interval) });
    }
  }
  return {
    direction,
    figure,
    waveform: direction === 'more' ? 'sawtooth' : direction === 'less' ? 'triangle' : 'sine',
    step,
    pulses,
    gain: gainFor(stats.litFraction),
    pan: panFor(xCentre, width),
    notes,
  };
}

/** Legend tour: samples from orange (s = −1) through white to purple (s = +1). */
export function legendTourPositions(count = 9): number[] {
  return Array.from({ length: count }, (_, i) => -1 + (2 * i) / (count - 1));
}

export const MAPPING_TABLE = [
  ['More light (mean legend position above +' + DIRECTION_THRESHOLD + ', purple side)', 'Rising pair: a note, then a major third up; brighter filtered-sawtooth timbre'],
  ['Less light (mean legend position below −' + DIRECTION_THRESHOLD + ', orange side)', 'Falling pair: a note, then a minor third down; mellow triangle timbre'],
  ['Lit but steady (near white on the legend)', 'A single soft sine tone'],
  ['How far the colour sits along NASA’s legend (|position|, 0–1)', 'Starting pitch: step 0–10 of a two-octave A major pentatonic scale from A3 (220 Hz)'],
  ['Share of the cell’s map pixels that are lit', 'Loudness (25–100 %, full at 10 %) and 1–4 pulses (at 2 %, 4 %, 6 %)'],
  ['Horizontal position (west to east on the image)', 'Stereo pan, left to right'],
  ['No lit map pixels, or a masked area (legend, inset, outline, connector)', 'Silence'],
] as const;
