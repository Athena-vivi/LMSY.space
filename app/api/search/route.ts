import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import {
  sanitizeSearchTerm,
  MIN_SEARCH_TERM_LENGTH,
} from '@/lib/search-term';
import {
  buildSearchResults,
  type GalleryRow,
  type ProjectRow,
} from '@/lib/search-results';
import type { Language } from '@/lib/languages';

// Phase 5 rebuild (contract: docs/architecture/20261017-search-contract.md).
// History: remediation B2-T3 (audit P1-5) moved this route from the empty
// `gallery` table to gallery_assets + projects and sanitized the term against
// the .or() filter grammar. Phase 5 adds:
//   1. the shared public-visibility gate for images too - gallery_assets rows
//      are constrained with .in('project_id', <visible ids>) exactly like the
//      /gallery page (fixes acceptance finding P5-1: hidden containers'
//      radar photos could previously surface here);
//   2. a unified result contract (type/id/title/href/...), ranked in the pure
//      lib/search-results.ts module: exact > prefix > contains > metadata,
//      stable tiebreaks, no fabricated placeholder titles;
//   3. exhibition category entries backed by real per-category counts;
//   4. canonical hrefs everywhere (editorial -> /editorial/[id]).

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') ?? '';
  const langParam = searchParams.get('lang');
  const lang: Language =
    langParam === 'zh' || langParam === 'th' ? langParam : 'en';
  const searchTerm = sanitizeSearchTerm(query);

  if (searchTerm.length < MIN_SEARCH_TERM_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Public project id set - the same gate as every other surface. It
    //    drives the asset filter AND yields the real per-category counts for
    //    exhibition entries. Failure here fails closed for gallery results.
    const { data: publicProjects, error: idsError } = await applyPublicProjectFilter(
      supabase.schema('lmsy_archive').from('projects').select('id, category')
    );
    const publicRows = (publicProjects ?? []) as Array<{ id: string; category?: string | null }>;
    const publicIds = publicRows.map((row) => row.id);

    const categoryCounts: Record<string, number> = {};
    for (const row of publicRows) {
      const category = row.category;
      if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }

    // 2. Candidate pools (DB-level ILIKE prefilter). Values are double-quoted
    //    so a term containing spaces cannot break the PostgREST or-grammar;
    //    the sanitizer already stripped the grammar characters.
    const galleryOr = `caption.ilike."%${searchTerm}%",tag.ilike."%${searchTerm}%",catalog_id.ilike."%${searchTerm}%"`;

    // Fail-closed: unknown/empty id set -> no image results, never "all".
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

    // Only visitor-facing projects are searchable (see
    // lib/project-visibility.ts): back-end containers such as ingestion
    // batches or the MILESTONES_ARCHIVE collector must not leak through
    // search results.
    const projectQuery = applyPublicProjectFilter(
      supabase.schema('lmsy_archive').from('projects').select('id, title, description, category, release_date')
    )
      .or(`title.ilike."%${searchTerm}%",description.ilike."%${searchTerm}%",category.ilike."%${searchTerm}%"`)
      .order('id', { ascending: true })
      .limit(50);

    const [galleryRows, projectRes] = await Promise.all([
      fetchGalleryCandidates(),
      projectQuery,
    ]);

    // Projects lookup failing is a hard error; images failing just yields
    // no image results (fail-closed above).
    if (projectRes.error) throw projectRes.error;

    // 3. Contract mapping, ranking, dedup and caps live in the pure module.
    const results = buildSearchResults({
      term: searchTerm,
      projectRows: (projectRes.data ?? []) as unknown as ProjectRow[],
      galleryRows,
      categoryCounts,
      lang,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { results: [], error: 'search_failed' },
      { status: 500 }
    );
  }
}
