import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('site_content_blocks')
      .select('block_key, content_i18n, image_url, updated_at')
      .eq('is_active', true);

    if (key) {
      query = query.eq('block_key', key);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (key) {
      const block = data?.[0] || null;
      return NextResponse.json({
        success: true,
        block,
      });
    }

    return NextResponse.json({
      success: true,
      blocks: data || [],
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
