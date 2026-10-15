'use client';

import * as React from 'react';
import { Language, defaultLanguage } from '@/lib/languages';

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

// Runs synchronously after render but BEFORE the browser paints, so a visitor
// with a stored language never sees a flash of the default language. On the
// server it falls back to useEffect (useLayoutEffect warns during SSR).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export function LanguageProvider({
  children,
  defaultLanguage: defaultLang = defaultLanguage,
}: LanguageProviderProps) {
  const [language, setLanguageState] = React.useState<Language>(defaultLang);

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem('lmsy-language') as Language;
    if (stored && (stored === 'en' || stored === 'zh' || stored === 'th')) {
      setLanguageState(stored);
      // Keep <html lang> in sync on first load too. Previously lang was only
      // updated inside setLanguage(), so a reload reset it to the layout's "en"
      // even when the visitor had chosen zh/th.
      document.documentElement.lang = stored;
    }
  }, []);

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
