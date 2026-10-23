import { MetadataRoute } from 'next';
import { getSupabasePublic } from '@/lib/data/client';
import { listDramaEventSlugRows, listPublicSitemapProjects } from '@/lib/data/projects';
import {
  SUBTYPES_BY_CATEGORY,
  TALK_CATEGORIES,
  doorEntryPath,
  subtypeSegment,
} from '@/lib/category-registry';

/**
 * Sitemap.
 *
 * Previously hardcoded the retired domain (lookmheesonya-forever.com), listed
 * only 5 routes, queried a `members` table that does not exist in production,
 * and selected `projects.updated_at` — a column that does not exist either, so
 * the dynamic project URLs were silently dropped.
 */
export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lmsy.space').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
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
    { url: `${SITE_URL}/copyright`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamic entry routes. Only visitor-facing rows are listed (see
  // lib/project-visibility.ts): ingestion containers must not advertise their
  // URLs to crawlers. Every entry is submitted at the address its own door
  // gives it - there is no shared /projects address since 2026-10-21.
  let projectRoutes: MetadataRoute.Sitemap = [];
  // Door 1 keeps its own address space: drama_work rows are listed under
  // /dramas/<slug> below, and an entry under its series further down.
  let dramaRoutes: MetadataRoute.Sitemap = [];
  // Third level of door 1: every dated entry has its own address, so the
  // entries are submitted alongside the series that own them.
  let dramaEventRoutes: MetadataRoute.Sitemap = [];
  // Second level of doors 3 and 4: one page per shelf (fan meetings, awards,
  // fashion...). Each is a real page with its own title, not a tab. /talks
  // splits on category and /live on who held the phone, so their shelves are
  // submitted too - every one of them is a landing page, not a filter.
  const shelfRoutes: MetadataRoute.Sitemap = [
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
  try {
    const data = await listPublicSitemapProjects(getSupabasePublic());
    projectRoutes = (data || [])
      .filter((project: { category?: string | null }) => project.category !== 'drama_work')
      .map(
        (project: {
          id: string;
          slug?: string | null;
          category?: string | null;
          subtype?: string | null;
          created_at: string | null;
        }) => {
          // A door entry is submitted where the visitor lands. A row whose
          // hall has no page is not submitted at all - a sitemap must not
          // advertise a 404.
          const doorUrl = doorEntryPath(project);
          if (!doorUrl) return null;
          return {
            url: `${SITE_URL}${doorUrl}`,
            lastModified: project.created_at ? new Date(project.created_at) : now,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          };
        }
      )
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const dramas = (data || []).filter(
      (project: { category?: string | null; project_kind?: string | null }) =>
        project.category === 'drama_work' && project.project_kind === 'series'
    );
    dramaRoutes = dramas.map(
      (project: { id: string; slug?: string | null; created_at: string | null }) => ({
        url: `${SITE_URL}/dramas/${project.slug || project.id}`,
        lastModified: project.created_at ? new Date(project.created_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })
    );

    if (dramas.length > 0) {
      // Entries hang off the work, not off the series row, so the map is keyed
      // by work_id and skips any series row that has none.
      const seriesSlugById = new Map<string, string>(
        dramas
          .filter((project: { work_id?: string | null }) => Boolean(project.work_id))
          .map((project: { work_id?: string | null; id: string; slug?: string | null }) => [
            project.work_id as string,
            project.slug || project.id,
          ])
      );
      const events = await listDramaEventSlugRows(
        getSupabasePublic(),
        [...seriesSlugById.keys()]
      );

      dramaEventRoutes = (events ?? [])
        .map((event) => {
          const row = event as { work_id: string; slug: string | null; created_at: string | null };
          const seriesSlug = seriesSlugById.get(row.work_id);
          if (!seriesSlug || !row.slug) return null;
          return {
            url: `${SITE_URL}/dramas/${seriesSlug}/${row.slug}`,
            lastModified: row.created_at ? new Date(row.created_at) : now,
            changeFrequency: 'monthly' as const,
            priority: 0.5,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    }
  } catch {
    // A sitemap failure must not break the route; fall back to static entries.
  }

  return [...staticRoutes, ...shelfRoutes, ...dramaRoutes, ...dramaEventRoutes, ...projectRoutes];
}
