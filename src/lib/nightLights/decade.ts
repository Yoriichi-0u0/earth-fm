// The decade: NASA SVS 5313's own annual night-light frames, 2012–2023.
//
// The EIC movie opens with one annual-average frame per year before it reveals the change
// map. scripts/nightlights-extract-decade.sh takes each year's frame from the movie at the change map's
// 1024 × 288 grid (see public/nasa/svs5313/decade/provenance.json). Here we read RENDERED pixels.
//
// The measure of a place's light is its BRIGHTNESS ABOVE THE BASE MAP: for every pixel, the
// luma above the 7 × 7 median around it (the dark land or ocean), summed over the place. It
// has no "lit" threshold on purpose: a threshold lets dim lights cross it as they brighten,
// which exaggerates growth at this coarse scale (India read 2.8× instead of about 1.6×).
// Checked against NASA's independent SVS 5276 annual stills at 4–8× this resolution
// (validation/svs5276-crosscheck.json and tests/nightLights.crosscheck.test.ts). It is rendered
// brightness, not radiance.
import { luma } from './color.ts';
import { IMAGE_HEIGHT, IMAGE_WIDTH } from './layout.ts';
import { inRect, type Raster, type Rect } from './raster.ts';
import type { Direction } from './analyze.ts';
import { gainFor, panFor, type NotePlan } from './sonify.ts';

export const YEARS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023] as const;
export type Year = (typeof YEARS)[number];
export const frameUrl = (year: number) => `/nasa/svs5313/decade/${year}.jpg`;

/** NASA prints the year near the middle of the map (detected on all 12 frames; see the tests). */
export const YEAR_LABEL: Rect = { x0: 531, y0: 144, x1: 553, y1: 151 };
export const YEAR_LABEL_PAD = 4;

/** Darker pixels are ocean or base map and cannot stand above it (a fast path, not a threshold on light). */
export const DECADE_MIN_LUMA = 0.06;
/** Luma above the local base below this is treated as compression noise. */
export const DECADE_NOISE_FLOOR = 0.01;
/** "Bright" pixels (used only for loudness): at least this luma … */
export const BRIGHT_PIXEL_LUMA = 0.15;
/** … and at least this far above the local base. */
export const BRIGHT_PIXEL_CONTRAST = 0.03;

/** Per pixel: luma above the local base map (0 at or below the noise floor, and for the year label). */
export interface YearField {
  readonly year: number;
  readonly light: Float32Array;
  /** 1 where the pixel is bright (for loudness only). */
  readonly bright: Uint8Array;
}

export function isYearLabel(x: number, y: number): boolean {
  return inRect(YEAR_LABEL, x, y, YEAR_LABEL_PAD);
}

/** k-th smallest of the first n values (in place; n is small). */
function select(v: Float32Array, n: number, k: number): number {
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const pivot = v[(lo + hi) >> 1];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (v[i] < pivot) i++;
      while (v[j] > pivot) j--;
      if (i <= j) {
        const t = v[i];
        v[i] = v[j];
        v[j] = t;
        i++;
        j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else return v[k];
  }
  return v[k];
}

/** mask(x, y) excludes a pixel (by default NASA's printed year on the EIC frames). */
export interface DecadeOptions {
  readonly minLuma: number;
  readonly noiseFloor: number;
}
export const DECADE_OPTIONS: DecadeOptions = { minLuma: DECADE_MIN_LUMA, noiseFloor: DECADE_NOISE_FLOOR };

