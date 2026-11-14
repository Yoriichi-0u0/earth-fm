// Analyse the twelve NASA SVS 5046 frames (validation/svs5046/*.png) and write the record's data file.
// Usage: npx tsx scripts/svs5046-analyse.ts   (deterministic; tests/arcticIce.test.ts checks the file matches)
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng } from '../tests/airFixture.ts';
import { FRAME_DATES, analyseArctic } from '../src/lib/arcticIce/analyze.ts';

const frames = FRAME_DATES.map(d => decodePng(readFileSync(new URL(`../validation/svs5046/${d}.png`, import.meta.url))));
const world = JSON.parse(readFileSync(new URL('../src/data/world.json', import.meta.url), 'utf8'));
const result = analyseArctic(frames, world.coastlines);
writeFileSync(new URL('../src/data/arcticIce2024.json', import.meta.url), JSON.stringify(result) + '\n');
console.log(result.months.map(m => `${m.date} ${(m.iceKm2 / 1e6).toFixed(2)}`).join('\n'));
console.log(`sea analysed ${(result.seaKm2 / 1e6).toFixed(2)} M km², touch cells ${result.cells.length}`);
