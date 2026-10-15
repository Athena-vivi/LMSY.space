/**
 * POST /api/admin/drafts/[id]/unpublish - Unpublish a single draft item
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    console.log('[DRAFTS_API] Unpublishing item:', id);

    // Update status back to 'draft' and clear published_at
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .update({
        status: 'draft',
        published_at: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DRAFTS_API] Unpublish error:', error);
      return apiServerError('admin/drafts/[id]/unpublish POST', error);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Draft item not found' },
        { status: 404 }
      );
    }

    console.log('[DRAFTS_API] Unpublished successfully:', id);

    return NextResponse.json({
      success: true,
      data,
      message: 'Draft item unpublished successfully',
    });
  } catch (error) {
    console.error('[DRAFTS_API] Unpublish unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
