import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { decodePng } from './airFixture.ts';
import { BANDS, COLS, HEIGHT, ROWS, WIDTH, analyzeOcean, cellAt, poleToPole, readColorbar, readWindow, tempAtColumn, temperatureOf } from '../src/lib/ocean/analyze.ts';
import { NOTES, degreeFor, midiFor, noteFor, stepSeconds } from '../src/lib/ocean/sonify.ts';
import { bandCaption, cellCaption, feel } from '../src/lib/ocean/describe.ts';

const png = (name: string) => decodePng(readFileSync(new URL(`../public/nasa/svs3912/${name}`, import.meta.url)));
const bar = readColorbar(png('svs3912_sst_cbar.png'));
const field = analyzeOcean(png('svs3912_analysis_1024x512.png'), bar);

test('NASA’s colour bar is read as a linear 0–32 °C scale whose ticks sit where NASA printed them', () => {
  assert.equal(bar.length, 278);
  assert.ok(Math.abs(tempAtColumn(100) - 10) < 0.1 && Math.abs(tempAtColumn(188) - 20) < 0.1);
  assert.ok(bar[0].t < 0.2 && bar.at(-1)!.t > 31.8);
});

test('every colour on NASA’s bar reads back as its own temperature; grey land, black and white do not', () => {
  const img = png('svs3912_sst_cbar.png');
  let worst = 0;
  for (let x = 16; x <= 289; x++) {
    const i = (47 * img.width + x) * 4, t = temperatureOf([img.data[i], img.data[i + 1], img.data[i + 2]], bar);
    worst = Math.max(worst, Math.abs(t - tempAtColumn(x)));
  }
  assert.ok(worst < 1.2, `worst round-trip error ${worst.toFixed(2)} °C`);
  for (const rgb of [[64, 64, 64], [0, 0, 0], [255, 255, 255], [90, 92, 90]] as const) assert.ok(Number.isNaN(temperatureOf(rgb, bar)), String(rgb));
});

test('the readings are physically sensible for June 2007 and pinned', () => {
  assert.equal(field.width, WIDTH); assert.equal(field.height, HEIGHT);
  const warmPool = readWindow(field, 130, -5, 170, 10), coldTongue = readWindow(field, -120, -3, -90, 3);
  const gulf = readWindow(field, -75, 33, -60, 40), labrador = readWindow(field, -60, 52, -48, 62), southern = readWindow(field, -180, -65, 180, -55);
  assert.ok(Math.abs(warmPool.median - 29.5) < 0.4, `warm pool ${warmPool.median}`);
  assert.ok(Math.abs(labrador.median - 2.8) < 0.6, `Labrador ${labrador.median}`);
  assert.ok(Math.abs(southern.median - 3.0) < 0.5, `Southern Ocean ${southern.median}`);
  assert.ok(warmPool.median - coldTongue.median > 3, 'the eastern Pacific cold tongue is cooler than the western warm pool');
  assert.ok(gulf.median - labrador.median > 15, 'the Gulf Stream is far warmer than the Labrador Sea');
  assert.ok(warmPool.warmLon! > 130 && warmPool.warmLon! < 170);
});

test('pole to pole: 48 bands, warmest near the equator, cooling toward both poles', () => {
  const bands = poleToPole(field);
  assert.equal(bands.length, BANDS);
  const m = bands.map((b) => b.reading.median);
  const warmest = m.indexOf(Math.max(...m)), warmLat = (bands[warmest].lat0 + bands[warmest].lat1) / 2;
  assert.ok(Math.abs(warmLat) < 20, `warmest band at ${warmLat}`);
  const decade = (lat: number) => readWindow(field, -180, lat - 10, 180, lat).median;
  for (const lat of [70, 60, 50, 40, 30, 20]) assert.ok(decade(lat) < decade(lat - 10) + 0.5, `north: ${lat}`);
  for (const lat of [-10, -20, -30, -40, -50]) assert.ok(decade(lat) > decade(lat - 10) - 0.5, `south: ${lat}`);
  assert.ok(bands.every((b) => b.reading.n >= 30), 'every band has open-ocean traces');
});

test('touch the ocean: cells over land are silent, cells over sea read a temperature', () => {
  const sahara = cellAt(field, Math.floor((10 + 180) / (360 / COLS)), Math.floor((90 - 22) / (180 / ROWS)));
  assert.equal(sahara.reading.n < 30, true, 'the Sahara has no current traces');
  assert.equal(noteFor(sahara.reading), null);
  const pacific = cellAt(field, Math.floor((150 + 180) / (360 / COLS)), Math.floor((90 - 2) / (180 / ROWS)));
  assert.ok(pacific.reading.median > 27, `equatorial Pacific ${pacific.reading.median}`);
  assert.ok(noteFor(pacific.reading));
});

test('fixed sound rules: pentatonic pitch rises with temperature in 2 °C steps; tempo never changes a note', () => {
  assert.equal(NOTES, 16);
  assert.equal(degreeFor(-3), 0); assert.equal(degreeFor(0), 0); assert.equal(degreeFor(1.99), 0); assert.equal(degreeFor(2), 1); assert.equal(degreeFor(40), 15);
  assert.equal(midiFor(0), 50, 'D3 for freezing water');
  let last = 0;
  for (let t = 0; t <= 32; t += 0.5) { const m = midiFor(t); assert.ok(m >= last); assert.ok([0, 3, 5, 7, 10].includes((((m - 2) % 12) + 12) % 12)); last = m; }
  assert.equal(stepSeconds(104), 30 / 104); assert.equal(stepSeconds(20), 0.5);
});

test('captions use fixed words', () => {
  assert.deepEqual([1, 8, 15, 24, 29].map(feel), ['near-freezing', 'cold', 'cool', 'warm', 'tropical']);
  assert.match(bandCaption(0, 3.17, readWindow(field, -180, 0, 180, 3.17)), /^3°N to the equator: tropical, median \d+\.\d °C/);
  assert.match(cellCaption(-35, 20, { n: 0, median: NaN, p10: NaN, p90: NaN, warmLon: null, cover: 0 }), /land, ice or no current traces/);
});
