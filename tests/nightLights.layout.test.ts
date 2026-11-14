import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { JPEG_PATH, loadFixture } from './nightLightsFixture.ts';
import { detectLegend, refineFrame } from '../src/lib/nightLights/layout-detect.ts';
import { INSETS, LAYOUT_SEEDS, LEGEND_BAR, LEGEND_BOX, maskReason, parentRegion } from '../src/lib/nightLights/layout.ts';
import { extractRamp } from '../src/lib/nightLights/legend.ts';
import { analyzePixels, regionStats } from '../src/lib/nightLights/analyze.ts';

const raster = loadFixture();
const field = analyzePixels(raster, extractRamp(raster));
const provenance = JSON.parse(readFileSync(new URL('../public/nasa/svs5313/svs5313.provenance.json', import.meta.url), 'utf8'));

test('the served NASA file matches the recorded bytes and SHA-256', () => {
  const bytes = readFileSync(JPEG_PATH);
  assert.equal(bytes.length, provenance.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), provenance.sha256);
  assert.equal(raster.width, 1024);
  assert.equal(raster.height, 288);
});

test('detection on the pinned file still agrees with the frozen rectangles (±1 px)', () => {
  for (const inset of INSETS) {
    const seed = LAYOUT_SEEDS.insets.find((s) => s.id === inset.id)!;
    for (const [found, frozen] of [
      [refineFrame(raster, seed.frame), inset.frame],
      [refineFrame(raster, seed.parent, 4), inset.parent],
    ] as const) {
      for (const k of ['x0', 'y0', 'x1', 'y1'] as const) assert.ok(Math.abs(found[k] - frozen[k]) <= 1, `${inset.id} ${k}`);
    }
  }
  const legend = detectLegend(raster, LAYOUT_SEEDS.legendWindow);
  for (const k of ['x0', 'y0', 'x1', 'y1'] as const) {
    assert.ok(Math.abs(legend.bar[k] - LEGEND_BAR[k]) <= 1, `bar ${k}`);
    assert.ok(Math.abs(legend.box[k] - LEGEND_BOX[k]) <= 1, `box ${k}`);
  }
});

test('legend bar colours fall inside the legend mask', () => {
  for (let y = LEGEND_BAR.y0; y <= LEGEND_BAR.y1; y++) {
    for (let x = LEGEND_BAR.x0; x <= LEGEND_BAR.x1; x++) assert.equal(maskReason(x, y), 'legend');
  }
});

test('inset frames, labels and contents are masked', () => {
  for (const inset of INSETS) {
    const f = inset.frame;
    for (const [x, y] of [[f.x0, f.y0], [f.x1, f.y1], [(f.x0 + f.x1) >> 1, (f.y0 + f.y1) >> 1], [f.x0 + 10, f.y0 + 5], [f.x1 - 10, f.y0 + 5]]) {
      assert.equal(maskReason(x, y), 'inset', `${inset.id} ${x},${y}`);
    }
  }
});

test('parent-box outlines and connector wedges are masked, parent interiors are map', () => {
  for (const inset of INSETS) {
    const p = inset.parent;
    assert.equal(maskReason(p.x0, (p.y0 + p.y1) >> 1), 'parent-outline');
    const r = parentRegion(inset);
    assert.equal(maskReason((r.x0 + r.x1) >> 1, (r.y0 + r.y1) >> 1), null);
  }
  assert.equal(maskReason(240, 93), 'connector'); // Western Europe wedge
  assert.equal(maskReason(306, 92), 'connector'); // Eastern Mediterranean wedge
  assert.equal(maskReason(773, 65), 'connector'); // Ukraine wedge
  assert.equal(maskReason(870, 137), 'connector'); // India wedge
});

test('masked pixels never get a class', () => {
  let maskedLit = 0;
  let masked = 0;
  for (let i = 0; i < field.masked.length; i++) {
    if (field.masked[i]) {
      masked++;
      if (!Number.isNaN(field.s[i])) maskedLit++;
    }
  }
  assert.ok(masked > 50_000);
  assert.equal(maskedLit, 0);
});

test('each inset’s parent region on the map contains lit pixels', () => {
  for (const inset of INSETS) {
    const stats = regionStats(field, parentRegion(inset));
    assert.ok(stats.litPixels > 0, inset.id);
  }
});
