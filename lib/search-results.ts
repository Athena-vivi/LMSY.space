/**
 * Search result contract, ranking and routing (phase 5).
 *
 * Contract: docs/architecture/20261017-search-contract.md
 *
 * Everything in this module is a pure function over data the search API
 * already fetched, so it is directly unit-testable under node:test (no
 * path aliases, no Supabase). The route only does: sanitize term, fetch
 * candidate pools through the shared visibility rule, then call
 * buildSearchResults().
 *
 * Iron rules (ADR-001 D5 + phase-5 instruction):
 *   - never fabricate titles, descriptions, catalog numbers, dates or covers;
 *   - a row without a displayable real title does not enter the results;
 *   - `id` is always the database uuid (or the real exhibition category
 *     type segment), never an array index;
 *   - the frontend must never infer the result type from the title text.
 */

// NOTE: the explicit .ts extension keeps this module importable both by the
// Next.js build (allowImportingTsExtensions) and by node --strip-types tests.
import { EXHIBITION_CATEGORIES } from './exhibition-categories.ts';
import type { Language } from './languages';

// ---- Contract --------------------------------------------------------------

export type SearchResultType = 'project' | 'gallery' | 'exhibition';

export interface SearchResult {
  type: SearchResultType;
  /** Database uuid (projects / gallery_assets) or the real category type segment. */
  id: string;
  title: string;
  /** Canonical detail address. */
  href: string;
  /** Present only when real data exists - never fabricated. */
  description?: string;
  image?: string;
  date?: string;
  category?: string;
}

/** Minimal shapes of the rows the search API selects. */
export interface ProjectRow {
  id: string;
  title: string | null;
  description?: string | null;
  category?: string | null;
  release_date?: string | null;
}

export interface GalleryRow {
  id: string;
  caption?: string | null;
  tag?: string | null;
  catalog_id?: string | null;
  image_url?: string | null;
  event_date?: string | null;
  project_id?: string | null;
}

// ---- Ranking ---------------------------------------------------------------

export const SCORE_EXACT = 40;
export const SCORE_PREFIX = 30;
export const SCORE_CONTAINS = 20;
export const SCORE_METADATA = 10;

// Same-score type priority: works first, then category entries, then photos.
const TYPE_PRIORITY: Record<SearchResultType, number> = {
  project: 0,
  exhibition: 1,
  gallery: 2,
};

/** Title-based score; anything that only matched metadata scores SCORE_METADATA. */
export function scoreResult(result: SearchResult, term: string): number {
  if (result.type === 'exhibition') return SCORE_METADATA;
  const title = result.title.toLowerCase();
  const q = term.toLowerCase();
  if (!q) return SCORE_METADATA;
  if (title === q) return SCORE_EXACT;
  if (title.startsWith(q)) return SCORE_PREFIX;
  if (title.includes(q)) return SCORE_CONTAINS;
  return SCORE_METADATA;
}

/**
 * Deterministic comparator: score desc -> type priority -> real date desc
 * (missing dates sink within the same group, never padded with fake values)
 * -> id lexicographic. Same input always produces the same order.
 */
export function compareResults(
  a: SearchResult,
  b: SearchResult,
  term: string
): number {
  const scoreDiff = scoreResult(b, term) - scoreResult(a, term);
  if (scoreDiff !== 0) return scoreDiff;

  const typeDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
  if (typeDiff !== 0) return typeDiff;

  const dateA = a.date ?? '';
  const dateB = b.date ?? '';
  if (dateA !== dateB) return dateB.localeCompare(dateA);

  return a.id.localeCompare(b.id);
}

// ---- Mapping ---------------------------------------------------------------

/**
 * Canonical detail entry (phase-4 batch 2, Task 3): editorial works are read
 * through /editorial/[id], everything else through /projects/[id].
 */
export function projectHref(category: string | null | undefined, id: string): string {
  return category === 'editorial' ? `/editorial/${id}` : `/projects/${id}`;
}

