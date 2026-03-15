import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (authResult.user.email !== adminEmail) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .order('release_date', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projects: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
