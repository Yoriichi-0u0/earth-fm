// Plain-language wording. Every phrase describes rendered colours in NASA's legend terms.
import type { Cell, Direction, InsetSummary, RegionStats } from './analyze.ts';
import { COLS, ROWS } from './analyze.ts';
import type { NotePlan } from './sonify.ts';
import type { YearStats } from './decade.ts';

export function pct(f: number): string {
  if (f > 0 && f < 0.01) return 'under 1%';
  return `${Math.round(f * 100)}%`;
}

export function directionWords(d: Direction): string {
  return d === 'more' ? 'more light' : d === 'less' ? 'less light' : 'little change';
}

/** Strength = how far the colour sits along NASA's legend. Never a measured amount. */
export function legendWords(d: Direction, meanChange: number): string {
  if (d === 'steady') return 'near white on the legend';
  const m = Math.abs(meanChange);
  const how = m < 0.35 ? 'slightly' : m < 0.7 ? 'clearly' : 'strongly';
  return `${how} ${d === 'more' ? 'purple' : 'orange'} on the legend`;
}

export function figureWords(plan: NotePlan): string {
  return plan.figure === 'rising' ? 'rising' : plan.figure === 'falling' ? 'falling' : 'single tone';
}

export function cellPosition(cell: Pick<Cell, 'col' | 'row'>): string {
  return `Column ${cell.col + 1} of ${COLS}, row ${cell.row + 1} of ${ROWS}`;
}

export function statsSentence(s: RegionStats): string {
  if (!s.direction) return s.mapPixels ? 'no lit map pixels (dark land or ocean); silent' : 'no map pixels';
  return `${directionWords(s.direction)}, ${legendWords(s.direction, s.meanChange)}; ${pct(s.litFraction)} of map pixels lit`;
}

export function eventCaption(label: string, s: RegionStats, plan: NotePlan): string {
  return `${label} · ${directionWords(s.direction!)} · ${legendWords(s.direction!, s.meanChange)} · ${pct(s.litFraction)} of map pixels lit · ${figureWords(plan)}, ${plan.pulses} pulse${plan.pulses > 1 ? 's' : ''}`;
}

export function insetSentence(s: InsetSummary): string {
  if (!s.direction) return `${s.name}: the boxed map region has no lit pixels at this scale.`;
  const shares = `Of its ${s.litPixels} lit pixels, ${pct(s.shareMore)} are on the purple side, ${pct(s.shareLess)} on the orange side and ${pct(s.shareSteady)} near white.`;
  const few = s.litPixels < 10 ? ' Very few lit pixels: the region is dim at this map scale, so treat this as a weak reading.' : '';
  return `${s.name} (the small box on the world map that the inset magnifies): overall ${directionWords(s.direction)}, ${legendWords(s.direction, s.meanChange)}; ${pct(s.litFraction)} of its map pixels are lit. ${shares}${few}`;
}

export const VISUAL_DESCRIPTION =
  'NASA Scientific Visualization Studio’s “Change in Night Lights between 2012 and 2023 – EIC Version” (visualization 5313). ' +
  'A dark world map, drawn extra wide for the Earth Information Center’s screens so that some longitudes appear twice, shows where night-time lights changed between 2012 and 2023, using NASA’s Black Marble data from the Suomi NPP VIIRS instrument. ' +
  'Land is dark grey and oceans are black. Purple dots mark places with more light, orange dots mark places with less light, and white dots mark little change. ' +
  'Four magnified insets, labelled Western Europe, Eastern Mediterranean, Ukraine and India, enlarge small boxes on the map; translucent wedges connect each box to its inset. ' +
  'A legend in the middle, titled “Change in Lighting Intensity from 2012 to 2023”, runs from orange on the left (less light) through white in the middle (no change) to purple on the right (more light); its small tick labels are not legible at this file’s resolution.';

// ---- The decade ---------------------------------------------------------------------

const times = (r: number) => (r >= 10 ? `${Math.round(r)}×` : `${r.toFixed(1)}×`);

export function trendWords(d: Direction | null): string {
  return d === 'more' ? 'brighter' : d === 'less' ? 'dimmer' : d === 'steady' ? 'about the same (within ±10 %)' : 'never lit at this scale';
}

/** Caption for one year of the decade. */
export function yearCaption(label: string, cur: YearStats, start: YearStats | undefined, dir: Direction, prevYear: number | null): string {
  if (cur.light <= 0) return `${cur.year} · ${label} · nothing brighter than the base map · rest`;
  const rel = !start || start.year === cur.year ? 'starting note' : `${times(cur.light / start.light)} its ${start.year} brightness`;
  const vs = prevYear === null ? '' : ` · ${dir === 'more' ? 'brighter than' : dir === 'less' ? 'dimmer than' : 'similar to'} ${prevYear}`;
  return `${cur.year} · ${label} · ${rel}${vs}`;
}

/** A place too small for a reliable decade reading at this scale. */
export function smallPlaceWords(mapPixels: number): string {
  return ` This box covers only ${mapPixels} map pixels at this scale, so its decade is a weak reading.`;
}

/** One-sentence summary of a place over the decade, compared with NASA's change map. */
export function decadeSentence(label: string, series: readonly YearStats[], trend: Direction | null, change: Direction | null, small: boolean): string {
  const a = series[0];
  const b = series[series.length - 1];
  if (!trend) return `${label}: nothing brighter than the base map in any yearly frame at this scale.`;
  const ratio = a.light > 0 ? ` In 2023 its brightness above the base map is ${times(b.light / a.light)} that of 2012.` : '';
  const vsChange =
    change === null
      ? ''
      : change === trend
        ? ` NASA’s change map also shows ${directionWords(change)}: the two renderings agree.`
        : ` NASA’s change map shows ${directionWords(change)} here, so the two renderings differ.`;
  return `${label}: ${trendWords(trend)} over the decade.${ratio}${small ? smallPlaceWords(a.mapPixels) : ''}${vsChange}`;
}
