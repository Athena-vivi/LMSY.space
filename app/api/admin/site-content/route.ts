import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function ensureAdminEmail(email: string | undefined | null) {
  return email && email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  if (!ensureAdminEmail(authResult.user.email)) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('site_content_blocks')
      .select('*');

    if (key) {
      query = query.eq('block_key', key);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch site content', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      block: key ? (data?.[0] || null) : null,
      blocks: key ? undefined : (data || []),
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

export async function PUT(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  if (!ensureAdminEmail(authResult.user.email)) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { block_key, content_i18n, image_url = null, is_active = true } = body;

    if (!block_key || !content_i18n) {
      return NextResponse.json(
        { error: 'block_key and content_i18n are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('site_content_blocks')
      .upsert(
        {
          block_key,
          content_i18n,
          image_url,
          is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'block_key' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save site content', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      block: data,
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
