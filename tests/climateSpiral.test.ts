import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileClimateEvent, ELECTRONIC_REFERENCE_PROFILE, parseGistempMonthlyCsv } from '../src/lib/climateMapping.ts';
import { ClimateAuditionPlayer } from '../src/lib/climateAudition.ts';

const csv = readFileSync(new URL('../public/data/sources/gistemp-global-monthly-2026-10-18.csv', import.meta.url));
const generated = JSON.parse(readFileSync(new URL('../src/data/climateSpiral.json', import.meta.url), 'utf8'));
const observations = parseGistempMonthlyCsv(csv.toString());
const at = (year: number, month: number) => observations.find(point => point.year === year && point.month === month)!;

test('frozen NASA bytes, generated monthly records, coverage, and visual all match provenance', () => {
  assert.equal(createHash('sha256').update(csv).digest('hex'), generated.provenance.sha256);
  assert.equal(generated.provenance.sha256, '4c64eda288bce32b8d76926278f346ecea1e53506df8ee72a3d5accb0657c416');
  const visual = readFileSync(new URL(`../public${generated.provenance.visual.localSource}`, import.meta.url));
  assert.equal(createHash('sha256').update(visual).digest('hex'), generated.provenance.visual.sha256);
  assert.equal(observations.filter(point => point.anomaly !== null).length, 1761);
  assert.equal(new Set(observations.map(point => point.period)).size, observations.length);
  for (const point of observations) {
    const row = generated.years.find((row: { year: number }) => row.year === point.year);
    assert.equal(row.months[point.month - 1], point.anomaly, point.period);
  }
  assert.equal(generated.firstPeriod, '1880-01');
  assert.equal(generated.lastPeriod, '2026-09');
  assert.equal(at(2026, 10).anomaly, null);
  assert.equal(at(2026, 11).anomaly, null);
  assert.equal(at(2026, 12).anomaly, null);
});

test('published monthly values use fixed anomaly bands across different years', () => {
  for (const [year, month, anomaly, band] of [[1880, 1, -.19, 1], [1980, 1, .30, 2], [2000, 2, .56, 3], [2025, 1, 1.37, 4]]) {
    const point = at(year!, month!);
    assert.equal(point.anomaly, anomaly);
    const event = compileClimateEvent(point);
    assert.equal(event.kind, 'note');
    if (event.kind === 'note') {
      assert.equal(event.bandIndex, band);
      assert.equal(event.frequencyHz, ELECTRONIC_REFERENCE_PROFILE.frequenciesHz[band!]);
    }
  }
  const sameValue = { year: 1880, month: 1, period: '1880-01', anomaly: .3 };
  const first = compileClimateEvent(sameValue);
  const last = compileClimateEvent({ ...sameValue, year: 2026, period: '2026-01' });
  assert.equal(first.kind, 'note'); assert.equal(last.kind, 'note');
  if (first.kind === 'note' && last.kind === 'note') assert.equal(first.frequencyHz, last.frequencyHz);
});

test('boundaries are exact, all valid data are covered, and missing/out-of-range values never become invented notes', () => {
  for (const [anomaly, band] of [[-1, 0], [-.51, 0], [-.5, 1], [-.01, 1], [0, 2], [.49, 2], [.5, 3], [.99, 3], [1, 4], [1.5, 4]]) {
    const event = compileClimateEvent({ ...at(2025, 1), anomaly: anomaly! });
    assert.equal(event.kind, 'note');
    if (event.kind === 'note') assert.equal(event.bandIndex, band);
  }
  for (const point of observations.filter(point => point.anomaly !== null)) assert.equal(compileClimateEvent(point).kind, 'note', point.period);
  assert.equal(compileClimateEvent(at(2026, 10)).kind, 'rest');
  for (const anomaly of [NaN, Infinity, -1.01, 1.51]) assert.equal(compileClimateEvent({ ...at(2025, 1), anomaly }).kind, 'rest');
  const ordered = [...observations.filter(point => point.anomaly !== null)].sort((a, b) => a.anomaly! - b.anomaly!);
  let previous = -Infinity;
  for (const point of ordered) {
    const event = compileClimateEvent(point);
    if (event.kind === 'note') { assert.ok(event.frequencyHz >= previous); previous = event.frequencyHz; }
  }
});

