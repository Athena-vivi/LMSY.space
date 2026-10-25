import type { Language } from '@/lib/languages';

/**
 * Language-prefixed routing helpers (i18n routing plan).
 *
 * English lives at the bare path (/editorial); zh/th/es/pt have their own
 * prefix (/zh/editorial). One module owns the vocabulary so the [lang]
 * segment, the provider and the switcher cannot drift apart.
 */

/** Languages that have their own URL prefix. */
export const ROUTE_LANGUAGES: readonly Language[] = ['zh', 'th', 'es', 'pt'];

const LANG_PREFIX_RE = /^\/(zh|th|es|pt)(?=\/|$)/;

/** The language a pathname belongs to. Null on unprefixed (English) routes. */
export function langFromPath(pathname: string | null): Language | null {
  if (!pathname) return null;
  const match = LANG_PREFIX_RE.exec(pathname);
  return match ? (match[1] as Language) : null;
}

/** '/zh/editorial' -> '/editorial'; '/editorial' -> '/editorial'. */
export function stripLangPrefix(pathname: string): string {
  const stripped = pathname.replace(LANG_PREFIX_RE, '');
  return stripped === '' ? '/' : stripped;
}

/**
 * The URL for the same page in another language:
 * languageHref('pt', '/editorial') -> '/pt/editorial'
 * languageHref('pt', '/th/editorial') -> '/pt/editorial'
 * languageHref('en', '/zh/editorial') -> '/editorial'
 */
export function languageHref(lang: Language, pathname: string): string {
  const bare = stripLangPrefix(pathname);
  return lang === 'en' ? bare : `/${lang}${bare}`;
}
