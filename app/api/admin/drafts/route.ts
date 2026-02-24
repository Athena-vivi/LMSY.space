/**
 * GET /api/admin/drafts - Get draft items with filtering
 * DELETE /api/admin/drafts - Batch delete draft items (with R2 cleanup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2-client';

// =====================================================
// GET - Fetch draft items with optional filtering
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mediaType = searchParams.get('media_type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[DRAFTS_API] Fetching with filters:', { status, mediaType, limit, offset });

    let query = supabaseAdmin
      .from('draft_items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (mediaType && mediaType !== 'all') {
      query = query.eq('media_type', mediaType);
    }

    // Exclude archived and rejected by default
    query = query.not('status', 'in', '("archived", "rejected")');

    const { data, error, count } = await query;

    if (error) {
      console.error('[DRAFTS_API] Fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('[DRAFTS_API] Retrieved:', data?.length || 0, 'items');

    return NextResponse.json({
      success: true,
      data: data || [],
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[DRAFTS_API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Batch delete draft items (with R2 cleanup)
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids array is required' },
        { status: 400 }
      );
    }

    console.log('[DRAFTS_API] Batch delete:', ids.length, 'items');

    // First, fetch the items to get their R2 keys
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('draft_items')
      .select('id, r2_key')
      .in('id', ids);

    if (fetchError) {
      console.error('[DRAFTS_API] Fetch for delete error:', fetchError);
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No items found to delete',
      });
    }

    // Delete from R2 (parallel, ignore errors)
    const r2DeletePromises = items
      .filter(item => item.r2_key)
      .map(item => deleteFromR2(item.r2_key!));

    await Promise.allSettled(r2DeletePromises);

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('draft_items')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('[DRAFTS_API] Database delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[DRAFTS_API] Deleted:', items.length, 'items');

    return NextResponse.json({
      success: true,
      deleted: items.length,
      message: `Successfully deleted ${items.length} items`,
    });
  } catch (error) {
    console.error('[DRAFTS_API] Delete unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
