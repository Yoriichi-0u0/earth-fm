import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import chinese from './studio-zh.json';
export type Language = 'en' | 'zh';
const STORAGE_KEY = 'earth-fm-studio-language';
const messages: Record<string, string> = chinese;
const LanguageContext = createContext<{language: Language; setLanguage: (value: Language) => void}>({language:'en',setLanguage:()=>{}});
export function StudioLanguageProvider({children}: {children: ReactNode}) {
  const [language,setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'; } catch { return 'en'; }
  });
  useEffect(()=>{ try { localStorage.setItem(STORAGE_KEY,language); } catch { /* Language still works without storage. */ } },[language]);
  useEffect(()=>{ const previous=document.documentElement.lang; document.documentElement.lang=language==='zh'?'zh-Hans':'en'; return ()=>{document.documentElement.lang=previous;}; },[language]);
  return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useStudioLanguage() {
  const context=useContext(LanguageContext);
  const t=(text:string) => context.language==='zh' ? (messages[text] ?? text) : text.replaceAll('&lt;','<');
  const date=(year:number,month:number,englishMonth:string) => context.language==='zh' ? `${year} 年 ${month} 月` : `${englishMonth} ${year}`;
  return {...context,t,date};
}
