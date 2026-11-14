import type { RGB } from './color.ts';

/** RGBA pixels, row-major, as in a canvas ImageData. */
export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
}

export function rgbAt(r: Raster, x: number, y: number): RGB {
  const i = (y * r.width + x) * 4;
  return [r.data[i], r.data[i + 1], r.data[i + 2]];
}

/** Inclusive pixel rectangle. */
export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export function inRect(rect: Rect, x: number, y: number, pad = 0): boolean {
  return x >= rect.x0 - pad && x <= rect.x1 + pad && y >= rect.y0 - pad && y <= rect.y1 + pad;
}

export function shrink(rect: Rect, by: number): Rect {
  return { x0: rect.x0 + by, y0: rect.y0 + by, x1: rect.x1 - by, y1: rect.y1 - by };
}
