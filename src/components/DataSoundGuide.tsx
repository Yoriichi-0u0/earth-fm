import { climateSnapshot, getClimateMonth } from '../data/climateSpiral';
import { CLIMATE_MAPPING, formatAnomaly, MONTHS } from '../lib/climateMapping';
import type { MonthlyObservation } from '../lib/climateMapping';
import { useStudioLanguage } from '../lib/studioLanguage';
import { mapData, NOTES, PROFILE } from '../lib/symphony';

const width = (CLIMATE_MAPPING.maximum - CLIMATE_MAPPING.minimum) / NOTES.length;
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
export function bandLabel(index: number) {
  return `${signed(CLIMATE_MAPPING.minimum + index * width)} ≤ ΔT ${index === NOTES.length - 1 ? '≤' : '<'} ${signed(CLIMATE_MAPPING.minimum + (index + 1) * width)}°C`;
}

type Props = { current: MonthlyObservation; onHear: (points: MonthlyObservation[]) => void };
export default function DataSoundGuide({ current, onHear }: Props) {
  const {t,date} = useStudioLanguage();
  const event = mapData(current);
  const examples = [getClimateMonth(1880, 1), getClimateMonth(2025, 1)];
  const rows = MONTHS.map((_, index) => getClimateMonth(current.year, index + 1));
  function exportTrace() {
    const lines = ['period,global_anomaly_c,baseline,band,note,fundamental_hz,mapping,profile,status', ...rows.map(point => {
      const mapped = mapData(point);
      return [point.period, point.anomaly ?? '', '1951-1980', mapped.kind === 'note' ? mapped.bandIndex + 1 : '', mapped.kind === 'note' ? NOTES[mapped.bandIndex] : '', mapped.kind === 'note' ? mapped.frequencyHz : '', CLIMATE_MAPPING.id, PROFILE.id, mapped.kind === 'note' ? 'note' : mapped.reason].join(',');
    })];
    const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `Earth-Symphony-${current.year}-data-to-notes.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section id="data-to-sound" className="ss-guide" aria-labelledby="ss-guide-title">
    <p className="ss-kicker">{t("FOLLOW THE MEASUREMENT")}</p>
    <h2 id="ss-guide-title">{t("How does data become sound?")}</h2>
    <p className="ss-guide-intro">{t("Each monthly NASA temperature anomaly selects a fixed band, which determines the melody’s fundamental pitch. Higher anomalies produce higher or equal notes. Tone, rhythm and harmony are musical choices, not additional climate data. This is an Earth FM musical mapping, not a recording of Earth or a NASA measurement of sound.")}</p>
    <ol className="ss-proof-chain" aria-label={t("Current data to sound mapping")}>
      <li><small>{t("01 / NASA DATA")}</small><strong>{current.anomaly === null ? t('Not available') : formatAnomaly(current.anomaly)}</strong><span>{date(current.year,current.month,MONTHS[current.month-1])} {t("· global")}</span></li>
      <li><small>{t("02 / FIXED BAND")}</small><strong>{event.kind === 'note' ? `${t('Band')} ${event.bandIndex + 1} / ${NOTES.length}` : t('No mapped band')}</strong><span>{event.kind === 'note' ? bandLabel(event.bandIndex) : event.reason === 'missing' ? t('Missing data is never treated as zero.') : t('Outside the fixed range; no clipping.')}</span></li>
      <li><small>{t("03 / MELODY PITCH")}</small><strong>{event.kind === 'note' ? `${NOTES[event.bandIndex]} · ${event.frequencyHz.toFixed(2)} Hz` : t('Silence')}</strong><span>{t("The same target fundamental in every tone and style.")}</span></li>
    </ol>
    <div className="ss-guide-columns"><article><h3>{t("Listen and check")}</h3><p>{t("Compare two real January observations below. These buttons turn on")} <strong>{t("Hear Data Only")}</strong> {t("using your selected tone, so accompaniment cannot obscure the comparison.")}</p><div className="ss-example-buttons">{examples.map(point => {
      const mapped = mapData(point);
      return <button key={point.period} onClick={() => onHear([point])}>{t("Hear")} {point.period}<small>{formatAnomaly(point.anomaly!)} → {mapped.kind === 'note' ? `${NOTES[mapped.bandIndex]} · ${mapped.frequencyHz.toFixed(2)} Hz` : t('silence')}</small></button>;
    })}<button onClick={() => onHear(examples)}>{t("Compare both · 5s")}<small>{t("1880 January → 2025 January · data only")}</small></button></div></article>
    <article><h3>{t("What changes—and why?")}</h3><ul><li><strong>{t("Data decides melody pitch.")}</strong> {t("A fixed 0.25°C band selects the note. The displayed number keeps the original published precision.")}</li><li><strong>{t("You choose tone and accompaniment.")}</strong> {t("Drums, bass, chord progression, tempo and echo are musical choices, not additional climate measurements.")}</li><li><strong>{t("Repeated notes are not new observations.")}</strong> {t("In a full mix, quieter syncopated notes repeat that month’s pitch. Harmonics add tone colour; the readout names the fundamental.")}</li></ul></article></div>
    <details className="ss-guide-detail"><summary>{t("Why can different values sound the same?")}</summary><p>{t("The ten bands simplify a continuous measurement into ten pitches. For example, +1.10°C and +1.20°C both fall in +1.00 ≤ ΔT &lt; +1.25°C and play G4. A change across +1.25°C moves to A4. This loses detail: small warming or cooling can be inaudible. Check the exact number and graph; a higher note is not a local temperature, forecast, danger rating or direct measure of climate risk.")}</p><p>{t("The range never rescales by year. Different values in the same band share a note; missing or out-of-range values remain silent. The baseline is the 1951–1980 average for each corresponding month. Sound does not encode measurement uncertainty.")}</p></details>
    <details className="ss-guide-detail"><summary>{t("Show the full pitch scale")}</summary><div className="ss-trace-scroll"><table><caption>{t("Fixed Earth FM scale ·")} {CLIMATE_MAPPING.minimum.toFixed(2)} {t("to +")}{CLIMATE_MAPPING.maximum.toFixed(2)}°C</caption><thead><tr><th scope="col">{t("Band")}</th><th scope="col">{t("NASA anomaly interval")}</th><th scope="col">{t("Note")}</th><th scope="col">{t("Fundamental")}</th></tr></thead><tbody>{NOTES.map((note, index) => <tr key={note} aria-current={event.kind === 'note' && event.bandIndex === index ? 'true' : undefined}><th scope="row">{index + 1}</th><td>{bandLabel(index)}</td><td>{note}</td><td>{PROFILE.frequenciesHz[index].toFixed(2)} Hz</td></tr>)}</tbody></table></div></details>
    <details className="ss-guide-detail"><summary>{t("Trace every month ·")} {current.year}</summary><p>{t("This table is compiled from the same monthly observations and mapping function as playback. The highlighted row follows the month shown above while playing. Press a row’s Hear button for an isolated data note; missing or out-of-range months remain silent.")}</p><button onClick={exportTrace}>{t("↓ Download")} {current.year} {t("data → notes CSV")}</button><div className="ss-trace-scroll"><table><caption>{t("NASA measurement → Earth FM note ·")} {current.year}</caption><thead><tr><th scope="col">{t("Month")}</th><th scope="col">NASA ΔT</th><th scope="col">{t("Band")}</th><th scope="col">{t("Note / Hz")}</th><th scope="col">{t("Check")}</th></tr></thead><tbody>{rows.map(point => {
      const mapped = mapData(point);
      return <tr key={point.period} aria-current={point.month === current.month ? 'true' : undefined}><th scope="row">{point.period}</th><td>{point.anomaly === null ? t('Not available') : formatAnomaly(point.anomaly)}</td><td>{mapped.kind === 'note' ? mapped.bandIndex + 1 : '—'}</td><td>{mapped.kind === 'note' ? `${NOTES[mapped.bandIndex]} / ${mapped.frequencyHz.toFixed(2)}` : t('Silence')}</td><td><button disabled={mapped.kind !== 'note'} aria-label={`${t("Hear data")} ${point.period}`} onClick={() => onHear([point])}>{t("Hear")}</button></td></tr>;
    })}</tbody></table></div></details>
    <p className="ss-guide-source">{t("Source:")} <a href={climateSnapshot.provenance.localSource}>{t("NASA GISS GISTEMP v4 · fixed source CSV")}</a> · <a href="/data/climate-spiral-provenance.json">{t("Snapshot & provenance")}</a>{t(". Retrieved 18 October 2026, through September 2026; not live data. Global land–ocean anomaly relative to the 1951–1980 average for each month.")} <a href="#ss-source-credits">{t("Full science & NASA credits ↓")}</a></p>
  </section>;
}
