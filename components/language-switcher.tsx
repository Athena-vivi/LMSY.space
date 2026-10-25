'use client';

import { useLanguage } from '@/components/language-provider';
import { languages, type Language } from '@/lib/languages';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const languageLabels: Record<Language, string> = {
  en: 'EN',
  zh: '中',
  th: 'TH',
  es: 'ES',
  pt: 'PT',
};

const languageNames: Record<Language, string> = {
  en: 'English',
  zh: '中文',
  th: 'ไทย',
  es: 'Español',
  pt: 'Português',
};

/**
 * Language switcher as a dropdown.
 *
 * It used to render all three codes side by side in the header. With four nav
 * entries now sharing that bar, three always-visible codes competed with them
 * for attention; the trigger is a single globe that expands on click.
 */
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1.5 text-ink-2 transition-colors hover:border-white/10 hover:text-ink"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-sans tracking-wider">{languageLabels[language]}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-[rgba(10,10,10,0.96)] py-1 shadow-2xl backdrop-blur-xl"
          >
            {(Object.keys(languages) as Language[]).map((lang) => (
              <li key={lang}>
                <button
                  type="button"
                  role="option"
                  aria-selected={language === lang}
                  onClick={() => {
                    setLanguage(lang);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${
                    language === lang ? 'text-lmsy-yellow' : 'text-ink-2'
                  }`}
                >
                  <span className="font-sans tracking-wide">{languageNames[lang]}</span>
                  {language === lang && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
