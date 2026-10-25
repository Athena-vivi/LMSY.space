'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Language, defaultLanguage } from '@/lib/languages';
import { langFromPath } from '@/lib/i18n-path';

type LanguageProviderProps = {
  children: React.ReactNode;
  defaultLanguage?: Language;
};

type LanguageProviderState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const initialState: LanguageProviderState = {
  language: defaultLanguage,
  setLanguage: () => null,
};

const LanguageProviderContext = React.createContext<LanguageProviderState>(initialState);

// The URL is the source of truth on prefixed routes (/zh/..., /pt/...) - that
// is what makes the SSR HTML render in the route's language for crawlers.
// localStorage only matters on unprefixed (English) routes, where it remembers
// the visitor's choice. Note: usePathname works during SSR too, so the very
// first server render of /zh/editorial is already Chinese.
// Runs synchronously after render but BEFORE the browser paints, so a visitor
// with a stored language never sees a flash of the default language. On the
// server it falls back to useEffect (useLayoutEffect warns during SSR).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export function LanguageProvider({
  children,
  defaultLanguage: defaultLang = defaultLanguage,
}: LanguageProviderProps) {
  const pathname = usePathname();
  const routeLang = langFromPath(pathname);
  const [language, setLanguageState] = React.useState<Language>(routeLang ?? defaultLang);

  useIsomorphicLayoutEffect(() => {
    // Prefixed route: the URL decides. Do not let a stored preference win -
    // a visitor landing on /pt/editorial must see Portuguese.
    if (routeLang) {
      document.documentElement.lang = routeLang;
      return;
    }
    const stored = localStorage.getItem('lmsy-language') as Language;
    if (
      stored &&
      (stored === 'en' || stored === 'zh' || stored === 'th' || stored === 'es' || stored === 'pt')
    ) {
      setLanguageState(stored);
      // Keep <html lang> in sync on first load too. Previously lang was only
      // updated inside setLanguage(), so a reload reset it to the layout's "en"
      // even when the visitor had chosen zh/th.
      document.documentElement.lang = stored;
    }
  }, [routeLang]);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lmsy-language', lang);
    document.documentElement.lang = lang;
  }, []);

  const value = {
    language,
    setLanguage,
  };

  return (
    <LanguageProviderContext.Provider value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

export const useLanguage = () => {
  const context = React.useContext(LanguageProviderContext);

  if (context === undefined)
    throw new Error('useLanguage must be used within a LanguageProvider');

  return context;
};
