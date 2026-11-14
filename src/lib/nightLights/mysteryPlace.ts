// Mystery Place: hear one place's decade without being told where it is, guess, then see it
// on NASA's map. A listening lesson, not a score: the clue is the shape of the melody
// (climbing, stepping down or level) and NASA's change-map figure at the end.
import type {Direction} from './analyze.ts';
import {decadeSeries,decadeTrend,SMALL_PLACE_PIXELS,type YearField} from './decade.ts';
import type {Rect} from './raster.ts';

export type MysteryCandidate={readonly id:string;readonly label:string;readonly rect:Rect;readonly change:Direction|null};
export type MysteryAnswer=MysteryCandidate&{readonly ratio:number;readonly trend:Direction};

/** Shown instead of the place's name while the round is concealed. */
export const MYSTERY_LABEL='Mystery place';

/**
 * Only places that are safe to learn from: big enough for a reliable decade reading
 * (at least SMALL_PLACE_PIXELS map pixels) and lit in 2012, so a ratio exists.
 * At this scale that is the whole map, India and Western Europe; Ukraine's and the
 * Eastern Mediterranean's boxes are excluded as weak readings.
 */
export function mysteryPool(candidates:readonly MysteryCandidate[],fields:readonly YearField[]):MysteryAnswer[]{
  const pool:MysteryAnswer[]=[];
  for(const c of candidates){
    const s=decadeSeries(fields,c.rect),trend=decadeTrend(s);
    if(s[0].mapPixels<SMALL_PLACE_PIXELS||!trend||s[0].light<=0)continue;
    pool.push({...c,trend,ratio:s[s.length-1].light/s[0].light});
  }
  return pool;
}

/** A random place, never the same as the previous round. */
export function chooseMystery<T extends {id:string}>(pool:readonly T[],previous?:string,random:()=>number=Math.random):T{
  const choices=pool.filter(p=>p.id!==previous),draw=random();
  if(!choices.length)throw new RangeError('Mystery Place needs at least two places.');
  if(!Number.isFinite(draw)||draw<0||draw>=1)throw new RangeError('Expected a random draw from zero up to one.');
  return choices[Math.floor(draw*choices.length)];
}

const SHAPE:Record<Direction,string>={more:'a melody that climbs',less:'a melody that steps down',steady:'a melody that stays nearly level'};
const CHANGE:Record<Direction,string>={more:'more light',less:'less light',steady:'little change'};
const times=(r:number)=>`${r.toFixed(1)}×`;

/** What the reveal says: the answer, the guess, and the clue that was in the sound. */
export function revealSentence(answer:MysteryAnswer,guess?:MysteryCandidate|null):string{
  const head=!guess?`It was ${answer.label}.`:guess.id===answer.id?`Yes: it was ${answer.label}.`:`It was ${answer.label}, not ${guess.label}.`;
  const clue=` Its brightness in 2023 was ${times(answer.ratio)} that of 2012, so you heard ${SHAPE[answer.trend]}.`;
  const change=answer.change?` NASA’s change map closes the record with ${CHANGE[answer.change]}.`:'';
  return head+clue+change;
}
