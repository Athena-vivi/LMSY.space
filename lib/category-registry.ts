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

/** Just their values, for "does this hall own a homepage door" checks. */
export const HOME_CATEGORY_VALUES: ReadonlySet<string> = new Set(
  HOME_CATEGORIES.map((definition) => definition.value)
);

/**
 * The address of one entry inside a homepage door, outside door 1.
 *
 * Door 1 is excluded because its entries hang off a series slug, which this
 * pure function cannot know; /dramas builds those itself. Everything here is
 * pure so the sitemap and the route handlers compute the same string.
 *
 * Returns null for a hall without its own door - those rows are served by
 * /projects and have no second address.
 */
export function homeDoorEntryPath(project: {
  category?: string | null;
  subtype?: string | null;
  slug?: string | null;
  id: string;
}): string | null {
  const category = normalizeCategory(project.category);
  if (!category || !HOME_CATEGORY_VALUES.has(category) || category === 'drama_work') {
    return null;
  }

  const door = categoryHref(category);
  const key = project.slug || project.id;
  const definitions = SUBTYPES_BY_CATEGORY[category] ?? [];

  if (definitions.length === 0) return `${door}/${key}`;

  const filed = definitions.find(
    (definition) => String(definition.value) === String(project.subtype ?? '')
  );
  const segment = filed
    ? subtypeSegment(filed.value)
    : UNFILED_SUBTYPE_SEGMENT;

  return `${door}/${segment}/${key}`;
}

/**
 * Categories whose front door is their own page rather than /projects. One
 * hall, one front door: the halls holding them stay out of the /projects index
 * so the same rows never exist under two addresses.
 *
 * Since 2026-10-21 every one of the five homepage entries has its own page -
 * door 1 through door 5 - so the entry cards and the index no longer overlap.
 * The three conversation halls still share /talks, and the two stream halls
 * share /live: one subject, one page.
 */
export const TALK_CATEGORIES = ['interview', 'variety', 'radio'] as const;
export const STREAM_CATEGORIES = ['live_stream'] as const;

/** Categories whose front door is a page of its own rather than /projects. */
export const CATEGORIES_WITH_OWN_DOOR: ReadonlySet<string> = new Set<string>([
  'drama_work',
  'editorial',
  'live_event',
  'public_appearance',
  'commercial',
  ...TALK_CATEGORIES,
  ...STREAM_CATEGORIES,
]);

/**
 * The front-door path per hall that owns one. Everything else is served by the
 * /projects index with a `?category=` filter.
 *
 * Each of the five homepage entries resolves here, which is why the homepage
 * never links to a filtered copy of /projects any more.
 */
const DOOR_PATHS: Partial<Record<ProjectCategory, string>> = {
  drama_work: '/dramas',
  editorial: '/editorial',
  live_event: '/live-events',
  public_appearance: '/appearances',
  commercial: '/commercial',
  interview: '/talks',
  variety: '/talks',
  radio: '/talks',
  live_stream: '/live',
};

/**
 * A sub-class is stored with underscores (`brand_event`) and written in a URL
 * with hyphens (`/live-events/brand-event`). These two functions are the only
 * place that translation happens, so a link and a stored value can never drift
 * apart.
 */
export function subtypeSegment(value: string): string {
  return value.replace(/_/g, '-');
}

export function parseSubtypeSegment(segment: string): ProjectSubtype | null {
  const value = segment.replace(/-/g, '_');
  for (const definitions of Object.values(SUBTYPES_BY_CATEGORY)) {
    const match = (definitions ?? []).find((definition) => definition.value === value);
    if (match) return match.value;
  }
  return null;
}

/**
 * URL segment for rows a hall holds but has not filed under one of its own
 * sub-classes. They still need a door of their own: a row without a place to
 * land is a row nobody can reach.
 */
export const UNFILED_SUBTYPE_SEGMENT = 'unfiled';

/**
 * Label for a hall's second-level segment, as it appears in a URL. Null means
 * the segment is the unfiled bucket, which carries its own label.
 */
export function subtypeLabelKey(
  category: ProjectCategory,
  segment: string
): TranslationKey | null {
  if (segment === UNFILED_SUBTYPE_SEGMENT) return null;
  const wanted = segment.replace(/-/g, '_');
  return (
    (SUBTYPES_BY_CATEGORY[category] ?? []).find((item) => item.value === wanted)?.labelKey ?? null
  );
}

/**
 * Halls whose rows stay out of the /projects index. Only the halls whose entry
 * addresses live outside the /projects namespace: door 1 and the two
 * soul-resonance doors.
 *
 * This is narrower than CATEGORIES_WITH_OWN_DOOR on purpose. Doors 2-5 own a
 * page and their entries own an address under it, but /projects is still where
 * a visitor browses the whole archive - so those halls keep an index entry,
 * and the cards there open the entry at its door address. The index is an
 * entrance, not a second address.
 */
export const HALLS_OUTSIDE_INDEX: ReadonlySet<string> = new Set<string>([
  'drama_work',
  ...TALK_CATEGORIES,
  ...STREAM_CATEGORIES,
]);

/** Filter chips for the full index: every hall except the ones above. */
export const INDEX_CATEGORIES: CategoryDefinition[] = CATEGORY_DEFINITIONS.filter(
  (definition) => !HALLS_OUTSIDE_INDEX.has(definition.value)
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
  // Door 1: the six groups every entry in this hall is filed under. A series
  // is not a subtype - it is project_kind = 'series', addressed by slug - so a
  // fourth series never changes this list.
  drama_work: [
    { value: 'series_body', labelKey: 'drama.group.seriesBody' },
    { value: 'music', labelKey: 'drama.group.music' },
    { value: 'novel', labelKey: 'drama.group.novel' },
    { value: 'promo', labelKey: 'drama.group.promo' },
    { value: 'award', labelKey: 'drama.group.award' },
    { value: 'footage', labelKey: 'drama.group.footage' },
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
