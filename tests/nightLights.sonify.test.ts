import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gainFor, planFor, pulsesFor, stepFor } from '../src/lib/nightLights/sonify.ts';

const more = { direction: 'more' as const, meanChange: 0.5, litFraction: 0.05 };
const less = { direction: 'less' as const, meanChange: -0.5, litFraction: 0.05 };

test('more light → rising pairs; less light → falling pairs; steady → single tones', () => {
  const up = planFor(more, 512, 1024)!;
  assert.equal(up.figure, 'rising');
  for (let i = 0; i < up.notes.length; i += 2) assert.ok(up.notes[i + 1].hz > up.notes[i].hz);
  const down = planFor(less, 512, 1024)!;
  assert.equal(down.figure, 'falling');
  for (let i = 0; i < down.notes.length; i += 2) assert.ok(down.notes[i + 1].hz < down.notes[i].hz);
  const steady = planFor({ direction: 'steady', meanChange: 0.05, litFraction: 0.01 }, 512, 1024)!;
  assert.equal(steady.figure, 'single');
  assert.equal(steady.notes.length, 1);
});

test('unlit regions are silent', () => {
  assert.equal(planFor({ direction: null, meanChange: 0, litFraction: 0 }, 0, 1024), null);
});

test('pitch step rises monotonically with position along the legend', () => {
  let prev = -1;
  for (let m = 0; m <= 1.0001; m += 0.05) {
    const s = stepFor(m);
    assert.ok(s >= prev);
    prev = s;
  }
  assert.equal(stepFor(0), 0);
  assert.equal(stepFor(-1), 10);
});

test('lit share sets fixed pulse counts and loudness', () => {
  assert.deepEqual([0, 0.019, 0.02, 0.04, 0.06, 0.5].map(pulsesFor), [1, 1, 2, 3, 4, 4]);
  assert.equal(gainFor(0), 0.25);
  assert.equal(gainFor(0.1), 1);
  assert.equal(gainFor(0.9), 1);
});

test('pan follows x, and the rules are fixed (same input → same plan)', () => {
  assert.equal(planFor(more, 0, 1024)!.pan, -1);
  assert.equal(planFor(more, 1024, 1024)!.pan, 1);
  assert.deepEqual(planFor(more, 300, 1024), planFor(more, 300, 1024));
});
