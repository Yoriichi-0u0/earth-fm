#!/usr/bin/env node
/** Regenerate the bundled observations from versioned, attributed source snapshots. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkedOn = '2026-10-14';
// A fixed cutoff prevents a partial calendar year from entering the annual tracks.
const lastCompleteYear = 2025;
const snapshots = [
  {
    id: 'temperature', file: 'global-temperature.csv',
    repository: 'datasets/global-temp', commit: '44571fe8c15e228c156bb19308e5ccc1e31cf9f7',
    path: 'data/annual.csv',
    sha256: 'c9f98d4dfb6a985d9dbbb7a99e9208378d8d693ce951cd69f7983a628c296e20',
  },
  {
    id: 'co2', file: 'mauna-loa-co2.csv',
    repository: 'datasets/co2-ppm', commit: '8c4097238570147adf6fa97ad357315528dac4c5',
    path: 'data/co2-annmean-mlo.csv',
    sha256: 'b1548ededea6f9b7eecac370753de8d8da6e0afafe1041f749a11db78c2e33c4',
  },
  {
    id: 'sea-level', file: 'sea-level.csv',
    repository: 'datasets/sea-level-rise', commit: 'e75c7af397e8ef9cd93348fb608530eb764cc1ba',
    path: 'data/epa-sea-level.csv',
    sha256: 'f65bea986aca6a7444190e6384356c8d81284603ce391a9f44e3fe679ce96b4a',
  },
  {
    id: 'sea-ice', file: 'arctic-daily-extent.csv',
    repository: 's4f-dortmund/open_data_notebooks', commit: '17a7f4af6c5c895663e62ccda6e76e9228e95ce3',
    path: 'data/2023-07-25/N_seaice_extent_daily_v3.0.csv',
    sha256: 'b76a73a8b1c659476741b65336f9f522b3a836ad5b971a2236cce1ef0c5296b9',
  },
];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const round = (value, places) => Number(value.toFixed(places));
const run = promisify(execFile);

const sourceTexts = new Map();
for (const snapshot of snapshots) {
  snapshot.downloadUrl = `https://raw.githubusercontent.com/${snapshot.repository}/${snapshot.commit}/${snapshot.path}`;
  const localPath = path.join(root, 'public/data/sources', snapshot.file);
  let bytes;
  if (process.argv.includes('--download')) {
    // curl respects the cloud machine's injected HTTPS proxy without exposing it.
    // Default certificate verification stays enabled; redirects are allowed.
    const response = await run('curl', ['--fail', '--silent', '--show-error', '--location', '--max-time', '45', snapshot.downloadUrl], {
      encoding: 'buffer', maxBuffer: 8 * 1024 * 1024,
    });
    bytes = response.stdout;
  } else {
    bytes = await readFile(localPath);
  }
  if (sha256(bytes) !== snapshot.sha256) throw new Error(`Source integrity check failed: ${snapshot.file}`);
  if (process.argv.includes('--download')) {
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, bytes);
  }
  sourceTexts.set(snapshot.id, bytes.toString('utf8'));
}

// All fields consumed here precede any quoted, comma-containing provenance field.
const rows = text => text.trim().split(/\r?\n/).map(line => line.split(',').map(value => value.trim()));
const temperature = rows(sourceTexts.get('temperature')).slice(1)
  .filter(row => row[0] === 'GISTEMP' && Number(row[1]) <= lastCompleteYear)
  .map(row => ({ year: Number(row[1]), value: Number(row[2]) }));
const co2 = rows(sourceTexts.get('co2')).slice(1)
  .filter(row => Number(row[0]) <= lastCompleteYear && Number(row[1]) > 0)
  .map(row => ({ year: Number(row[0]), value: Number(row[1]) }));
const seaRows = rows(sourceTexts.get('sea-level')).slice(1)
  .filter(row => row[4] !== '' && Number(row[0]) <= lastCompleteYear);
const seaBaseline = Number(seaRows[0][4]);
const seaLevel = seaRows.map(row => ({
  year: Number(row[0]), value: round((Number(row[4]) - seaBaseline) * 25.4, 2),
}));
const septemberDays = new Map();
for (const row of rows(sourceTexts.get('sea-ice')).slice(2)) {
  const [year, month, day, extent, missing] = row.slice(0, 5).map(Number);
  if (month !== 9 || year > lastCompleteYear || extent < 0 || missing !== 0) continue;
  if (!septemberDays.has(year)) septemberDays.set(year, new Map());
  const days = septemberDays.get(year);
  if (days.has(day)) throw new Error(`Duplicate Arctic observation: ${year}-09-${day}`);
  days.set(day, extent);
}
// Require every September day: the early alternate-day satellite record is excluded.
const seaIce = [...septemberDays.entries()].filter(([, days]) =>
  days.size === 30 && Array.from({ length: 30 }, (_, i) => i + 1).every(day => days.has(day)),
).map(([year, days]) => ({
  year, value: round([...days.values()].reduce((sum, value) => sum + value, 0) / 30, 4),
})).sort((a, b) => a.year - b.year);

const tracks = [
  {
    id: 'temperature', title: 'Global temperature', subtitle: 'The planet’s rising melody',
    unit: '°C', color: '#ff7959', source: 'NASA GISS · GISTEMP v4',
    sourceUrl: 'https://data.giss.nasa.gov/gistemp/',
    description: 'Annual global land and ocean temperature anomalies from NASA GISTEMP. Each note represents one year of observations.',
    coverage: 'Global land and ocean average',
    baseline: 'Temperature anomaly relative to the 1951–1980 average.',
    mapping: 'Higher temperature anomalies produce higher notes. The sound is a musical representation of data, not a recording of Earth.',
    observations: temperature, precision: 2,
  },
  {
    id: 'co2', title: 'Atmospheric CO₂', subtitle: 'An atmosphere gathering tension',
    unit: 'ppm', color: '#bb98ff', source: 'NOAA Global Monitoring Laboratory',
    sourceUrl: 'https://gml.noaa.gov/ccgg/trends/data.html',
    description: 'Annual mean atmospheric carbon dioxide concentration from the Mauna Loa record. It is a long-running atmospheric reference, not a global spatial map.',
    coverage: 'Mauna Loa atmospheric reference record, Hawaiʻi',
    baseline: 'Absolute dry-air CO₂ mole fraction in parts per million.',
    mapping: 'Higher CO₂ concentrations produce higher notes. This association makes the changing concentration audible; it does not measure a natural sound.',
    observations: co2, precision: 2,
  },
  {
    id: 'sea-level', title: 'Sea level rise', subtitle: 'The ocean’s slow crescendo',
    unit: 'mm', color: '#66cddd', source: 'NOAA satellite record · EPA indicator',
    sourceUrl: 'https://www.epa.gov/climate-indicators/climate-change-indicators-sea-level',
    description: 'Annual global mean sea level from the NOAA satellite column of the EPA climate indicator. Values are rebased to 1993 and converted from inches to millimeters.',
    coverage: 'Global mean sea level from satellite altimetry',
    baseline: 'Change from the 1993 annual mean; 1993 is set to 0 mm.',
    mapping: 'Higher sea level produces higher notes. The relative rise is preserved; different tracks have separate musical scales.',
    observations: seaLevel, precision: 1,
  },
  {
    id: 'sea-ice', title: 'Arctic sea ice', subtitle: 'A vanishing September refrain',
    unit: 'million km²', color: '#b3deee', source: 'NSIDC · Sea Ice Index v3',
    sourceUrl: 'https://doi.org/10.7265/N5K072F8',
    description: 'September mean Arctic sea ice extent, calculated from 30 daily NSIDC observations per year. Years with incomplete September coverage are excluded.',
    coverage: 'Northern Hemisphere sea ice extent',
    baseline: 'September mean of daily extent; not the official NSIDC monthly product.',
    mapping: 'Greater ice extent produces higher notes, so declining ice moves down the scale. Each point averages a complete September of observations.',
    observations: seaIce, precision: 2,
  },
];

for (const track of tracks) {
  if (track.observations.length < 30) throw new Error(`Not enough observations: ${track.id}`);
  const years = new Set();
  for (let i = 0; i < track.observations.length; i++) {
    const { year, value } = track.observations[i];
    if (!Number.isInteger(year) || !Number.isFinite(value) || years.has(year)) throw new Error(`Invalid observation: ${track.id}`);
    if (i > 0 && year !== track.observations[i - 1].year + 1) throw new Error(`Non-contiguous series: ${track.id}`);
    years.add(year);
  }
}
const schema = `// Generated by scripts/refresh-data.mjs from checked-in, hash-verified source snapshots.
// Source provenance and transformations: docs/DATA.md and public/data/provenance.json.
export type Observation = { year: number; value: number };
export type EarthTrack = {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  color: string;
  source: string;
  sourceUrl: string;
  description: string;
  coverage: string;
  baseline: string;
  mapping: string;
  observations: Observation[];
  precision: number;
};

export const dataCheckedOn = ${JSON.stringify(checkedOn)};
export const tracks: EarthTrack[] = ${JSON.stringify(tracks, null, 2)};
`;
await mkdir(path.join(root, 'src/data'), { recursive: true });
await writeFile(path.join(root, 'src/data/earth.ts'), schema);
await writeFile(path.join(root, 'public/data/observations.json'), `${JSON.stringify(tracks, null, 2)}\n`);
const manifest = {
  checkedOn,
  note: 'Checked-on date is the date these mirrors were retrieved for this project, not an upstream update timestamp. Bundled snapshots are not live data.',
  lastCompleteCalendarYearAllowed: lastCompleteYear,
  observationsSha256: sha256(JSON.stringify(tracks)),
  sources: snapshots.map(snapshot => {
    const observations = tracks.find(track => track.id === snapshot.id).observations;
    return { ...snapshot, bundledUrl: `/data/sources/${snapshot.file}`, observations: observations.length,
      firstYear: observations[0].year, lastYear: observations.at(-1).year };
  }),
};
await writeFile(path.join(root, 'public/data/provenance.json'), `${JSON.stringify(manifest, null, 2)}\n`);
for (const track of tracks) console.log(`${track.id}: ${track.observations.length} observations (${track.observations[0].year}–${track.observations.at(-1).year})`);
