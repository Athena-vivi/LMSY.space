import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';

/**
 * Language versions that exist for every public path (i18n routing plan):
 * en lives at the bare path, the rest under /<lang>. Used to emit a full
 * hreflang cluster on every page so Google indexes each language version.
 */
const HREFLANG_LANGS: readonly Language[] = ['zh', 'th', 'es', 'pt'];

/** '/talks' -> '/zh/talks'; '/' -> '/zh' (no trailing slash on the homepage). */
function prefixed(path: string, lang: Language): string {
  return path === '/' ? `/${lang}` : `/${lang}${path}`;
}

function hreflangAlternates(path: string): NonNullable<Metadata['alternates']>['languages'] {
  const languages: Record<string, string> = {
    en: path,
    'x-default': path,
  };
  for (const lang of HREFLANG_LANGS) {
    languages[lang] = prefixed(path, lang);
  }
  return languages;
}

/**
 * Canonical + hreflang only, for routes whose title and description come from
 * the root layout (the homepage). The layout already writes them per language
 * — siteMetadata(lang) — so this adds the two things a layout cannot know:
 * each language version is its own canonical, and all five are one hreflang
 * cluster. Without it /zh reads as a duplicate of /.
 */
export function pageLanguageAlternates(lang: Language, path: string): Metadata {
  return {
    alternates: {
      canonical: lang === 'en' ? path : prefixed(path, lang),
      languages: hreflangAlternates(path),
    },
  };
}

/**
 * Build page metadata with a correct self-referential canonical.
 *
 * The root layout used to declare `alternates.canonical: '/'`, which every page
 * inherited — so all pages told search engines they were the homepage. Sections
 * are client components and cannot export metadata themselves, so they declare
 * it in a nested layout instead.
 *
 * Every page also carries the full hreflang cluster (en + 4 language prefixes
 * + x-default), so the language versions index as one connected set.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  /**
   * The language the route is served in. Dynamic pages (one per entry, per
   * year, per person) read it from their own `[lang]` param, so the same
   * function covers the root page and every language shell: en keeps the bare
   * canonical, the rest get their own prefix, and the hreflang cluster is
   * always built from the bare path.
   */
  lang?: Language;
}): Metadata {
  const lang = opts.lang ?? 'en';
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: lang === 'en' ? opts.path : prefixed(opts.path, lang),
      languages: hreflangAlternates(opts.path),
    },
  };
}

/**
 * Same contract for a language-prefixed route: the canonical points at the
 * prefixed URL itself (each language version is self-canonical — language
 * variants are the normal, sanctioned use of hreflang, not duplicate content).
 * The hreflang cluster is identical to the root page's, so all five versions
 * cross-link each other.
 */
export function langPageMetadata(
  lang: Language,
  opts: { title: string; description: string; path: string }
): Metadata {
  // The hreflang cluster is built from the bare path so every language
  // version points at the right URL: en/x-default stay unprefixed, the others
  // get their own prefix. Feeding the prefixed path in here would make the
  // en alternate point at e.g. /zh/talks.
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: `/${lang}${opts.path}`,
      languages: hreflangAlternates(opts.path),
    },
  };
}
