// Pixel classes and cell statistics, on masked map pixels only.
// Everything here describes RENDERED COLOURS: direction of change as drawn by NASA SVS
// (purple = more light, orange = less light, white = no change), position along the
// legend, and a share of map pixels. Not radiance, not area, not a measured magnitude.
import { chroma, luma, rgbToOklab } from './color.ts';
import { IMAGE_HEIGHT, IMAGE_WIDTH, INSETS, maskBitmap, parentRegion, type InsetId } from './layout.ts';
import { legendPosition, type RampSample } from './legend.ts';
import { rgbAt, type Raster, type Rect } from './raster.ts';

/** A pixel at or above this luma is lit whatever its colour (bright dots, white cores). */
export const BRIGHT_LUMA = 0.3;
/** Dimmer pixels are lit only if they stand this far above their local base map … */
export const LOCAL_CONTRAST = 0.04;
/** … measured from the larger of the 7×7 median luma and this typical land level … */
export const LAND_LUMA = 0.14;
/** … and carry at least this OKLab chroma (grey land, ice and Antarctica are neutral). */
export const MIN_CHROMA = 0.018;
/** Per-pixel and per-cell thresholds on legend position s for "more" / "less". */
export const DIRECTION_THRESHOLD = 0.15;
export const CELL_SIZE = 32;
export const COLS = IMAGE_WIDTH / CELL_SIZE;
export const ROWS = IMAGE_HEIGHT / CELL_SIZE;

export type Direction = 'more' | 'less' | 'steady';

export function localMedianLuma(r: Raster, x: number, y: number): number {
  const v: number[] = [];
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const xx = Math.min(r.width - 1, Math.max(0, x + dx));
      const yy = Math.min(r.height - 1, Math.max(0, y + dy));
      v.push(luma(rgbAt(r, xx, yy)));
    }
  }
  v.sort((a, b) => a - b);
  return v[24];
}

/** Legend position s for a lit pixel, or null if the pixel is unlit. Ignores the mask. */
export function classifyPixel(r: Raster, ramp: readonly RampSample[], x: number, y: number): number | null {
  const rgb = rgbAt(r, x, y);
  const L = luma(rgb);
  const lab = rgbToOklab(rgb);
  let lit = L >= BRIGHT_LUMA;
  if (!lit && L >= LAND_LUMA + LOCAL_CONTRAST && chroma(lab) >= MIN_CHROMA) {
    lit = L >= Math.max(localMedianLuma(r, x, y), LAND_LUMA) + LOCAL_CONTRAST;
  }
  return lit ? legendPosition(ramp, lab) : null;
}

export function directionOf(s: number): Direction {
  if (s > DIRECTION_THRESHOLD) return 'more';
  if (s < -DIRECTION_THRESHOLD) return 'less';
  return 'steady';
}

export interface RegionStats {
  /** Unmasked map pixels considered. */
  readonly mapPixels: number;
  readonly litPixels: number;
  /** litPixels / mapPixels: a share of rendered map pixels, not of land area. */
  readonly litFraction: number;
  /** Luma-weighted mean legend position of lit pixels (0 when none). */
  readonly meanChange: number;
  readonly shareMore: number;
  readonly shareLess: number;
  readonly shareSteady: number;
  /** Direction of the region as a whole, or null when nothing is lit. */
  readonly direction: Direction | null;
}

/** Per-pixel analysis of the whole image: legend position for lit map pixels, NaN otherwise. */
export interface PixelField {
  readonly s: Float32Array;
  readonly weight: Float32Array;
  readonly masked: Uint8Array;
}

export function analyzePixels(r: Raster, ramp: readonly RampSample[]): PixelField {
  const n = r.width * r.height;
  const s = new Float32Array(n).fill(Number.NaN);
  const weight = new Float32Array(n);
  const masked = maskBitmap();
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const i = y * r.width + x;
      if (masked[i]) continue;
      const v = classifyPixel(r, ramp, x, y);
      if (v !== null) {
        s[i] = v;
        weight[i] = luma(rgbAt(r, x, y));
      }
    }
  }
  return { s, weight, masked };
}

export function regionStats(field: PixelField, rect: Rect): RegionStats {
  let mapPixels = 0;
  let lit = 0;
  let wSum = 0;
  let sw = 0;
  let more = 0;
  let less = 0;
  for (let y = Math.max(0, rect.y0); y <= Math.min(IMAGE_HEIGHT - 1, rect.y1); y++) {
    for (let x = Math.max(0, rect.x0); x <= Math.min(IMAGE_WIDTH - 1, rect.x1); x++) {
      const i = y * IMAGE_WIDTH + x;
      if (field.masked[i]) continue;
      mapPixels++;
      const s = field.s[i];
      if (Number.isNaN(s)) continue;
      lit++;
      wSum += field.weight[i];
      sw += field.weight[i] * s;
      const d = directionOf(s);
      if (d === 'more') more++;
      else if (d === 'less') less++;
    }
  }
  const meanChange = wSum ? sw / wSum : 0;
  return {
    mapPixels,
    litPixels: lit,
    litFraction: mapPixels ? lit / mapPixels : 0,
    meanChange,
    shareMore: lit ? more / lit : 0,
    shareLess: lit ? less / lit : 0,
    shareSteady: lit ? (lit - more - less) / lit : 0,
    direction: lit ? directionOf(meanChange) : null,
  };
}

export interface Cell extends RegionStats {
  readonly col: number;
  readonly row: number;
  readonly rect: Rect;
  /** Share of the cell's pixels covered by the legend, insets, outlines or wedges. */
  readonly maskedFraction: number;
}

export function cellRect(col: number, row: number): Rect {
  return { x0: col * CELL_SIZE, y0: row * CELL_SIZE, x1: col * CELL_SIZE + CELL_SIZE - 1, y1: row * CELL_SIZE + CELL_SIZE - 1 };
}

export function computeCells(field: PixelField): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const rect = cellRect(col, row);
      const stats = regionStats(field, rect);
      cells.push({ ...stats, col, row, rect, maskedFraction: 1 - stats.mapPixels / (CELL_SIZE * CELL_SIZE) });
    }
  }
  return cells;
}

export interface InsetSummary extends RegionStats {
  readonly id: InsetId;
  readonly name: string;
  readonly region: Rect;
}

/** Statistics of each inset's PARENT region on the map (the inset itself is a duplicate). */
export function insetSummaries(field: PixelField): InsetSummary[] {
  return INSETS.map((inset) => {
    const region = parentRegion(inset);
    return { id: inset.id, name: inset.name, region, ...regionStats(field, region) };
  });
}
