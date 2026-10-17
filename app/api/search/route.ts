import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import {
  sanitizeSearchTerm,
  MIN_SEARCH_TERM_LENGTH,
} from '@/lib/search-term';

// Remediation B2-T3 (audit P1-5). This route previously queried the empty
// `gallery` table and the non-existent `schedule` table, and interpolated the
// raw search term into `.or()` filter syntax, so a term containing `,` `(` or
// wildcards could break (or abuse) the filter. It now:
//   1. searches gallery_assets (the table that actually holds 330 published
//      images) and projects;
//   2. sanitizes the term against the `.or()` syntax before building filters,
//      so no caller input reaches the filter grammar (see lib/search-term.ts).

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') ?? '';
  const searchTerm = sanitizeSearchTerm(query);

  if (searchTerm.length < MIN_SEARCH_TERM_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Search published images (gallery_assets) and projects. The `schedule`
    // branch is gone: that table does not exist in the database.
    const [galleryResults, projectResults] = await Promise.all([
      supabase
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('*')
        .or(`caption.ilike.%${searchTerm}%,tag.ilike.%${searchTerm}%`)
        .limit(10),

      // Only visitor-facing projects are searchable (see
      // lib/project-visibility.ts): back-end containers such as ingestion
      // batches or the MILESTONES_ARCHIVE collector must not leak through
      // search results.
      applyPublicProjectFilter(
        supabase
          .schema('lmsy_archive')
          .from('projects')
          .select('*')
      )
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .limit(5),
    ]);

    // Format results
    const results = [
      ...(galleryResults.data || []).map(item => ({
        id: `gallery-${item.id}`,
        type: 'gallery' as const,
        title: item.caption || 'Untitled',
        description: item.tag ? `#${item.tag}` : undefined,
        subtitle: item.tag || undefined,
        url: `/gallery#${item.id}`,
      })),

      ...(projectResults.data || []).map(item => ({
        id: `project-${item.id}`,
        type: 'project' as const,
        title: item.title,
        description: item.description,
        subtitle: `${item.category} • ${item.release_date ? new Date(item.release_date).getFullYear() : 'TBD'}`,
        // Canonical detail entry (phase-4 batch 2): editorial works land on
        // /editorial/[id]; every other category stays on /projects/[id].
        url: item.category === 'editorial' ? `/editorial/${item.id}` : `/projects/${item.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
