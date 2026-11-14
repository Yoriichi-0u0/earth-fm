// Plain-language captions for The Ice Year. Place names are approximate boxes for orientation only.
import {MONTHS, monthsWithIce} from './analyze.ts';

export const latLabel = (lat: number) => `${Math.round(lat)}°N`;
export const lonLabel = (lon: number) => { const v = Math.round(Math.abs(lon)); return v === 0 || v === 180 ? `${v}°` : `${v}°${lon < 0 ? 'W' : 'E'}`; };
export const millionKm2 = (km2: number) => `${(km2 / 1e6).toFixed(1)} million km²`;

/** [name, west, south, east, north]; first match wins, so smaller seas come first. */
const SEAS: readonly (readonly [string, number, number, number, number])[] = [
  ['the Central Arctic Ocean', -180, 84, 180, 90],
  ['Hudson Bay', -95, 51, -76, 64],
  ['the Canadian Arctic Archipelago', -125, 68, -60, 84],
  ['Baffin Bay', -80, 64, -50, 78],
  ['the Labrador Sea', -65, 50, -42, 64],
  ['the Gulf of St. Lawrence', -70, 45, -55, 51],
  ['the Beaufort Sea', -158, 68, -125, 84],
  ['the Chukchi Sea', -180, 64, -158, 78],
  ['the Bering Sea', -180, 50, -157, 66],
  ['the Bering Sea', 162, 52, 180, 66],
  ['the Sea of Okhotsk', 135, 50, 162, 63],
  ['the East Siberian Sea', 140, 68, 180, 84],
  ['the Laptev Sea', 100, 70, 140, 84],
  ['the Kara Sea', 55, 68, 100, 84],
  ['the White Sea', 30, 63, 45, 68],
  ['the Barents Sea', 15, 66, 55, 84],
  ['the Baltic Sea', 10, 53, 31, 66],
  ['the Greenland Sea', -20, 66, 15, 84],
  ['the Norwegian Sea', -10, 60, 15, 72],
  ['the North Atlantic', -60, 50, 10, 66],
  ['the Gulf of Alaska', -157, 50, -125, 62],
  ['the North Pacific', 140, 50, 180, 52],
];
export function seaName(lat: number, lon: number): string {
  for (const [name, w, s, e, n] of SEAS) if (lat >= s && lat < n && lon >= w && lon < e) return name;
  return 'the northern seas';
}

/** "December to June" from a 12-bit mask, wrapping over the new year; null if the run is not continuous. */
export function season(mask: number): string | null {
  const months = Array.from({length: 12}, (_, m) => (mask >> m) & 1);
  const count = months.reduce((a, b) => a + b, 0);
  if (count === 0 || count === 12) return null;
  const start = months.findIndex((v, m) => v === 1 && months[(m + 11) % 12] === 0);
  for (let k = 0; k < count; k++) if (!months[(start + k) % 12]) return null;
  return count === 1 ? MONTHS[start] : `${MONTHS[start]} to ${MONTHS[(start + count - 1) % 12]}`;
}

export function placeCaption(lat: number, lon: number, mask: number): string {
  const where = `${seaName(lat, lon)}, ${latLabel(lat)} ${lonLabel(lon)}`, n = monthsWithIce(mask).length;
  if (n === 0) return `${where}: open water all year in NASA’s 2024 frames`;
  if (n === 12) return `${where}: ice in all 12 months of 2024`;
  const run = season(mask);
  return `${where}: ice in ${n} of 12 months${run ? `, ${run}` : ` (${monthsWithIce(mask).join(', ')})`}`;
}
export function monthCaption(month: number, iceKm2: number, maxKm2: number): string {
  const share = Math.round((iceKm2 / maxKm2) * 100);
  return `15 ${MONTHS[month]} 2024: ${millionKm2(iceKm2)} of sea ice north of 50°N${share < 100 ? `, ${share}% of the March peak` : ', the year’s peak'}`;
}
