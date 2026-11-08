import {jukeboxRecords} from '../data/jukeboxRecords';
import type {JukeboxRecordId} from '../data/jukeboxRecords';

/** Curiosity, not a score: no persistence, invented records or immediate repeats. */
export function chooseMysteryRecord(previous?:JukeboxRecordId,random:()=>number=Math.random){
  const choices=jukeboxRecords.filter(record=>record.id!==previous),draw=random();
  if(!Number.isFinite(draw)||draw<0||draw>=1)throw new RangeError('Expected a random draw from zero up to one.');
  return choices[Math.floor(draw*choices.length)];
}
