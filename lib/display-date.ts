/**
 * Date display rules shared by Projects, Project detail and Editorial
 * (phase-6 batch 1). Before this module each surface had its own inline
 * `toLocaleDateString(...)` call - the project detail and both Editorial
 * surfaces were hard-coded to 'en-US', so a Chinese or Thai visitor saw
 * English dates next to localized copy.
 *
 * Pure functions, no path aliases, so node --test can exercise them directly.
 */

export type DisplayLanguage = 'en' | 'zh' | 'th' | 'es' | 'pt';

const LOCALES: Record<DisplayLanguage, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  // Thai locale formats years in the Buddhist era, matching the archive
  // convention already used by the chapter titles.
  th: 'th-TH',
  es: 'es-ES',
  pt: 'pt-BR',
};

export function localeFor(language: DisplayLanguage): string {
  return LOCALES[language] ?? LOCALES.en;
}

/**
 * Parse a plain `YYYY-MM-DD` (or full ISO timestamp) into a local Date.
 * Building the Date from parts avoids the UTC-midnight off-by-one-day shift
 * that `new Date('2024-08-29')` produces in negative-offset time zones.
 */
function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface DisplayDateOptions {
  /** 'long' (default) renders "August 2024"/"2024年8月"; 'short'/"Aug 2024". */
  month?: 'long' | 'short';
  /** Include the day number. Defaults to true. */
  day?: boolean;
}

/**
 * Locale-aware display date. Returns null for empty/invalid input instead of
 * inventing a date - callers decide whether to omit the field or show a
 * "date unknown" label.
 */
export function formatDisplayDate(
  iso: string | null | undefined,
  language: DisplayLanguage,
  options: DisplayDateOptions = {}
): string | null {
  if (!iso) return null;
  const date = parseIsoDate(iso);
  if (!date) return null;
  const { month = 'long', day = true } = options;
  return new Intl.DateTimeFormat(localeFor(language), {
    year: 'numeric',
    month,
    ...(day ? { day: 'numeric' } : {}),
  }).format(date);
}

/**
 * Month-only label from a `YYYY-MM` key (the chapter grouping format used by
 * the project detail page).
 */
export function formatMonthYear(
  monthKey: string,
  language: DisplayLanguage
): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }
  return new Intl.DateTimeFormat(localeFor(language), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}
