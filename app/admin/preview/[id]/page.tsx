import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAdminFromCookies } from '@/lib/security/api-auth';
import { isPublicProject, applyPublicProjectFilter } from '@/lib/project-visibility';
import { pickCoversByProject } from '@/lib/project-covers';
import { aggregateProjectSpans } from '@/lib/project-span';
import type { LocalizedText } from '@/lib/localized-content';
import ProjectDetailClient from './project-detail-client';

/**
 * /admin/preview/<id> - the workbench renderer for one row.
 *
 * 2026-10-21: this used to be /projects/<id>, the front end's shared detail
 * route. The public site no longer has a /projects namespace at all (an event
 * is addressed by the door that owns it), so the route moved behind /admin,
 * where "project" is still the right word: the workbench creates one folder of
 * pictures per row and publishes it.
 *
 * It is not a second public address. It is admin-only and now enforced on the
 * server: getAdminFromCookies() runs at the top of both the page and its
 * metadata generator, so an anonymous request never reaches the service-role
 * reads below (a client-side redirect in the admin layout cannot do this - the
 * server has already streamed the RSC payload by then). It is never linked from
 * a public page and is served with `X-Robots-Tag: noindex` by next.config.ts.
 */

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ProjectGalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  category_tag: string | null;
  curator_note: string | null;
  is_featured: boolean;
  event_date: string | null;
  created_at: string;
  is_cover?: boolean | null;
  rotation?: number | null;
  sequence?: number | null;
}

// The page renders a shell plus the project's own images. It is admin-only:
// getAdminFromCookies() runs per request (cookies() opts into dynamic
// rendering), so no unpublished row is ever cached at the edge for anonymous
// visitors. The previous `revalidate = 300` is intentionally gone - an
// auth-gated page must not be served from the ISR cache.

// Only the columns the detail view renders (the previous select('*') pulled
// excerpt/credits/i18n blobs the gallery grid never shows).
const PROJECT_GALLERY_COLUMNS =
  'id, image_url, caption, caption_i18n, catalog_id, category_tag, curator_note, is_featured, event_date, created_at, is_cover, rotation, sequence, width, height';

// Tab categories configuration
export const CATEGORIES = [
  { value: 'all', label: 'ALL' },
  { value: 'official_stills', label: 'OFFICIAL_STILLS' },
  { value: 'bts', label: 'BEHIND_THE_SCENES' },
  { value: 'press_events', label: 'PRESS_EVENTS' },
] as const;

