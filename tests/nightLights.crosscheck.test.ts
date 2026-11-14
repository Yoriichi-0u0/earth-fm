// Independent validation of the decade against NASA SVS 5276 (validation/svs5276-crosscheck.json,
// produced by scripts/crosscheck-5276.ts from NASA's own annual stills), plus parameter sensitivity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzePixels, insetSummaries } from '../src/lib/nightLights/analyze.ts';
import { analyzeYear, decadeSeries, decadeTrend, isYearLabel, YEARS, type YearStats } from '../src/lib/nightLights/decade.ts';
import { extractRamp } from '../src/lib/nightLights/legend.ts';
import { loadFixture, loadYearFixture } from './nightLightsFixture.ts';

const check = JSON.parse(readFileSync(new URL('../validation/svs5276-crosscheck.json', import.meta.url), 'utf8'));
const frames = YEARS.map((y) => loadYearFixture(y));
const fields = YEARS.map((y, i) => analyzeYear(frames[i], y));
const still = loadFixture();
const regions = insetSummaries(analyzePixels(still, extractRamp(still)));
const WORLD = { x0: 0, y0: 0, x1: 1023, y1: 287 };
const light = (s: readonly YearStats[]) => s.map((x) => x.light);
const region = (id: string) => regions.find((r) => r.id === id)!.region;

function pearson(a: readonly number[], b: readonly number[]): number {
  const mean = (v: readonly number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0, da = 0, db = 0;
  a.forEach((v, i) => {
    num += (v - ma) * (b[i] - mb);
    da += (v - ma) ** 2;
    db += (b[i] - mb) ** 2;
  });
  return num / Math.sqrt(da * db);
}

test('NASA’s 5276 series runs 2012 → 2023 in frame order (checked against its year-named stills)', () => {
  const o = check.yearOrder;
  assert.ok(o.frame0vs2012 < o.frame0vs2023);
  assert.ok(o.frame11vs2023 < o.frame11vs2012);
  assert.deepEqual(check.years, [...YEARS]);
});

test('world: the EIC decade tracks NASA’s independent 5276 series year by year (r > 0.99) and within 0.1 in the 2023/2012 ratio', () => {
  const eic = light(decadeSeries(fields, WORLD));
  const ind = check.series.world.light as number[];
  assert.ok(pearson(eic, ind) > 0.99, `r = ${pearson(eic, ind)}`);
  assert.ok(Math.abs(eic[11] / eic[0] - ind[11] / ind[0]) < 0.1);
});

test('India: the EIC box tracks NASA’s separate India series (r > 0.95); both brighten by more than 40 %', () => {
  const eic = light(decadeSeries(fields, region('india')));
  const ind = check.series.india.light as number[];
  assert.ok(pearson(eic, ind) > 0.95, `r = ${pearson(eic, ind)}`);
  assert.ok(eic[11] / eic[0] > 1.4 && ind[11] / ind[0] > 1.4);
});

test('the threshold-free measure is stable across noise floors and dark cutoffs', () => {
  for (const options of [{ minLuma: 0.04, noiseFloor: 0.005 }, { minLuma: 0.08, noiseFloor: 0.02 }]) {
    const f = YEARS.map((y, i) => analyzeYear(frames[i], y, isYearLabel, options));
    assert.equal(decadeTrend(decadeSeries(f, WORLD)), 'more');
    assert.equal(decadeTrend(decadeSeries(f, region('india'))), 'more');
    // Western Europe dims by about 10 %, right at the ±10 % decade threshold: always dimmer, never brighter.
    const europe = light(decadeSeries(f, region('western-europe')));
    assert.ok(europe[11] / europe[0] > 0.85 && europe[11] / europe[0] < 0.95, `Western Europe ${europe[11] / europe[0]}`);
    const india = light(decadeSeries(f, region('india')));
    assert.ok(india[11] / india[0] > 1.6 && india[11] / india[0] < 2.2, `India ${india[11] / india[0]}`);
  }
});
