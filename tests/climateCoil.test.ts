import test from 'node:test';
import assert from 'node:assert/strict';
import {COIL_LENGTH,COIL_R_HIGH,COIL_R_LOW,COIL_SPAN,coilPoint,coilRadius,coilRuns} from '../src/lib/climateCoil';
import {climateSnapshot} from '../src/data/climateSpiral';

test('the coil uses the fixed Side B span, not a per-view rescale', () => {
  assert.deepEqual(COIL_SPAN, {low: -1, high: 1.5});
  assert.equal(coilRadius(-1), COIL_R_LOW);
  assert.equal(coilRadius(1.5), COIL_R_HIGH);
  assert.ok(Math.abs(coilRadius(0) - (COIL_R_LOW + .4 * (COIL_R_HIGH - COIL_R_LOW))) < 1e-12);
  assert.ok(coilRadius(.5) > coilRadius(0), 'warmer months sit farther from the axis');
});

test('January sits at the top, months turn in order and time runs left to right', () => {
  const [, y1, z1] = coilPoint(2000, 1, 0, 1880, 2026);
  assert.ok(Math.abs(y1 - coilRadius(0)) < 1e-12 && Math.abs(z1) < 1e-12);
  const [, y4, z4] = coilPoint(2000, 4, 0, 1880, 2026);
  assert.ok(Math.abs(y4) < 1e-12 && Math.abs(z4 - coilRadius(0)) < 1e-12);
  assert.ok(coilPoint(1880, 1, 0, 1880, 2026)[0] > -COIL_LENGTH / 2);
  assert.ok(coilPoint(2026, 12, 0, 1880, 2026)[0] < COIL_LENGTH / 2);
  assert.ok(coilPoint(1950, 6, 0, 1880, 2026)[0] < coilPoint(1950, 7, 0, 1880, 2026)[0]);
});

test('every available pinned GISTEMP month is drawn once and missing months are never bridged', () => {
  const {first, last, runs} = coilRuns(climateSnapshot.years);
  assert.equal(first, 1880);
  assert.equal(last, 2026);
  const available = climateSnapshot.years.flatMap(row => row.months).filter(value => value !== null) as number[];
  const drawn = runs.flatMap(run => run.anomalies);
  assert.deepEqual(drawn, available);
  runs.forEach(run => assert.equal(run.positions.length, run.anomalies.length * 3));
  const gapped = coilRuns([{year: 2000, months: [0, .1, null, .2, .3, null, null, null, null, null, null, null]}]);
  assert.deepEqual(gapped.runs.map(run => run.anomalies), [[0, .1], [.2, .3]]);
});
