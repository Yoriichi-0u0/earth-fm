import {useState} from 'react';
import EarthGlobe from './EarthGlobe';
import {observatoryImagery} from '../data/observatory';
import {storyFrame} from '../data/guidedStory';
import {useStudioLanguage} from '../lib/studioLanguage';

type Props = {playing: boolean; motion: boolean; onListen: () => void};
export default function StudioWelcome({playing, motion, onListen}: Props) {
  const {t} = useStudioLanguage();
  const [surfaceReady, setSurfaceReady] = useState(false);
  return <div className="obs-home">
    <section className="ss-welcome" aria-labelledby="welcome-title">
      <div className="ss-welcome-copy">
        <p className="obs-eyebrow"><span aria-hidden="true">⊕</span>{t('NASA EARTH DATA → SOUND')}</p>
        <h1 id="welcome-title" tabIndex={-1} aria-label={t('Hear Earth’s changing climate.')}>
          {t('Hear Earth’s')}<br/><em>{t('changing climate.')}</em>
        </h1>
        <p className="ss-welcome-lead">{t('Explore NASA climate visuals and real temperature data through sound. No music or science knowledge needed.')}</p>
        <div className="ss-welcome-actions"><button className="ss-primary" onClick={onListen}>▶ {t('Start the experience')}<small>{t('A short, guided introduction')}</small></button></div>
        <a className="ss-welcome-how" href="#how-it-works">{t('How does it work?')} ↓</a>
        <p className="obs-independent">{t('An independent Earth FM experience using NASA visuals and data.')}</p>
      </div>
      <div className="ss-earth-scene obs-earth-view">
        <div className="obs-earth-top"><span className="obs-status-dot"/>{t('A CLOSER LOOK AT HOME')}<span>01 / EARTH</span></div>
        <EarthGlobe locations={[]} selectedId="" onSelect={()=>{}} playing={playing} autoRotate={motion} photographic onSurfaceReady={setSurfaceReady}/>
        <div className="obs-earth-caption"><a href={observatoryImagery.sourcePage} target="_blank" rel="noreferrer">{t(surfaceReady?'NASA Earth Observatory · Blue Marble':'Interactive Earth illustration')} ↗</a><span>{t('Drag to rotate')} ↔</span></div>
        <p className="ss-scene-note">{t(surfaceReady?'July 2004 composite. Lighting and rotation are illustrative, not live weather.':'2D globe view. The NASA climate visual and measurements are in the guided experience.')}</p>
      </div>
    </section>
    <section className="obs-record-strip" aria-label={t('The climate record behind the music')}>
      <div className="obs-record-source"><span className="obs-mini-orbit" aria-hidden="true"/><div><strong>NASA GISTEMP <small>v4</small></strong><span>{t('GLOBAL TEMPERATURE RECORD')}</span></div></div>
      <p className="obs-record-years">1880 <span>—</span> 2026<small>{t('One shared planet. A record of change.')}</small></p>
      <a href="/about#sources">{t('Meet the science')} ↗</a>
    </section>
    <section className="obs-first-story" id="how-it-works" aria-label={t('How Earth FM works')}>
      <figure className="obs-story-preview"><img src={storyFrame.imageUrl} alt={t('NASA Climate Spiral preview. The guided experience explains the image and the separate numerical data.')} loading="lazy"/><figcaption><span>{t('NASA Climate Spiral')}</span><a href={storyFrame.sourceUrl} target="_blank" rel="noreferrer">NASA SVS 5190 ↗</a></figcaption></figure>
      <div className="obs-story-intro"><p className="ss-kicker">{t('YOUR FIRST EARTH STORY')}</p><h2>{t('From a picture to a melody.')}</h2><div className="obs-story-steps">
        <article><span>01</span><div><h3>{t('Look at a NASA visual')}</h3><p>{t('Watch a picture become sound in real time.')}</p></div></article>
        <article><span>02</span><div><h3>{t('Listen to real data')}</h3><p>{t('Hear selected temperature measurements across time.')}</p></div></article>
        <article><span>03</span><div><h3>{t('Notice what changes')}</h3><p>{t('Then explore music and data at your own pace.')}</p></div></article>
      </div></div>
    </section>
  </div>;
}
