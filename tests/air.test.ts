import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadColorbar, loadStill } from './airFixture.ts';
import { AEROSOLS, IMAGE_HEIGHT, IMAGE_WIDTH, STEPS, analyzeStill, boxFor, classifyPixel, dominant, grooveSteps, latAt, lonAt, mixIn, readLegend, xAt, yAt } from '../src/lib/air/analyze.ts';
import { STORIES, STORY_STEPS } from '../src/lib/air/stories.ts';
import { FULL_AMOUNT, REST_AMOUNT, VOICES, chordFor, degreeFor, loudnessFor, midiFor, panFor, scoreFor, stepSeconds } from '../src/lib/air/sonify.ts';
import { latLabel, lonLabel, mixSentence, strengthWord } from '../src/lib/air/describe.ts';

const legend = readLegend(loadColorbar());
const field = analyzeStill(loadStill(), legend);
const WHOLE = { x0: 0, y0: 0, x1: IMAGE_WIDTH - 1, y1: IMAGE_HEIGHT - 1 };

test('the four swatches are read from NASA’s own colour bar', () => {
  const expected = { blackCarbon: [210, 94, 69], dust: [193, 154, 220], seaSalt: [133, 170, 169], sulfate: [83, 220, 52] };
  for (const s of legend) s.rgb.forEach((v, i) => assert.ok(Math.abs(v - expected[s.aerosol][i]) <= 1, `${s.aerosol} channel ${i}: ${v}`));
  const hues = Object.fromEntries(legend.map((s) => [s.aerosol, (s.hue * 180) / Math.PI]));
  assert.ok(Math.abs(hues.blackCarbon - 33.7) < 1 && Math.abs(hues.dust + 49.1) < 1 && Math.abs(hues.seaSalt + 165.8) < 1 && Math.abs(hues.sulfate - 140.5) < 1, JSON.stringify(hues));
});

test('each swatch classifies as itself at full strength; grey land, black and white are clear air', () => {
  for (const [k, s] of legend.entries()) { const c = classifyPixel(s.rgb, legend); assert.equal(c.type, k); assert.ok(c.strength > 0.98); }
  for (const rgb of [[60, 70, 60], [62, 69, 61], [0, 0, 0], [255, 255, 255], [128, 128, 128]] as const) assert.equal(classifyPixel(rgb, legend).type, -1, String(rgb));
});

test('the map is a full equirectangular globe', () => {
  assert.equal(lonAt(0), -180); assert.equal(lonAt(IMAGE_WIDTH), 180); assert.equal(latAt(0), 90); assert.equal(latAt(IMAGE_HEIGHT), -90);
  assert.equal(xAt(0), IMAGE_WIDTH / 2); assert.equal(yAt(0), IMAGE_HEIGHT / 2);
  assert.deepEqual(boxFor(-180, -90, 180, 90), WHOLE);
});

test('coverage of the pinned still: sulfate is everywhere, black carbon is rare', () => {
  const counts = [0, 0, 0, 0];
  for (const k of field.type) if (k >= 0) counts[k]++;
  const pct = counts.map((c) => (c / field.type.length) * 100);
  [1.1, 3.08, 6.65, 16.4].forEach((v, k) => assert.ok(Math.abs(pct[k] - v) < 0.1, `${AEROSOLS[k]} ${pct[k].toFixed(2)}%`));
  const whole = mixIn(field, WHOLE);
  assert.deepEqual(AEROSOLS.slice().sort((a, b) => whole[b].amount - whole[a].amount), ['sulfate', 'dust', 'seaSalt', 'blackCarbon']);
});

test('each of NASA’s six stories is dominated by the aerosol NASA names, at least twice the runner-up', () => {
  for (const s of STORIES) {
    const mix = mixIn(field, s.rect), top = dominant(mix);
    assert.equal(top, s.aerosol, `${s.id}: ${JSON.stringify(mix)}`);
    const runnerUp = Math.max(...AEROSOLS.filter((a) => a !== top).map((a) => mix[a].amount));
    assert.ok(mix[top].amount >= 2 * runnerUp, `${s.id}: ${mix[top].amount} vs ${runnerUp}`);
    assert.ok(mix[top].amount > 0.07, `${s.id} is audible: ${mix[top].amount}`);
  }
});

