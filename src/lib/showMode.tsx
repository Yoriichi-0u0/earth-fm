// Jukebox Show: the jukebox plays every NASA record in turn. The home page owns the running order;
// each deck's shared console listens for a cue, presses its own Play, and reports how it ended.
import { createContext, useContext } from 'react';

export type ShowCue = { cue: number | null; onEnded: (cue: number) => void; onStopped: (cue: number) => void };
export const ShowContext = createContext<ShowCue>({ cue: null, onEnded: () => {}, onStopped: () => {} });
export const useShowCue = () => useContext(ShowContext);
