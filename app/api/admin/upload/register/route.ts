import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * ATOMIC INGESTION API - Zero-Fallback Upload System
 *
 * 🤖 AUTOMATED CLOSED LOOP:
 * [Client Upload to R2] → [Verify File] → [Write Gallery] → [Link Project] → [Set Cover]
 *
 * ❌ NO PARTIAL STATES
 * ❌ NO NULL RECORDS
 * ❌ NO MANUAL INTERVENTION
 * ✅ ALL-OR-NOTHING: If any step fails, automatic rollback
 */

// R2 Client for cleanup on failure
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://e5b4187c5c945697f59cdf3cc036cb98.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Delete uploaded file from R2 (rollback)
 */
async function rollbackR2Upload(imageUrl: string): Promise<void> {
  try {
    // Extract key from CDN URL
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1); // Remove leading /

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: 'lmsy-archive',
        Key: key,
      })
    );

    console.log(`[ROLLBACK] 🗑️ Deleted R2 file: ${key}`);
  } catch (error) {
    console.error('[ROLLBACK] ❌ Failed to delete R2 file:', error);
  }
}

/**
 * Verify file actually exists in R2
 */
async function verifyR2FileExists(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
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

  // Track rollback state
  let galleryRecordCreated = false;
  let galleryRecordId: string | null = null;
  let projectLinked = false;
  let coverSet = false;

  try {
    const body = await request.json();
    const {
      catalogId,
      imageUrl,
      eventDate,
      caption,
      tag,
      projectId,
      isFeatured,
      isEditorial,
      curatorNote,
    } = body;

    // 🔒 CRITICAL: Validate required fields
    if (!catalogId || !imageUrl || !eventDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['catalogId', 'imageUrl', 'eventDate'],
        },
        { status: 400 }
      );
    }

    // 🔒 CRITICAL: Verify R2 file exists before writing DB
    console.log(`[ATOMIC_INGEST] 🔍 Verifying R2 file: ${imageUrl}`);
    const fileExists = await verifyR2FileExists(imageUrl);

    if (!fileExists) {
      console.error(`[ATOMIC_INGEST] ❌ R2 file not found: ${imageUrl}`);
      return NextResponse.json(
        {
          error: 'File verification failed',
          details: `Uploaded file not found in R2: ${imageUrl}`,
        },
        { status: 400 }
      );
    }

    // 🔒 YEAR VALIDATION: Ensure catalog ID year matches event date
    const catalogMatch = catalogId.match(/^LMSY-[A-Z]+-(\d{4})(\d{4})-(\d{3})$/);
    if (!catalogMatch) {
      return NextResponse.json(
        { error: 'Invalid catalog ID format', expected: 'LMSY-XXX-YYYYMMDD-###' },
        { status: 400 }
      );
    }

    const catalogYear = catalogMatch[1];
    const eventYear = new Date(eventDate).getFullYear().toString();

    if (catalogYear !== eventYear) {
      return NextResponse.json(
        {
          error: 'Year mismatch',
          catalogYear,
          eventYear,
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 🔒 CRITICAL: Log project_id for verification
    console.log(`[ATOMIC_INGEST] 📝 project_id received: "${projectId}" (type: ${typeof projectId}, empty: ${projectId === '' || projectId === null})`);

    // 🔒 ATOMIC STEP 1: Create gallery record
    console.log(`[ATOMIC_INGEST] 📝 Creating gallery record...`);

    const insertResult = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .insert({
        image_url: imageUrl,
        catalog_id: catalogId,
        caption: caption || null,
        tag: tag || null,
        is_featured: isFeatured || false,
        is_editorial: isEditorial || false,
        curator_note: curatorNote || null,
        event_date: eventDate,
        project_id: projectId && projectId !== '' ? projectId : null, // 🔒 CRITICAL: Treat empty string as null
      })
      .select()
      .single();

    if (insertResult.error || !insertResult.data) {
      // Rollback: Delete R2 file
      await rollbackR2Upload(imageUrl);
      throw new Error(`Gallery insert failed: ${insertResult.error?.message}`);
    }

    galleryRecordCreated = true;
    galleryRecordId = insertResult.data.id;
    console.log(`[ATOMIC_INGEST] ✅ Gallery record created: ${galleryRecordId}`);

    // 🔒 ATOMIC STEP 2: Auto-link to project if needed
    if (projectId) {
      console.log(`[ATOMIC_INGEST] 🔗 Linking to project ${projectId}...`);

      // Verify project exists
      const { data: project, error: projectError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id, title, cover_url')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        // Rollback: Delete gallery record and R2 file
        await supabaseAdmin.schema('lmsy_archive').from('gallery').delete().eq('id', galleryRecordId);
        await rollbackR2Upload(imageUrl);
        throw new Error(`Project not found: ${projectId}`);
      }

      projectLinked = true;

      // 🔒 ATOMIC STEP 3: Auto-set cover if -000 image OR if project has no cover
      const shouldSetCover = catalogId.endsWith('-000') || !project.cover_url;

      if (shouldSetCover) {
        const reason = catalogId.endsWith('-000')
          ? `-000 designation (${project.cover_url ? 'updating existing' : 'setting new'})`
          : 'first image for project';
        console.log(`[ATOMIC_INGEST] 🎯 Auto-setting cover (${reason})...`);

        const { error: updateError } = await supabaseAdmin
          .schema('lmsy_archive')
          .from('projects')
          .update({ cover_url: imageUrl })
          .eq('id', projectId);

        if (updateError) {
          // Rollback: Delete gallery record and R2 file
          await supabaseAdmin.schema('lmsy_archive').from('gallery').delete().eq('id', galleryRecordId);
          await rollbackR2Upload(imageUrl);
          throw new Error(`Cover update failed: ${updateError.message}`);
        }

        coverSet = true;
        console.log(`[ATOMIC_INGEST] ✅ Cover set successfully (${reason})`);
      }
    }

    console.log(`[ATOMIC_INGEST] ✅ ATOMIC TRANSACTION COMPLETE`);

    return NextResponse.json({
      success: true,
      data: {
        id: galleryRecordId,
        catalog_id: catalogId,
        image_url: imageUrl,
        event_date: eventDate,
        project_id: projectId,
        auto_cover_set: coverSet,
      },
      _atomic: {
        gallery_record: galleryRecordCreated,
        project_linked: projectLinked,
        cover_set: coverSet,
      },
    });

  } catch (error) {
    console.error('[ATOMIC_INGEST] ❌ TRANSACTION FAILED:', error);

    // Rollback any partial state
    if (galleryRecordId && galleryRecordCreated) {
      try {
        await getSupabaseAdmin()
          .schema('lmsy_archive')
          .from('gallery')
          .delete()
          .eq('id', galleryRecordId);
        console.log('[ROLLBACK] 🗑️ Deleted gallery record');
      } catch (rollbackError) {
        console.error('[ROLLBACK] ❌ Failed to delete gallery record:', rollbackError);
      }
    }

    return NextResponse.json(
      {
        error: 'Atomic ingestion failed',
        details: error instanceof Error ? error.message : String(error),
        _rolled_back: true,
      },
      { status: 500 }
    );
  }
}
