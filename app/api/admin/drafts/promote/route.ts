import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { promoteDraftBatch, type PromoteParams } from '@/lib/promote';

/**
 * Batched draft promotion (self-serve ingest wizard, phase 1).
 *
 * Thin authenticated shell around lib/promote.ts: the frontend sends small
 * batches (<= 5 draft ids) so one request always fits the serverless timeout,
 * and deletes consumed drafts via /promote/cleanup only after every batch
 * succeeded.
 */

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as PromoteBody;
    const params: PromoteParams = {
      draftIds: Array.isArray(body.draftIds) ? body.draftIds : [],
      projectId: body.projectId,
      subject: body.subject,
      personCode: body.personCode,
      assetGroup: body.assetGroup,
      captionPrefix: body.captionPrefix,
      writeCover: body.writeCover,
      dryRun: body.dryRun,
    };

    if (params.draftIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No draft ids given' }, { status: 400 });
    }
    if (params.draftIds.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Send at most 5 drafts per batch' },
        { status: 400 }
      );
    }
    if (!params.projectId || !params.subject || !params.subject.trim()) {
      return NextResponse.json(
        { success: false, error: 'projectId and subject are required' },
        { status: 400 }
      );
    }

    const result = await promoteDraftBatch(params);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[PROMOTE] error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

interface PromoteBody {
  draftIds: string[];
  projectId: string;
  subject: string;
  personCode?: 'LMSY' | 'LM' | 'SY';
  assetGroup?: string | null;
  captionPrefix?: string | null;
  writeCover?: boolean;
  dryRun?: boolean;
}
