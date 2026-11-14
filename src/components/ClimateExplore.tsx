import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, AudioLines, CircleHelp, Headphones, Play, Square, Volume2 } from 'lucide-react';
import { climateSnapshot, climateYears, getClimateMonth } from '../data/climateSpiral';
import { ClimateAuditionPlayer } from '../lib/climateAudition';
import { compileClimateEvent, formatAnomaly, MONTHS } from '../lib/climateMapping';
import './ClimateExplore.css';

type Props = { active: boolean; onStart: () => void };
const BAND_LABELS = ['−1.00 to <−0.50', '−0.50 to <0.00', '0.00 to <+0.50', '+0.50 to <+1.00', '+1.00 to +1.50'];

export default function ClimateExplore({ active, onStart }: Props) {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const player = useRef<ClimateAuditionPlayer | null>(null);
  const session = useRef(0);
  const observation = getClimateMonth(year, month);
  const event = compileClimateEvent(observation);
  const available = event.kind === 'note';
  const latestYear = Number(climateSnapshot.lastPeriod.slice(0, 4));
  const lastMonth = Number(climateSnapshot.lastPeriod.slice(5));
  const incomplete = year === latestYear && lastMonth < 12;
  const angle = (month - 1) * Math.PI / 6;

  const stop = useCallback(() => {
    session.current++;
    player.current?.stop();
    setPlaying(false);
    setStarting(false);
  }, []);

  useEffect(() => {
    const audio = new ClimateAuditionPlayer();
    player.current = audio;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => {
      session.current++;
      document.removeEventListener('visibilitychange', hide);
      audio.dispose();
      player.current = null;
    };
  }, [stop]);
  useEffect(() => { player.current?.setVolume(volume); }, [volume]);
  useEffect(() => { if (!active) stop(); }, [active, stop]);

  async function audition(nextYear = year, nextMonth = month) {
    stop();
    setError('');
    const next = compileClimateEvent(getClimateMonth(nextYear, nextMonth));
    onStart();
    if (next.kind === 'rest') return;
    const token = ++session.current;
    setStarting(true);
    try {
      const started = await player.current?.play(next, () => {
        if (token === session.current) setPlaying(false);
      });
      if (token === session.current) { setStarting(false); setPlaying(Boolean(started)); }
    } catch {
      if (token === session.current) {
        player.current?.stop();
        setStarting(false);
        setPlaying(false);
        setError('Sound could not start. Press Hear this month to try again. You can still explore every measurement.');
      }
    }
  }

  function choose(nextYear: number, nextMonth: number) {
    setYear(nextYear);
    setMonth(nextMonth);
    void audition(nextYear, nextMonth);
  }

  return <section id="climate-spiral" className="climate-explore content-width" aria-labelledby="climate-title">
    <div className="climate-intro">
      <div><span className="eyebrow"><span className="live-dot"/> TerraJuke · CLIMATE SPIRAL</span><h2 id="climate-title">A moment in time.<br/><span>A note of change.</span></h2></div>
      <p>Explore NASA’s global temperature record, one month at a time. Choose a moment, hear its anomaly, and discover what the note means.</p>
    </div>
    <div className="climate-layout">
      <figure className="climate-visual">
        <div className="climate-visual-heading"><span>NASA EARTH INFORMATION CENTER</span><span>SVS 5190 <ArrowUpRight size={12}/></span></div>
        <div className="climate-image-wrap">
          {imageFailed ? <p className="climate-image-error">The NASA overview could not load. The monthly measurements and sound are still available.</p> : <img src={climateSnapshot.provenance.visual.localSource} width="1080" height="1080" alt="NASA Climate Spiral: monthly global temperature anomalies from 1880 into 2026. Month labels encircle the record; the source image’s centre reads 2026." onError={() => setImageFailed(true)}/>}
          {!imageFailed && <svg className="climate-month-marker" viewBox="0 0 1080 1080" aria-hidden="true"><circle cx={540 + Math.sin(angle) * 455} cy={540 - Math.cos(angle) * 455} r="36"/></svg>}
        </div>
        <figcaption><span className="climate-marker-key"/> Calendar marker: <strong>{MONTHS[month - 1]}</strong>. It identifies the month label, not an exact point on a historical curve.</figcaption>
        <p className="climate-visual-credit">NASA’s Scientific Visualization Studio · source overview includes 2026. Selected measurement: {MONTHS[month - 1]} {year}.</p>
      </figure>
      <div className="climate-controls">
        <div className="climate-mode-row"><span className="climate-mode"><Headphones size={13}/> EXPLORE</span><span>DATA ONLY · NO ACCOMPANIMENT</span></div>
        <div className="climate-year-row"><label htmlFor="climate-year">Choose a year</label><select id="climate-year" value={year} onChange={e => choose(Number(e.target.value), month)}>{climateYears.map(value => <option key={value} value={value}>{value}{value === latestYear && lastMonth < 12 ? ' · partial year' : ''}</option>)}</select></div>
        <div className="climate-measurement" aria-live="polite" aria-atomic="true">
          <span>{MONTHS[month - 1]} {year}</span>
          <strong>{observation.anomaly === null ? 'Not available' : formatAnomaly(observation.anomaly)}</strong>
          <p>{observation.anomaly === null ? 'No observation is included for this month. No note will play.' : 'Global land–ocean temperature anomaly'}</p>
          <small>Relative to the 1951–1980 average for this month</small>
        </div>
        <div className="climate-months" role="group" aria-label="Choose a month">{MONTHS.map((name, i) => {
          const point = getClimateMonth(year, i + 1);
          return <button key={name} type="button" aria-label={`${name}${point.anomaly === null ? ' — no observation' : ''}`} aria-pressed={month === i + 1} disabled={point.anomaly === null} onClick={() => choose(year, i + 1)}>{name.slice(0, 3)}</button>;
        })}</div>
        <label className="sr-only" htmlFor="climate-month">Selected climate month</label>
        <input id="climate-month" className="climate-month-slider" type="range" min="1" max="12" step="1" value={month} aria-valuetext={`${MONTHS[month - 1]} ${year}, ${observation.anomaly === null ? 'no observation' : formatAnomaly(observation.anomaly)}`} onChange={e => choose(year, Number(e.target.value))}/>
        {incomplete && <p className="climate-partial">{year} is incomplete in this snapshot. January–{MONTHS[lastMonth - 1]} are available.</p>}
        <div className="climate-transport"><button type="button" className="primary-button" disabled={!available} onClick={() => playing || starting ? stop() : void audition()}>{playing || starting ? <Square size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}{starting ? 'Stop starting audio' : playing ? 'Stop note' : 'Hear this month'}</button><label className="climate-volume"><Volume2 size={16}/><span className="sr-only">Climate volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></label></div>
        <div className="climate-style"><span className="climate-style-active"><AudioLines size={15}/> Electronic</span><span className="climate-style-pending">Sape & Gong · under review</span></div>
        <div className="climate-band-readout">{event.kind === 'note' ? <><span>ANOMALY BAND {event.bandIndex + 1} OF 5</span><strong>{BAND_LABELS[event.bandIndex]}°C</strong></> : <span>{event.reason === 'missing' ? 'NO OBSERVATION · SILENCE' : 'OUTSIDE THE APPROVED SOUND RANGE · SILENCE'}</span>}</div>
        {error && <p className="climate-error" role="alert">{error}</p>}
      </div>
    </div>
    <div className="climate-explanation"><CircleHelp size={19}/><p><strong>What am I hearing?</strong> Each month’s published anomaly selects one of five fixed pitch bands. Higher anomalies produce higher or equal notes. Different values in the same band sound alike. This is a musical interpretation of measurements, not a recording of Earth.</p></div>
    <details className="climate-sources"><summary>Science, sound & source credits <ArrowUpRight size={13}/></summary><div>
      <p><strong>NASA GISS · GISTEMP v4.</strong> {climateSnapshot.validMonths.toLocaleString('en')} valid monthly estimates, January 1880–{MONTHS[lastMonth - 1]} {latestYear}. Fixed snapshot retrieved 18 October 2026; the app makes no live-data request. Values are anomalies in °C, not absolute temperatures or anomalies relative to a pre-industrial baseline.</p>
      <p><strong>Visual and data dates.</strong> SVS 5190 lists a September 11, 2026 update. Its curves and this later data snapshot may differ because GISTEMP revises historical estimates. The marker highlights a month label, not a matching curve point. A larger anomaly does not necessarily mean a hotter absolute month than another season.</p>
      <p><strong>Sound.</strong> Electronic reference tuning, five ordered pitches. This tuning has not been verified against the family’s sape recordings. Sarawak samples are not included in this milestone. Pitch bands convey broad differences; the numeric display retains the published values. Uncertainty is not encoded in the sound.</p>
      <p>{climateSnapshot.provenance.citation} Visual: {climateSnapshot.provenance.visual.credit}</p>
      <div className="climate-source-links"><a href={climateSnapshot.provenance.sourcePage} target="_blank" rel="noreferrer">NASA GISTEMP <ArrowUpRight size={12}/></a><a href={climateSnapshot.provenance.visual.sourcePage} target="_blank" rel="noreferrer">NASA Climate Spiral <ArrowUpRight size={12}/></a><a href={climateSnapshot.provenance.visual.eicEvidence} target="_blank" rel="noreferrer">EIC dashboard <ArrowUpRight size={12}/></a><a href={climateSnapshot.provenance.localSource} target="_blank" rel="noreferrer">Fixed source CSV <ArrowUpRight size={12}/></a><a href="/data/climate-spiral-provenance.json" target="_blank" rel="noreferrer">Snapshot provenance <ArrowUpRight size={12}/></a></div>
    </div></details>
  </section>;
}
