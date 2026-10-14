import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { dataCheckedOn, tracks } from '../src/data/earth.ts'
import { frames } from '../src/data/frames.ts'

const file = (relative: string) => new URL(`../${relative}`, import.meta.url)
const read = (relative: string) => readFileSync(file(relative))
const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const dataManifest = JSON.parse(read('public/data/provenance.json').toString()) as {
  checkedOn: string
  lastCompleteCalendarYearAllowed: number
  observationsSha256: string
  sources: { id: string; file: string; sha256: string; repository: string; commit: string; path: string; downloadUrl: string; bundledUrl: string; observations: number; firstYear: number; lastYear: number }[]
}
const frameManifest = JSON.parse(read('public/frames/provenance.json').toString()) as {
  commit: string
  assets: { file: string; sha256: string; bytes: number; bundledUrl: string; retrievalUrl: string }[]
}
const track = (id: string) => {
  const found = tracks.find(candidate => candidate.id === id)
  assert.ok(found, `Missing scientific track: ${id}`)
  return found
}
// Consumed numeric columns precede the comma-containing final NSIDC provenance field.
const table = (name: string) => read(`public/data/sources/${name}`).toString().trim()
  .split(/\r?\n/).map(line => line.split(',').map(value => value.trim()))

test('all observational snapshots match their recorded hashes and immutable retrieval origins', () => {
  assert.equal(dataManifest.sources.length, 4)
  for (const source of dataManifest.sources) {
    assert.match(source.commit, /^[a-f0-9]{40}$/)
    assert.equal(source.downloadUrl, `https://raw.githubusercontent.com/${source.repository}/${source.commit}/${source.path}`)
    assert.equal(source.bundledUrl, `/data/sources/${source.file}`)
    assert.equal(sha256(read(`public${source.bundledUrl}`)), source.sha256, source.id)
  }
})

test('original and compressed EIC visual assets retain byte integrity and reviewable mirror provenance', () => {
  assert.ok(frameManifest.assets.length >= 7)
  const assetUrls = new Set(frameManifest.assets.map(asset => asset.bundledUrl))
  for (const asset of frameManifest.assets) {
    const bytes = read(`public${asset.bundledUrl}`)
    assert.equal(bytes.length, asset.bytes, asset.file)
    assert.equal(sha256(bytes), asset.sha256, asset.file)
    assert.ok(asset.retrievalUrl.includes(`/${frameManifest.commit}/`), asset.file)
  }
  assert.equal(new Set(frames.map(frame => frame.id)).size, frames.length)
  for (const frame of frames) {
    assert.ok(assetUrls.has(frame.imageUrl), `Missing displayed image: ${frame.id}`)
    if (frame.videoUrl) assert.ok(assetUrls.has(frame.videoUrl), `Missing animation video: ${frame.id}`)
    assert.ok(frameManifest.assets.some(asset => asset.retrievalUrl === frame.mirrorUrl), `Missing original mirror: ${frame.id}`)
    assert.match(frame.source, /mirror/i)
    assert.match(frame.date, /not supplied/i, 'No image observation date should be invented')
    assert.ok(frame.credit.length > 0)
  }
  assert.match(read('public/frames/MIRROR-README.md').toString(), /earth\.gov images/)
})

test('typed observations, downloadable JSON, and collection digest describe exactly the same data', () => {
  const exported = JSON.parse(read('public/data/observations.json').toString())
  assert.deepEqual(exported, tracks)
  assert.equal(sha256(JSON.stringify(tracks)), dataManifest.observationsSha256)
  assert.equal(dataCheckedOn, dataManifest.checkedOn)
})

test('annual tracks contain finite, contiguous, uniquely observed complete years with explicit coverage', () => {
  assert.deepEqual(tracks.map(item => item.id), ['temperature', 'co2', 'sea-level', 'sea-ice'])
  const coverage = new Map([
    ['temperature', [1880, 2025, 146]], ['co2', [1959, 2025, 67]],
    ['sea-level', [1993, 2023, 31]], ['sea-ice', [1987, 2022, 36]],
  ])
  for (const item of tracks) {
    const [firstYear, lastYear, count] = coverage.get(item.id)!
    assert.equal(item.observations.length, count)
    assert.ok(item.observations.length >= 30)
    assert.equal(item.observations[0]!.year, firstYear)
    assert.equal(item.observations.at(-1)!.year, lastYear)
    assert.ok(item.coverage.length > 0)
    assert.ok(item.baseline.length > 0)
    const source = dataManifest.sources.find(source => source.id === item.id)!
    assert.equal(source.observations, item.observations.length)
    assert.equal(source.firstYear, firstYear)
    assert.equal(source.lastYear, lastYear)
    for (let index = 0; index < item.observations.length; index++) {
      const observation = item.observations[index]!
      assert.ok(Number.isFinite(observation.value))
      assert.equal(observation.year, firstYear! + index, `${item.id}: missing, duplicated, or unsorted year`)
      assert.ok(observation.year <= dataManifest.lastCompleteCalendarYearAllowed)
    }
  }
})

