import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { analyzePixels, cellRect, COLS, computeCells, insetSummaries, ROWS } from '../src/lib/nightLights/analyze.ts';
import { luma } from '../src/lib/nightLights/color.ts';
import {
  analyzeYear,
  decadeSeries,
  decadeStep,
  decadeTrend,
  DECADE_START_STEP,
  isYearLabel,
  SMALL_PLACE_PIXELS,
  startLight,
  STEPS_PER_DOUBLING,
  YEAR_LABEL,
  yearDirection,
  yearPlan,
  YEARS,
  type YearStats,
} from '../src/lib/nightLights/decade.ts';
import { extractRamp } from '../src/lib/nightLights/legend.ts';
import { rgbAt } from '../src/lib/nightLights/raster.ts';
import { loadFixture, loadYearFixture } from './nightLightsFixture.ts';

const frames = YEARS.map((y) => loadYearFixture(y));
const fields = YEARS.map((y, i) => analyzeYear(frames[i], y));
const still = loadFixture();
const changeField = analyzePixels(still, extractRamp(still));
const regions = insetSummaries(changeField);

test('the 12 served frames match their provenance hashes', () => {
  const prov = JSON.parse(readFileSync(new URL('../public/nasa/svs5313/decade/provenance.json', import.meta.url), 'utf8'));
  for (const y of YEARS) {
    const bytes = readFileSync(new URL(`../public/nasa/svs5313/decade/${y}.jpg`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), prov.frames[y].sha256, `${y}`);
    assert.equal(bytes.length, prov.frames[y].bytes);
  }
});

test('every frame is 1024 × 288 and its year label lies inside the masked rectangle', () => {
  for (const f of frames) {
    assert.equal(f.width, 1024);
    assert.equal(f.height, 288);
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 120; y < 180; y++) {
      for (let x = 480; x < 620; x++) {
        const [r, g, b] = rgbAt(f, x, y);
        if (luma([r, g, b]) > 0.18 && Math.max(r, g, b) - Math.min(r, g, b) < 25) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
    }
    assert.ok(x1 > 0, 'label found');
    assert.ok(x0 >= YEAR_LABEL.x0 - 1 && x1 <= YEAR_LABEL.x1 + 1 && y0 >= YEAR_LABEL.y0 - 1 && y1 <= YEAR_LABEL.y1 + 1, `label ${x0},${y0}–${x1},${y1}`);
    assert.ok(isYearLabel(542, 147));
  }
});

test('the year label is never counted as light', () => {
  for (const f of fields) for (let y = 140; y <= 155; y++) for (let x = 527; x <= 557; x++) assert.equal(f.light[y * 1024 + x], 0);
});

const regionSeries = (id: string) => decadeSeries(fields, regions.find((r) => r.id === id)!.region);

const ratio = (s: readonly YearStats[]) => s[11].light / s[0].light;

test('India brightens and Western Europe dims, as NASA’s change map says (figures pinned for LIMITATIONS.md)', () => {
  const india = regionSeries('india');
  const europe = regionSeries('western-europe');
  assert.equal(decadeTrend(india), 'more');
  assert.equal(decadeTrend(europe), 'less');
  for (const id of ['india', 'western-europe'] as const) assert.equal(decadeTrend(regionSeries(id)), regions.find((r) => r.id === id)!.direction, id);
  assert.ok(Math.abs(ratio(india) - 1.83) < 0.01, `India ${ratio(india)}`);
  assert.ok(Math.abs(ratio(europe) - 0.89) < 0.01, `Western Europe ${ratio(europe)}`);
  const world = decadeSeries(fields, { x0: 0, y0: 0, x1: 1023, y1: 287 });
  assert.ok(Math.abs(ratio(world) - 1.24) < 0.01, `world ${ratio(world)}`);
});

test('Ukraine’s and the Eastern Mediterranean’s boxes are too small for a reliable decade reading', () => {
  for (const id of ['ukraine', 'eastern-mediterranean'] as const) {
    assert.ok(regionSeries(id)[0].mapPixels < SMALL_PLACE_PIXELS, id);
  }
  for (const id of ['india', 'western-europe'] as const) assert.ok(regionSeries(id)[0].mapPixels >= SMALL_PLACE_PIXELS, id);
  // Documented disagreements at this scale: both boxes read brighter while the change map reads less / little change.
  assert.equal(decadeTrend(regionSeries('ukraine')), 'more');
  assert.equal(decadeTrend(regionSeries('eastern-mediterranean')), 'more');
});

