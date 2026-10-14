import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowDown, ArrowDownToLine, ArrowRight, AudioLines, Check, ChevronDown, ChevronRight, CircleHelp, Globe2, Headphones, Heart, Info, Leaf, Link2, Menu, Music2, Pause, Play, Radio, RotateCcw, Settings2, SkipForward, Sparkles, Volume2, VolumeX, Waves, X } from 'lucide-react';
import EarthGlobe from './components/EarthGlobe';
import FrameJukebox from './components/FrameJukebox';
import { tracks } from './data/earth';
import type { EarthTrack, Observation } from './data/earth';
import { EarthAudio, exportWav } from './lib/audio';
import type { Soundscape } from './lib/audio';

const locations = [
  { id: 'earth', name: 'Whole Earth', lat: 16, lon: -25, tag: 'ONE PLANET. MANY STORIES.', detail: 'A planetary perspective on the signals that connect us all.' },
  { id: 'arctic', name: 'The Arctic', lat: 74, lon: -40, tag: 'THE PLANET’S COOLING SYSTEM', detail: 'Listen to September sea ice: a shrinking shield that reflects sunlight.' },
  { id: 'pacific', name: 'Pacific Ocean', lat: 8, lon: -155, tag: 'AN OCEAN OF CHANGE', detail: 'Follow global sea level and the carbon signal measured at Mauna Loa.' },
  { id: 'amazon', name: 'The Amazon', lat: -8, lon: -60, tag: 'CONNECTED BY A SHARED ATMOSPHERE', detail: 'Explore global warming and the atmospheric carbon cycle from a forest perspective.' },
];
const moods: { id: Soundscape; name: string; description: string }[] = [
  { id: 'ambient', name: 'Ambient', description: 'Soft tones, space to listen' },
  { id: 'piano', name: 'Keys', description: 'A clear, melodic signal' },
  { id: 'pulse', name: 'Pulse', description: 'Feel the rhythm of change' },
];
const trackVisuals: Record<string, { eyebrow: string; title: string; icon: typeof Globe2; color: string; short: string }> = {
  temperature: { eyebrow: '01 / TEMPERATURE', title: 'A warmer world', icon: Globe2, color: '#f4ad81', short: 'NASA GISTEMP' },
  co2: { eyebrow: '02 / ATMOSPHERE', title: 'The carbon rhythm', icon: Leaf, color: '#bfed7b', short: 'NOAA GML' },
  'sea-level': { eyebrow: '03 / OCEANS', title: 'Oceans on the rise', icon: Waves, color: '#82cfe5', short: 'NOAA' },
  'sea-ice': { eyebrow: '04 / CRYOSPHERE', title: 'The vanishing ice', icon: Sparkles, color: '#b9abed', short: 'NSIDC' },
};
const readSettings = () => {
  const p = new URLSearchParams(window.location.search);
  const selected = tracks.find(t => t.id === p.get('track')) ?? tracks[0];
  return { track: selected.id, sound: moods.find(m => m.id === p.get('sound'))?.id ?? 'ambient' as Soundscape, tempo: Math.max(40, Math.min(160, Number(p.get('tempo')) || 90)), start: Number(p.get('from')) || 1980, end: Number(p.get('to')) || selected.observations.at(-1)!.year };
};
const initial = readSettings();
const formatValue = (value: number, track: EarthTrack) => `${value > 0 && track.id === 'temperature' ? '+' : ''}${value.toFixed(track.precision)}`;
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function MiniWave({ seed, active = false }: { seed: number; active?: boolean }) {
  return <div className={`mini-wave ${active ? 'wave-active' : ''}`} aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ height: `${12 + Math.abs(Math.sin(i * 1.9 + seed) * Math.cos(i * .41 + seed)) * 40}px`, animationDelay: `${i * -.13}s` }} />)}</div>;
}

