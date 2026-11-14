// Programmatic detection of the overlay graphics drawn on top of the SVS 5313 map:
// inset frames, the small parent-region boxes they magnify, and the legend.
// It runs on the pinned file in unit tests; the app uses the frozen constants in layout.ts.
import { luma, type RGB } from './color.ts';
import { rgbAt, type Raster, type Rect } from './raster.ts';

/** Luma of a low-chroma (grey or white) pixel; 0 for coloured pixels. Frame lines are grey. */
function greyLuma(rgb: RGB): number {
  const spread = Math.max(...rgb) - Math.min(...rgb);
  return spread <= 28 ? luma(rgb) : 0;
}

function lineScore(r: Raster, horizontal: boolean, at: number, from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (let t = from; t <= to; t++) {
    const p = (o: number) => {
      const x = horizontal ? t : at + o;
      const y = horizontal ? at + o : t;
      if (x < 0 || y < 0 || x >= r.width || y >= r.height) return 0;
      return greyLuma(rgbAt(r, x, y));
    };
    sum += p(0) - 0.5 * (p(-2) + p(2));
    n++;
  }
  return n ? sum / n : 0;
}

/** Move each edge of a seed rectangle (within ±search px) to the strongest grey line. */
export function refineFrame(r: Raster, seed: Rect, search = 6): Rect {
  const best = (horizontal: boolean, centre: number, from: number, to: number) => {
    let at = centre;
    let score = -Infinity;
    for (let c = centre - search; c <= centre + search; c++) {
      const s = lineScore(r, horizontal, c, from, to);
      if (s > score) {
        score = s;
        at = c;
      }
    }
    return at;
  };
  const inset = 3;
  return {
    y0: best(true, seed.y0, seed.x0 + inset, seed.x1 - inset),
    y1: best(true, seed.y1, seed.x0 + inset, seed.x1 - inset),
    x0: best(false, seed.x0, seed.y0 + inset, seed.y1 - inset),
    x1: best(false, seed.x1, seed.y0 + inset, seed.y1 - inset),
  };
}

export interface DetectedLegend {
  /** Bright colour bar (orange → white → purple). */
  readonly bar: Rect;
  /** Bounding box of every non-background pixel around the bar: title, bar, tick labels. */
  readonly box: Rect;
}

/** Find the legend bar as the rows holding a long run of bright pixels inside a search window. */
export function detectLegend(r: Raster, window: Rect): DetectedLegend {
  let bar: { x0: number; y0: number; x1: number; y1: number } | null = null;
  for (let y = window.y0; y <= window.y1; y++) {
    let start = -1;
    for (let x = window.x0; x <= window.x1 + 1; x++) {
      const on = x <= window.x1 && luma(rgbAt(r, x, y)) > 0.45;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        if (x - start >= 60) {
          bar = bar
            ? { x0: Math.min(bar.x0, start), x1: Math.max(bar.x1, x - 1), y0: bar.y0, y1: y }
            : { x0: start, x1: x - 1, y0: y, y1: y };
        }
        start = -1;
      }
    }
  }
  if (!bar) throw new Error('legend bar not found');
  const around = { x0: bar.x0 - 25, x1: bar.x1 + 25, y0: bar.y0 - 12, y1: bar.y1 + 12 };
  const box = { x0: bar.x0, y0: bar.y0, x1: bar.x1, y1: bar.y1 };
  for (let y = around.y0; y <= around.y1; y++) {
    for (let x = around.x0; x <= around.x1; x++) {
      if (luma(rgbAt(r, x, y)) > 0.08) {
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
      }
    }
  }
  return { bar, box };
}
