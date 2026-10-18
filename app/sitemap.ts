import { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';

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
    { url: `${SITE_URL}/copyright`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamic project detail routes. Only visitor-facing projects are listed
  // (see lib/project-visibility.ts): ingestion containers must not advertise
  // their URLs to crawlers. Every project shares one canonical detail route
  // since phase 7, addressed by slug.
  let projectRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await applyPublicProjectFilter(
      getSupabaseAdmin()
        .schema('lmsy_archive')
        .from('projects')
        .select('id, slug, created_at')
    );
    projectRoutes = (data || []).map(
      (project: { id: string; slug?: string | null; created_at: string | null }) => ({
        url: `${SITE_URL}/projects/${project.slug || project.id}`,
        lastModified: project.created_at ? new Date(project.created_at) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })
    );
  } catch {
    // A sitemap failure must not break the route; fall back to static entries.
  }

  return [...staticRoutes, ...projectRoutes];
}
