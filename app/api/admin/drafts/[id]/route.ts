/**
 * GET /api/admin/drafts/[id] - Fetch a single draft item
 * PATCH /api/admin/drafts/[id] - Update a draft item
 * DELETE /api/admin/drafts/[id] - Delete a single draft item (with R2 cleanup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2-client';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import {
  loadReferenceIndex,
  planDraftObjectDeletion,
  collectR2Failures,
  type ObjectPlan,
} from '@/lib/draft-delete-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =====================================================
// GET - Fetch a draft item
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return apiServerError('admin/drafts/[id] GET', error);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Draft item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Update a draft item
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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
      return apiServerError('admin/drafts/[id] PATCH', error);
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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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
      return apiServerError('admin/drafts/[id] DELETE', fetchError);
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Draft item not found' },
        { status: 404 }
      );
    }

    // Guard (B2-T1 / audit P1-4): never delete an R2 object that published
    // content still references. Fail closed if references cannot be loaded.
    let plans: ObjectPlan[];
    try {
      const { index, siteContentBlocks } = await loadReferenceIndex(supabaseAdmin, [id]);
      plans = planDraftObjectDeletion(
        [{ id: item.id, r2Key: item.r2_key }],
        index,
        siteContentBlocks
      );
    } catch (error) {
      console.error('[DRAFTS_API] Reference load for delete failed:', error);
      return apiServerError('admin/drafts/[id] DELETE reference check', error);
    }

    const plan = plans[0];

    // Delete from R2 only when no other row references the object.
    // A failure is reported, not swallowed.
    let r2Deleted = false;
    const r2DeleteFailures: Array<{ id: string; r2Key: string }> = [];
    if (plan.action === 'delete-object' && plan.r2Key) {
      const [result] = await Promise.allSettled([deleteFromR2(plan.r2Key)]);
      const failures = collectR2Failures([{ id: plan.id, r2Key: plan.r2Key }], [result]);
      r2DeleteFailures.push(...failures);
      r2Deleted = failures.length === 0;
      if (failures.length > 0) {
        console.error('[DRAFTS_API] R2 delete failure:', failures[0]);
      }
    }

    // Delete from database. The row is removed even when the object was kept:
    // the draft no longer owns the object, published content does.
    const { error: deleteError } = await supabaseAdmin
      .from('draft_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DRAFTS_API] Database delete error:', deleteError);
      return apiServerError('admin/drafts/[id] DELETE', deleteError);
    }

    console.log('[DRAFTS_API] Deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Draft item deleted successfully',
      r2_deleted: r2Deleted,
      object_kept: plan.action === 'keep-object',
      kept_object: plan.action === 'keep-object'
        ? { id: plan.id, r2_key: plan.r2Key, referenced_by: plan.referencedBy }
        : undefined,
      r2_delete_failures: r2DeleteFailures,
    });
  } catch (error) {
    console.error('[DRAFTS_API] Delete unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
