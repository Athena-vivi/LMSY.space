/**
 * GET /api/admin/drafts/stats - Get draft statistics for sidebar badge
 *
 * Returns pending draft count for sidebar badge
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import { countDraftItems } from '@/lib/data/drafts';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    // Count all drafts
    const count = await countDraftItems(supabaseAdmin);

    return NextResponse.json({
      success: true,
      pendingCount: count,
    });
  } catch (error) {
    console.error('[DRAFTS_STATS] Error:', error);
    return apiServerError('admin/drafts/stats GET', error);
  }
}
