import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,MouseEvent} from 'react';
import {ArrowDown,ArrowRight,AudioLines,Captions,ChevronLeft,ChevronRight,Disc3,Ear,Eye,Hand,Library,Pause,Play,ScanLine} from 'lucide-react';
import {jukeboxRecords} from '../data/jukeboxRecords';
import {storyFrame} from '../data/guidedStory';
import {useStudioLanguage} from '../lib/studioLanguage';
import {goToPage} from '../lib/studioRouter';
import './HomeIntro.css';

/** The guided tour: each step lights one part of a drawn player and moves the guide dot there. */
const tour=[
  {id:'shelf',icon:Disc3,title:'Choose a record',body:'Each record on the shelf is one Earth story, with its NASA source printed on the sleeve.',dot:[24,13]},
  {id:'play',icon:Play,title:'Press Play',body:'The sound is made live in your browser from the picture or the numbers. Nothing plays until you press Play.',dot:[17,86]},
  {id:'scan',icon:ScanLine,title:'Follow the scan',body:'A line moves across the picture. The readout below it shows the note, its pitch and what made it.',dot:[60,47]},
  {id:'touch',icon:Hand,title:'Explore by hand',body:'Flip to Side B, or choose a strip or a place yourself, by touch, mouse or arrow keys, and hear it on its own.',dot:[81,86]},
] as const;
const STEP_MS=4200;

function useListenLink(){
  return (event:MouseEvent<HTMLAnchorElement>,record?:string)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    if(record){history.pushState({},'',`/listen?record=${record}`);window.dispatchEvent(new PopStateEvent('popstate'));}
    else goToPage('listen');
  };
}

function GuidedTour({motion}:{motion:boolean}){
  const {t}=useStudioLanguage();
  const [step,setStep]=useState(0),[auto,setAuto]=useState(motion),[visible,setVisible]=useState(false);
  const root=useRef<HTMLElement>(null);
  // Auto-advance only while the tour is on screen, motion is allowed and the visitor has not taken over.
  useEffect(()=>{const element=root.current;if(!element)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'-25% 0px -25% 0px'});observer.observe(element);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(!motion)setAuto(false);},[motion]);
  useEffect(()=>{if(!auto||!visible)return;const timer=window.setTimeout(()=>setStep(s=>(s+1)%tour.length),STEP_MS);return()=>window.clearTimeout(timer);},[auto,visible,step]);
  const go=(next:number)=>{setAuto(false);setStep((next+tour.length)%tour.length);};
  const current=tour[step];
  return <section ref={root} className="hi-tour" id="how-it-works" aria-labelledby="hi-tour-title" data-step={current.id} style={{'--dot-x':`${current.dot[0]}%`,'--dot-y':`${current.dot[1]}%`} as CSSProperties}>
    <div className="hi-section-head"><p className="hi-kicker"><Eye size={14} aria-hidden="true"/>{t('HOW TO LISTEN · FOLLOW THE LIGHT')}</p><h2 id="hi-tour-title">{t('Four moves. Follow the glowing dot.')}</h2><p>{t('The light shows where to look on the player. Step through it yourself, or let it guide you.')}</p></div>
    <div className="hi-tour-body">
      <div className="hi-player" aria-hidden="true">
        <div className="hi-zone hi-zone-shelf" data-lit={current.id==='shelf'}>{jukeboxRecords.slice(0,5).map(r=><i key={r.id} style={{'--accent':r.accent} as CSSProperties}/>)}<span>{t('Shelf')}</span></div>
        <div className="hi-zone hi-zone-scan" data-lit={current.id==='scan'}><img src={storyFrame.imageUrl} alt=""/><b className="hi-scanline"/><span className="hi-readout"><em>C5</em> 523 Hz · 62% {t('brightness')}</span></div>
        <div className="hi-zone hi-zone-play" data-lit={current.id==='play'}><Play size={14} fill="currentColor"/>{t('Play record')}</div>
        <div className="hi-zone hi-zone-touch" data-lit={current.id==='touch'}><span>A</span><span>B</span><Hand size={15}/></div>
        <i className="hi-dot"/>
      </div>
      <div className="hi-steps">
        <ol>{tour.map((item,index)=>{const Icon=item.icon;return <li key={item.id} aria-current={index===step?'step':undefined}><button type="button" onClick={()=>go(index)}><span className="hi-step-number">{index+1}</span><Icon size={17} aria-hidden="true"/><span><strong>{t(item.title)}</strong><small>{t(item.body)}</small></span></button></li>;})}</ol>
        <div className="hi-tour-controls"><button type="button" onClick={()=>go(step-1)} aria-label={t('Previous step')}><ChevronLeft size={17}/></button><span>{t('Step')} {step+1} {t('of')} {tour.length}</span><button type="button" onClick={()=>go(step+1)} aria-label={t('Next step')}><ChevronRight size={17}/></button>{motion&&<button type="button" className="hi-tour-auto" aria-pressed={auto} onClick={()=>setAuto(a=>!a)}>{auto?<><Pause size={14}/>{t('Pause guide')}</>:<><Play size={14}/>{t('Auto guide')}</>}</button>}</div>
        <a className="hi-try" href="/listen?guide=1" onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState({},'','/listen?guide=1');window.dispatchEvent(new PopStateEvent('popstate'));}}>{t('Try it on the real player, with the guide')}<ArrowRight size={15} aria-hidden="true"/></a>
        <p className="sr-only" aria-live="polite">{`${t('Step')} ${step+1}: ${t(current.title)}. ${t(current.body)}`}</p>
      </div>
    </div>
  </section>;
}

