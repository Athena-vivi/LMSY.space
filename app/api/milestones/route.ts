import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listMilestonePriorityAssets } from '@/lib/data/gallery-assets';

/**
 * GET - Get milestone images for homepage timeline
 * Returns images for years 2022, 2023, 2024, 2025
 * Public endpoint, no authentication required
 */
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // The repository answers null on a read failure - the route keeps the
    // failure distinguishable from an empty set with its own 500.
    const rows = await listMilestonePriorityAssets(supabaseAdmin);

    if (!rows) {
      // The repository reports the failure without the error object; the
      // response below is byte-identical to the old inline branch.
      console.error('[MILESTONES_PUBLIC_API] ❌ Failed to fetch milestone assets');
      return NextResponse.json(
        { error: 'Failed to fetch milestones' },
        { status: 500 }
      );
    }

    // Map to year format for frontend
    const priorityToYear: Record<number, string> = {
      1: '2022',
      2: '2023',
      3: '2024',
      4: '2025',
      5: '∞',
    };

    const milestones = rows.map(item => ({
      year: priorityToYear[item.milestone_priority!],
      image_url: item.image_url,
    }));

    // Return as object keyed by year for easy access
    const milestonesMap: Record<string, string | null> = {
      '2022': null,
      '2023': null,
      '2024': null,
      '2025': null,
      '∞': null,
    };

    milestones.forEach(m => {
      milestonesMap[m.year] = m.image_url;
    });

    return NextResponse.json({
      success: true,
      data: milestonesMap,
    });
  } catch (error) {
    console.error('[MILESTONES_PUBLIC_API] ❌ Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
