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

/**
 * Resolve a raw `[lang]` route param to a language: the root route passes no
 * param at all (English), a language shell passes zh/th/es/pt. Anything else
 * (a typo, a stray segment) is English, never an unvalidated string reaching
 * the translation lookup.
 */
export function routeLanguage(raw: string | string[] | undefined | null): Language {
  if (typeof raw === 'string' && (ROUTE_LANGUAGES as readonly string[]).includes(raw)) {
    return raw as Language;
  }
  return 'en';
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
  if (lang === 'en') return bare;
  // '/' + '/pt' would be '/pt/', which is a different URL than the homepage
  // prefix and costs a trailing-slash redirect on every link home.
  return bare === '/' ? `/${lang}` : `/${lang}${bare}`;
}

/**
 * Paths that must never take a language prefix: the admin shell is
 * English-only, and API routes are not pages.
 */
function isPrefixFree(bare: string): boolean {
  return (
    bare === '/admin' ||
    bare.startsWith('/admin/') ||
    bare === '/api' ||
    bare.startsWith('/api/')
  );
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * The href a link should actually point at, for the language being read.
 *
 * Every in-site path is written bare ('/timeline'); the prefix is a URL
 * concern, resolved here rather than in each component. Without this, a
 * component hardcoding '/timeline' hands a Chinese visitor the English site -
 * and because the two languages sit under different root layouts, that is not
 * a soft transition but a full document load.
 *
 * Left alone: absolute URLs, protocol-relative (//), in-page anchors (#),
 * mailto:/tel:, and /admin or /api. Inside /admin nothing is prefixed either,
 * even a public path used as a breadcrumb.
 *
 * Idempotent: an already-prefixed path is stripped and re-prefixed for the
 * target language.
 */
export function localizeHref(
  lang: Language,
  pathname: string | null,
  href: string
): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (SCHEME_RE.test(href)) return href;

  const bare = stripLangPrefix(href);
  if (isPrefixFree(bare)) return href;
  if (pathname && isPrefixFree(stripLangPrefix(pathname))) return href;

  return languageHref(lang, href);
}
