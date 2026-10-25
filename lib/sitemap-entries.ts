import { getSupabasePublic } from '@/lib/data/client';
import { listDramaEventSlugRows, listPublicSitemapProjects } from '@/lib/data/projects';
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

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
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

    for (const project of rows) {
      if (project.category === 'drama_work') continue;
      const doorUrl = doorEntryPath(project);
      if (!doorUrl) continue;
      const slug = CATEGORY_SLUG[project.category ?? ''];
      if (!slug) continue;
      push(slug, {
        url: `${SITE_URL}${doorUrl}`,
        lastModified: project.created_at ? new Date(project.created_at) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }

    for (const project of dramas) {
      push('dramas', {
        url: `${SITE_URL}/dramas/${project.slug || project.id}`,
        lastModified: project.created_at ? new Date(project.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
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
      const events = await listDramaEventSlugRows(getSupabasePublic(), [
        ...seriesSlugById.keys(),
      ]);

      for (const event of events ?? []) {
        const row = event as { work_id: string; slug: string | null; created_at: string | null };
        const seriesSlug = seriesSlugById.get(row.work_id);
        if (!seriesSlug || !row.slug) continue;
        push('dramas', {
          url: `${SITE_URL}/dramas/${seriesSlug}/${row.slug}`,
          lastModified: row.created_at ? new Date(row.created_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  } catch {
    // Keep whatever was collected (static pages at minimum).
  }

  return groups;
}
