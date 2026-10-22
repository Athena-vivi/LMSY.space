import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAdminEmail } from '@/lib/security/api-auth';

function slugifyAscii(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/admin/projects - create an event from the promote wizard.
 *
 * Minimal on purpose: title + date + category (+ subtype for live events).
 * The slug gets the same <YYYYMMDD>-<name> shape the existing entries use;
 * the wizard files pictures into the new project right away, so it starts
 * portal-visible unless the curator unticks that.
 */
export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json({ error: 'Unauthorized', details: authResult.error }, { status: 401 });
  }

  const adminEmail = getAdminEmail();
  if (authResult.user.email?.toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as {
      title?: string;
      category?: string;
      subtype?: string;
      event_date?: string;
      portal_visible?: boolean;
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

    // Slug: <YYYYMMDD>-<ascii-title>, deduped with a numeric suffix.
    const compact = eventDate.replace(/-/g, '');
    const base = `${compact}-${slugifyAscii(title) || 'event'}`;
    let slug = base;
    for (let i = 2; ; i++) {
      const { data: taken } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${i}`;
    }

    const { data: project, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .insert({
        title,
        category,
        subtype: body.subtype?.trim() || null,
        event_date: eventDate,
        slug,
        curation_status: 'draft',
        portal_visible: body.portal_visible !== false,
        portal_priority: 0,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
  if (authResult.user.email?.toLowerCase() !== adminEmail) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .order('release_date', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projects: data || [],
      count: data?.length || 0,
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
