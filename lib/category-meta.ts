/**
 * Canonical work-category presentation (phase-6 batch 1).
 *
 * The archive uses the same `projects.category` values on four surfaces
 * (Projects list, project detail badge, Chronicle timeline, search), and each
 * one used to render its own label: "TV_SERIES" on the list, "TV Series" on
 * the detail page, and the raw lowercase database value on the Chronicle.
 * This module is the single source of truth for the display label and the
 * badge accent class.
 *
 * Label text lives in lib/languages.ts under `category.*` so it stays
 * translated; nothing here is user-visible copy.
 */

import type { TranslationKey } from './languages';

export interface CategoryMeta {
  /** Raw projects.category value (or the legacy alias). */
  key: string;
  /** i18n key holding the localized label. */
  labelKey: TranslationKey;
  /** Badge classes: text color + border + tint. */
  accent: string;
}

const META: Record<string, Omit<CategoryMeta, 'key'>> = {
  series: {
    labelKey: 'category.series',
    accent: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5',
  },
  editorial: {
    labelKey: 'category.editorial',
    accent: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5',
  },
  appearance: {
    labelKey: 'category.appearance',
    accent: 'text-ink border-white/20 bg-white/5',
  },
  commercial: {
    labelKey: 'category.commercial',
    accent: 'text-amber-200/80 border-amber-500/20 bg-amber-500/5',
  },
  journal: {
    labelKey: 'category.journal',
    accent: 'text-ink border-white/10 bg-transparent',
  },
  daily: {
    labelKey: 'category.daily',
    accent: 'text-ink border-white/10 bg-white/5',
  },
  travel: {
    labelKey: 'category.travel',
    accent: 'text-ink border-white/10 bg-white/5',
  },
  // Legacy enum values that may still exist on older rows.
  music: {
    labelKey: 'category.music',
    accent: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5',
  },
  magazine: {
    labelKey: 'category.magazine',
    accent: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5',
  },
};

const FALLBACK: Omit<CategoryMeta, 'key'> = {
  labelKey: 'category.other',
  accent: 'text-ink-2 border-border bg-muted',
};

/**
 * Metadata for a category value. Unknown values never crash a page: they fall
 * back to a neutral badge whose label is the localized "Other" string.
 */
export function categoryMeta(category: string | null | undefined): CategoryMeta {
  const key = (category ?? '').trim().toLowerCase();
  const found = META[key];
  if (!found) return { key, ...FALLBACK };
  return { key, ...found };
}

/** Convenience for surfaces that only need the i18n key. */
export function categoryLabelKey(category: string | null | undefined): string {
  return categoryMeta(category).labelKey;
}

/**
 * Asset-level tags (`assets.tag`) use a different vocabulary from
 * `projects.category`, but the Gallery already localizes its filter chips
 * through `gallery.tag*`. The masonry badge used to print the raw database
 * value ("#STAGE") next to a localized chip ("#舞台") on the same screen, so
 * both now resolve through the same keys.
 *
 * Unknown values return null: the badge falls back to the stored tag rather
 * than inventing a label for a value the archive has never seen.
 */
const ASSET_TAG_KEYS: Record<string, TranslationKey> = {
  magazine: 'gallery.tagMagazine',
  advertising: 'gallery.tagAdvertising',
  stage: 'gallery.tagStage',
  still: 'gallery.tagStill',
};

export function assetTagLabelKey(tag: string | null | undefined): TranslationKey | null {
  const key = (tag ?? '').trim().toLowerCase();
  return ASSET_TAG_KEYS[key] ?? null;
}
