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
import type { ProjectSubtype } from './supabase/types';

export const PROJECT_CATEGORIES = [
  'drama_work',
  'editorial',
  'live_event',
  'public_appearance',
  'commercial',
  'interview',
  'variety',
  'radio',
  'live_stream',
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
  // -- soul-resonance door 1: everything someone else asked them -------------
  // One hall of three categories. They share a production model (a third party
  // shoots it, cuts it, and gives it a running time) and that is exactly what
  // separates them from a live stream. They do NOT share a subject, so the
  // door splits them with tabs instead of pages: 21 variety spots would be a
  // thin page on their own.
  interview: {
    labelKey: 'category.interview',
    homeEntry: false,
    cardTitleKey: 'category.interview',
    accent: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5',
    gradient: 'from-indigo-500/25 via-violet-400/15 to-purple-600/25',
  },
  variety: {
    labelKey: 'category.variety',
    homeEntry: false,
    cardTitleKey: 'category.variety',
    accent: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5',
    gradient: 'from-orange-500/25 via-amber-400/15 to-rose-600/25',
  },
  radio: {
    labelKey: 'category.radio',
    homeEntry: false,
    cardTitleKey: 'category.radio',
    accent: 'text-ink-2 border-border bg-muted',
    gradient: 'from-cyan-500/25 via-sky-400/15 to-blue-600/25',
  },
  // -- soul-resonance door 2: no edit, nobody asking -------------------------
  live_stream: {
    labelKey: 'category.liveStream',
    homeEntry: false,
    cardTitleKey: 'category.liveStream',
    accent: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5',
    gradient: 'from-rose-500/25 via-pink-400/15 to-fuchsia-600/25',
  },
  behind_the_scenes: {
    labelKey: 'category.behindTheScenes',
    homeEntry: false,
    cardTitleKey: 'category.behindTheScenes',
    accent: 'text-ink-2 border-border bg-muted',
    gradient: 'from-zinc-500/25 via-slate-400/15 to-stone-600/25',
  },
  /**
   * @deprecated Folded into `behind_the_scenes`. Two archived rows still carry
   * it and the database CHECK still accepts it, so it stays in the vocabulary
   * until those rows are migrated - it has no home entry and no chip.
   */
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

/**
 * Categories whose front door is /talks, /live or /dramas rather than
 * /projects. One hall, one front door: the halls holding them stay out of the
 * /projects index so the same rows never exist under two addresses.
 */
export const TALK_CATEGORIES = ['interview', 'variety', 'radio'] as const;
export const STREAM_CATEGORIES = ['live_stream'] as const;

/** Categories whose front door is /talks or /live rather than /projects. */
export const CATEGORIES_WITH_OWN_DOOR: ReadonlySet<string> = new Set<string>([
  'drama_work',
  ...TALK_CATEGORIES,
  ...STREAM_CATEGORIES,
]);

/**
 * The front-door path per hall that owns one. Everything else is served by the
 * /projects index with a `?category=` filter.
 */
const DOOR_PATHS: Partial<Record<ProjectCategory, string>> = {
  drama_work: '/dramas',
  interview: '/talks',
  variety: '/talks',
  radio: '/talks',
  live_stream: '/live',
};

/** Filter chips for the full index: every hall except the two door halls. */
export const INDEX_CATEGORIES: CategoryDefinition[] = CATEGORY_DEFINITIONS.filter(
  (definition) => !CATEGORIES_WITH_OWN_DOOR.has(definition.value)
);

/**
 * Sub-classes, but only for the halls that are big enough to need a second
 * axis. The vocabulary itself is decided by the database CHECK constraint and
 * typed in lib/supabase/types.ts; this table only says **which hall shows which
 * sub-class, in what order, under what label** - the UI must not invent a value
 * the database would reject.
 *
 * Halls missing from this map have no tabs on purpose:
 *   editorial / commercial / behind_the_scenes / personal_travel /
 *   early_archive  - the work itself is the smallest unit
 *   interview / variety / radio / live_stream - these own a landing page
 *   (/talks, /live) that already splits them, so they never reach /projects
 */
export interface SubtypeDefinition {
  value: ProjectSubtype;
  labelKey: TranslationKey;
}

export const SUBTYPES_BY_CATEGORY: Partial<Record<ProjectCategory, SubtypeDefinition[]>> = {
  // Door 1: one tab per series, in broadcast order. A fourth series is a new
  // value here plus a row in the database - never a new hall.
  drama_work: [
    { value: 'affair', labelKey: 'subtype.affair' },
    { value: 'harmony_secret', labelKey: 'subtype.harmony_secret' },
    { value: 'hometown_romance', labelKey: 'subtype.hometown_romance' },
  ],
  live_event: [
    { value: 'fanmeeting', labelKey: 'subtype.fanmeeting' },
    { value: 'brand_event', labelKey: 'subtype.brand_event' },
    { value: 'birthday', labelKey: 'subtype.birthday' },
  ],
  public_appearance: [
    // Order and names mirror list types A-F in
    // docs/20261019-lmsy-public-appearance-list.md, one tab per type.
    { value: 'awards', labelKey: 'subtype.awards' },
    { value: 'fashion', labelKey: 'subtype.fashion' },
    { value: 'brand_stage', labelKey: 'subtype.brand_stage' },
    { value: 'industry', labelKey: 'subtype.industry' },
    { value: 'charity', labelKey: 'subtype.charity' },
    { value: 'premiere', labelKey: 'subtype.premiere' },
  ],
};

/**
 * Tabs for a hall, keeping the curated order and dropping values no visible
 * row uses. Returns an empty array when the hall has no sub-classes or when
 * only one of them is populated - a tab row holding "All 40 / Fanmeeting 40"
 * is a filter that filters nothing.
 */
export function subtypeTabs(
  category: ProjectCategory | null,
  counts: Record<string, number>
): SubtypeDefinition[] {
  if (!category) return [];
  const defined = SUBTYPES_BY_CATEGORY[category] ?? [];
  const populated = defined.filter((definition) => (counts[definition.value] ?? 0) > 0);
  return populated.length >= 2 ? populated : [];
}

/**
 * URL segment per category for /timeline and /projects filtering. Halls with
 * their own front door resolve to that door, so a homepage entry never sends a
 * visitor to a filtered copy of a page that already exists.
 */
export function categoryHref(value: ProjectCategory): string {
  return DOOR_PATHS[value] ?? `/projects?category=${value}`;
}
