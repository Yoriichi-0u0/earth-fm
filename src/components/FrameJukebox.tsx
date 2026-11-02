import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, AudioLines, Check, ImagePlus, Info, Pause, Play, Radio, RotateCcw, Volume2 } from 'lucide-react';
import { useStudioLanguage } from '../lib/studioLanguage';
import { frames } from '../data/frames';
import type { EarthFrame } from '../data/frames';
import { FrameAudio, imageSequenceWav, imageToSequence } from '../lib/imageSonification';
import type { FrameStep } from '../lib/imageSonification';
import { mapValueToNote } from '../lib/audio';
import './FrameJukebox.css';

type LocalFrame = { name: string; url: string; kind: 'image' | 'animation' };
const SCAN_STEPS = 48;

export default function FrameJukebox({ climatePlaying, onStart, onPlayingChange, motionAllowed = true, referenceFrame, simple = false }: { referenceFrame?: EarthFrame; simple?: boolean; motionAllowed?: boolean; climatePlaying: boolean; onStart: () => void; onPlayingChange: (playing: boolean) => void }) {
  const {t}=useStudioLanguage();
  const [frameId, setFrameId] = useState(referenceFrame?.id ?? frames[0].id);
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
  const [sampledTime,setSampledTime]=useState(0);
  const scheduledFrames=useRef<Array<{steps:FrameStep[];time:number}>>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [frameFit,setFrameFit]=useState({left:0,width:100});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<FrameAudio | null>(null);
  const sessionRef = useRef(0);
  const liveStepsRef = useRef<FrameStep[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);
  const frame = referenceFrame ?? frames.find(f => f.id === frameId)!;
  const title = localFrame?.name ?? t(frame.title);
  const videoUrl = localFrame?.kind === 'animation' ? localFrame.url : !localFrame ? frame.videoUrl : undefined;
  const imageUrl = localFrame?.url ?? frame.imageUrl;
  const current = steps[scanIndex] ?? steps[0];
  const note = current ? mapValueToNote(current.brightness, 0, 1).note : '—';

  const stop = () => { sessionRef.current++; audioRef.current?.stop(); videoRef.current?.pause(); setPlaying(false); onPlayingChange(false); };
  useEffect(() => { audioRef.current = new FrameAudio(); canvasRef.current = document.createElement('canvas'); return () => { sessionRef.current++; audioRef.current?.dispose(); if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current); }; }, []);
  useEffect(() => { const hide=()=>{if(document.hidden)stop();}; document.addEventListener('visibilitychange',hide); return ()=>document.removeEventListener('visibilitychange',hide); },[]);
  useEffect(() => { if (!motionAllowed) { videoRef.current?.pause(); setAnimate(false); } },[motionAllowed]);
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
  const fitFrame=()=>{
    const screen=screenRef.current,media=videoUrl?videoRef.current:imageRef.current;
    const width=videoUrl?videoRef.current?.videoWidth:imageRef.current?.naturalWidth;
    const height=videoUrl?videoRef.current?.videoHeight:imageRef.current?.naturalHeight;
    if(!screen||!media||!width||!height||!screen.clientWidth)return;
    const visibleWidth=Math.min(screen.clientWidth,screen.clientHeight*width/height);
    setFrameFit({left:(screen.clientWidth-visibleWidth)/2/screen.clientWidth*100,width:visibleWidth/screen.clientWidth*100});
  };
  const prepare = () => { try { const sequence = sample(); liveStepsRef.current = sequence; setSteps(sequence); setScanIndex(0); setReady(true); setError(''); fitFrame(); } catch { setReady(false); setError('This visual could not be read. Choose another frame or upload a local image.'); } };
  // A cached media element can already be decoded before readiness listeners
  // are attached. Observe native readiness and also inspect current state.
  useEffect(()=>{
    const video=videoRef.current;
    let prepared=false;
    const decoded=()=>{if(!prepared&&video&&video.readyState>=2){prepare();prepared=true;}};
    if(video){video.addEventListener('loadeddata',decoded);video.addEventListener('canplay',decoded);decoded();}
    else if(imageRef.current?.complete&&imageRef.current.naturalWidth)prepare();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fitFrame);if(screenRef.current)observer?.observe(screenRef.current);
    return()=>{observer?.disconnect();video?.removeEventListener('loadeddata',decoded);video?.removeEventListener('canplay',decoded);};
  },[videoUrl,imageUrl]);
  const changeFrame = (id: string) => { stop(); setFrameId(id); setLocalFrame(null); setReady(false); setScanIndex(0); setSteps([]); setError(''); setAnnouncement(''); };
  const start = async () => {
    onStart();
    const session = ++sessionRef.current;
    setError(''); setScanIndex(0); scheduledFrames.current=[];
    try {
      // Start the audio context from the user gesture before awaiting media decoding.
      const initialSequence = sample(); liveStepsRef.current = initialSequence;
      if (videoRef.current && animate && motionAllowed) void videoRef.current.play().catch(() => { setError('Animation playback was blocked. The visible frame can still be heard.'); });
      await audioRef.current?.start(initialSequence, {
        tempo, volume,
        sampleStep: i => { const sequence = sample(); liveStepsRef.current = sequence; scheduledFrames.current[i]={steps:sequence,time:videoRef.current?.currentTime??0}; return sequence[i]; },
        onStep: i => { if (session === sessionRef.current) { setScanIndex(i); setSteps(scheduledFrames.current[i]?.steps??liveStepsRef.current); setSampledTime(scheduledFrames.current[i]?.time??0); } },
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

  return <section id="visual-radio" className={`content-width visual-section${simple?' visual-guided':''}`}>
    <div className="section-heading"><div><div className="eyebrow muted">{t("THE EARTH INFORMATION CENTER, IN SOUND")}</div><h2>{t("Don’t just see the Earth. Hear it.")}</h2></div><span className="visual-tag"><Radio size={12}/> {t("REAL-TIME SONIFICATION")}</span></div>
    <div className="visual-layout">
      <div className="visual-screen-panel">
        <div className="visual-screen-header"><span><span className="live-dot"/>{t(playing ? 'ON AIR' : simple ? (videoUrl?'NASA EIC / EARTH IN MOTION':'NASA SVS / CLIMATE SPIRAL') : 'VISUAL RADIO')}</span><span>{t(videoUrl ? 'LIVE FRAME SAMPLING' : 'PIXELS → SOUND')}</span></div>
        <div ref={screenRef} className="visual-screen" aria-label={t("Visual frame and scan position")}>
          {videoUrl ? <video key={videoUrl} ref={videoRef} src={videoUrl} muted loop playsInline preload="auto" onError={() => { setReady(false); setError('The animation could not load. Try another frame.'); }} aria-label={localFrame ? `${t("Uploaded visualization:")} ${title}` : t(frame.description)}/> : <img key={imageUrl} ref={imageRef} src={imageUrl} alt={localFrame ? `${t("Uploaded visualization:")} ${title}` : t(frame.description)} onLoad={prepare} onError={() => { setReady(false); setError('The image could not load. Try another frame.'); }}/>}
          {ready && <div className={`visual-scan ${playing ? 'is-scanning' : ''}`} style={{ left: `${frameFit.left+(scanIndex + .5) / SCAN_STEPS * frameFit.width}%` }}><span>{String(scanIndex + 1).padStart(2, '0')} / 48</span></div>}
          {!ready && !error && <span className="visual-loading">{t("Loading the Earth’s signal…")}</span>}
        </div>
        {simple && <div className="obs-visual-cue"><span className="obs-cue-label">{t('IMAGE → SOUND')}</span><h3>{t('Follow the light. Hear the pattern.')}</h3><dl><div><dt>{t('Brightness')}</dt><dd>{t('Pitch')}</dd></div><div><dt>{t('Colour')}</dt><dd>{t('Tone')}</dd></div><div><dt>{t('Scan position')}</dt><dd>{t('Left / right sound')}</dd></div></dl><p>{t('These notes describe pixels. The next step listens to temperature measurements.')}</p>{videoUrl&&<label className="st-moving-control"><input type="checkbox" checked={animate&&motionAllowed} disabled={!motionAllowed} onChange={e=>{stop();setAnimate(e.target.checked);}}/>{t('Follow the animation')}</label>}{videoUrl&&!motionAllowed&&<small className="st-motion-off">{t('Motion is off. Listen to a still frame, or enable Motion effects in the footer.')}</small>}</div>}
        <div className="visual-screen-caption"><span>{title}</span><span>{t(localFrame ? 'LOCAL FILE · STAYS ON YOUR DEVICE' : referenceFrame?.id==='nasa-climate-spiral' ? 'NASA SVS 5190 · REFERENCE IMAGE' : 'EARTH.GOV ASSET MIRROR')}</span></div>
        <div className="visual-spectrum" role="img" aria-label={t("Current frame brightness across 48 vertical strips")}>{steps.map((s, i) => <i key={i} className={i === scanIndex ? 'active' : ''} style={{ height: `${Math.max(8, s.brightness * 100)}%` }}/>)}</div>
        <div className="visual-transport"><button className={`icon-button${simple?' sp-hide':''}`} aria-label={t("Restart visual scan")} disabled={!ready} onClick={() => { stop(); setScanIndex(0); }}><RotateCcw size={16}/></button><button id="play-visual-button" className="primary-button" disabled={!ready} onClick={() => playing ? stop() : void start()}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}{t(simple ? (playing?'Stop visual sound':'Play visual sound') : (playing ? 'Pause visual' : 'Hear this visual'))}</button><div className="visual-note"><strong>{note}</strong><span>{current ? `${Math.round(current.brightness * 100)}% ${t('LUMA')}` : t('READING PIXELS')}</span></div><div className="visual-volume"><Volume2 size={15}/><label className="sr-only" htmlFor="visual-volume">{t("Visual volume")}</label><input id="visual-volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></div></div>
      </div>
      {!simple && <div className="visual-settings"><span className="eyebrow">{t("SELECT A VISUAL FRAME")}</span><div className="frame-options">{frames.map(f => <button key={f.id} className={!localFrame && frameId === f.id ? 'active' : ''} aria-pressed={!localFrame && frameId === f.id} onClick={() => changeFrame(f.id)}><img src={f.id === 'untethered-earth' ? '/frames/eic-immersive.webp' : f.imageUrl} alt=""/><span><strong>{t(f.title)}</strong><small>{t(f.kind === 'animation' ? 'EIC immersive animation' : f.id === 'night-lights' ? 'NASA / NOAA nighttime imagery' : 'EIC exhibit photograph')}</small></span>{!localFrame && frameId === f.id ? <Check size={14}/> : <ArrowRight size={14}/>}</button>)}</div>
        <input className="sr-only" type="file" id="upload-visual" tabIndex={-1} aria-label={t("Upload a visual image or video")} ref={fileRef} accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }}/>
        <button className="upload-button" onClick={() => fileRef.current?.click()}><ImagePlus size={17}/><span>{t("Bring your own EIC frame")}<small>{t("Image or video · up to 20 MB · processed locally")}</small></span><span>+</span></button>
        <div className="visual-mapping"><span className="eyebrow">{t("HOW YOUR EYES BECOME EARS")}</span><p>{t("We scan from left to right. Brightness becomes pitch, color shapes the tone, and position moves the sound between your ears.")}</p><div><span>{t("BRIGHTNESS")}</span><i>↗</i><strong>{t("PITCH")}</strong></div><div><span>{t("RED / GREEN / BLUE")}</span><i>→</i><strong>{t("TIMBRE")}</strong></div><div><span>{t("LEFT → RIGHT")}</span><i>→</i><strong>{t("STEREO PAN")}</strong></div></div>
        <div className="visual-tempo"><label htmlFor="visual-tempo">{t("SCAN TEMPO")}</label><span>{tempo} BPM</span><input id="visual-tempo" type="range" min="60" max="180" step="10" value={tempo} onChange={e => { stop(); setTempo(Number(e.target.value)); }}/></div>
        {videoUrl && <label className="visual-motion"><input type="checkbox" checked={animate && motionAllowed} disabled={!motionAllowed} onChange={e => { stop(); setAnimate(e.target.checked); }}/><span>{t("Follow the animation")}<small>{t("Leave off to hear a still frame with less motion.")}</small></span></label>}
        <button className="outline-button" disabled={!ready || exporting} onClick={() => void download()}><ArrowDownToLine size={15}/>{t(exporting ? 'Rendering…' : 'Download visual soundtrack')}</button>
      </div>}
    </div>
    <div className="visual-science-note"><Info size={14}/><p>{t("Image sounds describe visual patterns, not measured temperature or concentration. Animated pixels are sampled again at every note. For scientific temperature values, choose Hear climate change.")}</p></div>
    <div className="visual-provenance">{localFrame ? <span>{t("Your file is processed only in this browser. No upload or account required.")}</span> : <><span>{frame.credit}. {t(frame.date)}.</span><a href={frame.mirrorUrl} target="_blank" rel="noreferrer">{t(referenceFrame?.id==='nasa-climate-spiral' ? "View NASA source" : "View archived source")} <ArrowRight size={12}/></a></>}</div>
    {simple&&<details className="sp-disclosure st-live-proof"><summary>{t('Inspect the pixel-to-sound mapping')}</summary><dl><div><dt>{t('Sampled frame time')}</dt><dd>{sampledTime.toFixed(2)} s</dd></div><div><dt>{t('Scan strip')}</dt><dd>{scanIndex+1} / 48</dd></div><div><dt>{t('Brightness · 0 to 1')}</dt><dd>{current?.brightness.toFixed(4)??'—'}</dd></div><div><dt>{t('Target pitch')}</dt><dd>{current?`${note} · ${mapValueToNote(current.brightness,0,1).frequency.toFixed(2)} Hz`:'—'}</dd></div></dl><p>{t('Brightness is the average displayed sRGB luma estimate in a vertical strip: 0.2126R + 0.7152G + 0.0722B. It selects a fixed musical pitch; colour changes harmonics and horizontal position changes stereo pan. It is not a physical temperature retrieval.')}</p><p>{t(frame.date)}</p></details>}
    {error && <p className="visual-error" role="alert">{t(error)}</p>}{announcement && <p className="visual-announcement" role="status"><AudioLines size={14}/>{t(announcement)}</p>}
  </section>;
}