export type CategoryType = typeof CATEGORIES[number]['value'];

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Server-side admin gate: no DB read (and no title/description leak) for
  // anonymous callers.
  if (!(await getAdminFromCookies())) {
    return { title: 'Preview Not Found | LMSY', robots: { index: false, follow: false } };
  }

  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  const project = await resolveProject(supabaseAdmin, id);

  if (!project || !isPublicProject(project)) {
    return {
      title: 'Preview Not Found | LMSY',
    };
  }

  return {
    title: `${project.title} | LMSY Preview`,
    description: project?.description || `Preview of ${project.title}`,
    robots: { index: false, follow: false },
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A project URL may carry the stable slug or the raw uuid. Both resolve to the
 * same row, so links written before the phase-7 slug migration keep working
 * and new links stay readable.
 */
async function resolveProject(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  key: string
) {
  const bySlug = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('slug', key)
    .maybeSingle();

  if (bySlug.data) return bySlug.data;

  if (!UUID_PATTERN.test(key)) return null;

  const byId = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', key)
    .maybeSingle();

  return byId.data ?? null;
}

export default async function ProjectPage({ params }: PageProps) {
  // Server-side admin gate (fail-closed): anonymous / non-admin requests 404
  // before any service-role read, closing the hole the client-only admin
  // layout left open.
  if (!(await getAdminFromCookies())) {
    notFound();
  }

  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  const sortProjectImages = (items: ProjectGalleryImage[]) => {
    return [...items].sort((a, b) => {
      const aCoverRank = a.is_cover || a.catalog_id?.endsWith('-000') ? 0 : 1;
      const bCoverRank = b.is_cover || b.catalog_id?.endsWith('-000') ? 0 : 1;
      if (aCoverRank !== bCoverRank) {
        return aCoverRank - bCoverRank;
      }

      const seqA = typeof a.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER;
      const seqB = typeof b.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) {
        return seqA - seqB;
      }

      const catalogA = a.catalog_id || '';
      const catalogB = b.catalog_id || '';
      if (catalogA && catalogB && catalogA !== catalogB) {
        return catalogA.localeCompare(catalogB);
      }

      return (a.created_at || '').localeCompare(b.created_at || '');
    });
  };

  // Fetch project details.
  // Public visibility (see lib/project-visibility.ts): visitor-facing only
  // when the admin opted the project in via portal_visible, it is not
  // archived, and it is not an ingestion container.
  const project = await resolveProject(supabaseAdmin, id);

  if (!project || !isPublicProject(project)) {
    notFound();
  }

  // No category-specific redirect any more. Door 1 used to bounce here so a
  // series kept one URL; that rule belongs to the public doors now, and a
  // preview that jumps somewhere else is not a preview.

  // Fetch gallery images for this project
  const { data: galleryImages } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select(PROJECT_GALLERY_COLUMNS)
    .eq('project_id', project.id)
    .order('created_at', { ascending: true });

  const sortedGalleryImages = sortProjectImages(galleryImages || []);

  // A theme project has no single event date, so its header is dated by the
  // span its images cover. Derived from the assets already fetched above - the
  // curator never types a range that could drift away from the photos.
  const spanRecord = aggregateProjectSpans(
    sortedGalleryImages.map((image) => ({
      project_id: project.id,
      event_date: image.event_date,
    }))
  );
  const dateSpan = spanRecord[project.id] ?? null;

  const coverRotation =
    sortedGalleryImages.find((img) => img.image_url === project.cover_url)?.rotation
    ?? sortedGalleryImages.find((img) => img.is_cover)?.rotation
    ?? sortedGalleryImages.find((img) => img.catalog_id?.endsWith('-000'))?.rotation
    ?? 0;

  // Group images by category
  const groupedImages = {
    all: sortedGalleryImages,
    official_stills: sortedGalleryImages.filter(img => !img.category_tag || img.category_tag === 'official_stills'),
    bts: sortedGalleryImages.filter(img => img.category_tag === 'bts'),
    press_events: sortedGalleryImages.filter(img => img.category_tag === 'press_events'),
  };

  // "More in this category" (phase-4 Task 4): same category, different project,
  // public visibility rule applied, hidden when empty. Covers follow the same
  // is_cover / -000-catalog / first-asset rule as the projects list.
  const { data: relatedRows } = await applyPublicProjectFilter(
    supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, category, event_date, release_date')
  )
    .neq('id', project.id)
    .eq('category', project.category)
    .order('event_date', { ascending: false, nullsFirst: false })
    .limit(6);

  let relatedProjects: Array<{
    id: string;
    slug: string | null;
    title: string;
    title_i18n: LocalizedText | null;
    event_date: string | null;
    release_date: string | null;
    cover?: string | null;
    category: string;
  }> = [];

  const related = relatedRows || [];
  if (related.length > 0) {
    const { data: relatedAssets } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id, image_url, is_cover, catalog_id')
      .in('project_id', related.map((r) => r.id))
      .order('created_at', { ascending: true, nullsFirst: false });
    const covers = pickCoversByProject(relatedAssets || []);
    relatedProjects = related.map((r) => ({
      id: r.id,
      slug: (r.slug as string | null) ?? null,
      title: r.title,
      title_i18n: (r.title_i18n ?? null) as LocalizedText | null,
      event_date: (r.event_date as string | null) ?? null,
      release_date: r.release_date,
      cover: covers[r.id] ?? null,
      category: r.category as string,
    }));
  }

  // Relations added in phase 7: who appears in this project, and which work
  // (series / film) it belongs to. Both are optional - a magazine shoot has no
  // work, and a project whose cast is not confirmed yet has no people.
  const { data: peopleLinks } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('project_people')
    .select('role, profile_id')
    .eq('project_id', project.id);

  const roleByProfile: Record<string, string> = {};
  for (const link of peopleLinks ?? []) {
    const row = link as { role: string; profile_id: string };
    roleByProfile[row.profile_id] = row.role;
  }

  const peopleIds = Object.keys(roleByProfile);
  const { data: peopleRows } = peopleIds.length
    ? await supabaseAdmin
        .schema('lmsy_archive')
        .from('profiles')
        .select('id, name, nickname, slug, avatar_url, role_label')
        .in('id', peopleIds)
    : { data: [] as unknown[] };

  // Two plain queries instead of an embedded select: the relations are small
  // and this keeps the shape identical to what /people reads.
  const people = (peopleRows ?? []).map((row) => ({
    ...(row as {
      id: string;
      name: string;
      nickname: string | null;
      slug: string | null;
      role_label: string | null;
    }),
    role: roleByProfile[(row as { id: string }).id] ?? 'subject',
  }));

  let work: { id: string; title: string; title_i18n: unknown; year: number | null } | null = null;
  if (project.work_id) {
    const { data: workRow } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('works')
      .select('id, title, title_i18n, year')
      .eq('id', project.work_id)
      .maybeSingle();
    work = (workRow as typeof work) ?? null;
  }

  return (
    <ProjectDetailClient
      project={{ ...project, cover_rotation: coverRotation, people, work }}
      images={groupedImages}
      dateSpan={dateSpan}
      relatedProjects={relatedProjects}
    />
  );
}
