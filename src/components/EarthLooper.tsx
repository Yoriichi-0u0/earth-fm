import {useStudioLanguage} from '../lib/studioLanguage';
import type {useEarthLooper} from '../lib/useEarthLooper';

export default function EarthLooper({looper}:{looper:ReturnType<typeof useEarthLooper>}){
  const {t}=useStudioLanguage();const busy=looper.phase!=='idle',count=looper.events.length;
  return <section className="jb-looper" aria-label={t('Earth Looper')} data-loop-phase={looper.phase} data-loop-count={count} data-loop-duration={looper.take?.durationMs??0}>
    <div className="jb-looper-heading"><strong>{t('Earth Looper')}</strong><span>{count} / 64{looper.take&&<> · {(looper.take.durationMs/1000).toFixed(1)} s</>}</span></div>
    <div className="jb-looper-buttons">
      <button type="button" className="jb-loop-record" disabled={busy} onClick={looper.record}><i aria-hidden="true"/>{t(count?'Record again':'Record')}</button>
      <button type="button" disabled={!busy} onClick={looper.stop}>{t('Stop take')}</button>
      <button type="button" disabled={busy||!looper.take} onClick={()=>void looper.replay()}>{t('Replay')}</button>
      <button type="button" disabled={!busy&&!count} onClick={looper.clear}>{t('Clear take')}</button>
    </div>
    <p className="jb-looper-status" role="status">{t(looper.message)}</p>
    <p>{t('Up to 15 seconds. Scan events, no microphone. Changing records clears this take.')}</p>
  </section>;
}
