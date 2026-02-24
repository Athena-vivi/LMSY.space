/**
 * PATCH /api/admin/drafts/[id] - Update a draft item
 * DELETE /api/admin/drafts/[id] - Delete a single draft item (with R2 cleanup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2-client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =====================================================
// PATCH - Update a draft item
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('[DRAFTS_API] Updating item:', id);

    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DRAFTS_API] Update error:', error);
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

    console.log('[DRAFTS_API] Updated successfully:', id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[DRAFTS_API] Update unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete a single draft item (with R2 cleanup)
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    console.log('[DRAFTS_API] Deleting item:', id);

    // First, fetch the item to get its R2 key
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('draft_items')
      .select('id, r2_key')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[DRAFTS_API] Fetch for delete error:', fetchError);
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Draft item not found' },
        { status: 404 }
      );
    }

    // Delete from R2 if key exists
    if (item.r2_key) {
      await deleteFromR2(item.r2_key);
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('draft_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DRAFTS_API] Database delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[DRAFTS_API] Deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Draft item deleted successfully',
    });
  } catch (error) {
    console.error('[DRAFTS_API] Delete unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
