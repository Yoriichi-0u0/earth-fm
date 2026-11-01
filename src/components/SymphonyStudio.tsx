import { useEffect, useMemo, useRef, useState } from 'react';
import { climateSnapshot, climateYears, getClimateMonth } from '../data/climateSpiral';
import { MONTHS, formatAnomaly } from '../lib/climateMapping';
import type { MonthlyObservation } from '../lib/climateMapping';
import { defaults, mapData, NOTES, TIMBRES, renderScore, SymphonyPlayer, wav } from '../lib/symphony';
import type { Settings, Style, Timbre } from '../lib/symphony';
import DataSoundGuide from './DataSoundGuide';
import { StudioLanguageProvider, useStudioLanguage } from '../lib/studioLanguage';
import type { Language } from '../lib/studioLanguage';
import './SymphonyStudio.css';
const modes = ['Earth Journey', 'Earth Remix Studio', 'Data Lab'] as const;
const yearPoints = (year: number) => MONTHS.map((_, i) => getClimateMonth(year, i + 1));

function Spiral({ current, playing }: { current: MonthlyObservation; playing: boolean }) {
  const {t,language} = useStudioLanguage();
  const [tilt, setTilt] = useState(30), [rotation, setRotation] = useState(0), [flat, setFlat] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  function project(anomaly: number, month: number, year: number) {
    const angle = (month - 1) * Math.PI / 6 + rotation * Math.PI / 180;
    const radius = 65 + (anomaly + 1) * 65;
    const x = radius * Math.sin(angle), y = -radius * Math.cos(angle);
    const z = flat ? 0 : (year - 1953) * 1.25;
    const a = (flat ? 0 : tilt) * Math.PI / 180;
    return [300 + x, 280 + y * Math.cos(a) - z * Math.sin(a)];
  }
  const paths = useMemo(() => climateSnapshot.years.map(row => {
    let path = '', connected = false;
    row.months.forEach((value, i) => { if (value === null) { connected = false; return; } const [x,y] = project(value,i+1,row.year); path += `${connected ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `; connected = true; });
    return { year: row.year, path };
  }), [flat, tilt, rotation]);
  const selected = current.anomaly === null ? null : project(current.anomaly,current.month,current.year);
  return <figure className="ss-spiral"><div className="ss-figure-top"><span>{t("01 / CLIMATE SPIRAL")}</span><button onClick={() => setFlat(!flat)}>{t(flat ? 'Explore 3D' : 'Use 2D')}</button></div>
    <svg viewBox="0 0 600 560" role="img" aria-label={t("Global monthly temperature anomalies: angle is month, radius is anomaly, height is year in 3D. Cyan marker shows the selected observation.")}>
      <defs><radialGradient id="ss-halo"><stop stopColor="#734de2" stopOpacity=".24"/><stop offset="1" stopColor="#734de2" stopOpacity="0"/></radialGradient></defs>
      <circle cx="300" cy="280" r="265" fill="url(#ss-halo)"/>
      {[-1,0,1,1.5].map(value => <g key={value}><path d={Array.from({length:73},(_,i) => { const [x,y] = project(value,1+i/6,1953); return `${i ? 'L':'M'}${x},${y}`; }).join(' ')} fill="none" stroke="#66828c" strokeOpacity=".35" strokeDasharray="3 5"/></g>)}
      {paths.map(row => <path key={row.year} d={row.path} fill="none" stroke={row.year === current.year ? '#f8eed8' : `hsl(${205-(row.year-1880)/146*195} 85% 65%)`} strokeWidth={row.year === current.year ? 2.8 : .7} opacity={row.year === current.year ? 1 : .36}/>) }
      {MONTHS.map((name,i) => { const [x,y] = project(1.9,i+1,1953); return <text key={name} x={x} y={y} textAnchor="middle" fill="#b7cbd5" fontSize="11">{language==='zh' ? t(name) : name.slice(0,3).toUpperCase()}</text>; })}
      {selected && <g><circle cx={selected[0]} cy={selected[1]} r={playing ? 16 : 10} fill="#7efce1" opacity=".13"/><circle cx={selected[0]} cy={selected[1]} r="5" fill="#7efce1" stroke="#fff"/></g>}
    </svg>
    <figcaption>{t("1880 → 2026 · radius = anomaly · angle = month")}{!flat && t(' · height = year')}<br/>{t("Reference rings: −1 / 0 / +1 / +1.5°C. White: selected year. Cyan: selected measurement. Halo: decoration only.")}</figcaption>
    <div className="ss-view-controls"><label>{t("Rotate")} <input aria-label={t("Rotate spiral")} type="range" min="-180" max="180" value={rotation} onChange={e=>setRotation(+e.target.value)}/></label>{!flat && <label>{t("Tilt")} <input aria-label={t("Tilt spiral")} type="range" min="0" max="65" value={tilt} onChange={e=>setTilt(+e.target.value)}/></label>}</div>
  </figure>;
}
function StudioContent() {
  const {t,date,language,setLanguage} = useStudioLanguage();
  const [mode,setMode] = useState<typeof modes[number]>('Earth Journey');
  const [settings,setSettings] = useState<Settings>(defaults);
  const [year,setYear] = useState(2025), [month,setMonth] = useState(1), [compare,setCompare] = useState(1880);
  const [audible,setAudible] = useState<MonthlyObservation | null>(null);
  const [playing,setPlaying] = useState(false), [status,setStatus] = useState('Ready when you are. Start with a 25-second journey.');
  const [exporting,setExporting] = useState(false);
  const player = useRef<SymphonyPlayer | null>(null), token = useRef(0);
  const current = audible ?? getClimateMonth(year,month), event = mapData(current);
  const stop = () => { token.current++; player.current?.stop(); setPlaying(false); setAudible(null); setStatus('Stopped. Ready to play your selection.'); };
  useEffect(() => { const engine = new SymphonyPlayer(); player.current = engine; const hide = () => { if(document.hidden) { token.current++; engine.stop(); setPlaying(false); } }; document.addEventListener('visibilitychange',hide); return () => { token.current++; engine.dispose(); document.removeEventListener('visibilitychange',hide); }; },[]);
  function update(patch: Partial<Settings>) { stop(); setSettings(value=>({...value,...patch})); setStatus('Mix updated. Press play to hear it.'); }
  async function play(points: MonthlyObservation[], fixed = false, dataOnly = false) {
    stop(); const id = token.current; setPlaying(true); setStatus('Starting audio…');
    try { await player.current!.play(points,{...settings,dataOnly: dataOnly || settings.dataOnly,tempo:fixed ? 60 : settings.tempo},index => { if(id !== token.current) return; setAudible(points[index]); setStatus('Playing'); },()=>{ if(id===token.current) { setPlaying(false); setAudible(null); setStatus('Complete. Explore another mix or compare years.'); } }); }
    catch { if(id===token.current) { stop(); setStatus('Audio could not start. Press play to try again.'); } }
  }
  function select(y:number,m:number) { stop(); setYear(y); setMonth(m); }
  async function download() {
    setExporting(true);
    try { const context = new OfflineAudioContext(1,Math.ceil(24.8*44100),44100); renderScore(context,context.destination,yearPoints(year),{...settings,tempo:60},0); const result = await context.startRendering(); const url=URL.createObjectURL(wav(result)); const a=document.createElement('a'); a.href=url; a.download=`Earth-Symphony-${year}-${settings.dataOnly ? 'Data-Only' : settings.style.replaceAll(' ','-')}-${settings.timbre.replaceAll(' ','-')}.wav`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); setStatus('25-second WAV exported from the same sound engine.'); } catch { setStatus('Audio export failed. You can still use live playback.'); } finally {setExporting(false);} }
  const yearSelect = (value:number, change:(year:number)=>void,label:string) => <label>{t(label)}<select value={value} onChange={e=>change(+e.target.value)}>{climateYears.map(y=><option key={y}>{y}</option>)}</select></label>;
  return <main className="ss" lang={language==='zh'?'zh-Hans':'en'}><header className="ss-header"><a href="?studio=1" className="ss-brand">◉ <span>EARTH FM <small>SYMPHONY STUDIO / 2.0</small></span></a><label className="ss-language">{t("Language")}<select aria-label={t("Language")} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en" lang="en">English</option><option value="zh" lang="zh-Hans">简体中文</option></select></label><span className="ss-local">{t("STUDIO BETA")}</span><a href="?legacy=1">Earth FM 1.0 ↗</a></header>
    <section className="ss-intro"><p className="ss-kicker">{t("OUR PLANET HAS A PATTERN. FIND YOUR SOUND.")}</p><h1>Earth Symphony<br/><em>Studio.</em></h1><p className="ss-tagline">{t("Hear the Data. Shape the Music. Explore the Earth.")}</p><p className="ss-description">{t("146 years of climate history. Ten notes. A new way to listen.")}<br/>{t("Real NASA measurements become music you can explore.")}</p></section>
    <nav className="ss-tabs" aria-label={t("Studio modes")}>{modes.map((name,i)=><button key={name} aria-pressed={mode===name} onClick={()=>{stop();setMode(name);}}><span>0{i+1}</span>{t(name)}</button>)}</nav>
    <section className="ss-workspace"><Spiral current={current} playing={playing}/><div className="ss-panel"><p className="ss-kicker">{t(mode === 'Earth Journey' ? 'LISTEN / DISCOVER' : mode === 'Data Lab' ? 'OBSERVE / COMPARE' : 'CREATE / REMIX')}</p><h2>{t(mode === 'Earth Journey' ? 'Listen to a changing world.' : mode === 'Data Lab' ? 'Every note has a number.' : 'Your planet. Your mix.')}</h2>
      <p className="ss-help">{t(mode === 'Earth Journey' ? 'Start with January–December 2025. Hear twelve monthly measurements in 25 seconds, then travel through another year.' : mode === 'Data Lab' ? 'Compare the same calendar months across two years. The pitch scale and playback speed stay identical.' : 'Shape the accompaniment and texture. The data melody keeps its original scientific pitch.')}</p>
      <div className="ss-measure"><span>{date(current.year,current.month,MONTHS[current.month-1])} {t("/ GLOBAL")}</span><strong>{current.anomaly===null ? t('No observation') : formatAnomaly(current.anomaly)}</strong><small>{t("Land–ocean anomaly · 1951–1980 monthly baseline")}</small><div>{event.kind==='note' ? `${NOTES[event.bandIndex]} · ${event.frequencyHz.toFixed(2)} Hz · ${t('Band').toLowerCase()} ${event.bandIndex+1}/10` : t('Silence · no mapped note')}</div></div>
      <a className="ss-explain-link" href="#data-to-sound">{t("Why this note? ↓")}</a>
      <div className="ss-selects">{yearSelect(year,y=>select(y,month),'Year A')}{mode==='Data Lab' && yearSelect(compare,y=>{stop();setCompare(y);},'Year B')}</div>
      <div className="ss-months">{MONTHS.map((name,i)=><button key={name} aria-pressed={month===i+1} onClick={()=>select(year,i+1)}>{language==='zh' ? t(name) : name.slice(0,3)}</button>)}</div>
      <label className="ss-timbre">{t("Melody tone")}<select value={settings.timbre} onChange={e=>update({timbre:e.target.value as Timbre})}>{TIMBRES.map(tone=><option key={tone} value={tone}>{t(tone)}</option>)}</select><small>{t("Choose your sound. Every tone keeps the same NASA pitch.")}</small></label>
      <div className="ss-styles" aria-label={t("Music style")}>{(['Ambient','Electronic Pulse','Cinematic'] as Style[]).map(style=><button key={style} aria-pressed={settings.style===style} onClick={()=>update({style})}>{t(style)}</button>)}</div>
      <label className="ss-toggle"><input type="checkbox" checked={settings.dataOnly} onChange={e=>update({dataOnly:e.target.checked})}/><span>{t("Hear Data Only")}<small>{t("Selected tone · one note per month · no accompaniment")}</small></span></label>
      {mode==='Earth Remix Studio' && <div className="ss-mix"><label><input type="checkbox" disabled={settings.dataOnly} checked={settings.drums} onChange={e=>update({drums:e.target.checked})}/> {t("Rhythm / drums")}</label><label><input type="checkbox" disabled={settings.dataOnly} checked={settings.harmony} onChange={e=>update({harmony:e.target.checked})}/> {t("Harmony")}</label><label>{t("Tempo ·")} {settings.tempo} BPM<input type="range" min="48" max="120" value={settings.tempo} onChange={e=>update({tempo:+e.target.value})}/></label><label>{t("Space / echo")}<input type="range" disabled={settings.dataOnly} min="0" max="1" step=".05" value={settings.space} onChange={e=>update({space:+e.target.value})}/></label><label>{t("Brightness")}<input type="range" min="800" max="6000" step="100" value={settings.brightness} onChange={e=>update({brightness:+e.target.value})}/></label></div>}
      <div className="ss-transport"><button className="ss-primary" onClick={()=>playing ? stop() : void play(yearPoints(year),mode!=='Earth Remix Studio')}>{playing ? `■ ${t('Stop')}` : `▶ ${t('Play year')} · ${mode==='Earth Remix Studio' ? Math.round(1440/settings.tempo+.8) : 25}${t('s')}`}</button>{mode==='Data Lab' && <><button onClick={()=>void play([current],true)}>{t("Hear month")}</button><button onClick={()=>void play([...yearPoints(year),...yearPoints(compare)],true)}>{t("A → B · 49s")}</button></>}</div>
      <label className="ss-volume">{t("Volume")}<input aria-label={t("Master volume")} type="range" min="0" max="1" step=".05" value={settings.volume} onChange={e=>{ const volume=+e.target.value; setSettings(value=>({...value,volume})); player.current?.setVolume(volume); }}/></label><p role="status" className="ss-status">{status==='Playing' && audible ? date(audible.year,audible.month,MONTHS[audible.month-1]) : t(status)}</p><button className="ss-export" disabled={exporting} onClick={()=>void download()}>{t(exporting ? 'Rendering…' : '↓ Export 25s audition WAV')}</button>
    </div></section>
    <DataSoundGuide current={current} onHear={points=>{ setSettings(value=>({...value,dataOnly:true})); void play(points,true,true); }}/>
    <section className="ss-foundation"><article><span>{t("01 / DATA MELODY")}</span><h3>{t("Science sets the note.")}</h3><p>{t("Fixed −1.00 to +1.50°C range, ten equal 0.25°C bands. C3 D3 E3 G3 A3 C4 D4 E4 G4 A4. Lower bounds included; +1.50 is included in the final band. No rescaling by year. Missing or out-of-range values are silent.")}</p></article><article><span>{t("02 / RHYTHM & HARMONY")}</span><h3>{t("You shape the setting.")}</h3><p>{t("Rhythm and a repeating C-major chord progression are decorative accompaniment. They do not encode additional measurements. Different values within a band share a note; read the number for the exact anomaly.")}</p></article><article><span>{t("03 / SOUND DESIGN")}</span><h3>{t("A synthetic sound world.")}</h3><p>{t("Five warm synthesized tones, gentle syncopation, filtering, echo and compression create the sound. No Sape or Gong recordings are used. No synthesized voice is presented as an authentic traditional instrument.")}</p></article></section>
    <details id="ss-source-credits" className="ss-sources"><summary>{t("Science, mapping & NASA credits")}</summary><p>{t("NASA GISS GISTEMP v4 · global land–ocean temperature anomalies relative to 1951–1980, not local weather, absolute temperature or a pre-industrial baseline. Uncertainty is not encoded. Fixed snapshot retrieved 18 October 2026: January 1880–September 2026; later months are missing. No live updates.")}</p><p lang="en">{climateSnapshot.provenance.citation}</p><p>{t("Interactive rendering by Earth FM from the numeric snapshot; inspired by NASA’s Scientific Visualization Studio Climate Spiral, Mark SubbaRao and Ed Hawkins. This is not an exact reproduction of the NASA image. No NASA endorsement implied. Height in 3D represents year; rotation and tilt change only the view. Separate year traces do not bridge missing months.")}</p><p><a href="https://data.giss.nasa.gov/gistemp/">NASA GISTEMP</a> · <a href="https://svs.gsfc.nasa.gov/5190/">{t("NASA SVS 5190 / full credits")}</a> · <a href="/data/climate-spiral-provenance.json">{t("Snapshot provenance")}</a> · <a href={climateSnapshot.provenance.localSource}>{t("Source CSV")}</a></p></details><footer>EARTH FM / EARTH SYMPHONY STUDIO <span>{t("Made to listen closer.")}</span></footer>
  </main>;
}

export default function SymphonyStudio() {
  return <StudioLanguageProvider><StudioContent/></StudioLanguageProvider>;
}
