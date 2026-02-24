import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

/**
 * PATCH - Set milestone priority for gallery images
 * Body: { imageId: string, year: string }
 * year: '2022' | '2023' | '2024' | '2025' | null
 *
 * This ensures only one image per year by:
 * 1. Clearing existing milestone for that year
 * 2. Setting the new image as milestone
 */
export async function PATCH(request: NextRequest) {
  // Authentication
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
    const body = await request.json();
    const { imageId, year } = body;

    // Validate year
    const validYears = ['2022', '2023', '2024', '2025', 'infinity', null];
    if (!validYears.includes(year)) {
      return NextResponse.json(
        { error: 'Invalid year. Must be 2022, 2023, 2024, 2025, infinity, or null' },
        { status: 400 }
      );
    }

    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Map year to priority
    const yearToPriority: Record<string, number | null> = {
      '2022': 1,
      '2023': 2,
      '2024': 3,
      '2025': 4,
      'infinity': 5,
      'null': null,
    };

    const newPriority = yearToPriority[String(year)];

    // First, clear existing milestone for this year (if setting a new milestone)
    if (newPriority !== null) {
      const { error: clearError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .update({ milestone_priority: null })
        .eq('milestone_priority', newPriority);

      if (clearError) {
        console.error('[MILESTONE_API] ❌ Failed to clear existing milestone:', clearError);
        return NextResponse.json(
          { error: 'Failed to clear existing milestone', details: clearError.message },
          { status: 500 }
        );
      }
    }

    // Set new milestone
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .update({ milestone_priority: newPriority })
      .eq('id', imageId)
      .select('id, image_url, milestone_priority')
      .single();

    if (error) {
      console.error('[MILESTONE_API] ❌ Failed to set milestone:', error);
      return NextResponse.json(
        { error: 'Failed to set milestone', details: error.message },
        { status: 500 }
      );
    }

    console.log('[MILESTONE_API] ✅ Set milestone:', { imageId, year, priority: newPriority });

    return NextResponse.json({
      success: true,
      data: {
        imageId: data.id,
        year,
        priority: data.milestone_priority,
      },
    });
  } catch (error) {
    console.error('[MILESTONE_API] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get current milestone images for all years
 */
export async function GET(request: NextRequest) {
  // Authentication
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
      .from('gallery')
      .select('id, image_url, milestone_priority, caption, tag')
      .not('milestone_priority', 'is', null)
      .order('milestone_priority', { ascending: true });

    if (error) {
      console.error('[MILESTONE_API] ❌ Failed to fetch milestones:', error);
      return NextResponse.json(
        { error: 'Failed to fetch milestones', details: error.message },
        { status: 500 }
      );
    }

    // Map to year
    const priorityToYear: Record<number, string> = {
      1: '2022',
      2: '2023',
      3: '2024',
      4: '2025',
      5: '∞',
    };

    const milestones = data?.map(item => ({
      id: item.id,
      image_url: item.image_url,
      year: priorityToYear[item.milestone_priority!],
      caption: item.caption,
      tag: item.tag,
    })) || [];

    return NextResponse.json({
      success: true,
      data: milestones,
    });
  } catch (error) {
    console.error('[MILESTONE_API] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
