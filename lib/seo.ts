import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';

/**
 * Build page metadata with a correct self-referential canonical.
 *
 * The root layout used to declare `alternates.canonical: '/'`, which every page
 * inherited — so all pages told search engines they were the homepage. Sections
 * are client components and cannot export metadata themselves, so they declare
 * it in a nested layout instead.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
  };
}

/**
 * Same contract for a language-prefixed route: the canonical points at the
 * prefixed URL itself (each language version is self-canonical; hreflang
 * alternates come in step 4 of the i18n routing plan).
 */
export function langPageMetadata(
  lang: Language,
  opts: { title: string; description: string; path: string }
): Metadata {
  return pageMetadata({ ...opts, path: `/${lang}${opts.path}` });
}
