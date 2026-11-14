export type AppearancePreference = 'auto' | 'light' | 'dark';
export type EffectiveAppearance = 'light' | 'dark';
export const APPEARANCE_KEY = 'terrajuke-appearance';
/** Key used while the project was named Earth FM; read only so returning visitors keep their choice. */
export const LEGACY_APPEARANCE_KEY = 'earth-fm-appearance';

export function parseAppearancePreference(value: unknown): AppearancePreference {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

export function resolveAppearance(preference: AppearancePreference, systemDark: boolean): EffectiveAppearance {
  return preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference;
}

export function readAppearancePreference(storage: Pick<Storage, 'getItem'> | null): AppearancePreference {
  try { return parseAppearancePreference(storage?.getItem(APPEARANCE_KEY) ?? storage?.getItem(LEGACY_APPEARANCE_KEY)); }
  catch { return 'auto'; }
}

export function persistAppearancePreference(storage: Pick<Storage, 'setItem'> | null, preference: AppearancePreference): void {
  try { storage?.setItem(APPEARANCE_KEY, preference); }
  catch { /* An appearance choice still works when browser storage is unavailable. */ }
}

export function appearanceStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

/** Presentation only: no keys or state enter the audio, source, or take owners. */
export function applyAppearance(preference: AppearancePreference, systemDark: boolean): EffectiveAppearance {
  const theme = resolveAppearance(preference, systemDark);
  document.documentElement.dataset.appearance = preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#090f14' : '#f4f6f3');
  return theme;
}
