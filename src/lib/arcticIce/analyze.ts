/**
 * Arctic sea ice as NASA SVS 5046 rendered it on the 15th of each month of 2024.
 * Pure and framework-free: the build script (scripts/svs5046-analyse.ts) and the unit tests run the same code.
 *
 * 1. Every pixel of the 960×540 analysis copy is traced through NASA's camera to a latitude, longitude and
 *    ground area (projection.ts). Only latitudes ≥ 50°N are read, which keeps out NASA's white atmospheric
 *    halo at the globe's edge.
 * 2. Sea or land: Natural Earth 1:110m land, plus any pixel that never shows open water in 2024 but shows
 *    vegetation or bare ground in some month (small islands the 1:110m outline misses).
 * 3. Ice: a sea pixel NASA drew bright blue-white (classify.ts). NASA draws ice only where AMSR2
 *    concentration is at least 15 %, the usual definition of sea-ice extent.
 */
import type {Raster} from '../nightLights/raster.ts';
import {pixelAreaKm2, pixelToLatLon} from './projection.ts';
import {isLand, rasterLand} from './landMask.ts';
import {isWhite, surfaceClass} from './classify.ts';

export const SOUTH_LAT = 50;
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
export const FRAME_DATES = MONTHS.map((_, i) => `2024-${String(i + 1).padStart(2, '0')}-15`);
/** Touch grid: 2° of latitude by 6° of longitude, 50–90°N. */
export const CELL = {lat: 2, lon: 6} as const;
export const CELL_ROWS = (90 - SOUTH_LAT) / CELL.lat, CELL_COLS = 360 / CELL.lon;

export type Month = {date: string; iceKm2: number};
/** One touch cell: centre, sea area analysed, and a 12-bit mask of months with ice (bit 0 = January). */
export type Cell = {row: number; col: number; lat: number; lon: number; seaKm2: number; iceMonths: number};
export type ArcticAnalysis = {southLat: number; seaKm2: number; months: Month[]; cells: Cell[]};
type Ring = readonly (readonly number[])[];

export function cellIndex(lat: number, lon: number): {row: number; col: number} | null {
  if (lat < SOUTH_LAT || lat > 90) return null;
  return {row: Math.min(CELL_ROWS - 1, Math.floor((90 - lat) / CELL.lat)), col: Math.min(CELL_COLS - 1, Math.floor((((lon + 180) % 360) + 360) % 360 / CELL.lon))};
}
export const cellCentre = (row: number, col: number) => ({lat: 90 - (row + 0.5) * CELL.lat, lon: -180 + (col + 0.5) * CELL.lon});

export function analyseArctic(frames: readonly Raster[], landRings: readonly Ring[]): ArcticAnalysis {
  if (frames.length !== 12) throw new Error('need the twelve monthly frames');
  const {width: W, height: H} = frames[0], N = W * H, grid = rasterLand(landRings);
  const area = new Float64Array(N), cellOf = new Int32Array(N).fill(-1), landNE = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = pixelToLatLon(x, y, W, H);
    if (!p || p.lat < SOUTH_LAT) continue;
    const i = y * W + x, c = cellIndex(p.lat, p.lon)!;
    area[i] = pixelAreaKm2(x, y, W, H); cellOf[i] = c.row * CELL_COLS + c.col; landNE[i] = isLand(grid, p.lat, p.lon) ? 1 : 0;
  }
  const everOcean = new Uint8Array(N), everGround = new Uint8Array(N);
  for (const f of frames) for (let i = 0; i < N; i++) {
    if (cellOf[i] < 0) continue;
    const s = surfaceClass(f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]);
    if (s === 'ocean') everOcean[i] = 1; else if (s === 'land') everGround[i] = 1;
  }
  const sea = new Uint8Array(N);
  let seaKm2 = 0;
  for (let i = 0; i < N; i++) if (cellOf[i] >= 0 && !landNE[i] && !(everGround[i] && !everOcean[i])) { sea[i] = 1; seaKm2 += area[i]; }
  const cellSea = new Float64Array(CELL_ROWS * CELL_COLS), cellIce = frames.map(() => new Float64Array(CELL_ROWS * CELL_COLS));
  const months = frames.map((f, m) => {
    let ice = 0;
    for (let i = 0; i < N; i++) {
      if (!sea[i]) continue;
      if (m === 0) cellSea[cellOf[i]] += area[i];
      if (f.data[i * 4 + 3] > 200 && isWhite(f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2])) { ice += area[i]; cellIce[m][cellOf[i]] += area[i]; }
    }
    return {date: FRAME_DATES[m], iceKm2: Math.round(ice)};
  });
  const cells: Cell[] = [];
  for (let row = 0; row < CELL_ROWS; row++) for (let col = 0; col < CELL_COLS; col++) {
    const k = row * CELL_COLS + col, s = cellSea[k];
    if (s < 200) continue; // too little open sea seen in this cell to say anything
    let mask = 0;
    for (let m = 0; m < 12; m++) if (cellIce[m][k] >= s / 2) mask |= 1 << m;
    cells.push({row, col, ...cellCentre(row, col), seaKm2: Math.round(s), iceMonths: mask});
  }
  return {southLat: SOUTH_LAT, seaKm2: Math.round(seaKm2), months, cells};
}
export const monthsWithIce = (mask: number) => MONTHS.filter((_, m) => mask & (1 << m));
export const iceMonthCount = (mask: number) => monthsWithIce(mask).length;
