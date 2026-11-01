/** Scientific events are independent of the instrument that performs them. */
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const CSV_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type MonthlyObservation = {
  year: number;
  month: number;
  period: string;
  anomaly: number | null;
};

export type PitchProfile = {
  id: string;
  frequenciesHz: readonly number[];
};

// Reference tuning for Electronic Explore only. These are not verified sape pitches.
// A later approved cultural bank must use the same event/profile contract.
export const ELECTRONIC_REFERENCE_PROFILE: PitchProfile = Object.freeze({
  id: 'electronic-reference-v1',
  frequenciesHz: Object.freeze([261.625565, 293.664768, 349.228231, 391.995436, 440]),
});

export const CLIMATE_MAPPING = Object.freeze({
  id: 'gistemp-fixed-bands-v1',
  minimum: -1,
  maximum: 1.5,
});

export type ClimateEvent = {
  kind: 'note';
  period: string;
  anomaly: number;
  mappingId: string;
  profileId: string;
  bandIndex: number;
  bandMinimum: number;
  bandMaximum: number;
  frequencyHz: number;
} | {
  kind: 'rest';
  period: string;
  anomaly: number | null;
  reason: 'missing' | 'outside-mapping';
};

export function parseGistempMonthlyCsv(csv: string): MonthlyObservation[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const headerAt = lines.findIndex(line => line.startsWith('Year,'));
  if (headerAt < 0) throw new Error('GISTEMP monthly header is missing.');
  const columns = lines[headerAt]!.split(',');
  if (CSV_MONTHS.some((month, i) => columns[i + 1] !== month)) throw new Error('Expected January–December GISTEMP columns.');
  const years = new Set<number>();
  const result: MonthlyObservation[] = [];
  for (const line of lines.slice(headerAt + 1)) {
    const cells = line.split(',').map(value => value.trim());
    if (!/^\d{4}$/.test(cells[0] ?? '') || cells.length !== columns.length) throw new Error('Malformed GISTEMP year row.');
    const year = Number(cells[0]);
    if (year < 1880 || years.has(year)) throw new Error('Invalid or duplicate GISTEMP year.');
    years.add(year);
    for (let month = 1; month <= 12; month++) {
      const raw = cells[month]!;
      if (raw !== '***' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Invalid anomaly for ${year}-${month}.`);
      const anomaly = raw === '***' ? null : Number(raw);
      if (anomaly !== null && !Number.isFinite(anomaly)) throw new Error('Anomaly must be finite.');
      result.push({ year, month, period: `${year}-${String(month).padStart(2, '0')}`, anomaly });
    }
  }
  if (!result.length) throw new Error('GISTEMP contains no monthly records.');
  result.sort((a, b) => a.year - b.year || a.month - b.month);
  const orderedYears = [...years].sort((a, b) => a - b);
  if (orderedYears.some((year, i) => year !== 1880 + i)) throw new Error('GISTEMP years must be contiguous from 1880.');
  return result;
}

export function compileClimateEvent(observation: MonthlyObservation, profile: PitchProfile = ELECTRONIC_REFERENCE_PROFILE): ClimateEvent {
  const pitches = profile.frequenciesHz;
  if (pitches.length < 3 || pitches.length > 12 || pitches.some((pitch, i) => !Number.isFinite(pitch) || pitch <= 0 || (i > 0 && pitch <= pitches[i - 1]!))) {
    throw new Error('A shared profile requires 3–12 distinct, increasing frequencies.');
  }
  const { anomaly, period } = observation;
  if (anomaly === null) return { kind: 'rest', period, anomaly, reason: 'missing' };
  if (!Number.isFinite(anomaly) || anomaly < CLIMATE_MAPPING.minimum || anomaly > CLIMATE_MAPPING.maximum) {
    return { kind: 'rest', period, anomaly, reason: 'outside-mapping' };
  }
  const normalized = (anomaly - CLIMATE_MAPPING.minimum) / (CLIMATE_MAPPING.maximum - CLIMATE_MAPPING.minimum);
  const bandIndex = Math.min(pitches.length - 1, Math.floor(normalized * pitches.length));
  const width = 2.5 / pitches.length;
  return {
    kind: 'note', period, anomaly, mappingId: CLIMATE_MAPPING.id, profileId: profile.id,
    bandIndex, bandMinimum: -1 + width * bandIndex, bandMaximum: -1 + width * (bandIndex + 1),
    frequencyHz: pitches[bandIndex]!,
  };
}

export function formatAnomaly(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}°C`;
}
