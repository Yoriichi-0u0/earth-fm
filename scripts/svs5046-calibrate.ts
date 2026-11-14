// Fit the globe inside NASA SVS 5046's fixed camera: radius from the rendered silhouette (alpha), then pole tilt,
// longitude origin and handedness by matching Natural Earth land to the July 2024 frame's land and ocean colours.
// Usage: npx tsx scripts/svs5046-calibrate.ts   (prints the GLOBE constant for src/lib/arcticIce/projection.ts)
import { readFileSync } from 'node:fs';
import { decodePng } from '../tests/airFixture.ts';
import { pixelToLatLon, pixelToWorld } from '../src/lib/arcticIce/projection.ts';
import type { Globe } from '../src/lib/arcticIce/projection.ts';
import { isLand, rasterLand } from '../src/lib/arcticIce/landMask.ts';
import { surfaceClass } from '../src/lib/arcticIce/classify.ts';

const world = JSON.parse(readFileSync(new URL('../src/data/world.json', import.meta.url), 'utf8'));
const grid = rasterLand(world.coastlines);
const july = decodePng(readFileSync(new URL('../validation/svs5046/2024-07-15.png', import.meta.url)));
const { width: W, height: H, data } = july;

// 1. Radius: the sphere that best reproduces NASA's alpha silhouette.
function iou(radius: number) {
  let both = 0, either = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const a = data[(y * W + x) * 4 + 3] > 127, b = pixelToWorld(x, y, W, H, { radius, tiltX: 0, tiltY: 0, lonOffset: 0, mirror: 1 }) !== null;
    if (a && b) both++; if (a || b) either++;
  }
  return both / either;
}
let radius = 30, best = 0;
for (let r = 20; r <= 90; r += 0.5) { const s = iou(r); if (s > best) { best = s; radius = r; } }
for (let r = radius - 0.5; r <= radius + 0.5; r += 0.02) { const s = iou(r); if (s > best) { best = s; radius = r; } }
console.log(`radius ${radius.toFixed(2)}  silhouette IoU ${best.toFixed(4)}`);

// 2. Orientation: confident land (vegetation, bare ground) and open ocean pixels vote against Natural Earth.
const samples: { x: number; y: number; land: boolean }[] = [];
for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
  const i = (y * W + x) * 4; if (data[i + 3] < 250) continue;
  const c = surfaceClass(data[i], data[i + 1], data[i + 2]);
  if (c === 'ocean' || c === 'land') samples.push({ x, y, land: c === 'land' });
}
function score(g: Globe) {
  let ok = 0, n = 0;
  for (const s of samples) { const p = pixelToLatLon(s.x, s.y, W, H, g); if (!p || p.lat < 25) continue; n++; if (isLand(grid, p.lat, p.lon) === s.land) ok++; }
  return n ? ok / n : 0;
}
let globe: Globe = { radius, tiltX: 0, tiltY: 0, lonOffset: 0, mirror: 1 }, top = 0;
for (const mirror of [1, -1] as const) for (let tx = -20; tx <= 20; tx += 4) for (let ty = -20; ty <= 20; ty += 4) for (let lo = 0; lo < 360; lo += 6) {
  const g = { radius, tiltX: tx, tiltY: ty, lonOffset: lo - 180, mirror }, s = score(g);
  if (s > top) { top = s; globe = g; }
}
for (const step of [1, 0.25, 0.05]) {
  let improved = true;
  while (improved) {
    improved = false;
    for (const key of ['tiltX', 'tiltY', 'lonOffset'] as const) for (const delta of [-step, step]) {
      const g = { ...globe, [key]: globe[key] + delta }, s = score(g);
      if (s > top) { top = s; globe = g; improved = true; }
    }
  }
}
console.log(`samples ${samples.length}  land/ocean agreement ${(top * 100).toFixed(2)}%`);
console.log(`export const GLOBE: Globe = {radius: ${globe.radius.toFixed(2)}, tiltX: ${globe.tiltX.toFixed(2)}, tiltY: ${globe.tiltY.toFixed(2)}, lonOffset: ${globe.lonOffset.toFixed(2)}, mirror: ${globe.mirror}};`);
