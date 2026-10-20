import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPublicProject } from '@/lib/project-visibility';
import { DramaDetailClient, type DramaDetailEvent, type DramaDetailAsset } from './drama-detail-client';

/**
 * /dramas/[slug] - one series, every dated entry under it.
 *
 * The SEO surface of door 1: three of these pages exist (one per series), each
 * server-rendered with its own title and description. The old address
 * /projects/[slug] for a drama_work row redirects here, so there is exactly
 * one canonical URL per series.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveDrama(slug: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select(
      'id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url, curation_status, portal_visible'
    )
    .eq('category', 'drama_work')
    .eq('slug', slug)
    .maybeSingle();

  if (data) return data;
  if (!UUID_PATTERN.test(slug)) return null;

  const { data: byId } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select(
      'id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url, curation_status, portal_visible'
    )
    .eq('category', 'drama_work')
    .eq('id', slug)
    .maybeSingle();

  return byId ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const drama = await resolveDrama(slug);

  if (!drama || !isPublicProject(drama)) {
    return { title: 'Series Not Found | LMSY' };
  }

  const title = drama.title_i18n?.en || drama.title;
  return {
    title: `${title} | LMSY Official Fan Site`,
    description: drama.description || `Everything archived under ${title}.`,
  };
}

export default async function DramaPage({ params }: PageProps) {
  const { slug } = await params;
  const supabaseAdmin = getSupabaseAdmin();
  const drama = await resolveDrama(slug);

  if (!drama || !isPublicProject(drama)) {
    notFound();
  }

  const [{ data: events }, { data: assets }] = await Promise.all([
    supabaseAdmin
      .schema('lmsy_archive')
      .from('drama_events')
      .select(
        'project_id, group_key, slug, title, event_date, description, source_url, result, sort_order'
      )
      .eq('project_id', drama.id),
    supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, caption, catalog_id, rotation, event_date')
      .eq('project_id', drama.id)
      .order('created_at', { ascending: true }),
  ]);

  return (
    <DramaDetailClient
      drama={drama as unknown as ComponentProps<typeof DramaDetailClient>['drama']}
      events={(events ?? []) as unknown as DramaDetailEvent[]}
      assets={(assets ?? []) as unknown as DramaDetailAsset[]}
    />
  );
}
