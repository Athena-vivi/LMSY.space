import type { Metadata } from 'next';
import { getSupabasePublic } from '@/lib/data/client';
import type { GalleryItem } from '@/lib/supabase/types';
import {
  fetchGalleryPage,
  fetchProjectRefs,
  fetchPublicProjectIds,
  PAGE_SIZE,
  type ProjectRef,
} from '@/lib/gallery-data';
import { pageMetadata } from '@/lib/seo';
import GalleryClient from './gallery-client';

/**
 * /gallery — SSR first screen.
 *
 * This page used to be a 'use client' shell that queried Supabase in the
 * browser, so the SSR HTML held one logo image and nothing else — the entire
 * gallery was invisible to search engines. The first page of results is now
 * fetched on the server (same visibility rule, same query logic from
 * lib/gallery-data.ts) and handed to the client component as props; tag
 * switching and load-more stay client-side.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Gallery',
  description:
    'Every photo in the archive — magazine editorials, advertising, stage and stills — browsable and filterable by tag.',
  path: '/gallery',
});

export default async function GalleryPage() {
  const sb = getSupabasePublic();

  let images: GalleryItem[] = [];
  let projectMap: Record<string, ProjectRef> = {};
  let hasMore = false;

  const projectIds = await fetchPublicProjectIds(sb);
  if (projectIds.length > 0) {
    const { rows, failed } = await fetchGalleryPage(sb, 0, 'All', projectIds);
    images = rows;
    hasMore = !failed && rows.length === PAGE_SIZE;
    projectMap = await fetchProjectRefs(
      sb,
      rows
        .map((row) => row.project_id)
        .filter((id): id is string => Boolean(id))
    );
  }

  return (
    <GalleryClient
      initialImages={images}
      initialProjectMap={projectMap}
      initialHasMore={hasMore}
      projectIds={projectIds}
    />
  );
}
