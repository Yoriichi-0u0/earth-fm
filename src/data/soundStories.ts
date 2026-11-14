// "About this sound": What, Who, When, Where, Why and How for every record on the shelf.
// Every line is taken from the record's provenance files and docs (docs/AIR.md, OCEAN.md, NIGHT-LIGHTS.md,
// ARCTIC-ICE.md, SOURCE-VERIFICATION.md). Update this file whenever a record's source or sound rules change.
import type {JukeboxRecordId} from './jukeboxRecords';

export type SoundStory={what:string;who:string;when:string;where:string;why:string;how:string};

export const SOUND_STORIES:Record<JukeboxRecordId,SoundStory>={
  spiral:{
    what:'Two sounds from one story. Side A plays NASA’s Climate Spiral picture itself; Side B plays twelve real January global temperature anomalies.',
    who:'NASA GISS measured the temperatures (GISTEMP v4). NASA’s Scientific Visualization Studio drew the spiral (Mark SubbaRao, after Ed Hawkins’s design). TerraJuke makes the sound.',
    when:'Temperatures from January 1880 to September 2026, a snapshot taken on 18 October 2026. The spiral image is NASA’s update of 11 September 2026.',
    where:'The whole planet: the average of land and ocean temperatures. Image: NASA SVS 5190.',
    why:'To hear the difference between a picture of warming and the measurements behind it: brighter pixels are not hotter years.',
    how:'Side A scans the picture left to right in 48 strips: brightness sets pitch, colour shapes the tone, position sets left and right. Side B: each anomaly, in °C against 1951–1980, sets pitch on a fixed scale.',
  },
  nightlights:{
    what:'How the Earth’s night lights changed over a decade. Side A plays NASA’s change map; Side B plays NASA’s twelve yearly night-light frames.',
    who:'The NASA/NOAA Suomi NPP satellite (VIIRS) and NASA’s Black Marble team; visualized by Kel Elkins at NASA’s Scientific Visualization Studio for the Earth Information Center.',
    when:'Yearly averages from 2012 to 2023.',
    where:'The whole world, with NASA’s close-ups of four regions. Image: NASA SVS 5313, EIC Version.',
    why:'To hear where human light grew or dimmed: a decade of change you can follow with your ears.',
    how:'Side A reads each pixel’s colour on NASA’s own legend: purple (more light) rises, orange (less light) falls. Side B: one note per year, and every doubling of a place’s brightness is one octave up.',
  },
  air:{
    what:'Four kinds of particles in the air at one moment: smoke (black carbon), dust, sea salt and sulfate.',
    who:'NASA’s Global Modeling and Assimilation Office ran the GEOS model; Joseph V. Ardizzone and Helen-Nicole Kostis visualized it at NASA’s Scientific Visualization Studio.',
    when:'19 August 2025, 20:00 UTC: a single moment, not a live feed.',
    where:'The whole globe. Image: NASA SVS 5669, GEOS Aerosols.',
    why:'To hear that the air is shared: smoke, dust and salt cross oceans and borders, and NASA’s six stories show where.',
    how:'Each aerosol’s colour, read from NASA’s own colour bar, becomes one instrument; how strongly a pixel shows that colour sets loudness, latitude sets pitch and longitude sets time.',
  },
  ocean:{
    what:'The temperature of the sea surface, carried along the ocean’s currents.',
    who:'The ECCO2 project (MIT and NASA JPL) modelled the ocean from satellite and float data; Greg Shirah visualized it at NASA’s Scientific Visualization Studio.',
    when:'19 June 2007, 12:00 UTC: one moment of a model, not today’s ocean.',
    where:'The world ocean, from 80°N to 72°S. Image: NASA SVS 3912.',
    why:'To hear the planet’s heat: warm tropical water against near-freezing polar seas.',
    how:'Each current’s colour is read back to °C on NASA’s printed 0–32 °C scale. Side A plays 48 bands pole to pole, warm water high and cold water low; Side B plays any place you touch.',
  },
  motion:{
    what:'An animated Earth from NASA’s Earth Information Center exhibit. It is a picture in motion, not a data set.',
    who:'NASA’s Earth Information Center (earth.gov). The copy here comes from an attributed third-party archive, because the originals now return “not found”.',
    when:'An archived animation; NASA did not publish its production date with this copy.',
    where:'The whole Earth, as shown on the exhibit’s screens.',
    why:'To hear how sound changes as a picture moves, the way a visitor watches the Earth Information Center walls.',
    how:'Video pixels are sampled again on every note: brightness sets pitch, colour shapes the tone, position sets left and right. With motion off, a still frame plays.',
  },
  ice:{
    what:'Arctic sea ice through 2024: how much there is each month (Side A), and when any place freezes and thaws (Side B).',
    who:'Japan’s GCOM-W1 “SHIZUKU” satellite (AMSR2 instrument, JAXA) saw the ice; Trent L. Schindler visualized it at NASA’s Scientific Visualization Studio for the Earth Information Center’s daily views.',
    when:'The 15th of every month of 2024; each day uses a three-day running minimum.',
    where:'The Arctic seas north of 50°N, seen from above the North Pole. Image: NASA SVS 5046, Daily Arctic Sea Ice.',
    why:'To hear the Arctic breathe: ice grows to a March peak and shrinks to a September low, and some seas never freeze at all.',
    how:'NASA draws ice wherever at least 15% of the sea is frozen. TerraJuke traces every pixel through NASA’s own camera to measure that ice in km²: less ice plays a lower bell, and open water adds an ocean wash. On Side B, each month with ice rings a bell, and farther north rings higher.',
  },
  temperature:{
    what:'Twelve January global temperature anomalies, the same numbers as the Climate Spiral’s Side B, on their own.',
    who:'NASA GISS (GISTEMP v4).',
    when:'Selected Januaries from 1880 to 2025.',
    where:'The whole planet: the average of land and ocean.',
    why:'To hear warming as numbers alone. This record repeats Climate Spiral’s Side B and is being rebuilt from an original NASA visualization.',
    how:'Each anomaly, in °C against the 1951–1980 average, sets pitch on a fixed scale; style and tempo never change a note.',
  },
};
