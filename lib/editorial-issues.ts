import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { countIssueArtifacts } from '@/lib/editorial-meta';
import type { LocalizedText } from '@/lib/localized-content';

/**
 * Editorial issues - the reading layer for door 2.
 *
 * One issue is one project row (category = 'editorial') plus its gallery
 * pages. The door is a rack of covers; an issue opens at /editorial/<slug>.
 *
 * This lives outside the route handler so the door page and the JSON API read
 * the same rows through the same cover rule. The door used to be a client
 * shell that fetched /api/editorial after paint, which meant search engines
 * saw an empty grid - the reason this module exists now is that an issue has
 * to be crawlable from the door.
 */

const CDN_BASE = 'https://cdn.lmsy.space';

export interface EditorialGalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
  catalog_id: string | null;
}

export interface EditorialIssue {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  /** Always 'editorial'; the detail component reads it as a badge. */
  category: string;
  cover_url: string | null;
  blur_data: string | null;
  release_date: string | null;
  catalog_id: string | null;
  artifact_count: number;
  cover_source: 'database' | 'gallery_discovery' | 'empty_vault';
  gallery_images: EditorialGalleryImage[];
}

/** Absolute URL for a stored path; absolute URLs pass through unchanged. */
function getCdnUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${CDN_BASE}/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
}

/**
 * Cover fallback for issues without a database cover: the -000 catalog plate,
 * else the lowest catalog number. Returns null when the issue has no usable
 * page - never a fabricated URL.
 */
function discoverCoverFromGallery(
  galleryImages: Array<{ image_url?: string | null; catalog_id?: string | null }>
): string | null {
  if (!galleryImages || galleryImages.length === 0) return null;

  const coverImage = galleryImages.find(
    (img) => img.catalog_id && img.catalog_id.endsWith('-000')
  );
  if (coverImage?.image_url) return getCdnUrl(coverImage.image_url);

  const sorted = [...galleryImages]
    .filter((img) => img.catalog_id)
    .sort((a, b) => (a.catalog_id || '').localeCompare(b.catalog_id || ''));

  return sorted.length > 0 ? getCdnUrl(sorted[0].image_url ?? null) : null;
}

/**
 * Pages of one issue, in page order. The embedded select cannot carry an
 * ORDER BY, and PostgREST gives no ordering guarantee without one - so the
 * sort happens here, on the catalog plate, which is the page number.
 */
function sortPages<T extends { catalog_id?: string | null; created_at?: string | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    if (a.catalog_id && b.catalog_id && a.catalog_id !== b.catalog_id) {
      return a.catalog_id.localeCompare(b.catalog_id);
    }
    if (a.catalog_id && !b.catalog_id) return -1;
    if (!a.catalog_id && b.catalog_id) return 1;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
}

const ISSUE_COLUMNS = `
  id,
  slug,
  title,
  title_i18n,
  description,
  description_i18n,
  category,
  cover_url,
  blur_data,
  release_date,
  catalog_id,
  created_at,
  gallery_assets (
    id,
    image_url,
    blur_data,
    caption,
    catalog_id,
    created_at
  )
`;

type IssueRow = {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: unknown;
  description: string | null;
  description_i18n: unknown;
  category: string | null;
  cover_url: string | null;
  blur_data: string | null;
  release_date: string | null;
  catalog_id: string | null;
  gallery_assets: EditorialGalleryImage[] | null;
};

function toIssue(row: IssueRow): EditorialIssue {
  const galleryImages = sortPages(row.gallery_assets ?? []);
  const artifactCount = countIssueArtifacts(galleryImages, row.cover_url);

  let coverUrl: string | null = null;
  let coverSource: EditorialIssue['cover_source'] = 'empty_vault';

  if (row.cover_url) {
    coverUrl = getCdnUrl(row.cover_url);
    coverSource = 'database';
  } else {
    coverUrl = discoverCoverFromGallery(galleryImages);
    coverSource = coverUrl ? 'gallery_discovery' : 'empty_vault';
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    title_i18n: (row.title_i18n as LocalizedText | null) ?? null,
    description: row.description,
    description_i18n: (row.description_i18n as LocalizedText | null) ?? null,
    category: row.category ?? 'editorial',
    cover_url: coverUrl,
    blur_data: row.blur_data,
    release_date: row.release_date,
    catalog_id: row.catalog_id,
    artifact_count: artifactCount,
    cover_source: coverSource,
    gallery_images: galleryImages,
  };
}

/** Every public issue, newest first. The rack on /editorial. */
export async function loadEditorialIssues(): Promise<EditorialIssue[]> {
  const { data, error } = await applyPublicProjectFilter(
    getSupabaseAdmin()
      .schema('lmsy_archive')
      .from('projects')
      .select(ISSUE_COLUMNS)
      .eq('category', 'editorial')
  )
    // Newest issue first. Issues whose date is still unknown sink to the end
    // instead of floating to the top on a NULL sort key.
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as unknown as IssueRow[]).map(toIssue);
}

/**
 * One issue by slug (or uuid). Visibility goes through the same rule as the
 * rack, so an unpublished issue cannot be opened by guessing its address.
 */
export async function loadEditorialIssue(key: string): Promise<EditorialIssue | null> {
  const { data } = await applyPublicProjectFilter(
    getSupabaseAdmin()
      .schema('lmsy_archive')
      .from('projects')
      .select(ISSUE_COLUMNS)
      .eq('category', 'editorial')
      .eq(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) ? 'id' : 'slug', key)
  ).maybeSingle();

  if (!data) return null;

  return toIssue(data as unknown as IssueRow);
}
