import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './nightLightsFixture.ts';
import { extractRamp } from '../src/lib/nightLights/legend.ts';
import { analyzePixels, classifyPixel, computeCells, COLS, insetSummaries, ROWS } from '../src/lib/nightLights/analyze.ts';
import type { Raster } from '../src/lib/nightLights/raster.ts';

const raster = loadFixture();
const ramp = extractRamp(raster);

function solid(rgb: [number, number, number]): Raster {
  const data = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < 256; i++) data.set([...rgb, 255], i * 4);
  return { width: 16, height: 16, data };
}

test('ocean, grey land, ice and Antarctica are unlit', () => {
  for (const rgb of [[0, 1, 6], [35, 36, 31], [48, 48, 48], [70, 70, 70], [58, 48, 40]] as [number, number, number][]) {
    assert.equal(classifyPixel(solid(rgb), ramp, 8, 8), null, rgb.join(','));
  }
  // On the pinned file: open Pacific, Antarctica.
  assert.equal(classifyPixel(raster, ramp, 700, 250), null);
  assert.equal(classifyPixel(raster, ramp, 100, 280), null);
});

test('bright legend-coloured pixels are lit with the right direction', () => {
  assert.ok(classifyPixel(solid([233, 169, 105]), ramp, 8, 8)! < -0.8);
  assert.ok(classifyPixel(solid([160, 121, 201]), ramp, 8, 8)! > 0.8);
});

test('cell statistics are deterministic and cover a 32 × 9 grid', () => {
  const a = computeCells(analyzePixels(raster, ramp));
  const b = computeCells(analyzePixels(raster, ramp));
  assert.equal(COLS, 32);
  assert.equal(ROWS, 9);
  assert.equal(a.length, 288);
  assert.deepEqual(a, b);
});

test('parent regions: Western Europe reads as less light, India as more light', () => {
  const s = Object.fromEntries(insetSummaries(analyzePixels(raster, ramp)).map((x) => [x.id, x]));
  assert.equal(s['western-europe'].direction, 'less');
  assert.equal(s['india'].direction, 'more');
  assert.ok(s['india'].shareMore > 0.8);
  assert.ok(s['western-europe'].shareLess > 0.6);
});
