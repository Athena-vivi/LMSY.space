'use client';

import { useLanguage } from '@/components/language-provider';
import { languages, type Language } from '@/lib/languages';
import { motion } from 'framer-motion';

const languageLabels: Record<Language, string> = {
  en: 'EN',
  zh: '中',
  th: 'TH',
};

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-3">
      {(Object.keys(languages) as Language[]).map((lang) => (
        <motion.button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`
            relative text-xs font-sans tracking-wider transition-all duration-300
            ${language === lang
              ? 'text-lmsy-yellow font-bold'
              : 'text-muted-foreground/60 hover:text-foreground'
            }
          `}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.2 }}
        >
          {languageLabels[lang]}
          {/* Underline animation for non-active languages on hover */}
          {language !== lang && (
            <motion.span
              className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}
