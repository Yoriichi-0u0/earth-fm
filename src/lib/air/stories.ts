// Side B: the six events NASA describes on the SVS 5669 page, each a short track.
// Captions paraphrase NASA's description; boxes are longitude/latitude windows on the still.
// Unit tests pin that each box is dominated by the aerosol NASA names.
import { boxFor, type Aerosol } from './analyze.ts';
import type { Rect } from '../nightLights/raster.ts';

export type Story = { id: string; title: string; place: string; aerosol: Aerosol; lon: number; lat: number; rect: Rect; caption: string };

const story = (id: string, title: string, place: string, aerosol: Aerosol, [lon0, lat0, lon1, lat1]: [number, number, number, number], caption: string): Story =>
  ({ id, title, place, aerosol, lon: (lon0 + lon1) / 2, lat: (lat0 + lat1) / 2, rect: boxFor(lon0, lat0, lon1, lat1), caption });

export const STORIES: readonly Story[] = [
  story('sahara', 'The Saharan dust journey', 'Sahara → Atlantic → Caribbean', 'dust', [-60, 8, 30, 30],
    'Desert dust from the Sahara crosses the whole Atlantic, hazing Caribbean skies and reaching the United States.'),
  story('erin', 'Hurricane Erin', 'Western Atlantic', 'seaSalt', [-80, 20, -66, 33],
    'The first Atlantic hurricane of 2025. Its winds churn the ocean, lifting sea salt into blue spirals, while it draws in dust from Africa.'),
  story('africa', 'Southern African fire smoke', 'Southern Africa → Atlantic', 'blackCarbon', [8, -22, 32, -2],
    'Seasonal agricultural burning sends smoke drifting out over the Atlantic Ocean.'),
  story('spain', 'Wildfires in Spain', 'Iberian Peninsula', 'blackCarbon', [-10, 38, 0, 45],
    'Wildfires raging across several regions of Spain add smoke to the European sky.'),
  story('etna', 'Mount Etna’s plume', 'Sicily → southern Europe', 'sulfate', [12, 32, 25, 40],
    'Italy’s Mount Etna releases streams of sulfate particles over southern Europe.'),
  story('kilauea', 'Kilauea’s sulfate stream', 'Hawaiʻi → central Pacific', 'sulfate', [-180, 15, -155, 25],
    'Hawaiʻi’s Kilauea volcano sends a narrow stream of sulfate particles westward across the Pacific.'),
];

/** Steps per story phrase. */
export const STORY_STEPS = 8;
