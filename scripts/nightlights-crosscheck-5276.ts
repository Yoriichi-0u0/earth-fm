// Independent cross-check of the decade against NASA SVS 5276 (the original, non-EIC version
// of the same visualization), which publishes its annual averages as separate 12-frame series:
// the whole world (7680 × 4320), India (3840 × 2160) and Ukraine (3840 × 2160).
//
// Usage: node scripts/nightlights-crosscheck-5276.ts /path/to/svs5276-files   (needs ffmpeg)
// Writes validation/svs5276-crosscheck.json. The unit tests compare it with the decade
// TerraJuke reads from the EIC frames; they do not need ffmpeg or the source files.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { analyzeYear, DECADE_MIN_LUMA, DECADE_NOISE_FLOOR, YEARS } from '../src/lib/nightLights/decade.ts';
import { luma } from '../src/lib/nightLights/color.ts';
import type { Raster, Rect } from '../src/lib/nightLights/raster.ts';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/nightlights-crosscheck-5276.ts <dir with the SVS 5276 files>');
const BASE = 'https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005276/';

function source(file: string) {
  const bytes = readFileSync(`${dir}/${file}`);
  return { file, url: BASE + file, bytes: statSync(`${dir}/${file}`).size, sha256: createHash('sha256').update(bytes).digest('hex') };
}

function frames(file: string, w: number, h: number): Raster[] {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', `${dir}/${file}`, '-vf', `scale=${w}:${h}:flags=area`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  const n = w * h * 3;
  const out: Raster[] = [];
  for (let f = 0; f < raw.length / n; f++) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = raw[f * n + i * 3];
      data[i * 4 + 1] = raw[f * n + i * 3 + 1];
      data[i * 4 + 2] = raw[f * n + i * 3 + 2];
      data[i * 4 + 3] = 255;
    }
    out.push({ width: w, height: h, data });
  }
  return out;
}

/** NASA prints the year on each frame: find the bright neutral text inside a search box (fractions of the frame). */
function findLabel(r: Raster, box: [number, number, number, number]): Rect {
  const [fx0, fy0, fx1, fy1] = box;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = Math.floor(fy0 * r.height); y < fy1 * r.height; y++) {
    for (let x = Math.floor(fx0 * r.width); x < fx1 * r.width; x++) {
      const i = (y * r.width + x) * 4;
      const [R, G, B] = [r.data[i], r.data[i + 1], r.data[i + 2]];
      if (luma([R, G, B]) > 0.25 && Math.max(R, G, B) - Math.min(R, G, B) < 14) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) throw new Error('year label not found');
  return { x0: x0 - 4, y0: y0 - 4, x1: x1 + 4, y1: y1 + 4 };
}

function meanAbsDiff(a: Raster, b: Raster): number {
  let s = 0;
  for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  return s / (a.data.length / 4) / 3;
}

const SERIES = {
  world: { file: 'nightlights_flat_series_stills_8k_4320p3_h265.mp4', w: 720, h: 405, label: [0.38, 0.58, 0.5, 0.68] as [number, number, number, number] },
  india: { file: 'nightlights_flat_series_stills_india_2160p3_h265.mp4', w: 960, h: 540, label: [0.28, 0.62, 0.4, 0.72] as [number, number, number, number] },
  ukraine: { file: 'nightlights_flat_series_stills_ukraine_2160p3_h265.mp4', w: 960, h: 540, label: [0.44, 0.84, 0.58, 0.95] as [number, number, number, number] },
};

const result: Record<string, unknown> = {};
for (const [name, s] of Object.entries(SERIES)) {
  const fr = frames(s.file, s.w, s.h);
  if (fr.length !== 12) throw new Error(`${s.file}: expected 12 frames, got ${fr.length}`);
  const labels = fr.map((r) => findLabel(r, s.label));
  const light = fr.map((r, i) => {
    const L = labels[i];
    const f = analyzeYear(r, YEARS[i], (x, y) => x >= L.x0 && x <= L.x1 && y >= L.y0 && y <= L.y1);
    let sum = 0;
    for (const v of f.light) sum += v;
    return Number(sum.toFixed(3));
  });
  result[name] = { source: source(s.file), scale: [s.w, s.h], yearLabels: labels, light };
}

// The frame order is the year order: frame 0 matches NASA's year-named 2012 still, frame 11 the 2023 still.
const world = frames(SERIES.world.file, 720, 405);
const still2012 = frames('nightlights_flat_series_stills_8k_compare.02012.jpg', 720, 405)[0];
const still2023 = frames('nightlights_flat_series_stills_8k_compare.02023.jpg', 720, 405)[0];
const order = {
  stills: [source('nightlights_flat_series_stills_8k_compare.02012.jpg'), source('nightlights_flat_series_stills_8k_compare.02023.jpg')],
  frame0vs2012: Number(meanAbsDiff(world[0], still2012).toFixed(3)),
  frame0vs2023: Number(meanAbsDiff(world[0], still2023).toFixed(3)),
  frame11vs2012: Number(meanAbsDiff(world[11], still2012).toFixed(3)),
  frame11vs2023: Number(meanAbsDiff(world[11], still2023).toFixed(3)),
};

writeFileSync(
  new URL('../validation/svs5276-crosscheck.json', import.meta.url),
  JSON.stringify(
    {
      title: 'Independent cross-check: NASA SVS 5276 annual night-light stills, 2012–2023',
      page: 'https://svs.gsfc.nasa.gov/5276',
      method: `Each 12-frame series is scaled with area averaging, NASA's printed year is masked (detected per frame), and src/lib/nightLights/decade.ts analyzeYear() sums every pixel's luma above its 7 × 7 median (pixels darker than ${DECADE_MIN_LUMA} skipped; excess at or below ${DECADE_NOISE_FLOOR} treated as noise), exactly as for the EIC frames.`,
      years: YEARS,
      yearOrder: order,
      series: result,
    },
    null,
    2,
  ) + '\n',
);
console.log('wrote validation/svs5276-crosscheck.json', order);
