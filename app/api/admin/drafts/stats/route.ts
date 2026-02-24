/**
 * GET /api/admin/drafts/stats - Get draft statistics for sidebar badge
 *
 * Returns pending draft count for sidebar badge
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Count pending drafts (status = 'draft' or 'ready')
    const { count, error } = await supabaseAdmin
      .from('draft_items')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'ready']);

    if (error) {
      console.error('[DRAFTS_STATS] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingCount: count || 0,
    });
  } catch (error) {
    console.error('[DRAFTS_STATS] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
