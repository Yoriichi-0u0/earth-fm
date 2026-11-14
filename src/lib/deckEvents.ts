/** Fired by the record console whenever a record starts or stops (read by the 3D jukebox). */
export const DECK_EVENT='terrajuke:deck';
export type DeckEventDetail={playing:boolean};
export function announceDeck(playing:boolean){window.dispatchEvent(new CustomEvent<DeckEventDetail>(DECK_EVENT,{detail:{playing}}));}
