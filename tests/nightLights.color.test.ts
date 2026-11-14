import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chroma, linearToSrgb, luma, oklabToRgb, rgbToOklab, srgbToLinear } from '../src/lib/nightLights/color.ts';

test('sRGB ↔ linear round-trips every 8-bit value', () => {
  for (let v = 0; v <= 255; v++) assert.equal(linearToSrgb(srgbToLinear(v)), v);
});

test('OKLab: white L≈1, black L=0, greys have no chroma', () => {
  assert.ok(Math.abs(rgbToOklab([255, 255, 255])[0] - 1) < 1e-3);
  assert.equal(rgbToOklab([0, 0, 0])[0], 0);
  assert.ok(chroma(rgbToOklab([128, 128, 128])) < 1e-3);
});

test('OKLab round-trips colours', () => {
  for (const c of [[233, 169, 105], [160, 121, 201], [12, 200, 50]] as const) {
    assert.deepEqual(oklabToRgb(rgbToOklab(c)), [...c]);
  }
});

test('luma is 0 for black and 1 for white', () => {
  assert.equal(luma([0, 0, 0]), 0);
  assert.ok(Math.abs(luma([255, 255, 255]) - 1) < 1e-9);
});
