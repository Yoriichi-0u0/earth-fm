import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzePixels, insetSummaries } from '../src/lib/nightLights/analyze.ts';
import { analyzeYear, YEARS } from '../src/lib/nightLights/decade.ts';
import { extractRamp } from '../src/lib/nightLights/legend.ts';
import { chooseMystery, mysteryPool, revealSentence, type MysteryCandidate } from '../src/lib/nightLights/mysteryPlace.ts';
import { loadFixture, loadYearFixture } from './nightLightsFixture.ts';

const fields = YEARS.map((y) => analyzeYear(loadYearFixture(y), y));
const still = loadFixture();
const regions = insetSummaries(analyzePixels(still, extractRamp(still)));
const candidates: MysteryCandidate[] = [
  { id: 'world', label: 'The whole map', rect: { x0: 0, y0: 0, x1: 1023, y1: 287 }, change: 'more' },
  ...regions.map((r) => ({ id: r.id, label: `${r.name} map region`, rect: r.region, change: r.direction })),
];
const pool = mysteryPool(candidates, fields);
const by = (id: string) => pool.find((p) => p.id === id)!;

test('the pool keeps only places with reliable decade readings: whole map, India, Western Europe', () => {
  assert.deepEqual(pool.map((p) => p.id).sort(), ['india', 'western-europe', 'world']);
  assert.equal(by('india').trend, 'more');
  assert.equal(by('western-europe').trend, 'less');
  assert.equal(by('world').trend, 'more');
  assert.ok(by('india').ratio > by('world').ratio, 'India brightens more than the map as a whole');
});

test('a mystery never repeats the previous round and rejects invalid draws', () => {
  for (const previous of pool) {
    const picks = [0, 0.5, 0.999999].map((d) => chooseMystery(pool, previous.id, () => d).id);
    assert.ok(picks.every((id) => id !== previous.id));
    assert.equal(new Set(picks).size, pool.length - 1);
  }
  for (const bad of [NaN, Infinity, -0.1, 1]) assert.throws(() => chooseMystery(pool, undefined, () => bad), RangeError);
  assert.throws(() => chooseMystery([pool[0]], pool[0].id, () => 0), RangeError);
});

test('the reveal names the place, answers the guess and explains the clue in the sound', () => {
  const india = by('india');
  assert.match(revealSentence(india, india), /^Yes: it was India map region\. Its brightness in 2023 was 1\.8× that of 2012, so you heard a melody that climbs\. NASA’s change map closes the record with more light\.$/);
  assert.match(revealSentence(india, by('western-europe')), /^It was India map region, not Western Europe map region\./);
  assert.match(revealSentence(by('western-europe')), /^It was Western Europe map region\. .*a melody that steps down\. .*less light\.$/);
});
