// The Ice Year: NASA SVS 5046 (Daily Arctic Sea Ice; JAXA AMSR2), the 15th of every month of 2024.
// Side A plays the year: each month's ice area north of 50°N, measured on NASA's own globe, sets the pitch.
// Side B: touch any Arctic place to hear its ice season, a bell for each frozen month.
import {useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,KeyboardEvent as ReactKeyboardEvent,PointerEvent as ReactPointerEvent} from 'react';
import {AudioLines} from 'lucide-react';
import DeckConsole from './DeckConsole';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import type {RecordSide,RecordSignal} from '../lib/recordSignal';
import {useStudioLanguage} from '../lib/studioLanguage';
import data from '../data/arcticIce2024.json';
import type {ArcticAnalysis,Cell} from '../lib/arcticIce/analyze';
import {CELL_COLS,CELL_ROWS,FRAME_DATES,MONTHS,cellCentre,cellIndex,iceMonthCount} from '../lib/arcticIce/analyze';
import {latLonToPixel,pixelToLatLon} from '../lib/arcticIce/projection';
import {DEFAULT_BPM,MAPPING_TABLE,placeNote,stepSeconds,yearNote} from '../lib/arcticIce/sonify';
import type {IceNote} from '../lib/arcticIce/sonify';
import {latLabel,lonLabel,millionKm2,monthCaption,placeCaption,seaName} from '../lib/arcticIce/describe';
import {IceEngine} from '../lib/arcticIce/audio';
import './NightLightsDeck.css';
import './AirDeck.css';
import './IceDeck.css';

const ice=data as ArcticAnalysis;
const frameUrl=(m:number)=>`/nasa/svs5046/${FRAME_DATES[m]}.webp`;
const AW=960,AH=540;
const peak=Math.max(...ice.months.map(m=>m.iceKm2));
const cellMap=new Map<number,Cell>(ice.cells.map(c=>[c.row*CELL_COLS+c.col,c]));
const yearScore=ice.months.map((m,i)=>yearNote(i,m.iceKm2,ice.seaKm2));
type Current={serial:number;at:number;kind:'month'|'place';month:number;caption:string;note:IceNote};
declare global{interface Window{terrajukeIce?:{events:{kind:string;month:number;ice:boolean}[]}}}

