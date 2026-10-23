import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { createProject, listAllProjectsByReleaseDate, updateProject } from '@/lib/data/projects';

/**
 * POST /api/admin/projects - create an event from the promote wizard.
 *
 * Minimal on purpose: title + date + category (+ subtype and city for live
 * events). The slug gets the same <YYYYMMDD>-<name> shape the existing
 * entries use; the wizard files pictures into the new project right away,
 * so it starts portal-visible unless the curator unticks that.
 *
 * P1-3 Phase 2: slug dedup + insert moved to lib/data/projects.ts
 * (createProject); this route is validation, auth and response shaping.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as {
      title?: string;
      category?: string;
      subtype?: string;
      event_date?: string;
      portal_visible?: boolean;
      /** Structured city, picked in the wizard; feeds the subject code. */
      city?: string | null;
      /**
       * Who the event belongs to: 'LMSY' (duo, the default) or 'LM' / 'SY'
       * for a single-person booking, which becomes a tail code on the id.
       */
      person?: string | null;
      /** Drama events hang off a work (series row) through this id. */
      work_id?: string | null;
    };

    const title = body.title?.trim();
    const category = body.category?.trim();
    const eventDate = body.event_date?.trim();
    if (!title || !category || !eventDate) {
      return NextResponse.json(
        { error: 'title, category and event_date are required' },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return NextResponse.json({ error: 'event_date must be YYYY-MM-DD' }, { status: 400 });
    }

    let project;
    try {
      project = await createProject(supabaseAdmin, {
        title,
        category,
        subtype: body.subtype?.trim() || null,
        eventDate,
        city: body.city?.trim() || null,
        portalVisible: body.portal_visible !== false,
        workId: body.work_id?.trim() || null,
      });
    } catch (error) {
      // The repository throws on an insert error; the old route answered
      // this exact branch with 'Failed to create project'.
      return NextResponse.json(
        {
          error: 'Failed to create project',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    // createProject keeps its minimal field list; the person is written right
    // after so a single-person event gets its tail code from the start. The
    // table default is LMSY, so a duo event needs no extra round trip.
    const person = body.person?.trim().toUpperCase();
    if (person === 'LM' || person === 'SY') {
      const [patched] = await updateProject(supabaseAdmin, project.id, { person });
      if (patched) project = patched;
    }

    revalidateContentSurfaces();

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // P1-3 Phase 2: the list moved to lib/data/projects.ts. Ordering is
    // verbatim - PostgREST sorts DESC NULLs FIRST by default and 136 of the
    // 183 rows have no release_date, so "nulls last" would reshuffle it.
    let projects;
    try {
      projects = await listAllProjectsByReleaseDate(supabaseAdmin);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch projects',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
