import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { sanitizeSearchTerm, MIN_SEARCH_TERM_LENGTH } from '@/lib/search-term';
import {
  buildSearchResults,
  type GalleryRow,
  type ProjectRow,
} from '@/lib/search-results';
import { seriesSlugMapFrom } from '@/lib/entry-path';
import type { Language } from '@/lib/languages';

/**
 * GET /api/search?q=&lang=
 *
 * Contract: docs/architecture/20261017-search-contract.md, updated for the
 * phase-7 model:
 *   - one visibility gate for projects and images;
 *   - project matches come from title, description, the stable category value
 *     and `search_aliases` (Thai / Chinese / short names);
 *   - a person match expands to the projects that person is linked to, so
 *     typing "Lookmhee" surfaces her work rather than nothing;
 *   - canonical hrefs: whatever door owns the row (a homepage entry resolves
 *     to /dramas/<series>/<entry>, /editorial/<issue>, /live-events/...,
 *     /appearances/... or /commercial/...); images stay at
 *     /gallery#<asset uuid>. There is no /projects namespace since 2026-10-21.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') ?? '';
  const langParam = searchParams.get('lang');
  const lang: Language = langParam === 'zh' || langParam === 'th' ? langParam : 'en';
  const searchTerm = sanitizeSearchTerm(query);

  if (searchTerm.length < MIN_SEARCH_TERM_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Public project set - the same gate as every other surface. It drives
    //    the asset filter and the per-category counts for category entries.
    const { data: publicProjects, error: idsError } = await applyPublicProjectFilter(
      supabase
        .schema('lmsy_archive')
        .from('projects')
        .select('id, slug, title, description, category, subtype, project_kind, work_id, event_date, release_date')
    );
    const publicRows = (publicProjects ?? []) as unknown as ProjectRow[];
    const publicIds = publicRows.map((row) => row.id);
    const publicById = new Map(publicRows.map((row) => [row.id, row]));

    const categoryCounts: Record<string, number> = {};
    for (const row of publicRows) {
      if (row.category) categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
    }

    // 2. Image candidates (DB-level ILIKE prefilter). Values are double-quoted
    //    so a term containing spaces cannot break the PostgREST or-grammar.
    const galleryOr = `caption.ilike."%${searchTerm}%",tag.ilike."%${searchTerm}%",catalog_id.ilike."%${searchTerm}%"`;

    async function fetchGalleryCandidates(): Promise<GalleryRow[]> {
      if (idsError || publicIds.length === 0) return [];
      const { data, error } = await supabase
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id, caption, tag, catalog_id, image_url, event_date, project_id')
        .in('project_id', publicIds)
        .or(galleryOr)
        .order('id', { ascending: true })
        .limit(100);
      if (error) {
        console.error('[SEARCH] gallery_assets lookup failed:', error);
        return [];
      }
      return (data ?? []) as unknown as GalleryRow[];
    }

    // 3. Project candidates: title / description / category / aliases.
    const projectQuery = applyPublicProjectFilter(
      supabase
        .schema('lmsy_archive')
        .from('projects')
        .select('id, slug, title, description, category, subtype, project_kind, work_id, event_date, release_date, search_aliases')
        .in('id', publicIds)
    )
      .or(
        `title.ilike."%${searchTerm}%",description.ilike."%${searchTerm}%",category.ilike."%${searchTerm}%",search_aliases.cs."{${searchTerm}}"`
      )
      .order('id', { ascending: true })
      .limit(50);

    // 4. People: a name match expands to their linked projects.
    const profileQuery = supabase
      .schema('lmsy_archive')
      .from('profiles')
      .select('id, name, nickname, slug')
      .or(`name.ilike."%${searchTerm}%",nickname.ilike."%${searchTerm}%"`)
      .limit(10);

    const [galleryRows, projectRes, profileRes] = await Promise.all([
      fetchGalleryCandidates(),
      publicIds.length > 0 ? projectQuery : Promise.resolve({ data: [], error: null }),
      profileQuery,
    ]);

    if (projectRes.error) throw projectRes.error;

    // Expand people matches into project rows so the result list answers
    // "what do they appear in", not "here is a name".
    let peopleProjectRows: ProjectRow[] = [];
    const matchedProfiles = (profileRes?.data ?? []) as Array<{ id: string }>;
    if (matchedProfiles.length > 0) {
      const { data: links } = await supabase
        .schema('lmsy_archive')
        .from('project_people')
        .select('project_id')
        .in('profile_id', matchedProfiles.map((profile) => profile.id));

      peopleProjectRows = (links ?? [])
        .map((link) => publicById.get((link as { project_id: string }).project_id))
        .filter((row): row is ProjectRow => Boolean(row));
    }

    // 5. Contract mapping, ranking, dedup and caps live in the pure module.
    //    Door 1 addresses an entry under its series, so the series slugs come
    //    from the same public set - no extra round-trip.
    const results = buildSearchResults({
      term: searchTerm,
      projectRows: [
        ...((projectRes.data ?? []) as unknown as ProjectRow[]),
        ...peopleProjectRows,
      ],
      galleryRows,
      categoryCounts,
      lang,
      seriesSlugs: seriesSlugMapFrom(publicRows),
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [], error: 'search_failed' }, { status: 500 });
  }
}