test('grey land and Antarctica stay near silent', () => {
  for (const [name, box] of [['Greenland', boxFor(-50, 65, -30, 78)], ['Australia', boxFor(120, -32, 145, -20)], ['Antarctica', boxFor(-180, -90, 180, -75)]] as const) {
    const mix = mixIn(field, box), total = AEROSOLS.reduce((s, a) => s + mix[a].amount, 0);
    assert.ok(total < 0.02, `${name}: ${total}`);
  }
});

test('salt over two oceans is placed where most of it is, not averaged into the tropics', () => {
  const step = grooveSteps(field)[33]; // 8°E: Southern Ocean salt and Saharan dust in one slice
  assert.ok((step.mix.seaSalt.lat ?? 0) < -25, `salt ${step.mix.seaSalt.lat}`);
  assert.ok((step.mix.dust.lat ?? 0) > 10, `dust ${step.mix.dust.lat}`);
});

test('64 groove steps cover the world west to east without gaps', () => {
  const steps = grooveSteps(field);
  assert.equal(steps.length, STEPS);
  assert.equal(steps[0].rect.x0, 0); assert.equal(steps.at(-1)!.rect.x1, IMAGE_WIDTH - 1);
  for (let i = 1; i < steps.length; i++) assert.equal(steps[i].rect.x0, steps[i - 1].rect.x1 + 1);
  assert.equal(steps[0].lon0, -180); assert.equal(steps.at(-1)!.lon1, 180);
  for (const s of STORIES) assert.equal(grooveSteps(field, s.rect, STORY_STEPS).length, STORY_STEPS);
});

test('the score: every slice of the world sounds, and Africa plays all four tracks at once', () => {
  const score = scoreFor(grooveSteps(field));
  assert.equal(score.filter((c) => !c.notes.length).length, 0);
  const africa = score.filter((c) => c.lon > -20 && c.lon < 30);
  assert.ok(africa.some((c) => c.notes.length === 4), africa.map((c) => c.notes.length).join(','));
  assert.ok(africa.every((c) => c.notes.some((n) => n.aerosol === 'dust')));
  assert.deepEqual(scoreFor(grooveSteps(field)), score, 'deterministic');
});

test('fixed sound rules: pentatonic pitch rises with latitude; loudness is one fixed scale; pan follows longitude', () => {
  let last = -1;
  for (let lat = -90; lat <= 90; lat += 1) { const d = degreeFor(lat); assert.ok(d >= last); last = d; }
  assert.equal(degreeFor(-90), 0); assert.equal(degreeFor(90), 6);
  for (const voice of Object.values(VOICES)) for (let lat = -90; lat <= 90; lat += 7) {
    const midi = midiFor(voice, lat);
    assert.ok([0, 3, 5, 7, 10].includes((((midi - 2) % 12) + 12) % 12), `${voice.aerosol} ${midi} is in D minor pentatonic`);
  }
  assert.equal(loudnessFor(REST_AMOUNT / 2), 0);
  assert.equal(loudnessFor(FULL_AMOUNT), 1); assert.equal(loudnessFor(1), 1);
  assert.ok(loudnessFor(0.05) < loudnessFor(0.1));
  assert.ok(panFor(-180) < panFor(0) && panFor(0) === 0 && panFor(0) < panFor(180));
  const mix = mixIn(field, STORIES[0].rect);
  assert.deepEqual(chordFor(mix, 0, 0), chordFor(mix, 0, 0));
  assert.equal(stepSeconds(96), 30 / 96); assert.equal(stepSeconds(10), 0.5); assert.equal(stepSeconds(999), 30 / 160);
});

test('captions use fixed words on the same scale as the sound', () => {
  assert.equal(lonLabel(-149.4), '149°W'); assert.equal(lonLabel(8), '8°E'); assert.equal(lonLabel(0), '0°');
  assert.equal(latLabel(-38), '38°S'); assert.equal(latLabel(0.2), 'the equator');
  assert.deepEqual([0.001, 0.01, 0.03, 0.1, 0.3].map(strengthWord), ['none', 'faint', 'light', 'moderate', 'strong']);
  const sahara = mixSentence(mixIn(field, STORIES[0].rect));
  assert.match(sahara, /^strong dust near \d+°N/);
  assert.equal(mixSentence(mixIn(field, boxFor(-180, -90, 180, -80))), 'clear air, silence');
});
