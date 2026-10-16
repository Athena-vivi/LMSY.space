/**
 * GET /api/admin/drafts - Get draft items with filtering
 * DELETE /api/admin/drafts - Batch delete draft items (with R2 cleanup)
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

// =====================================================
// GET - Fetch draft items with optional filtering
// =====================================================
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mediaType = searchParams.get('media_type');
    const batchId = searchParams.get('batch_id');
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[DRAFTS_API] Fetching with filters:', { status, mediaType, batchId, projectId, limit, offset });

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
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Exclude archived and rejected by default
    query = query.not('status', 'in', '("archived", "rejected")');

    const { data, error, count } = await query;

    if (error) {
      console.error('[DRAFTS_API] Fetch error:', error);
      return apiServerError('admin/drafts GET', error);
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

    console.log('[DRAFTS_API] Batch delete:', ids.length, 'items');

    // First, fetch the items to get their R2 keys
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('draft_items')
      .select('id, r2_key')
      .in('id', ids);

    if (fetchError) {
      console.error('[DRAFTS_API] Fetch for delete error:', fetchError);
      return apiServerError('admin/drafts DELETE', fetchError);
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No items found to delete',
      });
    }

    // Guard (B2-T1 / audit P1-4): never delete an R2 object that published
    // content still references. Fail closed if references cannot be loaded.
    let plans: ObjectPlan[];
    try {
      const { index, siteContentBlocks } = await loadReferenceIndex(supabaseAdmin, ids);
      plans = planDraftObjectDeletion(
        items.map((item) => ({ id: item.id, r2Key: item.r2_key })),
        index,
        siteContentBlocks
      );
    } catch (error) {
      console.error('[DRAFTS_API] Reference load for delete failed:', error);
      return apiServerError('admin/drafts DELETE reference check', error);
    }

    const deleteList = plans
      .filter((plan) => plan.action === 'delete-object' && plan.r2Key)
      .map((plan) => ({ id: plan.id, r2Key: plan.r2Key! }));

    // Delete from R2 (objects with no remaining references only).
    // Failures are collected and reported, not swallowed.
    const r2Results = await Promise.allSettled(
      deleteList.map((entry) => deleteFromR2(entry.r2Key))
    );
    const r2DeleteFailures = collectR2Failures(deleteList, r2Results);

    if (r2DeleteFailures.length > 0) {
      console.error('[DRAFTS_API] R2 delete failures:', r2DeleteFailures);
    }

    const keptObjects = plans
      .filter((plan) => plan.action === 'keep-object')
      .map((plan) => ({ id: plan.id, r2_key: plan.r2Key, referenced_by: plan.referencedBy }));

    if (keptObjects.length > 0) {
      console.log('[DRAFTS_API] Objects kept (still referenced):', keptObjects.length);
    }

    // Delete from database. Rows are removed even when their object was kept:
    // the draft no longer owns the object, published content does.
    const { error: deleteError } = await supabaseAdmin
      .from('draft_items')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('[DRAFTS_API] Database delete error:', deleteError);
      return apiServerError('admin/drafts DELETE', deleteError);
    }

    console.log('[DRAFTS_API] Deleted:', items.length, 'items');

    return NextResponse.json({
      success: true,
      deleted: items.length,
      objects_deleted: deleteList.length - r2DeleteFailures.length,
      objects_kept: keptObjects.length,
      kept_objects: keptObjects,
      r2_delete_failures: r2DeleteFailures,
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
