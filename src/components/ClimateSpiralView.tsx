import {useMemo,useState} from 'react';
import {climateSnapshot} from '../data/climateSpiral';
import {MONTHS} from '../lib/climateMapping';
import type {MonthlyObservation} from '../lib/climateMapping';
import {useStudioLanguage} from '../lib/studioLanguage';

export default function ClimateSpiralView({ current, playing }: { current: MonthlyObservation; playing: boolean }) {
  const {t} = useStudioLanguage();
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
  return <figure className="ss-spiral" data-playing={playing}><div className="ss-figure-top"><span>{t("01 / CLIMATE SPIRAL")}</span><button onClick={() => setFlat(!flat)}>{t(flat ? 'Explore 3D' : 'Use 2D')}</button></div>
    <svg viewBox="0 0 600 560" role="img" aria-label={t("Global monthly temperature anomalies: angle is month, radius is anomaly, height is year in 3D. Cyan marker shows the selected observation.")}>
      <defs><radialGradient id="ss-halo"><stop stopColor="#734de2" stopOpacity=".24"/><stop offset="1" stopColor="#734de2" stopOpacity="0"/></radialGradient></defs>
      <circle cx="300" cy="280" r="265" fill="url(#ss-halo)"/>
      {[-1,0,1,1.5].map(value => <g key={value}><path d={Array.from({length:73},(_,i) => { const [x,y] = project(value,1+i/6,1953); return `${i ? 'L':'M'}${x},${y}`; }).join(' ')} fill="none" stroke="#66828c" strokeOpacity=".35" strokeDasharray="3 5"/></g>)}
      {paths.map(row => <path key={row.year} d={row.path} fill="none" stroke={row.year === current.year ? '#f8eed8' : `hsl(${205-(row.year-1880)/146*195} 85% 65%)`} strokeWidth={row.year === current.year ? 2.8 : .7} opacity={row.year === current.year ? 1 : .36}/>) }
      {MONTHS.map((name,i) => { const [x,y] = project(1.9,i+1,1953); return <text key={name} x={x} y={y} textAnchor="middle" fill="#b7cbd5" fontSize="11">{name.slice(0,3).toUpperCase()}</text>; })}
      {selected && <g className="ss-data-marker"><circle className="ss-melody-halo" cx={selected[0]} cy={selected[1]} r={playing ? 16 : 10} fill="#7efce1" opacity=".13"/><circle cx={selected[0]} cy={selected[1]} r="5" fill="#7efce1" stroke="#fff"/></g>}
    </svg>
    <figcaption>{t("Each line is a year; warmer colours indicate later years.")}<br/>{t("1880 → 2026 · radius = anomaly · angle = month")}{!flat && t(' · height = year')}<br/>{t("Reference rings: −1 / 0 / +1 / +1.5°C. White: selected year. Cyan: selected measurement. Halo: decoration only.")}</figcaption>
    <details className="ss-reference"><summary>{t("NASA reference image")}</summary><img src={climateSnapshot.provenance.visual.localSource} alt={t("NASA Climate Spiral overview showing the record into 2026; not the selected month.")} loading="lazy"/><p>{t("NASA’s Scientific Visualization Studio · Mark SubbaRao and Ed Hawkins. The published visual and this numeric snapshot may use different data revisions.")}</p></details>
    <div className="ss-view-controls"><label>{t("Rotate")} <input aria-label={t("Rotate spiral")} type="range" min="-180" max="180" value={rotation} onChange={e=>setRotation(+e.target.value)}/></label>{!flat && <label>{t("Tilt")} <input aria-label={t("Tilt spiral")} type="range" min="0" max="65" value={tilt} onChange={e=>setTilt(+e.target.value)}/></label>}</div>
  </figure>;
}
