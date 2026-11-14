import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './nightLightsFixture.ts';
import { extractRamp, legendPosition } from '../src/lib/nightLights/legend.ts';
import { rgbToOklab } from '../src/lib/nightLights/color.ts';

const ramp = extractRamp(loadFixture());

test('ramp read from the pinned legend: orange left, white near the centre, purple right', () => {
  const first = ramp[0].rgb;
  const last = ramp[ramp.length - 1].rgb;
  assert.ok(first[0] > first[2] + 80, 'left end is orange (red ≫ blue)');
  assert.ok(last[2] > last[1] + 50, 'right end is purple (blue ≫ green)');
  const white = ramp.find((s) => s.s === 0)!;
  assert.ok(white.x >= 536 && white.x <= 548, `white at x=${white.x}`);
  assert.ok(Math.min(...white.rgb) > 235);
});

test('positions run monotonically from −1 to +1', () => {
  assert.equal(ramp[0].s, -1);
  assert.equal(ramp[ramp.length - 1].s, 1);
  for (let i = 1; i < ramp.length; i++) assert.ok(ramp[i].s > ramp[i - 1].s);
});

test('orange, white and purple colours map to about −1, 0 and +1', () => {
  assert.ok(legendPosition(ramp, rgbToOklab([233, 169, 105])) < -0.8);
  assert.ok(Math.abs(legendPosition(ramp, rgbToOklab([252, 252, 252]))) < 0.15);
  assert.ok(legendPosition(ramp, rgbToOklab([160, 121, 201])) > 0.8);
});

test('dim versions of legend colours keep their direction', () => {
  assert.ok(legendPosition(ramp, rgbToOklab([81, 59, 35])) < -0.15, 'dim orange → less');
  assert.ok(legendPosition(ramp, rgbToOklab([69, 56, 84])) > 0.15, 'dim purple → more');
});
