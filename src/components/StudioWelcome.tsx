import EarthGlobe from './EarthGlobe';
import { useStudioLanguage } from '../lib/studioLanguage';

type Props = { playing: boolean; onListen: () => void; onVisual: () => void };
export default function StudioWelcome({playing,onListen,onVisual}: Props) {
  const {t}=useStudioLanguage();
  return <><section className="ss-welcome" aria-labelledby="welcome-title">
    <div className="ss-welcome-copy"><p className="ss-kicker"><span className="ss-signal-dot"/>{t('ONE PLANET. A NEW WAY TO LISTEN.')}</p><h1 id="welcome-title">{t('See our Earth.')}<br/><em>{t('Hear its story.')}</em></h1><p className="ss-welcome-lead">{t('We turn NASA Earth visuals and climate measurements into sound you can explore. No music or science experience needed.')}</p>
    <div className="ss-welcome-actions"><button className="ss-primary" onClick={onListen}>▶ {t('Start listening')} <small>{t('Visual → measurements → discovery')}</small></button><button className="ss-secondary" onClick={onVisual}>{t('Hear a NASA visual')} <span>↗</span></button></div>
    <a className="ss-welcome-how" href="#how-it-works">{t('How does it work?')} ↓</a>
    <div className="ss-welcome-trust"><span>NASA GISS / EIC</span><i/><span>{t('Real sources. Browser-made sound.')}</span></div></div>
    <div className="ss-earth-scene"><div className="ss-orbit-label ss-orbit-top"><span className="ss-signal-dot"/>{t('EARTH / LISTENING ROOM')}<span>01 — 02</span></div><EarthGlobe locations={[]} selectedId="" onSelect={()=>{}} playing={playing}/><div className="ss-earth-caption"><span>{t('A planet to explore. A record to hear.')}</span><span>{t('Drag to rotate')} ↔</span></div><div className="ss-scene-note">{t('Earth illustration for context; the climate spiral below shows the measurements.')}</div></div>
  </section>
  <section className="ss-start-steps" id="how-it-works" aria-label={t('How Earth FM works')}><article><span>01</span><div><h2>{t('Choose a story')}</h2><p>{t('Explore climate measurements or a NASA-related visual.')}</p></div></article><article><span>02</span><div><h2>{t('See it. Hear it.')}</h2><p>{t('Follow the highlighted month or moving image scan as sound is made.')}</p></div></article><article><span>03</span><div><h2>{t('Make it yours')}</h2><p>{t('Try a different tone, compare years, or create your own mix.')}</p></div></article></section></>;
}
