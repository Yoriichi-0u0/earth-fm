// The Air We Share: NASA SVS 5669 (GEOS Aerosols, 19 Aug 2025 20:00 UTC) read in the browser.
// Every pixel is placed on NASA's own colour bar: the nearest aerosol hue decides the type, and how
// far the pixel reaches toward that swatch's colour is its strength. Rendered colour, not optical depth.
import { rgbToOklab, srgbToLinear, type RGB } from '../nightLights/color.ts';
import type { Raster, Rect } from '../nightLights/raster.ts';

export const STILL_URL = '/nasa/svs5669/svs5669_aerosols_2025-08-19T20Z_1920x1080.png';
export const COLORBAR_URL = '/nasa/svs5669/svs5669_aerosols_cbar.png';
export const IMAGE_WIDTH = 1920;
export const IMAGE_HEIGHT = 1080;
/** Every other pixel in each direction: 960 × 540 samples, identical in Node and the browser. */
export const SAMPLE_STEP = 2;
/** One groove step = 1920 / 64 = 30 pixels = 5.625° of longitude. */
export const STEPS = 64;

export const AEROSOLS = ['blackCarbon', 'dust', 'seaSalt', 'sulfate'] as const;
export type Aerosol = (typeof AEROSOLS)[number];
export const AEROSOL_NAMES: Record<Aerosol, string> = { blackCarbon: 'Black carbon (smoke)', dust: 'Dust', seaSalt: 'Sea salt', sulfate: 'Sulfate' };

/** NASA's four swatches in svs5669_aerosols_cbar.png (inclusive pixel boxes inside each rounded tile). */
export const SWATCH_BOXES: Record<Aerosol, Rect> = {
  blackCarbon: { x0: 233, y0: 170, x1: 371, y1: 205 },
  dust: { x0: 528, y0: 170, x1: 666, y1: 205 },
  seaSalt: { x0: 829, y0: 170, x1: 968, y1: 205 },
  sulfate: { x0: 1123, y0: 170, x1: 1262, y1: 205 },
};

/** A pixel joins a type only within this hue angle of NASA's swatch. */
export const HUE_WINDOW_DEG = 40;
/** OKLab chroma floor. Grey land, ice and Antarctica sit below it. Sea salt is a pale colour, so its floor is lower. */
export const MIN_CHROMA = 0.03;
export const MIN_CHROMA_SEA_SALT = 0.018;
/** Strength floor (projection onto the swatch in linear RGB); weaker pixels count as clear air. */
export const MIN_STRENGTH = 0.06;

export type Swatch = { aerosol: Aerosol; rgb: RGB; hue: number; linear: readonly [number, number, number] };

export function readLegend(colorbar: Raster): Swatch[] {
  return AEROSOLS.map((aerosol) => {
    const box = SWATCH_BOXES[aerosol];
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
      const i = (y * colorbar.width + x) * 4;
      r += colorbar.data[i]; g += colorbar.data[i + 1]; b += colorbar.data[i + 2]; n++;
    }
    const rgb: RGB = [r / n, g / n, b / n];
    const [, a, bb] = rgbToOklab(rgb);
    return { aerosol, rgb, hue: Math.atan2(bb, a), linear: [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])] as const };
  });
}

const angle = (x: number, y: number) => { const d = Math.abs(x - y) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

/** Type index (0–3, or -1 for clear air) and strength (0–1) for one sRGB pixel. */
export function classifyPixel(rgb: RGB, legend: readonly Swatch[]): { type: number; strength: number } {
  const [, a, b] = rgbToOklab(rgb);
  const chroma = Math.hypot(a, b), hue = Math.atan2(b, a);
  let type = -1, best = Infinity;
  for (let k = 0; k < legend.length; k++) { const d = angle(hue, legend[k].hue); if (d < best) { best = d; type = k; } }
  if (best > (HUE_WINDOW_DEG * Math.PI) / 180) return { type: -1, strength: 0 };
  if (chroma < (legend[type].aerosol === 'seaSalt' ? MIN_CHROMA_SEA_SALT : MIN_CHROMA)) return { type: -1, strength: 0 };
  const s = legend[type].linear, r = srgbToLinear(rgb[0]), g = srgbToLinear(rgb[1]), bl = srgbToLinear(rgb[2]);
  const strength = (r * s[0] + g * s[1] + bl * s[2]) / (s[0] ** 2 + s[1] ** 2 + s[2] ** 2);
  return strength < MIN_STRENGTH ? { type: -1, strength: 0 } : { type, strength: Math.min(1, strength) };
}

/** The sampled field: one entry per SAMPLE_STEP × SAMPLE_STEP block, at its top-left pixel. */
export type AirField = { width: number; height: number; type: Int8Array; strength: Float32Array; legend: readonly Swatch[] };

export function analyzeStill(still: Raster, legend: readonly Swatch[]): AirField {
  const width = Math.floor(still.width / SAMPLE_STEP), height = Math.floor(still.height / SAMPLE_STEP);
  const type = new Int8Array(width * height).fill(-1), strength = new Float32Array(width * height);
  const cache = new Map<number, { type: number; strength: number }>();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * SAMPLE_STEP * still.width + x * SAMPLE_STEP) * 4;
    const key = (still.data[i] << 16) | (still.data[i + 1] << 8) | still.data[i + 2];
    let c = cache.get(key);
    if (!c) { c = classifyPixel([still.data[i], still.data[i + 1], still.data[i + 2]], legend); cache.set(key, c); }
    type[y * width + x] = c.type; strength[y * width + x] = c.strength;
  }
  return { width, height, type, strength, legend };
}

