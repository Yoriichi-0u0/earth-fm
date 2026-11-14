// Plain-language captions for screen readers, the caption line and the liner notes.
import { AEROSOLS, AEROSOL_NAMES, type Aerosol, type Mix } from './analyze.ts';

export const lonLabel = (lon: number) => { const v = Math.round(Math.abs(lon)); return v === 0 || v === 180 ? `${v}°` : `${v}°${lon < 0 ? 'W' : 'E'}`; };
export const latLabel = (lat: number) => { const v = Math.round(Math.abs(lat)); return v === 0 ? 'the equator' : `${v}°${lat < 0 ? 'S' : 'N'}`; };

/** Fixed words for the same fixed amount scale the sound uses. */
export function strengthWord(amount: number): string {
  if (amount < 0.004) return 'none';
  if (amount < 0.02) return 'faint';
  if (amount < 0.06) return 'light';
  if (amount < 0.15) return 'moderate';
  return 'strong';
}

export function mixSentence(mix: Mix): string {
  const heard = AEROSOLS.filter((a) => mix[a].amount >= 0.004).sort((a, b) => mix[b].amount - mix[a].amount);
  if (!heard.length) return 'clear air, silence';
  return heard.map((a) => `${strengthWord(mix[a].amount)} ${AEROSOL_NAMES[a].toLowerCase()} near ${latLabel(mix[a].lat ?? 0)}`).join('; ');
}

export const stepCaption = (lon: number, mix: Mix) => `${lonLabel(lon)}: ${mixSentence(mix)}`;

export function shareSentence(shares: Record<Aerosol, number>): string {
  return AEROSOLS.slice().sort((a, b) => shares[b] - shares[a]).map((a) => `${AEROSOL_NAMES[a]} ${(shares[a] * 100).toFixed(1)}%`).join(', ');
}
