/**
 * POST /api/admin/drafts/batch-publish - Batch publish draft items
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids array is required' },
        { status: 400 }
      );
    }

    console.log('[DRAFTS_API] Batch publishing:', ids.length, 'items');

    // Batch update status to 'published'
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select('id');

    if (error) {
      console.error('[DRAFTS_API] Batch publish error:', error);
      return apiServerError('admin/drafts/batch-publish POST', error);
    }

    const published = data?.length || 0;

    console.log('[DRAFTS_API] Batch published:', published, 'items');

    return NextResponse.json({
      success: true,
      published,
      message: `Successfully published ${published} items`,
    });
  } catch (error) {
    console.error('[DRAFTS_API] Batch publish unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
