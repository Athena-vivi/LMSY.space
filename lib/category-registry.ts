/**
 * Stable project categories (phase 7).
 *
 * One vocabulary for the database CHECK constraint, the front-end filter
 * chips, the homepage entries, the timeline, the search index and the URL
 * parameter. Before this module each surface carried its own copy: the
 * database said `series`, the route said `drama`, the badge said "TV_SERIES"
 * and the homepage card said "Drama". Nothing here is user-visible copy -
 * labels live in lib/languages.ts under `category.*`.
 *
 * Changing a value here means changing three things together:
 *   - the CHECK constraint on lmsy_archive.projects.category
 *   - docs/architecture/20261018-category-spec.md
 *   - lib/category-registry.ts (this file)
 */

import type { TranslationKey } from './languages';

export const PROJECT_CATEGORIES = [
  'drama_work',
  'editorial',
  'live_event',
  'public_appearance',
  'commercial',
  'behind_the_scenes',
  'personal_travel',
  'early_archive',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export interface CategoryDefinition {
  /** Stable database value. Never translate this. */
  value: ProjectCategory;
  /** i18n key for the display label. */
  labelKey: TranslationKey;
  /** Position in the full index filter row. */
  order: number;
  /**
   * Shown as a fixed entry on the homepage. Five entries only: the archive
   * owner wants a permanent front door per main hall, even while a hall is
   * still being filled. Empty halls render a "collecting" placeholder rather
   * than disappearing.
   */
  homeEntry: boolean;
  /** Short card title for the homepage entry. */
  cardTitleKey: TranslationKey;
  /** Badge classes (text + border + tint). */
  accent: string;
  /** Fallback gradient when the category has no cover image yet. */
  gradient: string;
}

const DEFINITIONS: Record<ProjectCategory, Omit<CategoryDefinition, 'value' | 'order'>> = {
  drama_work: {
    labelKey: 'category.dramaWork',
    homeEntry: true,
    cardTitleKey: 'category.dramaWork',
    accent: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5',
    gradient: 'from-rose-500/25 via-orange-400/15 to-amber-500/25',
  },
  editorial: {
    labelKey: 'category.editorial',
    homeEntry: true,
    cardTitleKey: 'category.editorial',
    accent: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5',
    gradient: 'from-sky-500/25 via-indigo-400/15 to-blue-600/25',
  },
  live_event: {
    labelKey: 'category.liveEvent',
    homeEntry: true,
    cardTitleKey: 'category.liveEvent',
    accent: 'text-ink border-white/20 bg-white/5',
    gradient: 'from-fuchsia-500/25 via-pink-400/15 to-purple-600/25',
  },
  public_appearance: {
    labelKey: 'category.publicAppearance',
    homeEntry: true,
    cardTitleKey: 'category.publicAppearance',
    accent: 'text-ink border-white/20 bg-white/5',
    gradient: 'from-teal-500/25 via-cyan-400/15 to-emerald-600/25',
  },
  commercial: {
    labelKey: 'category.commercial',
    homeEntry: true,
    cardTitleKey: 'category.commercial',
    accent: 'text-ink border-white/20 bg-white/5',
    gradient: 'from-amber-500/25 via-yellow-400/15 to-orange-600/25',
  },
  behind_the_scenes: {
    labelKey: 'category.behindTheScenes',
    homeEntry: false,
    cardTitleKey: 'category.behindTheScenes',
    accent: 'text-ink-2 border-border bg-muted',
    gradient: 'from-zinc-500/25 via-slate-400/15 to-stone-600/25',
  },
  personal_travel: {
    labelKey: 'category.personalTravel',
    homeEntry: false,
    cardTitleKey: 'category.personalTravel',
    accent: 'text-ink border-white/10 bg-white/5',
    gradient: 'from-emerald-500/25 via-teal-400/15 to-sky-600/25',
  },
  early_archive: {
    labelKey: 'category.earlyArchive',
    homeEntry: false,
    cardTitleKey: 'category.earlyArchive',
    accent: 'text-ink-2 border-border bg-muted',
    gradient: 'from-stone-500/25 via-neutral-400/15 to-zinc-600/25',
  },
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = PROJECT_CATEGORIES.map(
  (value, index) => ({ value, order: index, ...DEFINITIONS[value] })
);

const BY_VALUE = new Map<string, CategoryDefinition>(
  CATEGORY_DEFINITIONS.map((definition) => [definition.value, definition])
);

/**
 * Legacy database values. Kept so old links (`?category=series`) and any row
 * written before the phase-7 migration still resolve to the right hall.
 * The migration renamed every row, so this map exists for URLs, not data.
 */
export const LEGACY_CATEGORY_ALIASES: Record<string, ProjectCategory> = {
  series: 'drama_work',
  appearance: 'live_event',
  travel: 'public_appearance',
  daily: 'personal_travel',
  magazine: 'editorial',
  journal: 'early_archive',
  music: 'early_archive',
};

/**
 * Accepts a stable value, a legacy alias, a homepage entry slug or a raw
 * string from a URL. Returns null for anything the archive does not know -
 * callers fall back to "all" instead of inventing a category.
 */
export function normalizeCategory(raw: string | null | undefined): ProjectCategory | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (BY_VALUE.has(key)) return key as ProjectCategory;
  return LEGACY_CATEGORY_ALIASES[key] ?? null;
}

export function categoryDefinition(
  raw: string | null | undefined
): CategoryDefinition | null {
  const value = normalizeCategory(raw);
  return value ? BY_VALUE.get(value) ?? null : null;
}

/** The five fixed homepage entries, in display order. */
export const HOME_CATEGORIES: CategoryDefinition[] = CATEGORY_DEFINITIONS.filter(
  (definition) => definition.homeEntry
);

/** Filter chips for the full index: all eight, in a stable order. */
export const INDEX_CATEGORIES: CategoryDefinition[] = CATEGORY_DEFINITIONS;

/**
 * URL segment per category for /timeline and /projects filtering. Equal to
 * the database value today, but kept as a separate accessor so a future
 * rename only touches this file.
 */
export function categoryHref(value: ProjectCategory): string {
  return `/projects?category=${value}`;
}
