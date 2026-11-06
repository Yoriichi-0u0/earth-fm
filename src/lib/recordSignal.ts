/** Read-only playback events for presentation. Rendering never controls the audio clock. */
export type NoteEvent = {serial:number; at:number; index:number};
export type RecordSignal = {playing:boolean; note:string; frequency:number|null; event:NoteEvent|null};
export type RecordSide = 'a'|'b';
