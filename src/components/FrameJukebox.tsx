import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, AudioLines, Check, ImagePlus, Info, Pause, Play, Radio, RotateCcw, Volume2 } from 'lucide-react';
import { frames } from '../data/frames';
import { FrameAudio, imageSequenceWav, imageToSequence } from '../lib/imageSonification';
import type { FrameStep } from '../lib/imageSonification';
import { mapValueToNote } from '../lib/audio';
import './FrameJukebox.css';

type LocalFrame = { name: string; url: string; kind: 'image' | 'animation' };
const SCAN_STEPS = 48;

export default function FrameJukebox({ climatePlaying, onStart, onPlayingChange }: { climatePlaying: boolean; onStart: () => void; onPlayingChange: (playing: boolean) => void }) {
  const [frameId, setFrameId] = useState(frames[0].id);
  const [localFrame, setLocalFrame] = useState<LocalFrame | null>(null);
  const [steps, setSteps] = useState<FrameStep[]>([]);
  const [scanIndex, setScanIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [volume, setVolume] = useState(.55);
  const [animate, setAnimate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<FrameAudio | null>(null);
  const sessionRef = useRef(0);
  const liveStepsRef = useRef<FrameStep[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);
  const frame = frames.find(f => f.id === frameId)!;
  const title = localFrame?.name ?? frame.title;
  const videoUrl = localFrame?.kind === 'animation' ? localFrame.url : !localFrame ? frame.videoUrl : undefined;
  const imageUrl = localFrame?.url ?? frame.imageUrl;
  const current = steps[scanIndex] ?? steps[0];
  const note = current ? mapValueToNote(current.brightness, 0, 1).note : '—';

  const stop = () => { sessionRef.current++; audioRef.current?.stop(); videoRef.current?.pause(); setPlaying(false); onPlayingChange(false); };
  useEffect(() => { audioRef.current = new FrameAudio(); canvasRef.current = document.createElement('canvas'); return () => { sessionRef.current++; audioRef.current?.dispose(); if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current); }; }, []);
  useEffect(() => { if (climatePlaying) stop(); }, [climatePlaying]);
  useEffect(() => { audioRef.current?.setVolume(volume); }, [volume]);

  const sample = () => {
    const video = videoRef.current;
    const image = imageRef.current;
    const source = videoUrl ? video : image;
    const naturalWidth = videoUrl ? video?.videoWidth : image?.naturalWidth;
    const naturalHeight = videoUrl ? video?.videoHeight : image?.naturalHeight;
    const canvas = canvasRef.current;
    if (!source || !canvas || !naturalWidth || !naturalHeight) throw new Error('The visual has not finished loading.');
    canvas.width = 384; canvas.height = Math.max(1, Math.round(naturalHeight / naturalWidth * 384));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('This browser does not support reading image pixels.');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return imageToSequence(context.getImageData(0, 0, canvas.width, canvas.height), SCAN_STEPS);
  };
  const prepare = () => { try { const sequence = sample(); liveStepsRef.current = sequence; setSteps(sequence); setScanIndex(0); setReady(true); setError(''); } catch { setReady(false); setError('This visual could not be read. Choose another frame or upload a local image.'); } };
  const changeFrame = (id: string) => { stop(); setFrameId(id); setLocalFrame(null); setReady(false); setScanIndex(0); setSteps([]); setError(''); setAnnouncement(''); };
  const start = async () => {
    onStart();
    const session = ++sessionRef.current;
    setError(''); setScanIndex(0);
    try {
      // Start the audio context from the user gesture before awaiting media decoding.
      const initialSequence = sample(); liveStepsRef.current = initialSequence;
      if (videoRef.current && animate) void videoRef.current.play().catch(() => { setError('Animation playback was blocked. The visible frame can still be heard.'); });
      await audioRef.current?.start(initialSequence, {
        tempo, volume,
        sampleStep: i => { const sequence = sample(); liveStepsRef.current = sequence; return sequence[i]; },
        onStep: i => { if (session === sessionRef.current) { setScanIndex(i); setSteps(liveStepsRef.current); } },
        onEnd: () => { if (session === sessionRef.current) { setPlaying(false); onPlayingChange(false); videoRef.current?.pause(); } },
      });
      if (session === sessionRef.current) { setPlaying(true); onPlayingChange(true); }
    } catch { if (session === sessionRef.current) { stop(); setError('Could not start this visual. Check that it has loaded, then try again.'); } }
  };
  const upload = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/webm', 'video/mp4'].includes(file.type)) { setError('Choose a PNG, JPEG, WebP, GIF, MP4, or WebM file.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('Please choose a file smaller than 20 MB.'); return; }
    stop(); if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const url = URL.createObjectURL(file); localUrlRef.current = url;
    setLocalFrame({ name: file.name, url, kind: file.type.startsWith('video/') ? 'animation' : 'image' }); setReady(false); setSteps([]); setScanIndex(0); setError(''); setAnnouncement('');
  };
  const download = async () => {
    setExporting(true); setAnnouncement('');
    try {
      const snapshot = sample(); const blob = await imageSequenceWav(snapshot, { tempo, volume });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `earth-fm-visual-${localFrame ? 'upload' : frame.id}.wav`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setAnnouncement('Visual soundtrack downloaded. Video exports represent the frame visible when you clicked download.');
    } catch { setError('This visual could not be exported. Try another frame.'); }
    finally { setExporting(false); }
  };

  return <section id="visual-radio" className="content-width visual-section">
    <div className="section-heading"><div><div className="eyebrow muted">THE EARTH INFORMATION CENTER, IN SOUND</div><h2>Don’t just see the Earth. Hear it.</h2></div><span className="visual-tag"><Radio size={12}/> REAL-TIME SONIFICATION</span></div>
    <div className="visual-layout">
      <div className="visual-screen-panel">
        <div className="visual-screen-header"><span><span className="live-dot"/>{playing ? 'ON AIR' : 'VISUAL RADIO'}</span><span>{videoUrl ? 'LIVE FRAME SAMPLING' : 'PIXELS → SOUND'}</span></div>
        <div className="visual-screen" aria-label="Visual frame and scan position">
          {videoUrl ? <video key={videoUrl} ref={videoRef} src={videoUrl} poster={!localFrame ? frame.imageUrl : undefined} muted loop playsInline preload="auto" onLoadedData={prepare} onError={() => { setReady(false); setError('The animation could not load. Try another frame.'); }} aria-label={localFrame ? `Uploaded visualization: ${title}` : frame.description}/> : <img key={imageUrl} ref={imageRef} src={imageUrl} alt={localFrame ? `Uploaded visualization: ${title}` : frame.description} onLoad={prepare} onError={() => { setReady(false); setError('The image could not load. Try another frame.'); }}/>} 
          {ready && <div className={`visual-scan ${playing ? 'is-scanning' : ''}`} style={{ left: `${(scanIndex + .5) / SCAN_STEPS * 100}%` }}><span>{String(scanIndex + 1).padStart(2, '0')} / 48</span></div>}
          {!ready && !error && <span className="visual-loading">Loading the Earth’s signal…</span>}
        </div>
        <div className="visual-screen-caption"><span>{title}</span><span>{localFrame ? 'LOCAL FILE · STAYS ON YOUR DEVICE' : 'EARTH.GOV ASSET MIRROR'}</span></div>
        <div className="visual-spectrum" role="img" aria-label="Current frame brightness across 48 vertical strips">{steps.map((s, i) => <i key={i} className={i === scanIndex ? 'active' : ''} style={{ height: `${Math.max(8, s.brightness * 100)}%` }}/>)}</div>
        <div className="visual-transport"><button className="icon-button" aria-label="Restart visual scan" disabled={!ready} onClick={() => { stop(); setScanIndex(0); }}><RotateCcw size={16}/></button><button id="play-visual-button" className="primary-button" disabled={!ready} onClick={() => playing ? stop() : void start()}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}{playing ? 'Pause visual' : 'Hear this visual'}</button><div className="visual-note"><strong>{note}</strong><span>{current ? `${Math.round(current.brightness * 100)}% LUMA` : 'READING PIXELS'}</span></div><div className="visual-volume"><Volume2 size={15}/><label className="sr-only" htmlFor="visual-volume">Visual volume</label><input id="visual-volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></div></div>
      </div>
      <div className="visual-settings"><span className="eyebrow">SELECT A VISUAL FRAME</span><div className="frame-options">{frames.map(f => <button key={f.id} className={!localFrame && frameId === f.id ? 'active' : ''} aria-pressed={!localFrame && frameId === f.id} onClick={() => changeFrame(f.id)}><img src={f.id === 'untethered-earth' ? '/frames/eic-immersive.webp' : f.imageUrl} alt=""/><span><strong>{f.title}</strong><small>{f.kind === 'animation' ? 'EIC immersive animation' : f.id === 'night-lights' ? 'NASA / NOAA nighttime imagery' : 'EIC exhibit photograph'}</small></span>{!localFrame && frameId === f.id ? <Check size={14}/> : <ArrowRight size={14}/>}</button>)}</div>
        <input className="sr-only" type="file" id="upload-visual" tabIndex={-1} aria-label="Upload a visual image or video" ref={fileRef} accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }}/>
        <button className="upload-button" onClick={() => fileRef.current?.click()}><ImagePlus size={17}/><span>Bring your own EIC frame<small>Image or video · up to 20 MB · processed locally</small></span><span>+</span></button>
        <div className="visual-mapping"><span className="eyebrow">HOW YOUR EYES BECOME EARS</span><p>We scan from left to right. Brightness becomes pitch, color shapes the tone, and position moves the sound between your ears.</p><div><span>BRIGHTNESS</span><i>↗</i><strong>PITCH</strong></div><div><span>RED / GREEN / BLUE</span><i>→</i><strong>TIMBRE</strong></div><div><span>LEFT → RIGHT</span><i>→</i><strong>STEREO PAN</strong></div></div>
        <div className="visual-tempo"><label htmlFor="visual-tempo">SCAN TEMPO</label><span>{tempo} BPM</span><input id="visual-tempo" type="range" min="60" max="180" step="10" value={tempo} onChange={e => { stop(); setTempo(Number(e.target.value)); }}/></div>
        {videoUrl && <label className="visual-motion"><input type="checkbox" checked={animate} onChange={e => { stop(); setAnimate(e.target.checked); }}/><span>Follow the animation<small>Leave off to hear a still frame with less motion.</small></span></label>}
        <button className="outline-button" disabled={!ready || exporting} onClick={() => void download()}><ArrowDownToLine size={15}/>{exporting ? 'Rendering…' : 'Download visual soundtrack'}</button>
      </div>
    </div>
    <div className="visual-science-note"><Info size={14}/><p>Image sounds describe visual patterns, not measured temperature or concentration. Animated pixels are sampled again at every note. Climate measurements have their own recordings below.</p></div>
    <div className="visual-provenance">{localFrame ? <span>Your file is processed only in this browser. No upload or account required.</span> : <><span>{frame.credit}. {frame.date}.</span><a href={frame.mirrorUrl} target="_blank" rel="noreferrer">View archived source <ArrowRight size={12}/></a></>}</div>
    {error && <p className="visual-error" role="alert">{error}</p>}{announcement && <p className="visual-announcement" role="status"><AudioLines size={14}/>{announcement}</p>}
  </section>;
}
