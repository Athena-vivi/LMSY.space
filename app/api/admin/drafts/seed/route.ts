/**
 * POST /api/admin/drafts/seed - Seed mock draft data for testing
 *
 * TEMPORARY ENDPOINT for development/testing only
 * Bypasses normal ingestion flow to insert test data directly
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const draftData = await request.json();

    console.log('[DRAFTS_SEED] Seeding mock draft:', draftData.title?.en?.substring(0, 40));

    // Insert directly into database
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .insert({
        source_url: draftData.source_url,
        source_platform: draftData.source_platform,
        source_post_id: draftData.source_post_id,
        r2_media_url: draftData.r2_media_url,
        r2_key: draftData.r2_key,
        media_type: draftData.media_type,
        media_metadata: draftData.media_metadata,
        title: draftData.title,
        description: draftData.description,
        event_date: draftData.event_date,
        status: draftData.status,
        ingestion_stage: draftData.ingestion_stage,
        ai_translation_status: draftData.ai_translation_status,
        tags: draftData.tags,
        is_featured: draftData.is_featured || false,
        // Set timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[DRAFTS_SEED] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('[DRAFTS_SEED] Seeded successfully:', data.id);

    return NextResponse.json({
      success: true,
      data: { id: data.id },
      message: 'Mock draft seeded successfully',
    });
  } catch (error) {
    console.error('[DRAFTS_SEED] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
