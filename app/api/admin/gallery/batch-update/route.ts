import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

// Remediation B2-T2 (audit P2-1): this route previously only checked that the
// caller was logged in - any authenticated user could rewrite gallery ordering.
// It now requires the admin identity, and validates the payload shape.

const MAX_UPDATES_PER_REQUEST = 200;
const SEQUENCE_MIN = 0;
const SEQUENCE_MAX = 999999;

interface SequenceUpdate {
  id: string;
  sequence: number;
}

function parseUpdates(raw: unknown): SequenceUpdate[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > MAX_UPDATES_PER_REQUEST) return null;

  const updates: SequenceUpdate[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null;
    const { id, sequence } = entry as { id?: unknown; sequence?: unknown };
    if (typeof id !== 'string' || id.length === 0) return null;
    if (typeof sequence !== 'number' || !Number.isInteger(sequence)) return null;
    if (sequence < SEQUENCE_MIN || sequence > SEQUENCE_MAX) return null;
    updates.push({ id, sequence });
  }
  return updates;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const updates = parseUpdates(body?.updates);

    if (!updates) {
      return NextResponse.json(
        {
          error: `Invalid updates format: expected 1-${MAX_UPDATES_PER_REQUEST} entries of { id: string, sequence: integer ${SEQUENCE_MIN}-${SEQUENCE_MAX} }`,
        },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      updates.map(({ id, sequence }: SequenceUpdate) =>
        supabaseAdmin
          .from('gallery_assets')
          .update({ sequence })
          .eq('id', id)
      )
    );

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Batch update errors:', errors);
      return apiServerError('admin/gallery/batch-update', errors[0].error);
    }

    return NextResponse.json({
      success: true,
      count: updates.length,
      message: `Updated ${updates.length} image sequences`
    });

  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
