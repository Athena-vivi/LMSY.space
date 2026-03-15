import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.user || authResult.error) {
      return NextResponse.json({ error: 'Unauthorized', details: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid updates format' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = await Promise.all(
      updates.map(({ id, sequence }: { id: string; sequence: number }) =>
        supabaseAdmin
          .schema('lmsy_archive')
          .from('gallery_assets')
          .update({ sequence })
          .eq('id', id)
      )
    );

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Batch update errors:', errors);
      return NextResponse.json(
        { error: 'Some updates failed', count: errors.length },
        { status: 500 }
      );
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
