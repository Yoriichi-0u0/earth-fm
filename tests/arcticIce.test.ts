import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {decodePng} from './airFixture.ts';
import {CELL_COLS, FRAME_DATES, SOUTH_LAT, analyseArctic, cellIndex, iceMonthCount} from '../src/lib/arcticIce/analyze.ts';
import type {ArcticAnalysis} from '../src/lib/arcticIce/analyze.ts';
import {EARTH_RADIUS_KM, GLOBE, latLonToPixel, pixelAreaKm2, pixelToLatLon, pixelToWorld} from '../src/lib/arcticIce/projection.ts';
import {isLand, rasterLand} from '../src/lib/arcticIce/landMask.ts';
import {isOcean, isWhite, surfaceClass} from '../src/lib/arcticIce/classify.ts';
import {areaMidi, placeNote, yearNote} from '../src/lib/arcticIce/sonify.ts';
import {monthCaption, placeCaption, season, seaName} from '../src/lib/arcticIce/describe.ts';

const frames = FRAME_DATES.map(d => decodePng(readFileSync(new URL(`../validation/svs5046/${d}.png`, import.meta.url))));
const world = JSON.parse(readFileSync(new URL('../src/data/world.json', import.meta.url), 'utf8'));
const committed: ArcticAnalysis = JSON.parse(readFileSync(new URL('../src/data/arcticIce2024.json', import.meta.url), 'utf8'));
const W = 960, H = 540;
const at = (lat: number, lon: number) => { const c = cellIndex(lat, lon)!; return committed.cells.find(x => x.row === c.row && x.col === c.col); };

test('NASA’s camera and the fitted globe reproduce the rendered silhouette', () => {
  let both = 0, either = 0;
  const july = frames[6];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = july.data[(y * W + x) * 4 + 3] > 127, b = pixelToWorld(x, y, W, H) !== null;
    if (a && b) both++; if (a || b) either++;
  }
  assert.ok(both / either > 0.995, `silhouette overlap ${(both / either).toFixed(4)}`);
  const pole = latLonToPixel(90, 0, W, H)!;
  assert.ok(Math.abs(pole.x - W / 2) < 1 && Math.abs(pole.y - H / 2) < 1, 'the North Pole faces the camera');
});

test('pixel ↔ latitude/longitude round-trips and pixel areas add up to the true area of the cap', () => {
  for (const [lat, lon] of [[85, 30], [70, -150], [60, 100], [52, -60]]) {
    const p = latLonToPixel(lat, lon, W, H)!, back = pixelToLatLon(p.x, p.y, W, H)!;
    assert.ok(Math.abs(back.lat - lat) < 0.01 && Math.abs(back.lon - lon) < 0.01, `${lat},${lon} → ${back.lat},${back.lon}`);
  }
  let sum = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = pixelToLatLon(x, y, W, H); if (p && p.lat >= SOUTH_LAT) sum += pixelAreaKm2(x, y, W, H); }
  const truth = 2 * Math.PI * EARTH_RADIUS_KM ** 2 * (1 - Math.sin((SOUTH_LAT * Math.PI) / 180));
  assert.ok(Math.abs(sum / truth - 1) < 0.01, `cap north of 50°N: ${(sum / 1e6).toFixed(2)} vs ${(truth / 1e6).toFixed(2)} million km²`);
  assert.equal(GLOBE.mirror, 1);
});

test('Natural Earth land lines up with the land NASA drew (July 2024)', () => {
  const grid = rasterLand(world.coastlines), july = frames[6];
  let ok = 0, n = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4, p = pixelToLatLon(x, y, W, H);
    if (!p || p.lat < SOUTH_LAT || july.data[i + 3] < 250) continue;
    const s = surfaceClass(july.data[i], july.data[i + 1], july.data[i + 2]);
    if (s !== 'ocean' && s !== 'land') continue;
    n++; if (isLand(grid, p.lat, p.lon) === (s === 'land')) ok++;
  }
  assert.ok(ok / n > 0.97, `agreement ${(ok / n * 100).toFixed(1)}% of ${n} pixels`);
});

test('pixel classes: NASA’s open ocean, ice and land colours', () => {
  assert.ok(isOcean(61, 102, 137), 'open water sampled from NASA’s print');
  assert.ok(isWhite(240, 244, 254) && isWhite(250, 251, 253), 'sea ice sampled from NASA’s print');
  assert.equal(surfaceClass(96, 112, 70), 'land');
  assert.ok(!isWhite(61, 102, 137) && !isOcean(240, 244, 254));
});

