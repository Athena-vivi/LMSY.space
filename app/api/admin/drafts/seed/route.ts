/**
 * POST /api/admin/drafts/seed - Seed mock draft data for testing
 *
 * TEMPORARY ENDPOINT for development/testing only
 * Bypasses normal ingestion flow to insert test data directly
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import { insertDraftItem } from '@/lib/data/drafts';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const draftData = await request.json();

    console.log('[DRAFTS_SEED] Seeding mock draft:', draftData.title?.en?.substring(0, 40));

    // Insert directly into database
    const { id } = await insertDraftItem(supabaseAdmin, {
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
    });

    console.log('[DRAFTS_SEED] Seeded successfully:', id);

    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Mock draft seeded successfully',
    });
  } catch (error) {
    console.error('[DRAFTS_SEED] Error:', error);
    return apiServerError('admin/drafts/seed POST', error);
  }
}
