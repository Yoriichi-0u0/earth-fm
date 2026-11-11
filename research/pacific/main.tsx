import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Play, Square, Volume2, ArrowUpRight } from 'lucide-react'
import { AppearanceProvider } from '../../src/lib/AppearanceProvider'
import AppearanceSelector from '../../src/components/AppearanceSelector'
import { StudioLanguageProvider, useStudioLanguage } from '../../src/lib/studioLanguage'
import { useVisualTransport, VISUAL_SCAN_STEPS } from '../../src/lib/useVisualTransport'
import { useFrameInstrument } from '../../src/lib/useFrameInstrument'
import { mapValueToNote } from '../../src/lib/audio'
import { chinese } from './copy'
import type { Message } from './copy'
import provenance from './provenance.json'
import manifestUrl from './provenance.json?url'
import original from './assets/svs5688-original.jpg'
import globe2025 from './assets/svs5688-2025-circle-v1.png'
import globe2026 from './assets/svs5688-2026-circle-v1.png'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/space-grotesk/500.css'
import '../../src/appearance.css'
import './pacific.css'

const years = ['2025', '2026'] as const
type Year = typeof years[number]
const images = { '2025': globe2025, '2026': globe2026 }
const TEMPO = 120
const noop = () => {}

function usePanel(imageUrl: string, volume: number) {
  return useVisualTransport({
    imageUrl, animate: false, motionAllowed: true, tempo: TEMPO, volume, onStart: noop,
  })
}

