/**
 * Canonical work-category presentation.
 *
 * The archive uses the same `projects.category` values on four surfaces
 * (Projects list, project detail badge, Timeline, search), and each one used
 * to render its own label: "TV_SERIES" on the list, "TV Series" on the detail
 * page, and the raw lowercase database value on the Chronicle.
 *
 * Phase 7 folded the whole vocabulary into lib/category-registry.ts, so this
 * module is now a thin adapter: it normalizes legacy values and returns the
 * label key plus badge accent from the single registry.
 */

import type { TranslationKey } from './languages';
import { categoryDefinition, normalizeCategory } from './category-registry.ts';

export interface CategoryMeta {
  /** Normalized registry value, or the raw input when unknown. */
  key: string;
  /** i18n key holding the localized label. */
  labelKey: TranslationKey;
  /** Badge classes: text color + border + tint. */
  accent: string;
}

const FALLBACK: Omit<CategoryMeta, 'key'> = {
  labelKey: 'category.other',
  accent: 'text-ink-2 border-border bg-muted',
};

/**
 * Metadata for a category value. Unknown values never crash a page: they fall
 * back to a neutral badge whose label is the localized "Other" string.
 */
export function categoryMeta(category: string | null | undefined): CategoryMeta {
  const definition = categoryDefinition(category);
  if (!definition) {
    return { key: (category ?? '').trim().toLowerCase(), ...FALLBACK };
  }
  return {
    key: definition.value,
    labelKey: definition.labelKey,
    accent: definition.accent,
  };
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
  bts: 'gallery.tagStill',
};

export function assetTagLabelKey(tag: string | null | undefined): TranslationKey | null {
  const key = (tag ?? '').trim().toLowerCase();
  return ASSET_TAG_KEYS[key] ?? null;
}

export { normalizeCategory };
