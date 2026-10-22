import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { loadSubjectOptions } from '@/lib/promote';

/**
 * Subject-segment candidates for the promote wizard: the project's own
 * catalog head, subjects its assets already use, and same-category peers as
 * reference - so the curator picks instead of inventing a segment.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const projectId = new URL(request.url).searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
  }

  try {
    const options = await loadSubjectOptions(projectId);
    if (!options) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, options });
  } catch (error) {
    console.error(
      '[PROMOTE_SUBJECTS] error:',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