function PacificLab() {
  const { language, setLanguage } = useStudioLanguage()
  const t = (message: Message) => language === 'zh' ? chinese[message] : message
  const [year, setYear] = useState<Year>('2025')
  const [position, setPosition] = useState(Math.floor((VISUAL_SCAN_STEPS - 1) / 2))
  const [volume, setVolume] = useState(.55)
  const panel2025 = usePanel(globe2025, volume)
  const panel2026 = usePanel(globe2026, volume)
  const panels = { '2025': panel2025, '2026': panel2026 }
  const selected = panels[year]
  const audition = useFrameInstrument(selected.steps, volume, selected.ready)
  const ready = panel2025.ready && panel2026.ready
  const playing = selected.playing || selected.starting || audition.playing || audition.starting
  const strip = selected.playing || selected.completed ? selected.scanIndex : position
  const displayDate = new Intl.DateTimeFormat(language === 'zh' ? 'zh-Hans' : 'en-GB', {
    dateStyle: 'long', timeZone: 'UTC',
  })
  const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 })

  function stop() {
    panel2025.stop()
    panel2026.stop()
    audition.stop()
    setPosition(strip)
  }

  function choose(next: Year) {
    stop()
    setYear(next)
  }

  function listen() {
    stop()
    setPosition(0)
    void selected.start()
  }

  function hearStrip() {
    stop()
    void audition.play(strip)
  }

  function seek(next: number) {
    stop()
    setPosition(next)
  }

  const imageError = (!panel2025.ready && panel2025.error) || (!panel2026.ready && panel2026.error)
  const error = imageError ? t('The image could not be read. Reload to try again.')
    : selected.error || audition.error ? t('Audio could not start. Try the listening control again.')
    : ''
  let status = ready ? t('Ready to listen') : t('Preparing the images')
  if (selected.completed) status = t('Scan complete')
  if (selected.playing) status = t('Playing the scan')
  if (audition.playing) status = t('Playing the selected strip')
  if (selected.starting || audition.starting) status = t('Starting audio')

  return (
    <main className="pacific">
      <header className="lab-header">
        <span className="lab-brand">Earth FM</span>
        <div className="lab-preferences">
          <label className="appearance-selector">
            <span>{language === 'zh' ? '语言' : 'Language'}</span>
            <select value={language} onChange={event => setLanguage(event.target.value === 'zh' ? 'zh' : 'en')}>
              <option value="en">English</option>
              <option value="zh">简体中文</option>
            </select>
          </label>
          <AppearanceSelector />
        </div>
      </header>

      <div className="lab-intro">
        <h1>{t('Pacific Listening Lab')}</h1>
        <p>{t('Compare the same strip in two Pacific images. Move the marker, choose a year and listen.')}</p>
      </div>

      <fieldset className="lab-comparison">
        <legend>{t('Choose a globe to hear')}</legend>
        <div className="lab-panels">
          {years.map(candidate => {
            const panel = panels[candidate]
            const { displayedDate } = provenance.panels[candidate]
            const step = panel.steps[strip]
            const note = step && mapValueToNote(step.brightness, 0, 1)
            return (
              <article key={candidate} className="lab-panel" data-year={candidate} data-selected={candidate === year}>
                <label className="lab-year">
                  <time dateTime={displayedDate}>{displayDate.format(new Date(displayedDate))}</time>
                  <input
                    type="radio" name="globe" value={candidate}
                    checked={year === candidate} onChange={() => choose(candidate)}
                  />
                </label>
                <div className="lab-globe" ref={panel.screenRef}>
                  <img
                    ref={panel.imageRef} src={images[candidate]}
                    width={provenance.panels[candidate].size} height={provenance.panels[candidate].size}
                    alt={`${t('Tropical Pacific globe')}, ${displayDate.format(new Date(displayedDate))}`}
                    onLoad={panel.prepare}
                    onError={() => panel.setError('Image failed to load')}
                  />
                  {panel.ready && <span className="lab-strip" aria-hidden="true" style={{ left: `${strip / VISUAL_SCAN_STEPS * 100}%` }} />}
                </div>
                <dl className="lab-readout">
                  <div><dt>{t('Brightness')}</dt><dd>{step ? percent.format(step.brightness) : '—'}</dd></div>
                  <div><dt>{t('Note')}</dt><dd data-frequency={note?.frequency}>{note ? `${note.note} · ${note.frequency.toFixed(2)} Hz` : '—'}</dd></div>
                </dl>
              </article>
            )
          })}
        </div>
      </fieldset>

      <section className="lab-controls" aria-label={t('Image strip')}>
        <div className="lab-slider-head">
          <label htmlFor="lab-strip">{t('Image strip')}</label>
          <span aria-hidden="true">{String(strip + 1).padStart(2, '0')} / {VISUAL_SCAN_STEPS}</span>
        </div>
        <input
          id="lab-strip" type="range" min={1} max={VISUAL_SCAN_STEPS} value={strip + 1}
          disabled={!ready} onChange={event => seek(Number(event.target.value) - 1)}
        />
        <div className="lab-buttons">
          <button className="lab-primary" type="button" disabled={!ready} onClick={listen}>
            <Play size={17} aria-hidden="true" /> {t('Listen to scan')}
          </button>
          <button type="button" disabled={!ready} onClick={hearStrip}>{t('Hear this strip')}</button>
          <button type="button" disabled={!playing} onClick={stop}><Square size={16} aria-hidden="true" /> {t('Stop')}</button>
          <label className="lab-volume">
            <Volume2 size={19} aria-hidden="true" />
            <input aria-label={t('Volume')} type="range" min={0} max={1} step={.01} value={volume} onChange={event => setVolume(Number(event.target.value))} />
          </label>
        </div>
        <p className="lab-status" role="status">{year} · {audition.notice ? t('Audio is ready. Press Hear this strip again.') : status}</p>
        {error && <p className="lab-error" role="alert">{error}</p>}
      </section>

      <p className="lab-note">{t('The scan turns pixel brightness into pitch. A higher note cannot tell you which ocean is warmer.')}</p>

      <details className="lab-source">
        <summary>{t('Original NASA image and legend')}</summary>
        <img src={original} width={1670} height={835} loading="lazy" alt={t('Full NASA SVS comparison with the original legend and both dates')} />
        <p>{t('The NASA legend shows seven-day sea-surface temperature anomalies in °C. Red and blue indicate warmer and cooler than the reference conditions.')}</p>
        <a href={original}>{t('Open original image')} <ArrowUpRight size={15} aria-hidden="true" /></a>
      </details>

      <details className="lab-source">
        <summary>{t('How the two panels were prepared')}</summary>
        <p>{t('The circular crops remove the surrounding titles and legend from the sound input. Each crop is sampled into 48 strips at the same relative positions. A strip does not identify a matching longitude or a temperature value.')}</p>
        <p>{t('Original pixels kept inside each circle. Opaque black fills the corners.')}</p>
        <ul>
          {years.map(candidate => {
            const { x, y, size } = provenance.panels[candidate]
            return <li key={candidate}>{candidate} · x {x}, y {y} · {size} × {size} px</li>
          })}
        </ul>
        <p><a href={manifestUrl}>{t('Source and crop geometry (JSON)')}</a> · {provenance.version}</p>
      </details>

      <footer className="lab-credit">
        <span>{t('NASA Scientific Visualization Studio · Kel Elkins · NASA JPL MUR SST')}</span>
        <a href={provenance.source.page}>NASA SVS 5688 <ArrowUpRight size={15} aria-hidden="true" /></a>
      </footer>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <AppearanceProvider>
    <StudioLanguageProvider>
      <PacificLab />
    </StudioLanguageProvider>
  </AppearanceProvider>,
)