test('NASA temperature remains a Celsius anomaly relative to 1951–1980 and excludes the other mirror series', () => {
  const temperature = track('temperature')
  assert.equal(temperature.unit, '°C')
  assert.match(temperature.baseline, /1951–1980/)
  const raw = table('global-temperature.csv').slice(1)
  assert.ok(raw.some(row => row[0] === 'GCAG'), 'The source really contains another series to exclude')
  const nasaRows = raw.filter(row => row[0] === 'GISTEMP' && Number(row[1]) <= 2025)
  assert.deepEqual(temperature.observations.map(point => point.year), nasaRows.map(row => Number(row[1])))
  for (const point of temperature.observations) {
    assert.equal(point.value, Number(nasaRows.find(row => Number(row[1]) === point.year)![2]))
    assert.ok(point.value > -2 && point.value < 3, 'Anomalies should not be absolute temperatures or hundredths of °C')
  }
  const referenceYears = temperature.observations.filter(point => point.year >= 1951 && point.year <= 1980)
  assert.equal(referenceYears.length, 30)
  assert.ok(Math.abs(referenceYears.reduce((sum, point) => sum + point.value, 0) / 30) < 0.002)
  assert.ok(temperature.observations.some(point => point.value < 0), 'Negative anomalies must be preserved')
  assert.equal(temperature.observations.find(point => point.year === 2024)!.value, 1.2858)
})

test('CO₂ uses observed annual dry-air ppm means without rebasing or interpolated years', () => {
  const co2 = track('co2')
  assert.equal(co2.unit, 'ppm')
  assert.match(co2.coverage, /Mauna Loa/)
  const source = table('mauna-loa-co2.csv').slice(1)
  assert.deepEqual(co2.observations.map(point => point.year), source.map(row => Number(row[0])))
  for (const point of co2.observations) {
    assert.equal(point.value, Number(source.find(row => Number(row[0]) === point.year)![1]))
    assert.ok(point.value > 300 && point.value < 500)
  }
  assert.equal(co2.observations[0]!.value, 315.98)
  assert.equal(co2.observations.at(-1)!.value, 427.35)
})

test('sea level uses only NOAA satellite observations, zeroes 1993, and correctly converts inches to mm', () => {
  const seaLevel = track('sea-level')
  assert.equal(seaLevel.unit, 'mm')
  assert.match(seaLevel.baseline, /1993/)
  const source = table('sea-level.csv')
  const satelliteColumn = source[0]!.indexOf('NOAA Adjusted Sea Level')
  assert.ok(satelliteColumn >= 0)
  const observed = source.slice(1).filter(row => row[satelliteColumn] !== '')
  assert.deepEqual(seaLevel.observations.map(point => point.year), observed.map(row => Number(row[0])))
  const reference = Number(observed.find(row => row[0] === '1993')![satelliteColumn])
  assert.equal(seaLevel.observations[0]!.value, 0)
  for (const point of seaLevel.observations) {
    const inches = Number(observed.find(row => Number(row[0]) === point.year)![satelliteColumn])
    const independentlyConverted = (inches - reference) * 25.4
    assert.ok(Math.abs(point.value - independentlyConverted) <= 0.005000001, `${point.year}: wrong unit, column, or reference`)
  }
  assert.equal(seaLevel.observations.at(-1)!.value, 98.94)
  assert.ok(source.some(row => row[0] === '1880' && row[satelliteColumn] === ''), 'Historical CSIRO rows must not become satellite observations')
})

test('NSIDC means use exactly 30 observed September days and exclude the alternate-day and partial-year record', () => {
  const seaIce = track('sea-ice')
  assert.equal(seaIce.unit, 'million km²')
  assert.match(seaIce.baseline, /not the official NSIDC monthly product/)
  const september = new Map<number, { day: number; extent: number; missing: number }[]>()
  for (const row of table('arctic-daily-extent.csv').slice(2)) {
    if (Number(row[1]) !== 9) continue
    const year = Number(row[0])
    const days = september.get(year) ?? []
    days.push({ day: Number(row[2]), extent: Number(row[3]), missing: Number(row[4]) })
    september.set(year, days)
  }
  assert.equal(september.get(1979)!.length, 15, 'Pre-1987 satellite coverage is alternate-day')
  assert.ok(!seaIce.observations.some(point => point.year === 1979 || point.year === 2023))
  const completeObservedYears = [...september.entries()].filter(([, days]) =>
    days.length === 30 && new Set(days.map(day => day.day)).size === 30
      && days.every(day => day.missing === 0 && day.extent >= 0),
  ).map(([year]) => year).sort((a, b) => a - b)
  assert.deepEqual(seaIce.observations.map(point => point.year), completeObservedYears)
  for (const point of seaIce.observations) {
    const days = september.get(point.year)!
    assert.deepEqual(days.map(day => day.day).sort((a, b) => a - b), Array.from({ length: 30 }, (_, index) => index + 1))
    // The source is recorded to 0.001 million km². Sum integer thousandths to
    // independently check the mean without repeating floating-point generation.
    const integerSum = days.reduce((sum, day) => sum + Math.round(day.extent * 1000), 0)
    const independentlyCalculated = integerSum / 30_000
    assert.ok(Math.abs(point.value - independentlyCalculated) <= 0.000050001, `${point.year}: invalid September mean`)
  }
  assert.equal(seaIce.observations.find(point => point.year === 2012)!.value, 3.5656)
  assert.equal(seaIce.observations.at(-1)!.value, 4.8969)
})
