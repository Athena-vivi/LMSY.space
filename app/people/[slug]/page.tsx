import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabasePublic } from '@/lib/data/client';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { routeLanguage } from '@/lib/i18n-path';
import { pickCoversByProject } from '@/lib/project-covers';
import { entryPath } from '@/lib/entry-path';
import { loadSeriesSlugMap } from '@/lib/series-slugs';
import { listPersonProjects } from '@/lib/data/projects';
import { listCoverCandidates } from '@/lib/data/gallery-assets';
import PersonClient, { type PersonProject } from './person-client';

export const revalidate = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang?: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang = routeLanguage(rawLang);
  const door = getTranslation(lang, 'people.title');
  const supabase = getSupabasePublic();

  // The page also resolves raw uuids; metadata only needs the slug lookup —
  // a uuid hit falls back to the generic People title.
  const { data } = await supabase
    .schema('lmsy_archive')
    .from('profiles')
    .select('name, nickname')
    .eq('slug', slug)
    .maybeSingle();

  const profile = data as { name: string; nickname: string | null } | null;

  if (!profile) {
    return pageMetadata({
      title: door,
      description:
        lang === 'en'
          ? 'The two people this archive is built around.'
          : getTranslation(lang, 'people.description'),
      path: `/people/${slug}`,
      lang,
    });
  }

  const suffix = profile.nickname && profile.nickname !== profile.name ? ` (${profile.nickname})` : '';

  return pageMetadata({
    title: `${profile.name}${suffix}`,
    description:
      lang === 'en'
        ? `Projects, appearances and records for ${profile.name}${suffix} in the archive.`
        : `${profile.name}${suffix} · ${getTranslation(lang, 'people.description')}`,
    path: `/people/${slug}`,
    lang,
  });
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ lang?: string; slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabasePublic();

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
    const projectRows = await listPersonProjects(supabase, linkedIds);

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

    const assets = await listCoverCandidates(supabase, rows.map((project) => project.id));

    const covers = pickCoversByProject(assets);
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