function DataChart({ points, track, index, onSeek }: { points: Observation[]; track: EarthTrack; index: number; onSeek: (index: number) => void }) {
  const values = points.map(p => p.value);
  const min = Math.min(...values), max = Math.max(...values), pad = (max - min || 1) * .14;
  const low = min - pad, high = max + pad, width = 900, height = 190;
  const x = (i: number) => 48 + i / Math.max(1, points.length - 1) * (width - 70);
  const y = (v: number) => 12 + (high - v) / (high - low) * (height - 42);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
  const current = points[index] ?? points[0];
  return <div className="chart-wrap">
    <svg className="data-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${track.title}: ${points.length} annual observations from ${points[0].year} to ${points.at(-1)!.year}. ${current.year}: ${formatValue(current.value, track)} ${track.unit}.`}>
      <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".18"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
      {[0, 1, 2, 3].map(i => { const v = low + (high - low) * i / 3; return <g key={i}><line x1="48" y1={y(v)} x2="879" y2={y(v)} stroke="#253039" strokeDasharray="3 5"/><text x="0" y={y(v) + 4} fill="#88969e" fontSize="11">{v.toFixed(track.precision)}</text></g>; })}
      <path d={`${path} L${x(points.length - 1)},${height - 25} L48,${height - 25} Z`} fill="url(#chart-fill)"/>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1={x(index)} y1="8" x2={x(index)} y2={height - 25} stroke="currentColor" strokeOpacity=".55" strokeDasharray="4 4"/>
      <circle cx={x(index)} cy={y(current.value)} r="5" fill="currentColor" stroke="#0b141b" strokeWidth="3"/>
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(i => <text key={i} x={x(i)} y={height - 2} textAnchor="middle" fill="#88969e" fontSize="11">{points[i].year}</text>)}
    </svg>
    <label className="sr-only" htmlFor="playback-position">Playback position</label>
    <input id="playback-position" className="chart-seek" type="range" min="0" max={points.length - 1} value={index} onChange={e => onSeek(Number(e.target.value))} aria-valuetext={`${current.year}, ${formatValue(current.value, track)} ${track.unit}`} />
  </div>;
}

