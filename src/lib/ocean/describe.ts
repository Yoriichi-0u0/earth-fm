// Plain-language captions for Currents of Heat.
import type { Reading } from './analyze.ts';

export const latLabel = (lat: number) => { const v = Math.round(Math.abs(lat)); return v === 0 ? 'the equator' : `${v}°${lat < 0 ? 'S' : 'N'}`; };
export const lonLabel = (lon: number) => { const v = Math.round(Math.abs(lon)); return v === 0 || v === 180 ? `${v}°` : `${v}°${lon < 0 ? 'W' : 'E'}`; };
export const celsius = (t: number) => `${t.toFixed(1)} °C`;

export function feel(t: number): string {
  if (t < 4) return 'near-freezing';
  if (t < 12) return 'cold';
  if (t < 20) return 'cool';
  if (t < 26) return 'warm';
  return 'tropical';
}

export function bandCaption(lat0: number, lat1: number, r: Reading): string {
  const where = `${latLabel(lat1)} to ${latLabel(lat0)}`;
  if (!r.n) return `${where}: no open-ocean traces, silence`;
  return `${where}: ${feel(r.median)}, median ${celsius(r.median)} (most water ${celsius(r.p10)}–${celsius(r.p90)})${r.warmLon === null ? '' : `, warmest near ${lonLabel(r.warmLon)}`}`;
}

export function cellCaption(lat: number, lon: number, r: Reading): string {
  const where = `${latLabel(lat)}, ${lonLabel(lon)}`;
  return r.n ? `${where}: ${celsius(r.median)}, ${feel(r.median)}` : `${where}: land, ice or no current traces`;
}
