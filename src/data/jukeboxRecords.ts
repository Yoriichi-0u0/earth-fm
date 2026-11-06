import {frames} from './frames';
import {storyFrame} from './guidedStory';
import {arcticTrack} from './earthStations';
import type {EarthFrame} from './frames';

export type JukeboxRecordId='spiral'|'motion'|'arctic'|'temperature';
export type JukeboxRecord={id:JukeboxRecordId;number:string;title:string;kind:'visual'|'data';subtitle:string;source:string;sourceUrl:string;meaning:string;frame?:EarthFrame;posterUrl?:string;accent:string};
export const jukeboxRecords:readonly JukeboxRecord[]=[
  {id:'spiral',number:'01',title:'Climate Spiral',kind:'visual',subtitle:'One story. Two sides. Picture and measurements.',source:'NASA SVS 5190',sourceUrl:storyFrame.sourceUrl,meaning:'Image brightness makes pitch. These are pixels, not temperature measurements.',frame:storyFrame,accent:'#d5f38b'},
  {id:'motion',number:'02',title:'Moving Earth',kind:'visual',subtitle:'An Earth in motion. An evolving sound.',source:'NASA EIC · attributed mirror',sourceUrl:frames[2].mirrorUrl,meaning:'Changing video pixels shape the sound. This is an archived visual, not a live measurement feed.',frame:frames[2],posterUrl:'/frames/untethered-record-poster.jpg',accent:'#9acfcf'},
  {id:'arctic',number:'03',title:'Arctic September',kind:'data',subtitle:'Listen to the shape of a changing Arctic.',source:'NSIDC · project-derived means',sourceUrl:arcticTrack.sourceUrl,meaning:'September extent in million km² sets pitch. These are project-derived means, not an EIC visual frame.',accent:'#9bc7ef'},
  {id:'temperature',number:'04',title:'Temperature Through Time',kind:'data',subtitle:'The Side B measurements, on their own.',source:'NASA GISS · GISTEMP v4',sourceUrl:'https://data.giss.nasa.gov/gistemp/',meaning:'Global monthly anomalies set pitch, relative to the 1951–1980 January average. Selected years, not a continuous record.',accent:'#f0b08b'},
];