export default function App() {
  const [trackId, setTrackId] = useState(initial.track);
  const [locationId, setLocationId] = useState('earth');
  const [soundscape, setSoundscape] = useState<Soundscape>(initial.sound);
  const [tempo, setTempo] = useState(initial.tempo);
  const [yearStart, setYearStart] = useState(initial.start);
  const [yearEnd, setYearEnd] = useState(initial.end);
  const [volume, setVolume] = useState(.55);
  const [playing, setPlaying] = useState(false);
  const [visualPlaying, setVisualPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [modal, setModal] = useState<'about' | 'mix' | 'saved' | null>(null);
  const [saved, setSaved] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem('earth-fm-saved') ?? '[]'); return Array.isArray(v) ? v.filter(id => typeof id === 'string' && tracks.some(t => t.id === id)) : []; } catch { return []; } });
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef<EarthAudio | null>(null);
  const session = useRef(0);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const track = tracks.find(t => t.id === trackId)!;
  const visual = trackVisuals[track.id];
  const loc = locations.find(l => l.id === locationId)!;
  const points = useMemo(() => { const result = track.observations.filter(p => p.year >= yearStart && p.year <= yearEnd); return result.length >= 2 ? result : track.observations; }, [track, yearStart, yearEnd]);
  const index = Math.min(playIndex, points.length - 1);
  const current = points[index];
  const latest = track.observations.at(-1)!;
  const elapsed = index * 60 / tempo, duration = points.length * 60 / tempo;

  useEffect(() => { audioRef.current = new EarthAudio(); return () => { session.current++; audioRef.current?.dispose(); }; }, []);
  useEffect(() => { audioRef.current?.setVolume(volume); }, [volume]);
  useEffect(() => { try { localStorage.setItem('earth-fm-saved', JSON.stringify(saved)); } catch { /* Storage is optional. */ } }, [saved]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!modal) return;
    triggerRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
      if (e.key !== 'Tab') return;
      const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]') ?? []);
      const first = focusables[0], last = focusables.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', key); triggerRef.current?.focus(); };
  }, [modal]);

  const stop = () => { session.current++; audioRef.current?.stop(); setPlaying(false); };
  const chooseTrack = (id: string) => { stop(); setTrackId(id); setPlayIndex(0); const t = tracks.find(t => t.id === id)!; setYearStart(Math.max(1980, t.observations[0].year)); setYearEnd(t.observations.at(-1)!.year); };
  const chooseLocation = (id: string) => { setLocationId(id); if (id === 'arctic' && tracks.some(t => t.id === 'sea-ice')) chooseTrack('sea-ice'); if (id === 'pacific') chooseTrack('sea-level'); if (id === 'amazon') chooseTrack('co2'); };
  const begin = async (from = index) => {
    const activeSession = ++session.current;
    const offset = from >= points.length - 1 ? 0 : from;
    setPlayIndex(offset);
    try {
      await audioRef.current?.start(points.slice(offset), { soundscape, tempo, volume, pitchRange: { min: Math.min(...points.map(p => p.value)), max: Math.max(...points.map(p => p.value)) }, onStep: i => { if (activeSession === session.current) setPlayIndex(offset + i); }, onEnd: () => { if (activeSession === session.current) setPlaying(false); } });
      if (activeSession === session.current) setPlaying(true);
    } catch { if (activeSession === session.current) { setPlaying(false); setNotice('Audio could not start. Try again in a browser with Web Audio support.'); } }
  };
  const togglePlay = () => { if (playing) stop(); else void begin(); };
  const seek = (i: number) => { const wasPlaying = playing; stop(); setPlayIndex(i); if (wasPlaying) void begin(i); };
  const toggleSave = (id: string) => { setSaved(s => s.includes(id) ? s.filter(v => v !== id) : [...s, id]); };
  const adjust = (fn: () => void) => { stop(); setPlayIndex(0); fn(); };
  const scrollPlayer = () => document.getElementById('listen')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const share = async () => {
    const url = new URL(window.location.href); url.search = new URLSearchParams({ track: track.id, sound: soundscape, tempo: String(tempo), from: String(points[0].year), to: String(points.at(-1)!.year) }).toString();
    try { await navigator.clipboard.writeText(url.toString()); setNotice('Mix link copied. Share your planet’s soundtrack.'); }
    catch { window.history.replaceState(null, '', url); setNotice('Mix saved in the address bar. Copy the URL to share it.'); }
  };
  const download = async () => {
    setExporting(true);
    try {
      const blob = await exportWav(points, { soundscape, tempo, volume });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `earth-fm-${track.id}-${points[0].year}-${points.at(-1)!.year}.wav`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice('Your WAV is ready. The same data, the same notes, yours to keep.');
    } catch { setNotice('Audio export failed. Please try a shorter year range.'); }
    finally { setExporting(false); }
  };

  return <>
    <a className="skip-link" href="#listen">Skip to the jukebox</a>
    <header className="site-header">
      <a className="brand" href="#" aria-label="Earth FM home"><span className="brand-mark"><Globe2 size={23}/></span><span>earth<span className="brand-fm">fm</span><sup>↗</sup></span></a>
      <nav aria-label="Main navigation" className={menuOpen ? 'nav-open' : ''}><a href="#visual-radio" onClick={() => setMenuOpen(false)}>Visual radio</a><a href="#tracks" onClick={() => setMenuOpen(false)}>The collection</a><button onClick={() => { setModal('about'); setMenuOpen(false); }}>Behind the sound <span>↗</span></button></nav>
      <button className="saved-button" onClick={() => setModal('saved')}><Headphones size={16}/><span>My collection</span>{saved.length > 0 && <span className="saved-count">{saved.length}</span>}</button>
      <button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu size={22}/></button>
    </header>

    <main>
      <section id="explore" className="hero content-width">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> THE EARTH INFORMATION JUKEBOX</div>
          <h1>Our planet.<br/>A thousand stories.<br/><span>One soundtrack.</span></h1>
          <p>What if you could hear the Earth changing?<br className="desktop-break"/> Turn NASA visuals and climate data into music.<br className="desktop-break"/> Connect with the place we all call home.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => { document.getElementById('visual-radio')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); document.getElementById('play-visual-button')?.click(); }}><Play size={15} fill="currentColor"/> Listen to the Earth <ArrowRight size={17}/></button><button className="text-button" onClick={() => setModal('about')}><CircleHelp size={16}/> How it works</button></div>
          <div className="hero-proof"><span><i/> REAL OBSERVATIONS</span><span><i/> NO API KEY NEEDED</span><span><i/> MADE FOR EVERYONE</span></div>
        </div>
        <div className="hero-globe"><div className="globe-heading"><span><span className="live-dot"/> EARTH SIGNAL</span><span>VOL. 01 — OUR CHANGING PLANET</span></div><EarthGlobe locations={locations} selectedId={locationId} onSelect={chooseLocation} playing={playing || visualPlaying}/><div className="globe-caption"><span><Globe2 size={13}/> {loc.tag}</span><span>DRAG TO EXPLORE <span className="drag-icon">↔</span></span></div></div>
      </section>

      <div className="signal-strip"><div className="content-width signal-inner"><span><AudioLines size={17}/> SMALL SIGNALS. BIG STORIES.</span><span>Temperature <i/> Atmosphere <i/> Oceans <i/> Ice</span><span>SCROLL TO TUNE IN <ArrowDown size={13}/></span></div></div>

      <FrameJukebox climatePlaying={playing} onStart={stop} onPlayingChange={setVisualPlaying}/>

      <section id="tracks" className="content-width collection-section">
        <div className="section-heading"><div><div className="eyebrow muted">THE PLANET’S PLAYLIST</div><h2>Four signals. A world of change.</h2></div><span className="section-note">Science you can see.<br/>Stories you can hear.</span></div>
        <div className="track-grid">{tracks.map((t, i) => { const v = trackVisuals[t.id]; const Icon = v.icon; const selected = trackId === t.id; return <article key={t.id} className={`track-card ${selected ? 'selected' : ''}`} style={{ '--track-color': v.color } as CSSProperties}>
          <div className="card-top"><span className="track-icon"><Icon size={19}/></span><button className={`favorite-button ${saved.includes(t.id) ? 'is-saved' : ''}`} onClick={() => toggleSave(t.id)} aria-label={`${saved.includes(t.id) ? 'Remove' : 'Save'} ${v.title}`} aria-pressed={saved.includes(t.id)}><Heart size={16} fill={saved.includes(t.id) ? 'currentColor' : 'none'}/></button></div>
          <button className="track-select" onClick={() => { chooseTrack(t.id); scrollPlayer(); }} aria-pressed={selected}><span className="card-eyebrow">{v.eyebrow}</span><h3>{v.title}</h3><span className="track-card-description">{t.subtitle}</span><MiniWave seed={i + 2} active={selected && playing}/><span className="card-bottom"><span>{v.short} <span className="source-dot">·</span> {t.observations[0].year}–{t.observations.at(-1)!.year}</span><span className="card-play">{selected ? <AudioLines size={15}/> : <ArrowRight size={15}/>}</span></span></button>
        </article>; })}</div>
      </section>

      <section id="listen" className="content-width listening-section" style={{ '--track-color': visual.color } as CSSProperties}>
        <div className="section-heading"><div><div className="eyebrow muted">YOUR LISTENING ROOM</div><h2>Tune into a different perspective.</h2></div><button className="outline-button" onClick={() => setModal('mix')}><Settings2 size={15}/> Make it your own</button></div>
        <div className="listening-layout">
          <aside className="perspective-panel"><div className="panel-label"><Globe2 size={15}/> A PLACE TO LISTEN FROM</div>{locations.map(l => <button key={l.id} className={`place-option ${locationId === l.id ? 'active' : ''}`} aria-pressed={locationId === l.id} onClick={() => chooseLocation(l.id)}><span className="place-dot"/><span>{l.name}</span>{locationId === l.id ? <AudioLines size={15}/> : <ChevronRight size={14}/>}</button>)}<div className="perspective-note"><span className="eyebrow">{loc.tag}</span><p>{loc.detail}</p><p className="coverage-note">Places suggest a track. Each recording uses the dataset’s original coverage, shown in the player.</p></div><div className="headphones-note"><Headphones size={18}/><span>A little space. A pair of headphones.<br/>A whole new perspective.</span></div></aside>
          <div className="player-panel">
            <div className="player-heading"><div className="record-icon"><visual.icon size={23}/></div><div><span className="eyebrow muted">{playing ? 'NOW PLAYING' : 'READY WHEN YOU ARE'} <span className={playing ? 'playing-indicator' : ''}/></span><h3>{visual.title}</h3><p>{track.coverage} <span>·</span> {track.unit}</p></div><button className={`favorite-button ${saved.includes(track.id) ? 'is-saved' : ''}`} onClick={() => toggleSave(track.id)} aria-label={`${saved.includes(track.id) ? 'Remove' : 'Save'} current track`} aria-pressed={saved.includes(track.id)}><Heart size={19} fill={saved.includes(track.id) ? 'currentColor' : 'none'}/></button></div>
            <div className="player-data-heading"><div><span className="observation-year">{current.year}</span><strong>{formatValue(current.value, track)} <small>{track.unit}</small></strong></div><div className="data-legend"><i/> ANNUAL OBSERVATIONS <span>{points[0].year} — {points.at(-1)!.year}</span></div></div>
            <DataChart points={points} track={track} index={index} onSeek={seek}/>
            <div className="player-controls"><div className="transport"><button className="icon-button" aria-label="Restart track" onClick={() => seek(0)}><RotateCcw size={17}/></button><button className="play-button" aria-label={playing ? 'Pause track' : 'Play track'} onClick={togglePlay}>{playing ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}</button><button className="icon-button" aria-label="Next track" onClick={() => chooseTrack(tracks[(tracks.findIndex(t => t.id === trackId) + 1) % tracks.length].id)}><SkipForward size={18}/></button><span className="time-display">{formatTime(elapsed)} <span>/ {formatTime(duration)}</span></span></div><div className="soundscape-select"><Music2 size={14}/><label className="sr-only" htmlFor="soundscape">Soundscape</label><select id="soundscape" value={soundscape} onChange={e => adjust(() => setSoundscape(e.target.value as Soundscape))}>{moods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><ChevronDown size={12}/></div><div className="volume-control"><button className="icon-button" aria-label={volume ? 'Mute audio' : 'Unmute audio'} onClick={() => setVolume(volume ? 0 : .55)}>{volume ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button><label className="sr-only" htmlFor="volume">Volume</label><input id="volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></div></div>
            <div className="player-footnote"><span><span className="live-dot"/> {points.length} YEARS → {points.length} NOTES <button onClick={() => setModal('about')} aria-label="Explain the data to music mapping"><Info size={13}/></button></span><button className="text-button" onClick={() => setModal('mix')}>Customize <Settings2 size={13}/></button></div>
          </div>
        </div>
        <div className="source-row"><span><Info size={14}/> {track.baseline}</span><a href={track.sourceUrl} target="_blank" rel="noreferrer">Explore the source data <ArrowRight size={13}/></a></div>
      </section>

      <section className="content-width meaning-section"><div className="meaning-intro"><span className="eyebrow muted">MORE THAN A MELODY</span><h2>A small shift in pitch.<br/>A big shift in perspective.</h2><p>When numbers become notes, change becomes something you can feel. Listen closely. There’s a story in every signal.</p></div><div className="meaning-card"><span className="step-number">01</span><AudioLines size={24}/><h3>Real data. Real change.</h3><p>{track.description}</p><span className="meaning-metric">{formatValue(latest.value, track)} <small>{track.unit}</small><span>LATEST BUNDLED OBSERVATION · {latest.year}</span></span></div><div className="meaning-card"><span className="step-number">02</span><Headphones size={24}/><h3>Let the pattern speak.</h3><p>Each year becomes one note. Higher measurements become higher pitches within this track. Hear the trend, then check the chart.</p><button className="text-button" onClick={() => setModal('about')}>Meet the science behind the sound <ArrowRight size={14}/></button></div></section>

      <section className="content-width share-banner"><div className="share-symbol"><Radio size={31}/></div><div><span className="eyebrow">GOOD STORIES ARE MEANT TO TRAVEL</span><h2>Give the Earth a little airtime.</h2><p>Make a mix. Share a signal. Start a conversation.</p></div><div className="share-actions"><button className="outline-button" onClick={() => void share()}><Link2 size={16}/> Share this mix</button><button className="primary-button" disabled={exporting} onClick={() => void download()}><ArrowDownToLine size={16}/>{exporting ? 'Rendering audio…' : 'Download your track'}</button></div></section>
    </main>

    <section className="content-width team-credit"><div><span className="eyebrow">TEAM BOBOMIMI <span className="team-heart">♥</span></span><h3>Curiosity sounds better together.</h3></div><p><strong>Chia Yuen Kai</strong><span>Team leader · Chia_0u0</span></p><p><strong>Jacy Chiong Yet Suu</strong><span>Team member · jacychiongys</span></p></section>
    <footer className="site-footer content-width"><a className="brand" href="#"><span className="brand-mark"><Globe2 size={20}/></span><span>earth<span className="brand-fm">fm</span></span></a><p>One planet. A shared frequency.</p><span>BOBOMIMI · NASA SPACE APPS <span className="footer-star">✳</span> 2026</span><button onClick={() => setModal('about')}>Data & credits <ArrowRight size={13}/></button></footer>

    {notice && <div className="toast" role="status"><Check size={17}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={16}/></button></div>}
    {modal && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Close dialog"><X size={22}/></button>
      {modal === 'about' && <><span className="eyebrow">THE SCIENCE BEHIND THE SOUND</span><h2 id="modal-title">A planet you can listen to.</h2><p>Earth FM pairs EIC-related visual frames with sound generated in your browser. A left-to-right scan maps brightness to pitch, RGB color to harmonic tone, and horizontal position to stereo pan. Videos are sampled at each note, so the soundtrack changes with the visible frame. Image pixels are visual signals, not physical measurements.</p><div className="explain-grid"><div><span>01</span><h3>Choose a signal</h3><p>Listen to NASA imagery, an EIC immersive animation, or your own visual. Explore four annual climate time series for scientific context.</p></div><div><span>02</span><h3>Listen to the pattern</h3><p>Notes use D-minor pentatonic across two octaves. Image brightness uses a fixed black-to-white scale. Climate values are normalized to the selected year range.</p></div><div><span>03</span><h3>Make it yours</h3><p>Choose a tempo and era. Share a climate mix or export audio. Video WAV exports describe the current frame; live playback follows the animation.</p></div></div><h3 className="credits-title">Open observations. Clear origins.</h3><div className="credit-list">{tracks.map(t => <a key={t.id} href={t.sourceUrl} target="_blank" rel="noreferrer"><div><strong>{trackVisuals[t.id].title}</strong><span>{t.source} · {t.observations[0].year}–{t.observations.at(-1)!.year}</span></div><ArrowRight size={17}/></a>)}</div><p className="fine-print">Team BoboMimi: Chia Yuen Kai (Chia_0u0), leader; Jacy Chiong Yet Suu (jacychiongys), member. EIC visuals are attributed earth.gov mirror assets, with archive links in the player. Observation tracks are bundled snapshots, not a live feed. Globe geography: Natural Earth, public domain. This independent prototype is not endorsed by NASA.</p></>}
      {modal === 'mix' && <><span className="eyebrow">MAKE A LITTLE SPACE FOR EARTH</span><h2 id="modal-title">Your signal. Your sound.</h2><p>Shape the way you hear <strong>{visual.title.toLowerCase()}</strong>. Every note still starts with a real observation.</p><label className="form-label">SOUNDSCAPE</label><div className="mood-options">{moods.map(m => <button key={m.id} className={soundscape === m.id ? 'active' : ''} aria-pressed={soundscape === m.id} onClick={() => adjust(() => setSoundscape(m.id))}><Music2 size={19}/><strong>{m.name}</strong><span>{m.description}</span></button>)}</div><div className="form-label tempo-label"><label htmlFor="tempo">TEMPO</label><span>{tempo} BPM</span></div><input id="tempo" className="wide-range" type="range" min="40" max="160" step="5" value={tempo} onChange={e => adjust(() => setTempo(Number(e.target.value)))}/><div className="range-captions"><span>Room to reflect</span><span>A little more energy</span></div><div className="form-label">YOUR ERA</div><div className="year-inputs"><label>From<select aria-label="Start year" value={points[0].year} onChange={e => adjust(() => setYearStart(Number(e.target.value)))}>{track.observations.filter(p => p.year < points.at(-1)!.year).map(p => <option key={p.year} value={p.year}>{p.year}</option>)}</select></label><span>→</span><label>To<select aria-label="End year" value={points.at(-1)!.year} onChange={e => adjust(() => setYearEnd(Number(e.target.value)))}>{track.observations.filter(p => p.year > points[0].year).map(p => <option key={p.year} value={p.year}>{p.year}</option>)}</select></label></div><p className="fine-print">{points.length} observations · {formatTime(duration)} of audio · notes rescale to this era. The chart always shows the original units.</p><div className="modal-actions"><button className="outline-button" onClick={() => void share()}><Link2 size={15}/> Copy mix link</button><button className="primary-button" onClick={() => { setModal(null); scrollPlayer(); void begin(0); }}><Play size={15} fill="currentColor"/> Listen to your mix</button></div></>}
      {modal === 'saved' && <><span className="eyebrow">KEEP THE SIGNALS THAT STAY WITH YOU</span><h2 id="modal-title">Your collection.</h2><p>{saved.length ? 'A few stories worth coming back to. Saved on this device.' : 'Your collection starts with a little curiosity. Tap a heart on any track to keep it here.'}</p>{saved.length ? <div className="saved-list">{saved.map(id => { const t = tracks.find(t => t.id === id)!; const Icon = trackVisuals[id].icon; return <div key={id}><Icon size={23} style={{ color: trackVisuals[id].color }}/><button onClick={() => { chooseTrack(id); setModal(null); scrollPlayer(); }}>{trackVisuals[id].title}<span>{t.source}</span></button><button className="icon-button" aria-label={`Remove ${trackVisuals[id].title} from collection`} onClick={() => toggleSave(id)}><X size={17}/></button></div>; })}</div> : <div className="empty-collection"><Headphones size={48}/><span>A whole planet is waiting.</span><button className="primary-button" onClick={() => { setModal(null); document.getElementById('tracks')?.scrollIntoView(); }}>Explore the collection <ArrowRight size={16}/></button></div>}</>}
    </div></div>}
  </>;
}
