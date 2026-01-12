import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, type ProcessedImageResult } from '@/lib/image-processing';

/**
 * POST - Fallback upload endpoint for when client-to-R2 direct upload fails
 *
 * 🔒 HIGHEST PRECISION: All validation, no silent failures
 * 🚀 PERFORMANCE: Skip R2 upload if file already exists
 */
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

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const catalogId = formData.get('catalogId') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const eventDate = formData.get('eventDate') as string | null;
    const caption = formData.get('caption') as string | null;
    const tag = formData.get('tag') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const isFeatured = formData.get('isFeatured') === 'true';
    const originalSize = formData.get('originalSize') as string | null;

    console.log('[UPLOAD_FALLBACK] 📋 Processing request:', {
      hasFile: !!file,
      catalogId,
      imageUrl,
      eventDate,
      caption,
      tag,
      projectId,
      isFeatured,
      originalSize,
    });

    // 🔒 CRITICAL: Validate required fields - NO NULL VALUES
    if (!file) {
      return NextResponse.json(
        { error: 'File is required for fallback upload' },
        { status: 400 }
      );
    }

    if (!catalogId) {
      return NextResponse.json(
        { error: 'catalogId is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // 🔒 HIGHEST PRECISION: Robust catalog ID validation with strict regex
    // Format: LMSY-XXX-YYYYMMDD-### where XXX is category code
    const catalogStrictMatch = catalogId.match(/^LMSY-[A-Z]+-(\d{4})(\d{2})(\d{2})-(\d{3})$/);
    if (!catalogStrictMatch) {
      console.error('[UPLOAD_FALLBACK] ❌ INVALID CATALOG ID FORMAT:', catalogId);
      return NextResponse.json(
        {
          error: 'Invalid catalog ID format',
          details: `Expected format: LMSY-XXX-YYYYMMDD-###, got: ${catalogId}`,
          received: catalogId,
        },
        { status: 400 }
      );
    }

    const [, year, month, day, sequence] = catalogStrictMatch;
    const r2Path = `magazines/${year}/${catalogId}.webp`;

    console.log('[UPLOAD_FALLBACK] ✅ Catalog ID validated:', {
      catalogId,
      year,
      month,
      day,
      sequence,
      r2Path,
    });

    // 🔒 CRITICAL: Validate eventDate - MUST BE PROVIDED
    if (!eventDate) {
      console.error('[UPLOAD_FALLBACK] ❌ eventDate is null or empty');
      return NextResponse.json(
        {
          error: 'eventDate is required',
          details: 'The eventDate field must be provided. Cannot extract from catalog_id alone.',
          hint: 'Ensure the frontend passes the selected date from the date picker.',
        },
        { status: 400 }
      );
    }

    // Validate eventDate format (YYYY-MM-DD)
    const eventDateMatch = eventDate.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!eventDateMatch) {
      console.error('[UPLOAD_FALLBACK] ❌ INVALID eventDate FORMAT:', eventDate);
      return NextResponse.json(
        {
          error: 'Invalid eventDate format',
          details: `Expected format: YYYY-MM-DD, got: ${eventDate}`,
          received: eventDate,
        },
        { status: 400 }
      );
    }

    // 🔒 CRITICAL: Year validation - catalog year must match event year
    const eventYear = eventDate.substring(0, 4);
    if (year !== eventYear) {
      console.error('[UPLOAD_FALLBACK] ❌ YEAR MISMATCH:', {
        catalogId,
        catalogYear: year,
        eventDate,
        eventYear,
      });
      return NextResponse.json(
        {
          error: 'Year mismatch between catalog ID and event date',
          details: `Catalog ID year (${year}) does not match event date year (${eventYear}). This prevents data integrity issues.`,
          catalogId,
          catalogYear: year,
          eventDate,
          eventYear,
        },
        { status: 400 }
      );
    }

    console.log('[UPLOAD_FALLBACK] ✅ Date validation passed:', { catalogYear: year, eventYear, eventDate });

    console.log('[UPLOAD_FALLBACK] Step 1: Converting to WebP...');

    // Convert to WebP on server
    let webpResult: ProcessedImageResult;
    try {
      webpResult = await convertToWebP(file);
      console.log(`[UPLOAD_FALLBACK] Step 1: ✅ WebP conversion complete (${(webpResult.sizeBytes / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error('[UPLOAD_FALLBACK] ❌ WebP conversion failed:', error);
      throw new Error(`WebP conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('[UPLOAD_FALLBACK] Step 2: Uploading to R2 via server...');

    // 🚀 PERFORMANCE: Check if file already exists in R2
    const r2PublicUrl = `https://cdn.lmsy.space/${r2Path}`;
    let skipR2Upload = false;

    try {
      const existingCheck = await fetch(r2PublicUrl, { method: 'HEAD' });
      if (existingCheck.ok) {
        console.log('[UPLOAD_FALLBACK] 🚀 File already exists in R2, skipping upload:', r2PublicUrl);
        skipR2Upload = true;
      }
    } catch (checkError) {
      // If check fails, proceed with upload
      console.log('[UPLOAD_FALLBACK] ⚠️ R2 existence check failed, proceeding with upload');
    }

    // Upload to R2 using server credentials (only if not already exists)
    if (!skipR2Upload) {
      const r2Result = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');
      if (!r2Result.success || !r2Result.url) {
        throw new Error(`R2 upload failed: ${r2Result.error || 'Unknown error'}`);
      }
      console.log(`[UPLOAD_FALLBACK] Step 2: ✅ Uploaded to R2: ${r2Result.url}`);
    } else {
      console.log(`[UPLOAD_FALLBACK] Step 2: ⏭️ Skipped R2 upload (file exists)`);
    }

    console.log('[UPLOAD_FALLBACK] Step 3: Registering in database...');

    // Register in database with validated eventDate
    const supabaseAdmin = getSupabaseAdmin();

    const insertData: Record<string, any> = {
      image_url: r2PublicUrl, // Use the constructed CDN URL
      catalog_id: catalogId,
      caption: caption || null,
      tag: tag || null,
      is_featured: isFeatured,
      blur_data: null, // Could generate blur data if needed
      event_date: eventDate, // 🔒 CRITICAL: Use validated eventDate
    };

    if (projectId && projectId !== '') {
      insertData.project_id = projectId;
    }

    const { data, error: insertError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .insert(insertData)
      .select()
      .single();

    if (insertError || !data) {
      console.error('[UPLOAD_FALLBACK] ❌ Database insert failed:', insertError);
      throw new Error(`Database insert failed: ${insertError?.message || 'Unknown error'}`);
    }

    console.log('[UPLOAD_FALLBACK] Step 3: ✅ Registered in database');

    // 🔒 ARCHIVE_SUCCESS LOG: 零误差上传确认
    console.log(`[ARCHIVE_SUCCESS] Physical: ${r2Path} | Logical: ${catalogId}`);

    // 🔒 AUTO-COVER LOGIC: Auto-set project cover if needed
    let coverSet = false;
    if (projectId && projectId !== '') {
      console.log(`[UPLOAD_FALLBACK] 🔍 Checking project cover status...`);

      // Fetch project to check current cover
      const { data: project, error: projectError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id, title, cover_url')
        .eq('id', projectId)
        .maybeSingle();

      if (!projectError && project) {
        // Auto-set cover if -000 image OR if project has no cover
        const shouldSetCover = catalogId.endsWith('-000') || !project.cover_url;

        if (shouldSetCover) {
          const reason = catalogId.endsWith('-000')
            ? `-000 designation (${project.cover_url ? 'updating existing' : 'setting new'})`
            : 'first image for project';
          console.log(`[UPLOAD_FALLBACK] 🎯 Auto-setting cover (${reason})...`);

          const { error: updateError } = await supabaseAdmin
            .schema('lmsy_archive')
            .from('projects')
            .update({ cover_url: r2PublicUrl })
            .eq('id', projectId);

          if (!updateError) {
            coverSet = true;
            console.log('[UPLOAD_FALLBACK] ✅ Project cover updated');
          } else {
            console.error('[UPLOAD_FALLBACK] ⚠️ Failed to update project cover:', updateError);
          }
        }
      } else {
        console.error('[UPLOAD_FALLBACK] ⚠️ Failed to fetch project for cover check:', projectError);
      }
    }

    console.log('[UPLOAD_FALLBACK] ✅ Fallback upload complete');

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        catalog_id: catalogId,
        image_url: r2PublicUrl,
        r2_path: r2Path,
        event_date: eventDate,
        caption: data.caption,
        tag: data.tag,
        is_featured: data.is_featured,
        skipped_r2_upload: skipR2Upload,
        cover_set: coverSet,
      },
    });

  } catch (error) {
    console.error('[UPLOAD_FALLBACK] ❌ EXCEPTION:', error);

    return NextResponse.json(
      {
        error: 'Fallback upload failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
