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

export function LanguageProvider({
  children,
  defaultLanguage: defaultLang = defaultLanguage,
}: LanguageProviderProps) {
  const [language, setLanguageState] = React.useState<Language>(defaultLang);

  React.useEffect(() => {
    const stored = localStorage.getItem('lmsy-language') as Language;
    if (stored && (stored === 'en' || stored === 'zh' || stored === 'th')) {
      setLanguageState(stored);
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