export function analyzeYear(
  r: Raster,
  year: number,
  mask: (x: number, y: number) => boolean = isYearLabel,
  options: DecadeOptions = DECADE_OPTIONS,
): YearField {
  const { width: W, height: H, data } = r;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = luma([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  const light = new Float32Array(W * H);
  const bright = new Uint8Array(W * H);
  const win = new Float32Array(49);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const L = lum[i];
      if (L < options.minLuma || mask(x, y)) continue;
      let n = 0;
      for (let dy = -3; dy <= 3; dy++) {
        const yy = Math.min(H - 1, Math.max(0, y + dy)) * W;
        for (let dx = -3; dx <= 3; dx++) win[n++] = lum[yy + Math.min(W - 1, Math.max(0, x + dx))];
      }
      const excess = L - select(win, 49, 24);
      if (excess > options.noiseFloor) light[i] = excess;
      if (L >= BRIGHT_PIXEL_LUMA && excess >= BRIGHT_PIXEL_CONTRAST) bright[i] = 1;
    }
  }
  return { year, light, bright };
}

export interface YearStats {
  readonly year: number;
  /** Map pixels considered (the year label is excluded). */
  readonly mapPixels: number;
  /** Bright pixels (luma ≥ 0.15 and ≥ 0.03 above the base): used for loudness only. */
  readonly litPixels: number;
  /** litPixels / mapPixels: a share of rendered map pixels, not of land area. */
  readonly litFraction: number;
  /** Brightness above the base map, summed over the place: rendered brightness, not radiance. */
  readonly light: number;
}

export function yearStats(field: YearField, rect: Rect): YearStats {
  let mapPixels = 0;
  let litPixels = 0;
  let light = 0;
  for (let y = Math.max(0, rect.y0); y <= Math.min(IMAGE_HEIGHT - 1, rect.y1); y++) {
    for (let x = Math.max(0, rect.x0); x <= Math.min(IMAGE_WIDTH - 1, rect.x1); x++) {
      if (isYearLabel(x, y)) continue;
      mapPixels++;
      const i = y * IMAGE_WIDTH + x;
      light += field.light[i];
      litPixels += field.bright[i];
    }
  }
  return { year: field.year, mapPixels, litPixels, litFraction: mapPixels ? litPixels / mapPixels : 0, light };
}

/** Places smaller than this many map pixels give weak readings at this scale (Ukraine's box). */
export const SMALL_PLACE_PIXELS = 600;

export function decadeSeries(fields: readonly YearField[], rect: Rect): YearStats[] {
  return fields.map((f) => yearStats(f, rect));
}

/** Year-on-year change above this share counts as more / less light for that step. */
export const YEAR_CHANGE = 0.05;
/** 2023 against 2012: a change above this share is a decade trend of more / less light. */
export const DECADE_CHANGE = 0.1;

function compare(before: number, after: number, threshold: number): Direction {
  if (before === 0) return after > 0 ? 'more' : 'steady';
  const r = after / before - 1;
  if (r > threshold) return 'more';
  if (r < -threshold) return 'less';
  return 'steady';
}

/** Direction of one year against the previous year (the first year is 'steady'). */
export function yearDirection(prev: YearStats | undefined, cur: YearStats): Direction {
  return prev ? compare(prev.light, cur.light, YEAR_CHANGE) : 'steady';
}

/** Direction of the whole decade (first year against last), or null when nothing is ever lit. */
export function decadeTrend(series: readonly YearStats[]): Direction | null {
  const first = series[0];
  const last = series[series.length - 1];
  if (!series.some((s) => s.light > 0)) return null;
  return compare(first.light, last.light, DECADE_CHANGE);
}

// ---- Sound rules for the decade ------------------------------------------------
// Each place starts on the same note (A3) in its first year with any light. Every doubling of
// its brightness above the base map moves the melody up one octave (5 steps of the pentatonic
// scale); every halving, one octave down. So the melody is the place's own trend, comparable
// everywhere: "an octave up" always means "twice the brightness of the starting year".
// Loudness follows the share of clearly bright pixels, as the change map's follows lit pixels.

/** A major pentatonic scale over three octaves from A2 (110 Hz), in semitones. */
export const DECADE_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36] as const;
export const DECADE_BASE_HZ = 110;
/** Starting note (A3) and how many scale steps one doubling of light moves. */
export const DECADE_START_STEP = 5;
export const STEPS_PER_DOUBLING = 5;
export const YEAR_NOTE_SECONDS = 0.34;
export const YEAR_STEP_MS = 500;

