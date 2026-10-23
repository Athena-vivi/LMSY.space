import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import {
  listActiveSiteContentBlocks,
  upsertSiteContentBlock,
} from '@/lib/data/site-content';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const supabaseAdmin = getSupabaseAdmin();
    const blocks = await listActiveSiteContentBlocks(supabaseAdmin, '*', key ?? undefined);

    return NextResponse.json({
      success: true,
      block: key ? (blocks[0] ?? null) : null,
      blocks: key ? undefined : blocks,
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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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
    const block = await upsertSiteContentBlock(supabaseAdmin, {
      block_key,
      content_i18n,
      image_url,
      is_active,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      block,
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