test('the committed data file is exactly what the analysis produces from NASA’s frames', () => {
  assert.deepEqual(analyseArctic(frames, world.coastlines), committed);
});

test('the 2024 ice year has the shape the Arctic is known to have', () => {
  const km2 = committed.months.map(m => m.iceKm2), max = km2.indexOf(Math.max(...km2)), min = km2.indexOf(Math.min(...km2));
  assert.ok([1, 2, 3].includes(max), `peak in February–April, got month ${max + 1}`);
  assert.ok([7, 8, 9].includes(min), `low in August–October, got month ${min + 1}`);
  for (let m = 3; m < 8; m++) assert.ok(km2[m] > km2[m + 1], `melting: month ${m + 1} > ${m + 2}`);
  for (let m = 8; m < 11; m++) assert.ok(km2[m] < km2[m + 1], `freezing: month ${m + 1} < ${m + 2}`);
  assert.ok(km2[8] / km2[2] > 0.2 && km2[8] / km2[2] < 0.45, `September is a fifth to under half of March: ${(km2[8] / km2[2]).toFixed(2)}`);
  // NSIDC Sea Ice Index (an independent product) reported about 15.0 and 4.3 million km² of extent on these dates;
  // this view reads ice north of 50°N only, so it must be close to, and not above, those totals.
  assert.ok(km2[2] > 12e6 && km2[2] < 15.5e6, `March ${km2[2]}`);
  assert.ok(km2[8] > 3.3e6 && km2[8] < 4.8e6, `September ${km2[8]}`);
});

test('places freeze and thaw as they should', () => {
  const pole = at(89, 0)!, hudson = at(60, -86)!, norwegian = at(67, 4)!, okhotsk = at(55, 140)!;
  assert.equal(iceMonthCount(pole.iceMonths), 12, 'the North Pole keeps its ice all year');
  for (const m of [0, 1, 2]) assert.ok(hudson.iceMonths & (1 << m), 'Hudson Bay is frozen in winter');
  for (const m of [7, 8]) assert.ok(!(hudson.iceMonths & (1 << m)), 'Hudson Bay is open in late summer');
  assert.equal(iceMonthCount(norwegian.iceMonths), 0, 'the Norwegian Sea, warmed by the Atlantic, stays open');
  assert.ok(okhotsk.iceMonths & (1 << 2) && !(okhotsk.iceMonths & (1 << 7)), 'the western Sea of Okhotsk freezes in March and is open in August');
  assert.ok(committed.cells.every(c => c.col < CELL_COLS && c.lat >= SOUTH_LAT));
});

test('sound rules: fixed, monotonic, and less ice sounds lower', () => {
  for (let k = 0; k < 16e6; k += 0.5e6) assert.ok(areaMidi(k + 0.5e6) >= areaMidi(k));
  const march = yearNote(2, committed.months[2].iceKm2, committed.seaKm2), september = yearNote(8, committed.months[8].iceKm2, committed.seaKm2);
  assert.ok(march.midi > september.midi + 10, `${march.name} vs ${september.name}`);
  assert.ok(september.water > march.water, 'more open water, louder wash');
  const pole = at(89, 0)!, open = placeNote(7, 60, 0), frozen = placeNote(0, 89, pole.iceMonths);
  assert.ok(frozen.ice && !open.ice && open.water === 1);
  assert.ok(placeNote(0, 88, 1).midi > placeNote(0, 60, 1).midi, 'farther north rings higher');
});

test('captions name the place and its ice season', () => {
  assert.equal(seaName(60, -86), 'Hudson Bay');
  assert.equal(season(0b100001111111), 'December to July');
  assert.equal(season(0b000000000101), null);
  assert.equal(season(0b000000000010), 'February');
  assert.equal(seaName(65, 39), 'the White Sea');
  assert.match(placeCaption(60, -86, at(60, -86)!.iceMonths), /^Hudson Bay, 60°N 86°W: ice in \d+ of 12 months, \w+ to \w+$/);
  assert.match(monthCaption(8, 3.94e6, 13.65e6), /15 September 2024: 3\.9 million km² of sea ice north of 50°N, 29% of the March peak/);
});