/** Scale step for a year's light against the place's starting light, or null if unlit. */
export function decadeStep(light: number, startLight: number): number | null {
  if (light <= 0 || startLight <= 0) return null;
  const step = DECADE_START_STEP + Math.round(STEPS_PER_DOUBLING * Math.log2(light / startLight));
  return Math.max(0, Math.min(DECADE_SCALE.length - 1, step));
}

export const stepHz = (step: number) => DECADE_BASE_HZ * 2 ** (DECADE_SCALE[step] / 12);

/** The starting light: the first year in which the place has any lit pixels. */
export function startLight(series: readonly YearStats[]): number {
  return series.find((s) => s.light > 0)?.light ?? 0;
}

/** One soft note for one year, or null for a year with no lit pixels (a rest). */
export function yearPlan(cur: YearStats, start: number, direction: Direction, xCentre: number): NotePlan | null {
  const step = decadeStep(cur.light, start);
  if (step === null) return null;
  return {
    direction,
    figure: 'single',
    waveform: 'triangle',
    step,
    pulses: 1,
    gain: gainFor(cur.litFraction),
    pan: panFor(xCentre, IMAGE_WIDTH),
    notes: [{ at: 0, duration: YEAR_NOTE_SECONDS, hz: stepHz(step) }],
  };
}

export const DECADE_MAPPING_TABLE = [
  ['NASA’s annual frame for each year, 2012 → 2023', 'One note per year, half a second apart, while the map shows that year'],
  ['The place’s brightness above the dark base map, against its first year', 'Pitch: starts on A3; twice the brightness = one octave higher, half = one octave lower (A major pentatonic, A2–A5)'],
  ['Share of the place’s map pixels that are clearly bright', 'Loudness (25–100 %, full at 10 %)'],
  ['A year with nothing brighter than the base map', 'A rest (silence)'],
  ['Brighter / dimmer / similar to the year before (±5 %)', 'Purple / orange / white ring, and the matching vibration'],
  ['After 2023: NASA’s change map for the same place', 'The change-map figure: rising pair, falling pair or single tone'],
  ['Tempo (BPM) and beats per bar: your musical choice', 'Time between years, and an accent (plus an optional click) on the first beat of each bar. They never change a year’s note'],
] as const;

// ---- Tempo and meter (musical choices, never data) ------------------------------------
// One year per beat. Tempo sets the time between years; beats per bar groups the years and
// accents the first beat of each bar. Neither changes which note a year plays.
export const DEFAULT_BPM = 120;
export const MIN_BPM = 60;
export const MAX_BPM = 180;
export const METERS = [2, 3, 4, 6] as const;
export type Meter = (typeof METERS)[number];
/** The downbeat is this much louder (capped at full loudness); its pitch is unchanged. */
export const ACCENT_GAIN = 1.25;

export const clampBpm = (bpm: number) => Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
/** Milliseconds between years at this tempo (500 ms at the default 120 BPM). */
export const beatMs = (bpm: number) => 60000 / clampBpm(bpm);

export function beatPosition(index: number, beatsPerBar: Meter): { bar: number; beat: number; downbeat: boolean } {
  return { bar: Math.floor(index / beatsPerBar) + 1, beat: (index % beatsPerBar) + 1, downbeat: index % beatsPerBar === 0 };
}

/** The same notes, shortened to fit a fast beat and louder on a downbeat. Pitch never changes. */
export function rhythmPlan(plan: NotePlan, downbeat: boolean, bpm: number): NotePlan {
  const duration = Math.min(YEAR_NOTE_SECONDS, (beatMs(bpm) / 1000) * 0.7);
  return {
    ...plan,
    gain: downbeat ? Math.min(1, plan.gain * ACCENT_GAIN) : plan.gain,
    notes: plan.notes.map((n) => ({ ...n, duration: Math.min(n.duration, duration) })),
  };
}
