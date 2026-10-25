import { getSupabasePublic } from '@/lib/data/client';
import { listDramaEventSlugRows, listPublicSitemapProjects } from '@/lib/data/projects';
import { resolveImageUrl } from '@/lib/image-url';
import {
  SUBTYPES_BY_CATEGORY,
  TALK_CATEGORIES,
  doorEntryPath,
  subtypeSegment,
} from '@/lib/category-registry';

/**
 * Sitemap data layer, shared by the /sitemap.xml index and the /sitemaps/*.xml
 * sub-sitemaps.
 *
 * Architecture (2026-10-25): with thousands of images coming, a single sitemap
 * file cannot scale. The index lists per-door sub-sitemaps; each sub-sitemap
 * paginates with a -N suffix (live-events-2.xml) under PAGE_SIZE entries.
 * Image sitemaps (image:image) will be layered onto the same sub-sitemaps in
 * phase 1 — the door grouping already matches the R2 key layout.
 *
 * Only visitor-facing rows are listed (see lib/project-visibility.ts):
 * ingestion containers must not advertise their URLs to crawlers, and a sitemap
 * must never advertise a 404 — a row whose hall has no page is skipped.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lmsy.space').replace(/\/$/, '');

/** Sub-sitemap slugs served by app/sitemaps/[slug]/route.ts. */
export const SITEMAP_SLUGS = [
  'pages',
  'dramas',
  'editorial',
  'live-events',
  'appearances',
  'commercial',
  'talks',
  'live',
] as const;

/** Google caps a sitemap at 50k URLs; paginate well below with a -N suffix. */
export const PAGE_SIZE = 10000;

export type SitemapImage = {
  loc: string;
  title?: string;
};

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
  /** Images rendered on this page, fed to Google Images via image:image. */
  images?: SitemapImage[];
};

/** project.category → sub-sitemap slug. Rows outside the map have no hall page. */
const CATEGORY_SLUG: Record<string, string> = {
  editorial: 'editorial',
  live_event: 'live-events',
  public_appearance: 'appearances',
  commercial: 'commercial',
  talk: 'talks',
  live_stream: 'live',
};

