/** NASA / Earth Information Center imagery retrieved from an attributed earth.gov asset mirror.
 * Exact retrieval origins, verification scope, and hashes: docs/FRAMES.md.
 * Images are context visuals; their pixels do not encode the annual observation tracks.
 */
export type EarthFrame = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  description: string;
  date: string;
  kind: 'image' | 'animation';
  credit: string;
  videoUrl?: string;
  originalUrl: string;
  mirrorUrl: string;
};

const mirror = 'https://raw.githubusercontent.com/CarsonDavis/compression-comparison/2895d06f1a6abc144a5bc74f10daac805e8b0022/';

export const frames: EarthFrame[] = [
  {
    id: 'night-lights',
    title: 'Earth after dark',
    source: 'NASA / NOAA · earth.gov asset mirror',
    sourceUrl: 'https://earth.gov/',
    imageUrl: '/frames/night-lights.webp',
    description: 'Satellite nighttime imagery of the Great Lakes and eastern North America. NASA and NOAA credit appears in the visual. Published as the earth.gov energy theme image, according to the asset mirror.',
    date: 'Observation date not supplied',
    kind: 'image',
    credit: 'NOAA / NASA; earth.gov asset reproduced via CarsonDavis/compression-comparison',
    originalUrl: 'https://earth.gov/images/themes/energy/card.png',
    mirrorUrl: `${mirror}originals/themes--energy--card.png`,
  },
  {
    id: 'eic-immersive',
    title: 'Inside the Earth Information Center',
    source: 'NASA EIC · earth.gov asset mirror',
    sourceUrl: 'https://www.nasa.gov/earth-information-center/',
    imageUrl: '/frames/eic-immersive.webp',
    description: 'An Earth Information Center immersive display presents NASA Earth-observation mission imagery and planetary indicators. This is an exhibit photograph, not a gridded scientific dataset.',
    date: 'Photograph date not supplied',
    kind: 'image',
    credit: 'NASA / Earth Information Center, as identified by the earth.gov asset mirror; individual photographer not supplied',
    originalUrl: 'https://earth.gov/images/portals/earth-information-center.png',
    mirrorUrl: `${mirror}originals/portals--earth-information-center.png`,
  },
  {
    id: 'untethered-earth',
    title: 'Untethered: an Earth perspective',
    source: 'NASA EIC immersive experience · earth.gov asset mirror',
    sourceUrl: 'https://www.nasa.gov/earth-information-center/',
    imageUrl: '/frames/untethered-earth.gif',
    videoUrl: '/frames/untethered-earth.webm',
    description: 'An animated view of Earth from the Earth Information Center immersive experience, as identified by the asset mirror’s visit/immersive-experience path. The animation is contextual imagery, not an annual data visualization.',
    date: 'Animation date not supplied',
    kind: 'animation',
    credit: 'NASA / Earth Information Center, as identified by the earth.gov asset mirror; production credits not supplied',
    originalUrl: 'https://earth.gov/images/visit/immersive-experience/untethered-4.gif',
    mirrorUrl: `${mirror}originals/visit--immersive-experience--untethered-4.gif`,
  },
];
