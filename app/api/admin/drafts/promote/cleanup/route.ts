import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { cleanupPromotedDrafts } from '@/lib/promote';

/**
 * Cleanup after a successful promotion batch: delete the consumed draft rows
 * AND their draft/ R2 objects. The wizard calls this explicitly ONLY after
 * every promote batch succeeded - never as part of the promote route itself,
 * so a mid-run failure can never destroy draft sources.
 */

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { draftIds?: string[] };
    const draftIds = Array.isArray(body.draftIds) ? body.draftIds.filter(Boolean) : [];
    if (draftIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No draft ids given' }, { status: 400 });
    }

    const result = await cleanupPromotedDrafts(draftIds);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error(
      '[PROMOTE_CLEANUP] error:',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
