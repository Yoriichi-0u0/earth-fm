// Loads NASA SVS 5669's still and colour bar and analyses them in the browser, once per page.
import { useEffect, useState } from 'react';
import { AEROSOLS, COLORBAR_URL, IMAGE_HEIGHT, IMAGE_WIDTH, STILL_URL, analyzeStill, grooveSteps, mixIn, readLegend, type Aerosol, type AirField, type Mix, type Step } from './analyze.ts';
import { STORIES, STORY_STEPS, type Story } from './stories.ts';
import { scoreFor, type Chord } from './sonify.ts';

export type StoryTrack = { story: Story; steps: Step[]; score: Chord[]; mix: Mix };
export type AirModel =
  | { status: 'loading' | 'error'; error?: string }
  | { status: 'ready'; field: AirField; steps: Step[]; score: Chord[]; stories: StoryTrack[]; shares: Record<Aerosol, number> };

async function pixels(url: string, width?: number, height?: number): Promise<ImageData> {
  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error(`${url} failed to load`)); img.src = url; });
  const w = width ?? img.naturalWidth, h = height ?? img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

let cached: Promise<AirModel> | null = null;
function load(): Promise<AirModel> {
  return (cached ??= (async (): Promise<AirModel> => {
    try {
      const [still, bar] = await Promise.all([pixels(STILL_URL, IMAGE_WIDTH, IMAGE_HEIGHT), pixels(COLORBAR_URL)]);
      await new Promise((r) => setTimeout(r, 0)); // let the deck paint before the analysis pass
      const field = analyzeStill(still, readLegend(bar));
      const steps = grooveSteps(field);
      const counts = [0, 0, 0, 0];
      for (const k of field.type) if (k >= 0) counts[k]++;
      const shares = Object.fromEntries(AEROSOLS.map((a, k) => [a, counts[k] / field.type.length])) as Record<Aerosol, number>;
      const stories = STORIES.map((story) => { const s = grooveSteps(field, story.rect, STORY_STEPS); return { story, steps: s, score: scoreFor(s), mix: mixIn(field, story.rect) }; });
      return { status: 'ready', field, steps, score: scoreFor(steps), stories, shares };
    } catch (e) {
      cached = null;
      return { status: 'error', error: e instanceof Error ? e.message : String(e) };
    }
  })());
}

export function useAirModel(): AirModel {
  const [model, setModel] = useState<AirModel>({ status: 'loading' });
  useEffect(() => { let live = true; void load().then((m) => { if (live) setModel(m); }); return () => { live = false; }; }, []);
  return model;
}
