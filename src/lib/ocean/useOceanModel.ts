// Loads NASA SVS 3912's analysed still and colour bar and reads them in the browser, once per page.
import { useEffect, useState } from 'react';
import { ANALYSIS_URL, COLORBAR_URL, analyzeOcean, poleToPole, readColorbar, type Band, type OceanField } from './analyze.ts';
import { noteFor, type OceanNote } from './sonify.ts';

export type OceanModel = { status: 'loading' | 'error'; error?: string } | { status: 'ready'; field: OceanField; bands: Band[]; score: OceanNote[] };

async function pixels(url: string): Promise<ImageData> {
  const img = new Image(); img.decoding = 'async';
  await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error(`${url} failed to load`)); img.src = url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

let cached: Promise<OceanModel> | null = null;
function load(): Promise<OceanModel> {
  return (cached ??= (async (): Promise<OceanModel> => {
    try {
      const [img, bar] = await Promise.all([pixels(ANALYSIS_URL), pixels(COLORBAR_URL)]);
      await new Promise((r) => setTimeout(r, 0));
      const field = analyzeOcean(img, readColorbar(bar)), bands = poleToPole(field);
      return { status: 'ready', field, bands, score: bands.map((b) => noteFor(b.reading)) };
    } catch (e) { cached = null; return { status: 'error', error: e instanceof Error ? e.message : String(e) }; }
  })());
}

export function useOceanModel(): OceanModel {
  const [m, setM] = useState<OceanModel>({ status: 'loading' });
  useEffect(() => { let live = true; void load().then((x) => { if (live) setM(x); }); return () => { live = false; }; }, []);
  return m;
}
