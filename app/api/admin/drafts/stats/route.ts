/**
 * GET /api/admin/drafts/stats - Get draft statistics for sidebar badge
 *
 * Returns pending draft count for sidebar badge
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    // Count all drafts
    const { count, error } = await supabaseAdmin
      .from('draft_items')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[DRAFTS_STATS] Error:', error);
      return apiServerError('admin/drafts/stats GET', error);
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