// ---- Geography: NASA's still is a full equirectangular map ----------------------------
export const lonAt = (x: number) => (x / IMAGE_WIDTH) * 360 - 180;
export const latAt = (y: number) => 90 - (y / IMAGE_HEIGHT) * 180;
export const xAt = (lon: number) => Math.round(((lon + 180) / 360) * IMAGE_WIDTH);
export const yAt = (lat: number) => Math.round(((90 - lat) / 180) * IMAGE_HEIGHT);
export function boxFor(lon0: number, lat0: number, lon1: number, lat1: number): Rect {
  return { x0: xAt(lon0), y0: yAt(lat1), x1: Math.min(IMAGE_WIDTH - 1, xAt(lon1)), y1: Math.min(IMAGE_HEIGHT - 1, yAt(lat0)) };
}

/**
 * Per type: `amount` is the mean strength over every sample in the box (clear air counts as 0).
 * `lat` is where most of it is: the strength-weighted latitude inside its strongest 15° band,
 * so salt over two oceans is not averaged into the tropics between them.
 */
export type Mix = Record<Aerosol, { amount: number; lat: number | null }>;
export const LAT_BAND_DEG = 15;

export function mixIn(field: AirField, rect: Rect): Mix {
  const x0 = Math.ceil(rect.x0 / SAMPLE_STEP), x1 = Math.floor(rect.x1 / SAMPLE_STEP), y0 = Math.ceil(rect.y0 / SAMPLE_STEP), y1 = Math.floor(rect.y1 / SAMPLE_STEP);
  const bands = 180 / LAT_BAND_DEG;
  const sum = [0, 0, 0, 0], bandSum = AEROSOLS.map(() => new Float64Array(bands)), bandLat = AEROSOLS.map(() => new Float64Array(bands));
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    const lat = latAt(y * SAMPLE_STEP), band = Math.min(bands - 1, Math.floor((90 - lat) / LAT_BAND_DEG));
    for (let x = x0; x <= x1; x++) {
      n++;
      const k = field.type[y * field.width + x];
      if (k < 0) continue;
      const s = field.strength[y * field.width + x];
      sum[k] += s; bandSum[k][band] += s; bandLat[k][band] += s * lat;
    }
  }
  const mix = {} as Mix;
  AEROSOLS.forEach((aerosol, k) => {
    let best = 0;
    for (let b = 1; b < bands; b++) if (bandSum[k][b] > bandSum[k][best]) best = b;
    mix[aerosol] = { amount: n ? sum[k] / n : 0, lat: sum[k] > 0 ? bandLat[k][best] / bandSum[k][best] : null };
  });
  return mix;
}

export const dominant = (mix: Mix): Aerosol => AEROSOLS.reduce((a, b) => (mix[b].amount > mix[a].amount ? b : a));

/** The 64 groove steps around the world, west to east. */
export type Step = { index: number; rect: Rect; lon0: number; lon1: number; mix: Mix };
export function grooveSteps(field: AirField, rect: Rect = { x0: 0, y0: 0, x1: IMAGE_WIDTH - 1, y1: IMAGE_HEIGHT - 1 }, count = STEPS): Step[] {
  const width = rect.x1 - rect.x0 + 1;
  return Array.from({ length: count }, (_, index) => {
    const x0 = rect.x0 + Math.floor((index * width) / count), x1 = rect.x0 + Math.floor(((index + 1) * width) / count) - 1;
    const r = { x0, y0: rect.y0, x1, y1: rect.y1 };
    return { index, rect: r, lon0: lonAt(x0), lon1: lonAt(x1 + 1), mix: mixIn(field, r) };
  });
}
