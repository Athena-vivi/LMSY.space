/**
 * Featured editorial excerpt resolution (phase-6 batch 3, T2).
 *
 * The homepage longform block used to render its quote card unconditionally.
 * When the featured project had no excerpt at all (homepage_excerpt,
 * homepage_excerpt_i18n, description and description_i18n all empty) the
 * card still rendered - with quote marks, padding and no text - which is the
 * empty block visible on the production homepage.
 *
 * Two rules this module encodes:
 * 1. Each source is tried in order and the first one with real text wins.
 *    getLocalizedText() answers '' for a missing or all-empty object rather
 *    than signalling "no content", so the chain must advance explicitly
 *    instead of handing that '' on as if it were a resolved value.
 * 2. Whitespace is not content. If every source is blank the result is '',
 *    and callers must not render the quote card (and its attribution line)
 *    for an empty result.
 *
 * Nothing here invents copy: when there is no text, the answer is no text.
 *
 * Pure function, no path aliases - directly testable with node --test.
 */

import type { Language } from './languages';
import { getLocalizedText, type LocalizedText } from './localized-content.ts';

export interface FeaturedExcerptInput {
  /** True only when a project is actually flagged homepage_featured. */
  hasFeaturedProject: boolean;
  language: Language;
  homepageExcerptI18n?: LocalizedText | null;
  descriptionI18n?: LocalizedText | null;
  homepageExcerpt?: string | null;
  description?: string | null;
  /** Site-level quote used only when there is no featured project at all. */
  siteFallback?: string | null;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Resolve the excerpt to display, or '' when there is nothing worth showing.
 *
 * - no featured project: the site-level fallback (existing behaviour), still
 *   blank-checked so an empty site block cannot produce an empty card either
 * - featured project: homepage_excerpt_i18n -> description_i18n ->
 *   homepage_excerpt -> description
 */
export function resolveFeaturedExcerpt(input: FeaturedExcerptInput): string {
  const { hasFeaturedProject, language, siteFallback } = input;

  if (!hasFeaturedProject) {
    return clean(siteFallback);
  }

  const candidates: Array<string | null | undefined> = [
    getLocalizedText(input.homepageExcerptI18n, language),
    getLocalizedText(input.descriptionI18n, language),
    input.homepageExcerpt,
    input.description,
  ];

  for (const candidate of candidates) {
    const text = clean(candidate);
    if (text) return text;
  }

  return '';
}