test('a future approved cultural tuning shares the mapping contract and rejects invalid pitch banks', () => {
  const profile = { id: 'test-only-cultural-profile', frequenciesHz: [263, 292, 348, 390, 439] };
  const electronic = compileClimateEvent(at(2025, 1));
  const cultural = compileClimateEvent(at(2025, 1), profile);
  assert.equal(electronic.kind, 'note'); assert.equal(cultural.kind, 'note');
  if (electronic.kind === 'note' && cultural.kind === 'note') {
    assert.equal(electronic.bandIndex, cultural.bandIndex);
    assert.equal(electronic.mappingId, cultural.mappingId);
    assert.equal(cultural.frequencyHz, 439);
    // Both instrument renderers can consume this identical shared event.
    assert.deepEqual(compileClimateEvent(at(2025, 1), profile), cultural);
  }
  for (const frequenciesHz of [[1, 2], [1, 3, 2], [1, NaN, 3], [1, 1, 2], [0, 1, 2]]) {
    assert.throws(() => compileClimateEvent(at(2025, 1), { id: 'invalid', frequenciesHz }));
  }
});

test('the CSV parser rejects malformed headers, duplicate years, skipped years and invalid numeric cells', () => {
  const text = csv.toString();
  assert.throws(() => parseGistempMonthlyCsv('no data'));
  assert.throws(() => parseGistempMonthlyCsv(text.replace('Year,Jan,Feb', 'Year,Feb,Jan')));
  assert.throws(() => parseGistempMonthlyCsv(text + text.split('\n')[2] + '\n'));
  assert.throws(() => parseGistempMonthlyCsv(text.split('\n').filter(line => !line.startsWith('1881,')).join('\n')));
  assert.throws(() => parseGistempMonthlyCsv(text.replace('1880,-.19', '1880,unknown')));
});

class Param {
  value = 0;
  setValueAtTime(value: number) { this.value = value; return this; }
  linearRampToValueAtTime(value: number) { this.value = value; return this; }
  exponentialRampToValueAtTime(value: number) { this.value = value; return this; }
  setTargetAtTime(value: number) { this.value = value; return this; }
  cancelScheduledValues() { return this; }
}
class Node {
  gain = new Param(); frequency = new Param(); connected = false;
  onended: (() => void) | null = null; starts = 0; stops = 0;
  connect() { this.connected = true; return this; }
  disconnect() { this.connected = false; }
  start() { this.starts++; }
  stop() { this.stops++; }
}
class Context {
  static instances: Context[] = [];
  static resumeGate: (() => Promise<void>) | null = null;
  state = 'suspended'; currentTime = 0; destination = new Node(); nodes: Node[] = [];
  constructor() { Context.instances.push(this); }
  createGain() { const node = new Node(); this.nodes.push(node); return node; }
  createOscillator() { return this.createGain(); }
  async resume() { if (Context.resumeGate) await Context.resumeGate(); this.state = 'running'; }
  async close() { this.state = 'closed'; }
}
async function fakeAudio(run: () => Promise<void>) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Context.instances = []; Context.resumeGate = null;
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
  try { await run(); } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original);
    else delete (globalThis as { AudioContext?: unknown }).AudioContext;
    Context.resumeGate = null;
  }
}

test('audition schedules the mapped fundamental and cleans up cancelled voices without stale completion callbacks', async () => {
  await fakeAudio(async () => {
    const player = new ClimateAuditionPlayer();
    let callbacks = 0;
    const event = compileClimateEvent(at(2025, 1));
    try {
      assert.equal(await player.play(event, () => callbacks++), true);
      const context = Context.instances[0]!;
      assert.deepEqual(context.nodes.filter(node => node.starts).map(node => node.frequency.value), [440, 880]);
      player.stop();
      for (const node of context.nodes) node.onended?.();
      await new Promise(resolve => setTimeout(resolve, 60));
      assert.equal(callbacks, 0);
      assert.ok(context.nodes.slice(1).every(node => !node.connected));
      player.setVolume(0);
      assert.equal(context.nodes[0]!.gain.value, 0);
      player.dispose();
      assert.equal(context.state, 'closed');
      assert.ok(context.nodes.every(node => !node.connected));
      await assert.rejects(player.play(event, () => {}), /disposed/);
    } finally { player.dispose(); }
  });
});

test('stopping during pending autoplay resume cannot resurrect a note; missing months create no audio context', async () => {
  await fakeAudio(async () => {
    const player = new ClimateAuditionPlayer();
    assert.equal(await player.play(compileClimateEvent(at(2026, 10)), () => {}), false);
    assert.equal(Context.instances.length, 0);
    let resume: () => void = () => {};
    Context.resumeGate = () => new Promise<void>(resolve => { resume = resolve; });
    const pending = player.play(compileClimateEvent(at(2025, 1)), () => assert.fail('stale callback'));
    player.stop();
    resume();
    assert.equal(await pending, false);
    assert.equal(Context.instances[0]!.nodes.filter(node => node.starts).length, 0);
    player.dispose();
  });
});
