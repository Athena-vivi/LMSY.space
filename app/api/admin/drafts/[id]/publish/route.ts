/**
 * POST /api/admin/drafts/[id]/publish - Publish a single draft item
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    console.log('[DRAFTS_API] Publishing item:', id);

    // Update status to 'published' and set published_at
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DRAFTS_API] Publish error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Draft item not found' },
        { status: 404 }
      );
    }

    console.log('[DRAFTS_API] Published successfully:', id);

    return NextResponse.json({
      success: true,
      data,
      message: 'Draft item published successfully',
    });
  } catch (error) {
    console.error('[DRAFTS_API] Publish unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
