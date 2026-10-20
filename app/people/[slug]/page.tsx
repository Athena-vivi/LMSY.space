import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { pickCoversByProject } from '@/lib/project-covers';
import { entryPath } from '@/lib/entry-path';
import { loadSeriesSlugMap } from '@/lib/series-slugs';
import PersonClient, { type PersonProject } from './person-client';

export const revalidate = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  // Accept both the stable slug and the raw uuid, so nothing that worked
  // before the phase-7 rename stops working now.
  const bySlug = await supabase
    .schema('lmsy_archive')
    .from('profiles')
    .select('id, name, nickname, slug, avatar_url, role_label, bio, bio_i18n, birthday, ig_handle, x_handle')
    .eq('slug', slug)
    .maybeSingle();

  let profile = bySlug.data;

  if (!profile && UUID.test(slug)) {
    const byId = await supabase
      .schema('lmsy_archive')
      .from('profiles')
      .select('id, name, nickname, slug, avatar_url, role_label, bio, bio_i18n, birthday, ig_handle, x_handle')
      .eq('id', slug)
      .maybeSingle();
    profile = byId.data;
  }

  if (!profile) notFound();

  const row = profile as { id: string };
  const { data: links } = await supabase
    .schema('lmsy_archive')
    .from('project_people')
    .select('project_id, role')
    .eq('profile_id', row.id);

  const linkedIds = (links ?? []).map((link) => (link as { project_id: string }).project_id);

  let projects: PersonProject[] = [];

  if (linkedIds.length > 0) {
    const { data: projectRows } = await applyPublicProjectFilter(
      supabase
        .schema('lmsy_archive')
        .from('projects')
        .select('id, slug, title, title_i18n, category, subtype, project_kind, work_id, event_date, cover_url')
        .in('id', linkedIds)
    )
      .order('event_date', { ascending: false, nullsFirst: false });

    const rows = (projectRows ?? []) as unknown as Array<{
      id: string;
      slug: string | null;
      title: string;
      title_i18n: unknown;
      category: string | null;
      subtype: string | null;
      project_kind: string | null;
      work_id: string | null;
      event_date: string | null;
      cover_url: string | null;
    }>;

    const { data: assets } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id, image_url, is_cover, catalog_id')
      .in('project_id', rows.map((project) => project.id))
      .order('is_cover', { ascending: false })
      .order('created_at', { ascending: true, nullsFirst: false });

    const covers = pickCoversByProject(assets ?? []);
    // A drama entry is addressed under its series, so the map is resolved
    // here, once, and every card receives its own address.
    const seriesSlugs = await loadSeriesSlugMap();

    projects = rows.map((project) => ({
      ...project,
      cover: covers[project.id] || project.cover_url || null,
      href: entryPath(project, seriesSlugs),
    }));
  }

  return <PersonClient profile={profile as never} projects={projects} />;
}