export function mapProjectRow(row: ProjectRow): SearchResult | null {
  const title = (row.title ?? '').trim();
  if (!row.id || !title) return null;
  return {
    type: 'project',
    id: row.id,
    title,
    href: projectHref(row.category, row.id),
    description: (row.description ?? '').trim() || undefined,
    date: row.release_date || undefined,
    category: row.category || undefined,
  };
}

/**
 * Gallery asset title fallback chain uses only real fields:
 * caption -> catalog_id -> #tag. Assets with none of the three are excluded
 * (no placeholder stand-in titles). href is the verified stable anchor
 * /gallery#<asset uuid> - the gallery page auto-pages to it.
 */
export function mapGalleryRow(row: GalleryRow): SearchResult | null {
  const caption = (row.caption ?? '').trim();
  const catalog = (row.catalog_id ?? '').trim();
  const tag = (row.tag ?? '').trim();
  const title = caption || catalog || (tag ? `#${tag}` : '');
  if (!row.id || !title) return null;
  return {
    type: 'gallery',
    id: row.id,
    title,
    href: `/gallery#${row.id}`,
    image: row.image_url || undefined,
    date: row.event_date || undefined,
    category: tag || undefined,
  };
}

/**
 * Exhibition entries are the real category view, not fabricated exhibition
 * entities: a category only appears when it currently holds at least one
 * publicly visible project (counts derived from the public project set).
 * The term must match the category type, the projects.category value or one
 * of its real localized labels.
 */
export function buildExhibitionResults(
  term: string,
  categoryCounts: Record<string, number>,
  lang: Language
): SearchResult[] {
  const q = term.toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const category of EXHIBITION_CATEGORIES) {
    if ((categoryCounts[category.category] ?? 0) <= 0) continue;
    const haystacks = [
      category.type,
      category.category,
      category.title,
      category.label.en,
      category.label.zh,
      category.label.th,
    ].map((s) => s.toLowerCase());
    if (!haystacks.some((s) => s === q || s.includes(q))) continue;
    results.push({
      type: 'exhibition',
      id: category.type,
      title: category.label[lang] ?? category.label.en,
      href: `/exhibitions/category/${category.type}`,
      description: category.description,
      category: category.category,
    });
  }
  return results;
}

// ---- Assembly --------------------------------------------------------------

export const MAX_PER_TYPE = 10;
export const MAX_TOTAL_RESULTS = 15;

export interface BuildSearchResultsInput {
  term: string;
  projectRows: ProjectRow[];
  galleryRows: GalleryRow[];
  /** projects.category -> count over ALL publicly visible projects. */
  categoryCounts: Record<string, number>;
  lang: Language;
}

/**
 * Map, merge, rank and cap. Deduplicated by type+id as a structural safety
 * net (the queries themselves already make duplicates impossible).
 */
export function buildSearchResults(input: BuildSearchResultsInput): SearchResult[] {
  const { term, projectRows, galleryRows, categoryCounts, lang } = input;

  const mapped: SearchResult[] = [];
  for (const row of projectRows) {
    const mappedRow = mapProjectRow(row);
    if (mappedRow) mapped.push(mappedRow);
  }
  for (const row of galleryRows) {
    const mappedRow = mapGalleryRow(row);
    if (mappedRow) mapped.push(mappedRow);
  }
  mapped.push(...buildExhibitionResults(term, categoryCounts, lang));

  // Structural dedup: same type + same db id can only appear once.
  const seen = new Set<string>();
  const unique = mapped.filter((r) => {
    const key = `${r.type}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => compareResults(a, b, term));

  const perType: Record<SearchResultType, number> = { project: 0, gallery: 0, exhibition: 0 };
  const results: SearchResult[] = [];
  for (const result of unique) {
    if (results.length >= MAX_TOTAL_RESULTS) break;
    if (perType[result.type] >= MAX_PER_TYPE) continue;
    perType[result.type] += 1;
    results.push(result);
  }
  return results;
}
