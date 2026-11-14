// Currents of Heat: NASA SVS 3912 (ECCO2 sea surface currents coloured by temperature, 19 Jun 2007).
// NASA's colour bar is numeric (0–32 °C, linear), so each coloured current trace can be read back to
// a temperature: its lightness-normalised OKLab chromaticity is matched to the nearest bar colour.
// Model temperatures as rendered by NASA, read from colour: not satellite measurements.
import { rgbToOklab, type RGB } from '../nightLights/color.ts';
import type { Raster } from '../nightLights/raster.ts';

/** NASA's still as shown (2048 × 1024 JPEG) and the analysed copy: that JPEG decoded once and resampled to 1024 × 512, stored as PNG so every browser reads identical pixels. */
export const DISPLAY_URL = '/nasa/svs3912/svs3912_ecco2_sst_flow_2007-06-19_2048x1024.jpg';
export const ANALYSIS_URL = '/nasa/svs3912/svs3912_analysis_1024x512.png';
export const COLORBAR_URL = '/nasa/svs3912/svs3912_sst_cbar.png';
export const WIDTH = 1024;
export const HEIGHT = 512;
export const T_MIN = 0;
export const T_MAX = 32;

/** The gradient spans columns 14–291 of the colour bar, between black borders at 13 and 292 where the 0 and 32 ticks sit. */
export const BAR = { x0: 14, x1: 291, y0: 35, y1: 60, zeroX: 13, fullX: 292 } as const;
export const tempAtColumn = (x: number) => ((x - BAR.zeroX) / (BAR.fullX - BAR.zeroX)) * T_MAX;
/** Traces darker than this, or greyer than this, are background, land or ice, not temperature. */
export const MIN_LIGHTNESS = 0.22;
export const MIN_CHROMA = 0.05;
/** Squared distance in (a/L, b/L) beyond which a colour is not on NASA's bar. */
export const MAX_MATCH = 0.06;

export type BarSample = { t: number; u: number; v: number };
export function readColorbar(bar: Raster): BarSample[] {
  const out: BarSample[] = [];
  for (let x = BAR.x0; x <= BAR.x1; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = BAR.y0; y <= BAR.y1; y++) { const i = (y * bar.width + x) * 4; r += bar.data[i]; g += bar.data[i + 1]; b += bar.data[i + 2]; n++; }
    const [L, a, bb] = rgbToOklab([r / n, g / n, b / n]);
    out.push({ t: tempAtColumn(x), u: a / L, v: bb / L });
  }
  return out;
}

/** °C for one pixel, or NaN when it is not a coloured current trace. */
export function temperatureOf(rgb: RGB, bar: readonly BarSample[]): number {
  const [L, a, b] = rgbToOklab(rgb);
  if (L < MIN_LIGHTNESS || Math.hypot(a, b) < MIN_CHROMA) return NaN;
  const u = a / L, v = b / L;
  let best = Infinity, t = NaN;
  for (const s of bar) { const d = (s.u - u) ** 2 + (s.v - v) ** 2; if (d < best) { best = d; t = s.t; } }
  return best > MAX_MATCH ? NaN : t;
}

export type OceanField = { width: number; height: number; temp: Float32Array };
export function analyzeOcean(img: Raster, bar: readonly BarSample[]): OceanField {
  const temp = new Float32Array(img.width * img.height), cache = new Map<number, number>();
  for (let i = 0; i < img.width * img.height; i++) {
    const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2], key = (r << 16) | (g << 8) | b;
    let t = cache.get(key);
    if (t === undefined) { t = temperatureOf([r, g, b], bar); cache.set(key, t); }
    temp[i] = t;
  }
  return { width: img.width, height: img.height, temp };
}

export const latAt = (y: number, h = HEIGHT) => 90 - ((y + 0.5) / h) * 180;
export const lonAt = (x: number, w = WIDTH) => ((x + 0.5) / w) * 360 - 180;

/** Temperatures in a longitude/latitude window: median, spread, count, and where its warmest tenth sits. */
export type Reading = { n: number; median: number; p10: number; p90: number; warmLon: number | null; cover: number };
export function readWindow(f: OceanField, lon0: number, lat0: number, lon1: number, lat1: number): Reading {
  const v: number[] = [], pos: { t: number; lon: number }[] = [];
  let total = 0;
  for (let y = 0; y < f.height; y++) {
    const la = latAt(y, f.height); if (la < lat0 || la > lat1) continue;
    for (let x = 0; x < f.width; x++) {
      const lo = lonAt(x, f.width); if (lo < lon0 || lo > lon1) continue;
      total++;
      const t = f.temp[y * f.width + x];
      if (!Number.isNaN(t)) { v.push(t); pos.push({ t, lon: lo }); }
    }
  }
  if (!v.length) return { n: 0, median: NaN, p10: NaN, p90: NaN, warmLon: null, cover: 0 };
  v.sort((a, b) => a - b);
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(v.length * p))];
  // Circular mean longitude of the warmest tenth: where the heat sits in this window.
  const cut = q(0.9); let sx = 0, sy = 0;
  for (const p of pos) if (p.t >= cut) { sx += Math.cos((p.lon * Math.PI) / 180); sy += Math.sin((p.lon * Math.PI) / 180); }
  return { n: v.length, median: q(0.5), p10: q(0.1), p90: q(0.9), warmLon: (Math.atan2(sy, sx) * 180) / Math.PI, cover: v.length / total };
}

/** Side A: pole to pole, 80°N → 72°S, in 48 bands of 3.17°. */
export const BANDS = 48;
export const NORTH = 80;
export const SOUTH = -72;
export const MIN_TRACES = 30;
export type Band = { index: number; lat0: number; lat1: number; reading: Reading };
export function poleToPole(f: OceanField): Band[] {
  const step = (NORTH - SOUTH) / BANDS;
  return Array.from({ length: BANDS }, (_, index) => {
    const lat1 = NORTH - index * step, lat0 = lat1 - step;
    return { index, lat0, lat1, reading: readWindow(f, -180, lat0, 180, lat1) };
  });
}

/** Side B: touch the ocean, a 64 × 32 grid of 5.625° cells. */
export const COLS = 64;
export const ROWS = 32;
export type Cell = { col: number; row: number; lon0: number; lat1: number; reading: Reading };
export function cellAt(f: OceanField, col: number, row: number): Cell {
  const lon0 = -180 + col * (360 / COLS), lat1 = 90 - row * (180 / ROWS);
  return { col, row, lon0, lat1, reading: readWindow(f, lon0, lat1 - 180 / ROWS, lon0 + 360 / COLS, lat1) };
}
