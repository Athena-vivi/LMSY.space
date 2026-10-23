import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';

/**
 * POST /api/admin/gallery/transfer - Batch transfer gallery items to project
 * 🔒 IRON CURTAIN: Manual curator-controlled linkage only
 */
export async function POST(request: NextRequest) {
  // Authentication
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { ids, projectId } = body;

    console.log('[IRON_CURTAIN] ========== MANUAL TRANSFER ==========');
    console.log('[IRON_CURTAIN] 📝 Transferring', ids.length, 'items to project:', projectId);

    // Validate inputs
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty ids array' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify project exists
    console.log('[IRON_CURTAIN] 🔍 Verifying project exists...');
    const { data: project, error: projectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project) {
      console.error('[IRON_CURTAIN] ❌ Project not found:', projectId);
      return NextResponse.json(
        { error: 'Project not found', projectId },
        { status: 404 }
      );
    }

    console.log('[IRON_CURTAIN] ✅ Project verified:', project.title);

    // Update all gallery items
    // NOTE: must target gallery_assets (the live asset table). The legacy
    // `gallery` table has 0 rows and previously made this call a silent no-op.
    console.log('[IRON_CURTAIN] 📝 Updating gallery assets...');
    const { data: updatedItems, error: updateError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update({ project_id: projectId })
      .in('id', ids)
      .select();

    if (updateError) {
      console.error('[IRON_CURTAIN] ❌ Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to transfer items', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[IRON_CURTAIN] ✅ Transferred', updatedItems?.length || 0, 'items to', project.title);

    // Auto-set project cover if an explicit cover or -000 image is in the batch
    const coverImage = updatedItems?.find(item => item.is_cover) ||
      updatedItems?.find(item => item.catalog_id?.endsWith('-000'));
    if (coverImage) {
      console.log('[IRON_CURTAIN] 🎯 Cover image in batch, updating project cover...');
      await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .update({ cover_url: coverImage.image_url })
        .eq('id', projectId);
      console.log('[IRON_CURTAIN] ✅ Project cover updated');
    }

    return NextResponse.json({
      success: true,
      transferred: updatedItems?.length || 0,
      projectId,
      projectTitle: project.title,
    });

  } catch (error) {
    console.error('[IRON_CURTAIN] ❌ Exception:', error);
    return NextResponse.json(
      {
        error: 'Transfer failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
