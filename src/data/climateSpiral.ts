import snapshot from './climateSpiral.json';
import type { MonthlyObservation } from '../lib/climateMapping';

export const climateSnapshot = snapshot;
export const climateYears = snapshot.years.map(row => row.year);

export function getClimateMonth(year: number, month: number): MonthlyObservation {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError('Choose a month from January to December.');
  const row = snapshot.years.find(row => row.year === year);
  if (!row) throw new RangeError('This year is outside the fixed GISTEMP snapshot.');
  return { year, month, period: `${year}-${String(month).padStart(2, '0')}`, anomaly: row.months[month - 1] ?? null };
}
