// The legend ramp is read from the image's own legend bar, never invented.
// s = −1 at the orange end ("lights out" / less light), 0 at the whitest sample
// ("no change"), +1 at the purple end ("new lights" / more light).
import { luma, rgbToOklab, type Lab, type RGB } from './color.ts';
import { LEGEND_BAR } from './layout.ts';
import { rgbAt, type Raster } from './raster.ts';

export interface RampSample {
  readonly x: number;
  readonly rgb: RGB;
  readonly lab: Lab;
  /** Signed position along NASA's legend, −1 (orange) … 0 (white) … +1 (purple). */
  readonly s: number;
}

/** Pixels trimmed from each end of the bar (darkened anti-aliased edges). */
export const RAMP_TRIM = 2;
/**
 * Lit dots on the map are drawn at many brightness levels, mostly far dimmer than the
 * legend bar. A colour is therefore matched by its lightness-normalised OKLab chromaticity
 * (a/L, b/L): hue and relative colourfulness, independent of brightness.
 */
export function chromaticity(lab: Lab): readonly [number, number] {
  const L = Math.max(lab[0], 0.05);
  return [lab[1] / L, lab[2] / L];
}

export function extractRamp(r: Raster): RampSample[] {
  const xs: number[] = [];
  for (let x = LEGEND_BAR.x0 + RAMP_TRIM; x <= LEGEND_BAR.x1 - RAMP_TRIM; x++) xs.push(x);
  // Average the bar rows to reduce JPEG noise.
  const rgbs: RGB[] = xs.map((x) => {
    let r0 = 0;
    let g0 = 0;
    let b0 = 0;
    let n = 0;
    for (let y = LEGEND_BAR.y0; y <= LEGEND_BAR.y1; y++) {
      const [a, b, c] = rgbAt(r, x, y);
      r0 += a;
      g0 += b;
      b0 += c;
      n++;
    }
    return [r0 / n, g0 / n, b0 / n];
  });
  let whiteIdx = 0;
  rgbs.forEach((c, i) => {
    if (luma(c) - (Math.max(...c) - Math.min(...c)) / 255 > luma(rgbs[whiteIdx]) - (Math.max(...rgbs[whiteIdx]) - Math.min(...rgbs[whiteIdx])) / 255) whiteIdx = i;
  });
  const last = xs.length - 1;
  return xs.map((x, i) => ({
    x,
    rgb: rgbs[i],
    lab: rgbToOklab(rgbs[i]),
    s: i <= whiteIdx ? (i - whiteIdx) / whiteIdx : (i - whiteIdx) / (last - whiteIdx),
  }));
}

/** Position s of the ramp sample whose chromaticity is nearest to a colour's. */
export function legendPosition(ramp: readonly RampSample[], lab: Lab): number {
  const [pa, pb] = chromaticity(lab);
  let best = ramp[0];
  let bestD = Infinity;
  for (const sample of ramp) {
    const [sa, sb] = chromaticity(sample.lab);
    const d = (pa - sa) ** 2 + (pb - sb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = sample;
    }
  }
  return best.s;
}
