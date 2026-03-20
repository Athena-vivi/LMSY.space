import type { Language } from '@/lib/languages';

export interface LocalizedText {
  en?: string | null;
  zh?: string | null;
  th?: string | null;
}

export function emptyLocalizedText(): LocalizedText {
  return { en: '', zh: '', th: '' };
}

export function normalizeLocalizedText(value: unknown, fallback = ''): LocalizedText {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      en: fallback,
      zh: '',
      th: '',
    };
  }

  const input = value as Record<string, unknown>;
  return {
    en: typeof input.en === 'string' ? input.en : fallback,
    zh: typeof input.zh === 'string' ? input.zh : '',
    th: typeof input.th === 'string' ? input.th : '',
  };
}

export function getLocalizedText(
  value: unknown,
  language: Language,
  fallback?: string | null
): string {
  const normalized = normalizeLocalizedText(value, fallback ?? '');
  return normalized[language] || normalized.en || fallback || '';
}