export default function HomeIntro({motion}:{motion:boolean}){
  const {t}=useStudioLanguage();const listen=useListenLink();
  return <div className="hi-home">
    <header className="hi-hero">
      <div className="hi-hero-copy">
        <p className="hi-kicker"><Disc3 size={14} aria-hidden="true"/>{t('NASA SPACE APPS 2026 · THE EARTH INFORMATION JUKEBOX')}</p>
        <h1 tabIndex={-1}>{t('Hear NASA’s view')} <em>{t('of our planet.')}</em></h1>
        <p className="hi-lead">{t('TerraJuke turns NASA Earth visuals and Earth observations into sound, made live in your browser. Pick a record, press Play, and listen to Earth change.')}</p>
        <div className="hi-actions"><a className="hi-primary" href="/listen" onClick={e=>listen(e)}><AudioLines size={17} aria-hidden="true"/>{t('Open the jukebox')}<ArrowRight size={16} aria-hidden="true"/></a><a className="hi-secondary" href="#how-it-works">{t('How it works')}<ArrowDown size={15} aria-hidden="true"/></a></div>
        <p className="hi-fine">{t('Headphones help. Sound starts only when you press Play.')}</p>
      </div>
      <div className="hi-turntable" aria-hidden="true"><div className={`hi-vinyl${motion?' is-spinning':''}`}><img src={storyFrame.imageUrl} alt=""/><i/></div><span className="hi-arm"/><small>{t('Record 01 · Climate Spiral · NASA SVS 5190')}</small></div>
    </header>

    <section className="hi-what" aria-labelledby="hi-what-title">
      <div className="hi-section-head"><p className="hi-kicker">{t('WHAT WE ARE DOING')}</p><h2 id="hi-what-title">{t('A jukebox for Earth information.')}</h2><p>{t('NASA’s Earth Information Center shows how our planet is changing in pictures. TerraJuke pairs those visuals with sound, so you can choose a visualization, hear its soundscape, and explore it in more than one way.')}</p></div>
      <div className="hi-pillars">
        <article><Eye size={22} aria-hidden="true"/><h3>{t('See')}</h3><p>{t('Every record is a pinned snapshot of a named source, mostly NASA visualizations, kept with its source link and retrieval date.')}</p></article>
        <article><Ear size={22} aria-hidden="true"/><h3>{t('Hear')}</h3><p>{t('Fixed, published rules turn colour, brightness and values into notes in real time. Same picture, same notes, every time.')}</p></article>
        <article><Captions size={22} aria-hidden="true"/><h3>{t('Explore together')}</h3><p>{t('Every note is also shown as text. Controls work with a keyboard and screen reader, and every record works with motion turned off.')}</p></article>
      </div>
    </section>

    <GuidedTour motion={motion}/>

    <section className="hi-kinds" aria-labelledby="hi-kinds-title">
      <div className="hi-section-head"><p className="hi-kicker">{t('TWO KINDS OF SOUND · KNOW WHAT YOU HEAR')}</p><h2 id="hi-kinds-title">{t('Pictures and measurements sound different on purpose.')}</h2></div>
      <div className="hi-kinds-grid">
        <article><span className="hi-tag">{t('Visual sound')}</span><h3>{t('Hear the picture')}</h3><p>{t('A scan reads the colours NASA rendered. Brighter or warmer-coloured pixels play differently. These are rendered pixels, not measurements.')}</p></article>
        <article><span className="hi-tag hi-tag-data">{t('Measurement sound')}</span><h3>{t('Hear the numbers')}</h3><p>{t('Real observation values set the pitch on a fixed scale with units. Changing the musical style never changes which value made which note.')}</p></article>
      </div>
    </section>

    <section className="hi-shelf" aria-labelledby="hi-shelf-title">
      <div className="hi-section-head"><p className="hi-kicker">{t('ON THE SHELF')}</p><h2 id="hi-shelf-title">{t('Seven records. Pick one to start.')}</h2></div>
      <ul>{jukeboxRecords.map(record=>{const image=record.id==='spiral'?record.frame?.imageUrl:record.posterUrl;return <li key={record.id} style={{'--accent':record.accent} as CSSProperties}><a href={`/listen?record=${record.id}`} onClick={e=>listen(e,record.id)}>
        <span className="hi-sleeve" aria-hidden="true">{image?<img src={image} alt=""/>:<AudioLines size={20}/>}</span>
        <span className="hi-record-copy"><small>{record.number} · {t(record.kind==='visual'?'Visual':'Measurements')}</small><strong>{t(record.title)}</strong><span>{t(record.source)}</span></span><ArrowRight size={16} aria-hidden="true"/></a></li>;})}</ul>
    </section>

    <section className="hi-closing" aria-labelledby="hi-closing-title">
      <h2 id="hi-closing-title">{t('Ready to listen?')}</h2>
      <p>{t('Open the jukebox and choose a record, or play the whole shelf in turn.')}</p>
      <div className="hi-actions"><a className="hi-primary" href="/listen" onClick={e=>listen(e)}><AudioLines size={17} aria-hidden="true"/>{t('Open the jukebox')}<ArrowRight size={16} aria-hidden="true"/></a><a className="hi-secondary" href="/about" onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goToPage('about');}}><Library size={15} aria-hidden="true"/>{t('Sources and methods')}</a></div>
    </section>
  </div>;
}
