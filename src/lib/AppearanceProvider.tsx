import {createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {APPEARANCE_KEY, appearanceStorage, applyAppearance, parseAppearancePreference, persistAppearancePreference, readAppearancePreference} from './appearance';
import type {AppearancePreference} from './appearance';

const AppearanceContext = createContext({preference: 'auto' as AppearancePreference, setPreference: (_value: AppearancePreference) => {}});

/** Mounted above both modern and Legacy entries; changing appearance never keys a player. */
export function AppearanceProvider({children}: {children: ReactNode}) {
  const [preference, setPreferenceState] = useState(() => readAppearancePreference(appearanceStorage()));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useLayoutEffect(() => { applyAppearance(preference, systemDark); }, [preference, systemDark]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    update(); query.addEventListener('change', update);
    const storage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) setPreferenceState(parseAppearancePreference(event.key === null ? null : event.newValue));
    };
    window.addEventListener('storage', storage);
    return () => { query.removeEventListener('change', update); window.removeEventListener('storage', storage); };
  }, []);
  const setPreference = useCallback((next: AppearancePreference) => {
    persistAppearancePreference(appearanceStorage(), next);
    setPreferenceState(next);
  }, []);
  const value = useMemo(() => ({preference, setPreference}), [preference, setPreference]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = () => useContext(AppearanceContext);
