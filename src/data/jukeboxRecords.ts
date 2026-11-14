import {frames} from './frames';
import {storyFrame} from './guidedStory';
import {arcticTrack} from './earthStations';
import type {EarthFrame} from './frames';

export type JukeboxRecordId='spiral'|'nightlights'|'air'|'motion'|'arctic'|'temperature';
export type JukeboxRecord={/** false: not drawn by Mystery Record (it needs one picture or one measurement series). */mystery?:boolean;id:JukeboxRecordId;number:string;title:string;kind:'visual'|'data';subtitle:string;source:string;sourceUrl:string;meaning:string;frame?:EarthFrame;posterUrl?:string;accent:string};
export const jukeboxRecords:readonly JukeboxRecord[]=[
  {id:'spiral',number:'01',title:'Climate Spiral',kind:'visual',subtitle:'One story. Two sides. Picture and measurements.',source:'NASA SVS 5190',sourceUrl:storyFrame.sourceUrl,meaning:'Image brightness makes pitch. These are pixels, not temperature measurements.',frame:storyFrame,accent:'#64d2ff'},
  {mystery:false,id:'nightlights',number:'02',title:'Night Lights',kind:'visual',subtitle:'A decade of Earth after dark. Two sides: change and time.',source:'NASA SVS 5313 · EIC Version',sourceUrl:'https://svs.gsfc.nasa.gov/5313',meaning:'Purple (more light) rises and orange (less light) falls, read on NASA’s own legend. Side B plays NASA’s twelve annual frames. Rendered colours and brightness, not radiance.',posterUrl:'/nasa/svs5313/svs5313_eic_02599_print.jpg',accent:'#b48cff'},
  {mystery:false,id:'air',number:'03',title:'The Air We Share',kind:'visual',subtitle:'Four aerosols, four instruments. Earth turns under the needle.',source:'NASA SVS 5669 · GEOS Aerosols',sourceUrl:'https://svs.gsfc.nasa.gov/5669/',meaning:'Each aerosol NASA colours becomes an instrument: how strongly a pixel shows its colour sets loudness, latitude sets pitch, longitude sets time. Rendered model colours, not optical depth.',posterUrl:'/nasa/svs5669/svs5669_poster_640x360.jpg',accent:'#c19adc'},
  {id:'motion',number:'04',title:'Moving Earth',kind:'visual',subtitle:'An Earth in motion. An evolving sound.',source:'NASA EIC · attributed mirror',sourceUrl:frames[2].mirrorUrl,meaning:'Changing video pixels shape the sound. This is an archived visual, not a live measurement feed.',frame:frames[2],posterUrl:'/frames/untethered-record-poster.jpg',accent:'#9acfcf'},
  {id:'arctic',number:'05',title:'Arctic September',kind:'data',subtitle:'Listen to the shape of a changing Arctic.',source:'NSIDC · project-derived means',sourceUrl:arcticTrack.sourceUrl,meaning:'September extent in million km² sets pitch. These are project-derived means, not an EIC visual frame.',accent:'#9bc7ef'},
  {id:'temperature',number:'06',title:'Temperature Through Time',kind:'data',subtitle:'The Side B measurements, on their own.',source:'NASA GISS · GISTEMP v4',sourceUrl:'https://data.giss.nasa.gov/gistemp/',meaning:'Global monthly anomalies set pitch, relative to the 1951–1980 January average. Selected years, not a continuous record.',accent:'#f0b08b'},
];
/** Records Mystery Record can play concealed. */
export const mysteryRecords:readonly JukeboxRecord[]=jukeboxRecords.filter(record=>record.mystery!==false);
