import {Component, lazy, Suspense, useState} from 'react'
import type {ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import AppearanceSelector from '../../src/components/AppearanceSelector'
import {AppearanceProvider} from '../../src/lib/AppearanceProvider'
import {StudioLanguageProvider} from '../../src/lib/studioLanguage'
import {useFrameInstrument} from '../../src/lib/useFrameInstrument'
import {mapValueToNote} from '../../src/lib/audio'
import {bandTop, bandHeight, mapHeight, scanMap, stripCount} from './scanMap'
import map2025 from './assets/20251010.png'
import map2026 from './assets/20261010.png'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/space-grotesk/500.css'
import '../../src/appearance.css'
import '../pacific/pacific.css'
import './maps.css'

const Globes = lazy(() => import('./PairedGlobes'))
const frames = [
  {year: 2025, url: map2025},
  {year: 2026, url: map2026},
] as const

class GlobeBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false}
  static getDerivedStateFromError() { return {failed: true} }
  render() {
    return this.state.failed ? <p role="status">3D is unavailable. The maps and sound are ready below.</p> : this.props.children
  }
}

function PacificMaps() {
  const [decoded, setDecoded] = useState<Partial<Record<number, {image: HTMLImageElement; steps: ReturnType<typeof scanMap>}>>>({})
  const [strip, setStrip] = useState(23)
  const [volume, setVolume] = useState(.55)
  const [showGlobe, setShowGlobe] = useState(false)
  const [mapError, setMapError] = useState(false)
  const first = decoded[2025]
  const second = decoded[2026]
  const ready = Boolean(first && second)
  const instrument = useFrameInstrument([...(first?.steps ?? []), ...(second?.steps ?? [])], volume, ready)
  const readings = frames.map(frame => {
    const sample = decoded[frame.year]?.steps[strip]
    return {...frame, sample, pitch: sample && mapValueToNote(sample.brightness, 0, 1)}
  })
  const stripSummary = [`Strip ${strip + 1} of ${stripCount}`, ...readings.flatMap(({year, sample, pitch}) =>
    sample && pitch ? [`${year}: ${(sample.brightness * 100).toFixed(1)} percent brightness, ${pitch.note}, ${pitch.frequency.toFixed(2)} hertz`] : [])].join('; ')

  function prepare(year: number, image: HTMLImageElement) {
    try {
      const steps = scanMap(image)
      setDecoded(previous => ({...previous, [year]: {image, steps}}))
    } catch {
      setMapError(true)
    }
  }

  return <main className="pacific pacific-maps">
    <header className="lab-header"><span className="lab-brand">TerraJuke</span><AppearanceSelector /></header>
    <div className="lab-intro">
      <h1>Pacific Map Comparison</h1>
      <p>Listen to the same image strip on October 10, one year apart.</p>
    </div>
    <section className="lab-controls" aria-label="Pacific listening controls">
      <div className="lab-slider-head"><label htmlFor="pacific-strip">Shared strip</label><span>{strip + 1} / {stripCount}</span></div>
      <input id="pacific-strip" type="range" min={1} max={stripCount} value={strip + 1} disabled={!ready} aria-describedby="strip-meaning" aria-valuetext={stripSummary}
        onChange={event => {instrument.stop(); setStrip(event.currentTarget.valueAsNumber - 1)}} />
      <div className="lab-buttons">
        {frames.map(({year}, i) => <button type="button" key={year} className="lab-primary" disabled={!ready}
          onClick={() => {instrument.stop(); void instrument.play(i * stripCount + strip)}}>Hear {year}</button>)}
        <button type="button" disabled={!instrument.playing && !instrument.starting} onClick={instrument.stop}>Stop</button>
        <label className="lab-volume">Volume <input aria-label="Volume" type="range" min={0} max={1} step={.01} value={volume} onChange={event => setVolume(event.currentTarget.valueAsNumber)} /></label>
      </div>
      {instrument.notice && <p role="status">Audio is ready. Press a year to hear it.</p>}
      {(mapError || instrument.error) && <p role="alert">{mapError ? 'A source image failed to load or decode.' : 'Audio could not start. Press a year to try again.'}</p>}
    </section>
    <p id="strip-meaning" className="lab-note">Both notes use the same columns within the marked central band. Pitch follows pixel brightness. The NASA palette shows sea-surface temperature anomalies in °C. The pitch does not measure temperature.</p>
    <div className="lab-buttons">
      <button type="button" aria-pressed={showGlobe} aria-controls="pacific-globes" disabled={!ready} onClick={() => setShowGlobe(open => !open)}>Paired 3D globes</button>
    </div>
    <div id="pacific-globes">
      {showGlobe && first && second && <GlobeBoundary><Suspense fallback={<p role="status">Loading paired globes…</p>}>
        <Globes images={[first.image, second.image]} strip={strip} />
      </Suspense></GlobeBoundary>}
    </div>
    <div className="lab-panels pacific-map-panels">
      {readings.map(({year, url, sample, pitch}) =>
        <section className="lab-panel" key={year} aria-label={`October 10, ${year}`}>
          <h2>October 10, {year}</h2>
          <div className="pacific-map-frame">
            <img src={url} width={1024} height={512} alt={`NASA SVS Pacific-centered temperature anomaly map for October 10, ${year}`} onLoad={event => prepare(year, event.currentTarget)} onError={() => setMapError(true)} />
            <span className="pacific-map-band" aria-hidden="true" style={{top: `${bandTop / mapHeight * 100}%`, height: `${bandHeight / mapHeight * 100}%`}}>
              <span className="lab-strip" style={{left: `${strip / stripCount * 100}%`}} />
            </span>
          </div>
          <dl className="lab-readout"><div><dt>Brightness</dt><dd>{sample ? `${(sample.brightness * 100).toFixed(1)}%` : '—'}</dd></div>
            <div><dt>Note</dt><dd data-frequency={pitch?.frequency}>{pitch ? `${pitch.note} · ${pitch.frequency.toFixed(2)} Hz` : '—'}</dd></div></dl>
        </section>)}
    </div>
    <p className="lab-note">In the original legend, blue means cooler than the reference and red means warmer. Approximate globe orientation is inferred from landmarks. The renderer does not supply verified coordinates.</p>
    <footer className="lab-credit"><a href="https://svs.gsfc.nasa.gov/5176/">NASA Scientific Visualization Studio · Kel Elkins · JPL MUR SST</a></footer>
  </main>
}

createRoot(document.getElementById('root')!).render(<AppearanceProvider><StudioLanguageProvider><PacificMaps /></StudioLanguageProvider></AppearanceProvider>)
