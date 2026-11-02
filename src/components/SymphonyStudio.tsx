import {useEffect,useRef,useState} from 'react';
import type {MouseEvent} from 'react';
import StudioWelcome from './StudioWelcome';
import GuidedStory from './GuidedStory';
import {CreatePage,DataPage} from './pages/ClimatePages';
import AboutPage from './pages/AboutPage';
import {StudioLanguageProvider,useStudioLanguage} from '../lib/studioLanguage';
import type {Language} from '../lib/studioLanguage';
import {defaults} from '../lib/symphony';
import type {Settings} from '../lib/symphony';
import {PAGE_PATHS,pageForPath,goToPage} from '../lib/studioRouter';
import type {StudioPage} from '../lib/studioRouter';
import './SymphonyStudio.css';
import './StudioPages.css';
import './Observatory.css';
const pageNames:Record<StudioPage,string>={home:'Home',listen:'Listen',create:'Create',data:'Explore Data',about:'About'};
const ignorePlayback=(_value:boolean)=>{};
function StudioContent(){
  const {t,language,setLanguage}=useStudioLanguage();
  const [page,setPage]=useState<StudioPage>(()=>pageForPath(location.pathname));
  const [motion,setMotion]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [settings,setSettings]=useState<Settings>({...defaults});
  const content=useRef<HTMLElement>(null);
  useEffect(()=>{const update=()=>setPage(pageForPath(location.pathname));window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
  useEffect(()=>{const previous=document.title;document.title=`Earth FM — ${t(pageNames[page])}`;return()=>{document.title=previous;};},[page,language]);
  useEffect(()=>{const target=location.hash?document.getElementById(location.hash.slice(1)):null;if(target){target.scrollIntoView();}else{window.scrollTo({top:0,behavior:'instant'});content.current?.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});}},[page]);
  function link(event:MouseEvent<HTMLAnchorElement>,target:StudioPage){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();goToPage(target);}
  return <div className={`ss ss-pages ss-observatory${motion?' ss-motion':''}`} lang={language==='zh'?'zh-Hans':'en'}><a className="sp-skip" href="#page-content">{t('Skip to content')}</a>
    <header className="sp-header"><a className="sp-brand" href="/" onClick={e=>link(e,'home')} aria-label={t('Earth FM home')}><span>◉</span><span>EARTH FM<small>{t('SEE · HEAR · DISCOVER')}</small></span></a><nav className="sp-nav" aria-label={t('Main navigation')}>{(['home','listen','create','data'] as StudioPage[]).map(target=><a key={target} href={PAGE_PATHS[target]} aria-current={page===target?'page':undefined} onClick={e=>link(e,target)}>{t(pageNames[target])}</a>)}</nav><label className="sp-language"><span>{t('Language')}</span><select aria-label={t('Language')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="en" lang="en">English</option><option value="zh" lang="zh-Hans">简体中文</option></select></label></header>
    <main id="page-content" ref={content} className={`sp-page sp-page-${page}`}>
      {page==='home'&&<StudioWelcome motion={motion} playing={false} onListen={()=>goToPage('listen')}/>}
      {page==='listen'&&<><header className="sp-page-heading sp-listen-heading"><p className="ss-kicker">{t('LISTEN / YOUR FIRST EARTH STORY')}</p><h1 tabIndex={-1}>{t('A little looking. A little listening.')}</h1><p>{t('Follow three short steps. No settings to learn. Sound starts only when you press Play.')}</p></header><GuidedStory motion={motion} onPlayingChange={ignorePlayback} onExplore={()=>goToPage('create')} onData={()=>goToPage('data')}/></>}
      {page==='create'&&<CreatePage settings={settings} setSettings={setSettings}/>}
      {page==='data'&&<DataPage settings={settings} setSettings={setSettings}/>}
      {page==='about'&&<AboutPage/>}
    </main>
    <footer className="sp-footer"><span>EARTH FM <small>{t('A different way to meet our planet.')}</small></span><div><a href="/about" aria-current={page==='about'?'page':undefined} onClick={e=>link(e,'about')}>{t('About & sources')}</a><a href="/?legacy=1">{t('Original experience')} ↗</a><label><input type="checkbox" checked={motion} onChange={e=>setMotion(e.target.checked)}/>{t('Motion effects')}</label></div></footer>
  </div>;
}
export default function SymphonyStudio(){return <StudioLanguageProvider><StudioContent/></StudioLanguageProvider>;}
