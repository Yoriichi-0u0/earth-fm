// Where each record comes from, and where it goes: the chain from instrument to listener.
// Every link names a real instrument, team or place recorded in the record's provenance files.
import type {JukeboxRecordId} from './jukeboxRecords';

export type JourneyIcon='satellite'|'thermometer'|'model'|'studio'|'center'|'archive'|'jukebox';
export type JourneyLink={icon:JourneyIcon;title:string;detail:string};

const SVS='NASA Scientific Visualization Studio';
const EIC={icon:'center',title:'NASA Earth Information Center',detail:'NASA Headquarters, Washington, DC: Earth on giant screens for every visitor'} as const;
const TERRAJUKE={icon:'jukebox',title:'TerraJuke',detail:'Pixels and numbers become music live in your browser. Nothing is uploaded.'} as const;

export const JOURNEYS:Record<JukeboxRecordId,readonly JourneyLink[]>={
  spiral:[
    {icon:'thermometer',title:'Thermometers on land and at sea',detail:'Weather stations (NOAA GHCN) and ship and buoy sea-surface readings (NOAA ERSST)'},
    {icon:'model',title:'NASA GISS, New York',detail:'GISTEMP v4: monthly global temperature anomalies since 1880'},
    {icon:'studio',title:SVS,detail:'SVS 5190, the Climate Spiral, by Mark SubbaRao after Ed Hawkins’s design'},
    EIC,TERRAJUKE,
  ],
  nightlights:[
    {icon:'satellite',title:'Suomi NPP satellite, VIIRS',detail:'A NASA/NOAA instrument that sees city lights from 830 km up, every night'},
    {icon:'model',title:'NASA Black Marble',detail:'Yearly night-light averages, 2012 to 2023, cleaned of moonlight and clouds'},
    {icon:'studio',title:SVS,detail:'SVS 5313, EIC Version, visualized by Kel Elkins'},
    EIC,TERRAJUKE,
  ],
  air:[
    {icon:'satellite',title:'Satellites, ground stations, weather balloons',detail:'About a million observations every hour, from all over the planet'},
    {icon:'model',title:'NASA GEOS model, Goddard',detail:'The Global Modeling and Assimilation Office builds a moving picture of the whole atmosphere'},
    {icon:'studio',title:SVS,detail:'SVS 5669: 19 August 2025, 20:00 UTC, by Joseph V. Ardizzone and Helen-Nicole Kostis, with scientist Lesley Ott'},
    {icon:'center',title:'NASA Space Apps 2026',detail:'Listed as a resource for The Earth Information Jukebox challenge'},
    TERRAJUKE,
  ],
  ocean:[
    {icon:'satellite',title:'Satellites and ocean floats',detail:'Sea-surface height, temperature and thousands of drifting Argo floats measuring the ocean'},
    {icon:'model',title:'ECCO2, MIT and NASA JPL',detail:'The MIT general circulation model reconstructs every current, down to individual eddies'},
    {icon:'studio',title:'NASA Scientific Visualization Studio',detail:'SVS 3912, traced and coloured by temperature by Greg Shirah, for hyperwall displays'},
    {icon:'center',title:'NASA Space Apps 2026',detail:'Listed as a resource for The Earth Information Jukebox challenge'},
    {icon:'jukebox',title:'TerraJuke',detail:'Pixels and numbers become music live in your browser. Nothing is uploaded.'},
  ],
  motion:[
    {icon:'center',title:'NASA Earth Information Center',detail:'An immersive Earth animation from the exhibit in Washington, DC'},
    {icon:'archive',title:'earth.gov, via an attributed mirror',detail:'The originals now return 404; the archived copy is pinned by hash'},
    TERRAJUKE,
  ],
  ice:[
    {icon:'satellite',title:'GCOM-W1 “SHIZUKU” satellite, AMSR2',detail:'A JAXA microwave radiometer that sees sea ice through clouds and the polar night'},
    {icon:'model',title:'JAXA sea ice concentration',detail:'10 km daily concentration, a 3-day running minimum; ice is drawn where at least 15% of the sea is frozen'},
    {icon:'studio',title:SVS,detail:'SVS 5046, Daily Arctic Sea Ice, visualized by Trent L. Schindler over Blue Marble Next Generation land'},
    EIC,TERRAJUKE,
  ],
  temperature:[
    {icon:'thermometer',title:'Thermometers on land and at sea',detail:'Weather stations (NOAA GHCN) and ship and buoy sea-surface readings (NOAA ERSST)'},
    {icon:'model',title:'NASA GISS, New York',detail:'GISTEMP v4: monthly global temperature anomalies since 1880'},
    TERRAJUKE,
  ],
};
