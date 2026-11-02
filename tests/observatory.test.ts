import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {observatoryImagery} from '../src/data/observatory.ts';

test('NASA Earth surface imagery has a pinned official source, historical period and verifiable local bytes', () => {
  const record = JSON.parse(readFileSync(new URL('../public/frames/observatory-provenance.json', import.meta.url), 'utf8'));
  const bytes = readFileSync(new URL(`../public${observatoryImagery.texture}`, import.meta.url));
  assert.equal(new URL(record.retrievalUrl).hostname, 'assets.science.nasa.gov');
  assert.equal(record.sourcePage, observatoryImagery.sourcePage);
  assert.equal(record.display.url, observatoryImagery.texture);
  assert.equal(record.display.bytes, bytes.length);
  assert.equal(record.display.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(record.observationPeriod, 'July 2004 monthly composite');
  assert.match(record.interpretation, /not show current weather/);
  assert.ok(bytes.length < 400_000, 'Keep the globe asset suitable for mobile loading');
});
