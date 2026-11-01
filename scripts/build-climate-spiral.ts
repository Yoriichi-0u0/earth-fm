/** Offline generation only: never refresh a moving NASA source during a build. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseGistempMonthlyCsv } from '../src/lib/climateMapping.ts';

const root = new URL('../', import.meta.url);
const provenance = JSON.parse(await readFile(new URL('public/data/climate-spiral-provenance.json', root), 'utf8'));
const source = await readFile(new URL(`public${provenance.localSource}`, root));
if (createHash('sha256').update(source).digest('hex') !== provenance.sha256) throw new Error('Climate Spiral source hash mismatch.');
const observations = parseGistempMonthlyCsv(source.toString('utf8'));
const years = [...new Set(observations.map(point => point.year))].map(year => ({ year, months: observations.filter(point => point.year === year).map(point => point.anomaly) }));
const valid = observations.filter(point => point.anomaly !== null);
const data = { provenance, firstPeriod: valid[0]!.period, lastPeriod: valid.at(-1)!.period, validMonths: valid.length, years };
const target = new URL('src/data/climateSpiral.json', root);
await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Generated ${valid.length} monthly estimates (${data.firstPeriod}–${data.lastPeriod}) at ${fileURLToPath(target)}`);
