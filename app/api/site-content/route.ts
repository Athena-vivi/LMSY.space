import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listActiveSiteContentBlocks } from '@/lib/data/site-content';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const supabaseAdmin = getSupabaseAdmin();
    const blocks = await listActiveSiteContentBlocks(
      supabaseAdmin,
      'block_key, content_i18n, image_url, updated_at',
      key ?? undefined
    );

    if (key) {
      const block = blocks[0] ?? null;
      return NextResponse.json({
        success: true,
        block,
      });
    }

    return NextResponse.json({
      success: true,
      blocks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
