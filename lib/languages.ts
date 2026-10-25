// Locale index. UI strings live in per-language files under lib/languages/ —
// en.ts is the source of truth for TranslationKey; zh/th/es must cover it.
// Exports here are unchanged from the pre-split module, so no import site
// needs to move.
import { en, type TranslationKey } from './languages/en.ts';
import { zh } from './languages/zh.ts';
import { th } from './languages/th.ts';
import { es } from './languages/es.ts';

export type { TranslationKey } from './languages/en.ts';

export type Language = 'en' | 'zh' | 'th' | 'es';

export const languages: Record<Language, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  zh: { name: 'Chinese', nativeName: '中文' },
  th: { name: 'Thai', nativeName: 'ไทย' },
  es: { name: 'Spanish', nativeName: 'Español' },
};

export const defaultLanguage: Language = 'en';

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  zh,
  th,
  es,
};

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key];
}

export function t(lang: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  let translation: string = translations[lang][key];

  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{${param}}`, String(value));
    });
  }

  return translation;
}
