import { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import {
  SUBTYPES_BY_CATEGORY,
  homeDoorEntryPath,
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
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
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

  // Dynamic project detail routes. Only visitor-facing projects are listed
  // (see lib/project-visibility.ts): ingestion containers must not advertise
  // their URLs to crawlers. Every project shares one canonical detail route
  // since phase 7, addressed by slug.
  let projectRoutes: MetadataRoute.Sitemap = [];
  // Door 1 keeps its own address space since 2026-10-21: drama_work rows are
  // listed under /dramas/<slug> below and redirect from /projects/<slug>, so
  // advertising them here would submit a URL that only 308s.
  let dramaRoutes: MetadataRoute.Sitemap = [];
  // Third level of door 1: every dated entry has its own address, so the
  // entries are submitted alongside the series that own them.
  let dramaEventRoutes: MetadataRoute.Sitemap = [];
  // Second level of doors 3 and 4: one page per shelf (fan meetings, awards,
  // fashion...). Each is a real page with its own title, not a tab.
  const shelfRoutes: MetadataRoute.Sitemap = [
    ...(SUBTYPES_BY_CATEGORY.live_event ?? []).map(
      (definition) => `/live-events/${subtypeSegment(definition.value)}`
    ),
    ...(SUBTYPES_BY_CATEGORY.public_appearance ?? []).map(
      (definition) => `/appearances/${subtypeSegment(definition.value)}`
    ),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  try {
    const { data } = await applyPublicProjectFilter(
      getSupabaseAdmin()
        .schema('lmsy_archive')
        .from('projects')
        .select('id, work_id, slug, category, project_kind, subtype, created_at')
    );
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
          // A homepage door has its own address space: an entry there is
          // submitted at the address the visitor actually lands on, never at
          // the /projects copy that door no longer links to.
          const doorUrl = homeDoorEntryPath(project);
          return {
            url: `${SITE_URL}${doorUrl ?? `/projects/${project.slug || project.id}`}`,
            lastModified: project.created_at ? new Date(project.created_at) : now,
            changeFrequency: 'monthly' as const,
            priority: doorUrl ? 0.6 : 0.5,
          };
        }
      );

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
      const { data: events } = seriesSlugById.size
        ? await getSupabaseAdmin()
            .schema('lmsy_archive')
            .from('projects')
            .select('work_id, slug, created_at')
            .in('work_id', [...seriesSlugById.keys()])
            .neq('project_kind', 'series')
        : { data: [] as Array<{ work_id: string | null; slug: string | null; created_at: string | null }> };

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
