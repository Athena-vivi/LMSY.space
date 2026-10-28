import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { moveAssetsToProject, AssetMoveError } from '@/lib/asset-move';

/**
 * POST /api/admin/gallery/move-assets
 *
 * Move pictures from one project into another. Unlike /gallery/transfer, which
 * only rewrites project_id, this also re-allocates the catalog id under the
 * target project and moves the R2 object to its new key - the file path and the
 * database row always agree afterwards.
 *
 * Body: { assetIds: string[], targetProjectId: string }
 *
 * Answers 409 with a conflict list when any destination id or key is taken;
 * nothing is moved in that case.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: { assetIds?: unknown; targetProjectId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const assetIds = Array.isArray(body.assetIds) ? (body.assetIds as string[]) : [];
  const targetProjectId = typeof body.targetProjectId === 'string' ? body.targetProjectId : '';

  if (assetIds.length === 0) {
    return NextResponse.json({ error: 'assetIds is required' }, { status: 400 });
  }
  if (!targetProjectId) {
    return NextResponse.json({ error: 'targetProjectId is required' }, { status: 400 });
  }

  try {
    const outcome = await moveAssetsToProject(getSupabaseAdmin(), assetIds, targetProjectId);

    if (outcome.conflicts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some destination ids are already taken - nothing was moved',
          conflicts: outcome.conflicts,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      moved: outcome.moved.length,
      assets: outcome.moved,
      sources: outcome.sources,
      targetProjectId: outcome.targetProjectId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ASSET_MOVE] ❌', message);
    return NextResponse.json(
      { error: error instanceof AssetMoveError ? message : 'Move failed', details: message },
      { status: 500 }
    );
  }
}
