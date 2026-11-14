import type { ReactNode } from 'react';

// TerraJuke is English-only (Simplified Chinese was removed on 14 Nov 2026). Components still call
// t() so visible copy stays in one place; it returns the English text unchanged.
export type Language = 'en';
export function StudioLanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
const t = (text: string) => text.replaceAll('&lt;', '<');
const date = (year: number, _month: number, englishMonth: string) => `${englishMonth} ${year}`;
export function useStudioLanguage() {
  return { language: 'en' as Language, t, date };
}