export function staticSitemapEntries(): SitemapEntry[] {
  const now = new Date();

  const staticRoutes: SitemapEntry[] = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/timeline`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/people`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/editorial`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/live-events`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/appearances`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/commercial`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/talks`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/live`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/dramas`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/copyright`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Second level of doors 3 and 4: one page per shelf (fan meetings, awards,
  // fashion...). /talks splits on category and /live on who held the phone, so
  // their shelves are submitted too - every one of them is a landing page.
  const shelfRoutes: SitemapEntry[] = [
    ...(SUBTYPES_BY_CATEGORY.live_event ?? []).map(
      (definition) => `/live-events/${subtypeSegment(definition.value)}`
    ),
    ...(SUBTYPES_BY_CATEGORY.public_appearance ?? []).map(
      (definition) => `/appearances/${subtypeSegment(definition.value)}`
    ),
    ...TALK_CATEGORIES.map((category) => `/talks/${category}`),
    ...(SUBTYPES_BY_CATEGORY.live_stream ?? []).map(
      (definition) => `/live/${subtypeSegment(definition.value)}`
    ),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...shelfRoutes];
}

/**
 * All dynamic entries grouped by sub-sitemap slug. One DB pass; dramas need a
 * second query for their dated entries. A failure degrades to the static page
 * list — a sitemap failure must never break the route.
 */
export async function sitemapGroups(): Promise<Map<string, SitemapEntry[]>> {
  const groups = new Map<string, SitemapEntry[]>();
  for (const slug of SITEMAP_SLUGS) groups.set(slug, []);
  groups.set('pages', staticSitemapEntries());

  const push = (slug: string, entry: SitemapEntry) => {
    groups.get(slug)?.push(entry);
  };

  try {
    const data = await listPublicSitemapProjects(getSupabasePublic());
    const rows = (data || []) as Array<{
      id: string;
      slug?: string | null;
      category?: string | null;
      subtype?: string | null;
      project_kind?: string | null;
      work_id?: string | null;
      created_at: string | null;
    }>;

    // Door 1 is assembled separately: series rows get /dramas/<slug> and their
    // dated entries hang off the series (second query below).
    const dramas = rows.filter(
      (project) => project.category === 'drama_work' && project.project_kind === 'series'
    );

    // project_id → visitor-facing page URL. Every public image belongs to a
    // project; the image feed attaches to whichever page that project resolves
    // to. Projects with no page (doorEntryPath null) feed nothing.
    const urlByProject = new Map<string, string>();

    for (const project of rows) {
      if (project.category === 'drama_work') continue;
      const doorUrl = doorEntryPath(project);
      if (!doorUrl) continue;
      const slug = CATEGORY_SLUG[project.category ?? ''];
      if (!slug) continue;
      urlByProject.set(project.id, `${SITE_URL}${doorUrl}`);
      push(slug, {
        url: `${SITE_URL}${doorUrl}`,
        lastModified: project.created_at ? new Date(project.created_at) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }

    if (dramas.length > 0) {
      // Entries hang off the work, not off the series row, so the map is keyed
      // by work_id and skips any series row that has none.
      const seriesSlugById = new Map<string, string>(
        dramas
          .filter((project) => Boolean(project.work_id))
          .map((project) => [project.work_id as string, project.slug || project.id])
      );

      for (const project of dramas) {
        const seriesUrl = `${SITE_URL}/dramas/${project.slug || project.id}`;
        urlByProject.set(project.id, seriesUrl);
        push('dramas', {
          url: seriesUrl,
          lastModified: project.created_at ? new Date(project.created_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }

      const events = await listDramaEventSlugRows(getSupabasePublic(), [
        ...seriesSlugById.keys(),
      ]);

      for (const event of events ?? []) {
        const seriesSlug = seriesSlugById.get(event.work_id ?? '');
        if (!seriesSlug || !event.slug) continue;
        const eventUrl = `${SITE_URL}/dramas/${seriesSlug}/${event.slug}`;
        urlByProject.set(event.id, eventUrl);
        push('dramas', {
          url: eventUrl,
          lastModified: event.created_at ? new Date(event.created_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }

    // Image feed: page over the public assets once and attach them to their
    // project's page entry. Best-effort — a failure here must not drop URLs.
    try {
      const imagesByUrl = await fetchPublicImages(urlByProject);
      for (const entries of groups.values()) {
        for (const entry of entries) {
          const images = imagesByUrl.get(entry.url);
          if (images && images.length > 0) entry.images = images;
        }
      }
    } catch {
      // URLs without images are still valid; swallow and continue.
    }
  } catch {
    // Keep whatever was collected (static pages at minimum).
  }

  return groups;
}

/** Google caps image entries per <url> at 1000. */
const IMAGES_PER_URL = 1000;
/** Gallery assets rows read per request; PostgREST hard-caps at 1000. */
const IMAGE_PAGE = 1000;

/**
 * Public gallery assets grouped by their project's page URL. Paged with
 * `.range()` — a single unbounded select silently truncates at 1000 rows. Rows
 * whose project has no page, and rows without a resolvable image URL, are
 * skipped. `image:title` reuses the existing caption text; nothing is coined.
 */
async function fetchPublicImages(
  urlByProject: Map<string, string>
): Promise<Map<string, SitemapImage[]>> {
  const result = new Map<string, SitemapImage[]>();
  const db = getSupabasePublic();

  let from = 0;
  while (true) {
    const { data, error } = await db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id, image_url, caption, caption_i18n')
      .not('project_id', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + IMAGE_PAGE - 1);

    if (error) throw error;
    const rows = (data ?? []) as Array<{
      project_id: string;
      image_url: string | null;
      caption: string | null;
      caption_i18n: Record<string, string | null> | null;
    }>;

    for (const row of rows) {
      const pageUrl = urlByProject.get(row.project_id);
      if (!pageUrl) continue;
      const loc = resolveImageUrl(row.image_url);
      if (!loc) continue;

      let bucket = result.get(pageUrl);
      if (!bucket) {
        bucket = [];
        result.set(pageUrl, bucket);
      }
      if (bucket.length >= IMAGES_PER_URL) continue;

      const title = row.caption_i18n?.en?.trim() || row.caption?.trim() || undefined;
      bucket.push(title ? { loc, title } : { loc });
    }

    if (rows.length < IMAGE_PAGE) break;
    from += IMAGE_PAGE;
  }

  return result;
}