test('cell-by-cell comparison with the change map matches the figures in LIMITATIONS.md', () => {
  const cells = computeCells(changeField);
  let same = 0, nearly = 0, opposite = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const c = cells[row * COLS + col];
      const t = decadeTrend(decadeSeries(fields, cellRect(col, row)));
      if (!c.direction || !t || c.maskedFraction > 0.5) continue;
      if (c.direction === t) same++;
      else if (c.direction === 'steady' || t === 'steady') nearly++;
      else opposite++;
    }
  }
  assert.deepEqual({ same, nearly, opposite }, { same: 13, nearly: 7, opposite: 4 });
});

test('pitch: the first lit year is A3; twice the light is one octave (5 steps) higher; half is one lower', () => {
  assert.equal(decadeStep(2, 2), DECADE_START_STEP);
  assert.equal(decadeStep(4, 2), DECADE_START_STEP + STEPS_PER_DOUBLING);
  assert.equal(decadeStep(1, 2), DECADE_START_STEP - STEPS_PER_DOUBLING);
  assert.equal(decadeStep(0, 2), null);
  assert.equal(decadeStep(1000, 1), 15, 'clamped to the top of the scale');
  const india = regionSeries('india');
  const steps = india.map((s) => decadeStep(s.light, startLight(india)));
  assert.equal(steps[0], DECADE_START_STEP);
  assert.equal(steps[11]! - steps[0]!, 4, 'India ends four scale steps (most of an octave) higher: 1.83× the light');
  const europe = regionSeries('western-europe');
  const e = europe.map((s) => decadeStep(s.light, startLight(europe)));
  assert.ok(e[11]! < e[0]!, 'Western Europe ends lower');
});

test('years with nothing above the base map are rests; year-on-year direction uses a ±5 % band', () => {
  const dark: YearStats = { year: 2023, mapPixels: 100, litPixels: 0, litFraction: 0, light: 0 };
  assert.equal(yearPlan(dark, 5, 'less', 800), null);
  const a: YearStats = { year: 2012, mapPixels: 100, litPixels: 10, litFraction: 0.1, light: 10 };
  assert.equal(yearDirection(undefined, a), 'steady');
  assert.equal(yearDirection(a, { ...a, light: 10.4 }), 'steady');
  assert.equal(yearDirection(a, { ...a, light: 10.6 }), 'more');
  assert.equal(yearDirection(a, { ...a, light: 9.4 }), 'less');
  const plan = yearPlan({ ...a, light: 20 }, 10, 'more', 512)!;
  assert.equal(plan.notes.length, 1);
  assert.ok(Math.abs(plan.notes[0].hz - 440) < 0.01, 'twice the light → A4');
});

import { beatMs, beatPosition, clampBpm, rhythmPlan, ACCENT_GAIN } from '../src/lib/nightLights/decade.ts';

test('tempo and meter change timing and accents only, never pitch', () => {
  assert.equal(beatMs(120), 500, 'the default tempo keeps half a second per year');
  assert.equal(beatMs(60), 1000);
  assert.equal(clampBpm(10), 60);
  assert.equal(clampBpm(999), 180);
  assert.deepEqual([0, 1, 2, 3].map((i) => beatPosition(i, 3)), [
    { bar: 1, beat: 1, downbeat: true }, { bar: 1, beat: 2, downbeat: false }, { bar: 1, beat: 3, downbeat: false }, { bar: 2, beat: 1, downbeat: true },
  ]);
  const base = yearPlan({ year: 2012, mapPixels: 100, litPixels: 5, litFraction: 0.05, light: 20 }, 10, 'more', 512)!;
  for (const bpm of [60, 120, 180]) {
    for (const downbeat of [true, false]) {
      const p = rhythmPlan(base, downbeat, bpm);
      assert.deepEqual(p.notes.map((n) => n.hz), base.notes.map((n) => n.hz), 'same pitch');
      assert.ok(p.notes.every((n) => n.duration <= (beatMs(bpm) / 1000) * 0.7 + 1e-9), 'fits the beat');
      assert.equal(p.gain, downbeat ? Math.min(1, base.gain * ACCENT_GAIN) : base.gain);
    }
  }
});