export default function IceDeck({record,motion,volume,onVolume}:{record:JukeboxRecord;motion:boolean;volume:number;onVolume:(value:number)=>void}){
  const {t}=useStudioLanguage();
  const [side,setSide]=useState<RecordSide>('a');
  const [month,setMonth]=useState(8),[place,setPlace]=useState<{row:number;col:number}>(()=>cellIndex(76,-150)!);
  const [playing,setPlaying]=useState(false),[completed,setCompleted]=useState(false),[requestAt,setRequestAt]=useState(0);
  const [current,setCurrent]=useState<Current|null>(null),[message,setMessage]=useState('');
  const [bpm,setBpm]=useState(DEFAULT_BPM);const bpmRef=useRef(DEFAULT_BPM);
  const audio=useRef<IceEngine|null>(null),serial=useRef(0);
  useEffect(()=>{audio.current=new IceEngine();window.terrajukeIce={events:[]};return()=>audio.current?.dispose();},[]);
  useEffect(()=>{audio.current?.setVolume(volume);},[volume]);
  // Warm the next month's NASA frame so the globe never waits.
  useEffect(()=>{const img=new Image();img.src=frameUrl((month+1)%12);},[month]);

  const placeCell=cellMap.get(place.row*CELL_COLS+place.col)??null,placeAt=cellCentre(place.row,place.col);
  function show(kind:Current['kind'],m:number,note:IceNote,caption:string){
    const id=++serial.current;setCurrent({serial:id,at:performance.now(),kind,month:m,caption,note});setMonth(m);
    const log=window.terrajukeIce;if(log){log.events.push({kind,month:m,ice:note.ice});if(log.events.length>200)log.events.splice(0,log.events.length-200);}
  }
  const monthText=(m:number)=>monthCaption(m,ice.months[m].iceKm2,peak);
  function stop(say=true){const was=playing;audio.current?.stop();setPlaying(false);if(say&&was)setMessage(t('Stopped.'));}
  function playYear(){
    stop(false);setSide('a');setPlaying(true);setCompleted(false);setRequestAt(performance.now());
    setMessage(t('The Arctic year, January to December 2024: one note per month; less ice, lower note. Escape stops.'));
    audio.current?.play(yearScore,{getStepSeconds:()=>stepSeconds(bpmRef.current),onStep:i=>show('month',i,yearScore[i],monthText(i)),onEnd:()=>{setPlaying(false);setCompleted(true);setMessage(t('The ice year is complete: from the March peak to the September low and back.'));}});
  }
  function hearMonth(m:number){stop(false);setSide('a');audio.current?.playOne(yearScore[m],stepSeconds(bpmRef.current));show('month',m,yearScore[m],monthText(m));setMessage(monthText(m));}
  function playPlace(row:number,col:number){
    stop(false);setPlace({row,col});const cell=cellMap.get(row*CELL_COLS+col),{lat,lon}=cellCentre(row,col);
    if(!cell){const caption=`${seaName(lat,lon)}, ${latLabel(lat)} ${lonLabel(lon)}: ${t('land, or too little open sea seen here. Try a nearby place.')}`;setCurrent(null);setMessage(caption);setPlace({row,col});return;}
    const score=MONTHS.map((_,m)=>placeNote(m,lat,cell.iceMonths)),caption=placeCaption(lat,lon,cell.iceMonths);
    setPlaying(true);setCompleted(false);setRequestAt(performance.now());setMessage(caption);
    audio.current?.play(score,{getStepSeconds:()=>stepSeconds(bpmRef.current)*0.6,onStep:i=>show('place',i,score[i],`${caption}. ${MONTHS[i]}: ${score[i].ice?t('ice'):t('open water')}`),onEnd:()=>{setPlaying(false);setCompleted(true);}});
  }
  function changeSide(next:RecordSide){if(next===side)return;stop(false);setSide(next);setCompleted(false);setCurrent(null);setMessage('');}
  function onKey(e:ReactKeyboardEvent<HTMLDivElement>){
    const k=e.key;
    if(k==='Escape'){e.preventDefault();stop();return;}
    if(side==='a'){
      if(k==='ArrowRight'||k==='ArrowLeft'){e.preventDefault();hearMonth((month+(k==='ArrowRight'?1:11))%12);}
      else if(k==='Home'||k==='End'){e.preventDefault();hearMonth(k==='Home'?0:11);}
      else if(k==='Enter'||k===' '){e.preventDefault();playing?stop():playYear();}
    }else{
      const moves:Record<string,[number,number]>={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]};
      if(k in moves){e.preventDefault();const [dr,dc]=moves[k];playPlace(Math.max(0,Math.min(CELL_ROWS-1,place.row+dr)),(place.col+dc+CELL_COLS)%CELL_COLS);}
      else if(k==='Enter'||k===' '){e.preventDefault();playPlace(place.row,place.col);}
    }
  }
  function onPointer(e:ReactPointerEvent<HTMLDivElement>){
    const box=e.currentTarget.getBoundingClientRect(),fx=(e.clientX-box.left)/box.width,fy=(e.clientY-box.top)/box.height;
    const p=pixelToLatLon(fx*AW,fy*AH,AW,AH);
    if(!p)return;
    if(side==='a')return;
    const c=cellIndex(p.lat,p.lon);if(c)playPlace(c.row,c.col);
  }

  const marker=useMemo(()=>{if(side!=='b')return null;const px=latLonToPixel(placeAt.lat,placeAt.lon,AW,AH);return px?{left:`${(px.x+.5)/AW*100}%`,top:`${(px.y+.5)/AH*100}%`}:null;},[side,placeAt.lat,placeAt.lon]);
  const signal:RecordSignal={playing,note:current?.note.ice?current.note.name:current?t('open water'):'—',frequency:current?.note.ice?current.note.hz:null,event:current?{serial:current.serial,at:current.at,index:current.month}:null};
  const caption=current?.caption??t(side==='a'?'Press Play to hear the Arctic year, or choose a month.':'Tap the Arctic, or use the arrow keys, to hear a place’s ice season.');

  const sideControls=<>
    <div className="jb-side-selector" role="group" aria-label={t('Choose a side of The Ice Year')}>
      <button type="button" aria-label={t('Side A: the year of ice')} aria-pressed={side==='a'} onClick={()=>changeSide('a')}><b>A</b><span>{t('The year of ice')}<small>{t('12 months · area sets pitch')}</small></span></button>
      <button type="button" aria-label={t('Side B: touch the ice')} aria-pressed={side==='b'} onClick={()=>changeSide('b')}><b>B</b><span>{t('Touch the ice')}<small>{t('Any place · its ice season')}</small></span></button>
    </div>
    <div className="air-tempo"><label htmlFor="ice-bpm">{t('Tempo')}</label><input id="ice-bpm" type="range" min={48} max={120} step={4} value={bpm} aria-valuetext={`${bpm} ${t('beats per minute')}`} onChange={e=>{bpmRef.current=Number(e.target.value);setBpm(Number(e.target.value));}}/><output htmlFor="ice-bpm">{bpm} BPM</output></div>
  </>;

  const artwork=<div className="jb-media ice-media" aria-label={t('NASA Arctic sea ice globe, explorable by touch, mouse or keyboard')}>
    <div className="jb-art-label"><span>{t('AMSR2 sea ice')} · 15 {t(MONTHS[month])} 2024</span><span>NASA / SVS 5046</span></div>
    <div className="ice-globe" tabIndex={0} role="application" aria-roledescription={t('sound map')} data-side={side}
      aria-label={t(side==='a'?'Arctic globe, the year of ice. Left and right arrows move between months and play each one; Home and End jump to January and December; Enter plays the year; Escape stops.':'Arctic globe. Arrow keys move north, south, east and west and play each place’s ice season; Enter plays it again; Escape stops.')}
      onKeyDown={onKey} onPointerDown={onPointer}>
      {MONTHS.map((_,m)=><img key={m} src={frameUrl(m)} width={1600} height={900} alt={m===month?t(`NASA globe of the Arctic seen from above the North Pole on 15 ${MONTHS[m]} 2024. White sea ice covers ${millionKm2(ice.months[m].iceKm2)} north of 50°N; the open ocean is deep blue; land shows its seasonal colours.`):''} aria-hidden={m!==month} className={m===month?'is-shown':''} loading={m===month||m===(month+1)%12?'eager':'lazy'} decoding="async" draggable={false}/>)}
      {marker&&<span className={`ice-marker${playing?' is-playing':''}`} style={marker} aria-hidden="true"/>}
    </div>
    <ol className="ice-months" aria-label={t('Ice area each month, north of 50°N')}>
      {ice.months.map((m,i)=><li key={m.date}><button type="button" aria-pressed={i===month} aria-label={`${t(MONTHS[i])}: ${millionKm2(m.iceKm2)}`} onClick={()=>side==='a'?hearMonth(i):setMonth(i)} style={{'--h':`${m.iceKm2/peak*100}%`} as CSSProperties}><i aria-hidden="true"/><span aria-hidden="true">{MONTHS[i].slice(0,1)}</span></button></li>)}
    </ol>
    <p className="air-caption" data-testid="ice-caption">{caption}</p>
    <div className="jb-art-footer"><span>{t(playing?'SOUND GENERATED IN YOUR BROWSER':side==='a'?'PRESS PLAY OR CHOOSE A MONTH':'TAP THE ARCTIC OR USE THE ARROW KEYS')}</span><AudioLines size={16}/></div>
  </div>;

  const notes=<details className="nl-notes ice-notes">
    <summary>{t('Liner notes: measuring NASA’s ice, month by month')}</summary>
    <p>{t('Japan’s GCOM-W1 “SHIZUKU” satellite carries AMSR2, a microwave radiometer that sees sea ice through clouds and polar night. NASA’s Scientific Visualization Studio draws its daily ice on a globe wherever at least 15% of the sea is frozen, the standard threshold for sea-ice extent. Every NASA frame also stores the camera that rendered it, so TerraJuke can trace each pixel back to a latitude, longitude and ground area, and add up the ice NASA drew.')}</p>
    <table className="nl-mapping"><tbody>{MAPPING_TABLE.map(([a,b])=><tr key={a}><td>{t(a)}</td><td>{t(b)}</td></tr>)}</tbody></table>
    <h3>{t('Does it read the Arctic sensibly?')}</h3>
    <div className="nl-table-scroll" tabIndex={0} role="region" aria-label={t('Ice area measured on NASA’s 2024 frames')}><table className="nl-compare"><caption>{t('Sea ice north of 50°N on NASA’s globe, the 15th of each month of 2024')}</caption><thead><tr><th scope="col">{t('Month')}</th><th scope="col">{t('Ice area')}</th><th scope="col">{t('Note')}</th></tr></thead>
      <tbody>{ice.months.map((m,i)=><tr key={m.date}><th scope="row">{t(MONTHS[i])}</th><td>{millionKm2(m.iceKm2)}</td><td>{yearScore[i].name}</td></tr>)}</tbody></table></div>
    <p>{t('The ice peaks in March and is smallest in September, as the Arctic does every year. For comparison, the independent NSIDC Sea Ice Index reported about 15.0 million km² of extent on 15 March 2024 and 4.3 million km² on 15 September; TerraJuke reads somewhat less because it measures only north of 50°N and only what NASA drew. Tests also check places: the North Pole stays frozen all year, Hudson Bay freezes in winter and opens in late summer, and the Atlantic-warmed Norwegian Sea never freezes.')}</p>
    <h3>{t('Limits')}</h3>
    <ul><li>{t('This is the ice NASA drew, read from rendered colour: a measurement of the picture, not a replacement for NASA’s or NSIDC’s data products.')}</li><li>{t('One day per month (the 15th) stands for the whole month; each day uses a 3-day running minimum of concentration.')}</li><li>{t('Only latitudes north of 50°N are read, to stay clear of the globe’s bright edge; some southern ice (parts of the Sea of Okhotsk, the Gulf of St. Lawrence) is left out.')}</li><li>{t('Land is masked with Natural Earth 1:110m outlines plus islands visible in NASA’s frames; narrow channels may be misread.')}</li><li>{t('Touch places are 2° of latitude by 6° of longitude; a month counts as frozen when at least half the place’s sea is drawn as ice.')}</li></ul>
    <p className="nl-credit">{t('NASA’s Scientific Visualization Studio, SVS 5046. Visualizer: Trent L. Schindler. Data: JAXA GCOM-W1 AMSR2 sea ice concentration and 89 GHz brightness temperature; land: NASA Blue Marble Next Generation.')}</p>
  </details>;

  return <>
    <DeckConsole record={record} labels={{input:'ICE',position:side==='a'?'MONTH':'PLACE',count:side==='a'?'12 months of 2024':'Any Arctic place',duration:side==='a'?`~${Math.round(12*stepSeconds(bpm))} s`:t('Your pace')}}
      playing={playing} starting={false} ready completed={completed} progress={side==='a'&&current?.kind==='month'?(current.month+1)/12:0}
      note={signal.note} frequency={current?.note.ice?`${current.note.hz.toFixed(2)} Hz`:'—'}
      position={current?(current.kind==='month'?`15 ${t(MONTHS[current.month])}`:`${latLabel(placeAt.lat)} ${lonLabel(placeAt.lon)} · ${t(MONTHS[current.month].slice(0,3))}`):'—'}
      input={current?(current.kind==='month'?millionKm2(ice.months[current.month].iceKm2):current.note.ice?t('Ice'):t('Open water')):placeCell&&side==='b'?`${iceMonthCount(placeCell.iceMonths)} / 12 ${t('months frozen')}`:'—'}
      onPlay={()=>playing?stop():side==='a'?playYear():playPlace(place.row,place.col)} playLabel={side==='a'?'Play the ice year':'Play this place'}
      signal={signal} requestAt={requestAt}
      sideControls={sideControls}
      recordObject={<div className={`ice-vinyl${playing&&motion?' is-spinning':''}`} aria-hidden="true"><img src={frameUrl(month)} alt=""/><i/></div>}
      artwork={artwork} volume={volume} onVolume={onVolume} extra={notes}/>
    <p className="sr-only" aria-live="polite" data-testid="ice-announcer">{message}</p>
  </>;
}
