import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import { loadCurationTree } from '@/lib/curation';

/**
 * GET /api/admin/curation
 *
 * The door -> second level -> event tree, with the cover each node currently
 * shows and whether that cover was chosen or derived. One payload: the whole
 * archive is a few hundred rows, and an admin screen that pages through its own
 * tree is harder to reason about than one that loads it.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const doors = await loadCurationTree();
    return NextResponse.json({ success: true, data: doors });
  } catch (error) {
    console.error('[CURATION_API] Error:', error);
    return apiServerError('admin/curation GET', error);
  }
}
