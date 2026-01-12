import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, type ProcessedImageResult } from '@/lib/image-processing';

/**
 * POST - Fallback upload endpoint for when client-to-R2 direct upload fails
 *
 * This is a server-side upload endpoint that:
 * 1. Receives the file as FormData
 * 2. Converts to WebP on the server
 * 3. Uploads to R2 using server credentials
 * 4. Registers in database
 *
 * Use this when:
 * - CORS prevents client-side direct R2 upload
 * - Network issues prevent browser from reaching R2
 * - Debugging upload issues
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

    console.log('[UPLOAD_FALLBACK] Processing request:', {
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

    // Get R2 path from catalog ID
    const catalogMatch = catalogId.match(/^LMSY-[A-Z]+-(\d{4})\d{4}-\d{3}$/);
    if (!catalogMatch) {
      return NextResponse.json(
        { error: 'Invalid catalog ID format', catalogId },
        { status: 400 }
      );
    }

    const year = catalogMatch[1];
    const r2Path = `magazines/${year}/${catalogId}.webp`;

    // Upload to R2 using server credentials
    const r2Result = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');
    if (!r2Result.success || !r2Result.url) {
      throw new Error(`R2 upload failed: ${r2Result.error || 'Unknown error'}`);
    }

    console.log(`[UPLOAD_FALLBACK] Step 2: ✅ Uploaded to R2: ${r2Result.url}`);

    console.log('[UPLOAD_FALLBACK] Step 3: Registering in database...');

    // 🔒 HARDCORE YEAR VALIDATION: Extract year from catalog ID
    const catalogYear = catalogMatch[1]; // YYYY from catalog ID

    // Use provided eventDate or extract from catalog ID
    let validatedEventDate: string;
    if (eventDate) {
      const eventYear = new Date(eventDate).getFullYear().toString();

      // 🔒 CRITICAL: Years must match exactly
      if (catalogYear !== eventYear) {
        console.error('[UPLOAD_FALLBACK] ❌ YEAR MISMATCH DETECTED:', {
          catalogId,
          catalogYear,
          eventDate,
          eventYear,
        });
        return NextResponse.json(
          {
            error: 'Year mismatch between catalog ID and event date',
            details: `Catalog ID year (${catalogYear}) does not match event date year (${eventYear}). This prevents data integrity issues.`,
            catalogId,
            catalogYear,
            eventDate,
            eventYear,
          },
          { status: 400 }
        );
      }
      validatedEventDate = eventDate;
      console.log('[UPLOAD_FALLBACK] ✅ Year validation passed (using provided eventDate):', { catalogYear, eventYear });
    } else {
      // Fallback to extracting from catalog ID (for backward compatibility)
      const compactDate = catalogMatch[2]; // YYYYMMDD
      validatedEventDate = `${compactDate.substring(0, 4)}-${compactDate.substring(4, 6)}-${compactDate.substring(6, 8)}`;
      console.warn('[UPLOAD_FALLBACK] ⚠️ No eventDate provided, using catalog ID date (deprecated):', validatedEventDate);
    }

    // Register in database
    const supabaseAdmin = getSupabaseAdmin();

    const insertData: Record<string, any> = {
      image_url: r2Result.url,
      catalog_id: catalogId,
      caption: caption,
      tag: tag,
      is_featured: isFeatured,
      blur_data: null, // Could generate blur data if needed
      event_date: validatedEventDate,
    };

    if (projectId) {
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

    // 🔒 AUTO-COVER LOGIC: Auto-set project cover if needed
    let coverSet = false;
    if (projectId) {
      console.log(`[UPLOAD_FALLBACK] 🔍 Checking project cover status...`);

      // Fetch project to check current cover
      const { data: project, error: projectError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id, title, cover_url')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.warn('[UPLOAD_FALLBACK] ⚠️ Failed to fetch project for cover check:', projectError);
      } else if (project) {
        console.log(`[UPLOAD_FALLBACK] 📊 Project cover status:`, {
          project: project.title,
          hasCover: !!project.cover_url,
          currentCover: project.cover_url,
        });

        // Auto-set cover in two cases:
        // 1. This is a -000 cover designation (always set/replace cover)
        // 2. Project has no cover at all (set first image as cover)
        const shouldSetCover = catalogId.endsWith('-000') || !project.cover_url;

        if (shouldSetCover) {
          console.log(`[UPLOAD_FALLBACK] 🎯 Auto-setting cover (${catalogId.endsWith('-000') ? '-000 designation' : 'first image for project'})...`);

          const { error: updateError } = await supabaseAdmin
            .schema('lmsy_archive')
            .from('projects')
            .update({ cover_url: r2Result.url })
            .eq('id', projectId);

          if (updateError) {
            console.warn('[UPLOAD_FALLBACK] ⚠️ Failed to auto-set cover:', updateError);
          } else {
            coverSet = true;
            console.log(`[UPLOAD_FALLBACK] ✅ Auto-set project cover successfully`);
          }
        }
      }
    }

    console.log(`[UPLOAD_FALLBACK] ✅ Complete: ${catalogId} (cover set: ${coverSet})`);

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        catalog_id: catalogId,
        image_url: r2Result.url,
        event_date: validatedEventDate,
        caption: data.caption,
        tag: data.tag,
        is_featured: data.is_featured,
        project_id: projectId,
        auto_cover_set: coverSet,
        metadata: {
          originalSize: originalSize ? parseInt(originalSize, 10) : file.size,
          webpSize: webpResult.sizeBytes,
        },
      },
    });

  } catch (error) {
    console.error('[UPLOAD_FALLBACK] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Fallback upload failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
