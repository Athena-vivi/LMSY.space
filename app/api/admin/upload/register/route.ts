import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { convertToWebP, generateBlurData } from '@/lib/image-processing';

/**
 * POST - Register an uploaded image in the database
 *
 * This endpoint is called AFTER the client has successfully uploaded
 * the file directly to R2 using a presigned URL. It handles:
 * 1. WebP conversion (for metadata)
 * 2. Blur data generation
 * 3. Database record insertion
 *
 * Request body:
 * {
 *   "catalogId": "LMSY-MAG-20241023-001",
 *   "imageUrl": "https://cdn.lmsy.space/magazines/2024/LMSY-MAG-20241023-001.webp",
 *   "caption": "Magazine cover",
 *   "tag": "editorial",
 *   "projectId": "uuid",
 *   "isFeatured": true,
 *   "originalSize": 1234567
 * }
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
    const body = await request.json();
    const {
      catalogId,
      imageUrl,
      caption,
      tag,
      projectId,
      isFeatured,
      isEditorial,
      curatorNote,
      originalSize,
    } = body;

    // Validation
    if (!catalogId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: catalogId, imageUrl' },
        { status: 400 }
      );
    }

    console.log('[UPLOAD_REGISTER] 📝 Registering uploaded image:', {
      catalogId,
      imageUrl,
      caption,
      tag,
      projectId,
      isFeatured,
    });

    // Note: WebP conversion is skipped since the client uploads WebP directly
    // We only generate blur data for the placeholder
    let blurData = null;
    if (originalSize) {
      try {
        // We can't generate blur data without the original file
        // Client-side will need to handle this if needed
        blurData = null;
      } catch (error) {
        console.warn('[UPLOAD_REGISTER] Blur data generation failed:', error);
      }
    }

    // Database insert
    const supabaseAdmin = getSupabaseAdmin();

    // Get event_date from catalog ID
    const catalogMatch = catalogId.match(/^LMSY-[A-Z]+-(\d{8})-(\d{3})$/);
    let eventDate = new Date().toISOString().split('T')[0];

    if (catalogMatch) {
      const compactDate = catalogMatch[1];
      const year = compactDate.substring(0, 4);
      const month = compactDate.substring(4, 6);
      const day = compactDate.substring(6, 8);
      eventDate = `${year}-${month}-${day}`;
    }

    const insertData: Record<string, any> = {
      image_url: imageUrl,
      catalog_id: catalogId,
      caption: caption || null,
      tag: tag || null,
      is_featured: isFeatured || false,
      is_editorial: isEditorial || false,
      curator_note: curatorNote || null,
      blur_data: blurData,
      event_date: eventDate,
    };

    if (projectId) {
      insertData.project_id = projectId;
    }

    console.log('[UPLOAD_REGISTER] Insert data validation:', {
      fields: Object.keys(insertData),
      types: Object.fromEntries(
        Object.entries(insertData).map(([k, v]) => [k, typeof v])
      ),
    });

    const insertResult = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .insert(insertData)
      .select()
      .single();

    const { data, error: insertError } = insertResult;

    if (insertError) {
      console.error('[UPLOAD_REGISTER] ❌ Database insert failed:', insertError);
      throw new Error(`Database insert failed: ${insertError.message} (${insertError.code})`);
    }

    if (!data) {
      throw new Error('Database insert returned no data');
    }

    console.log(`[UPLOAD_REGISTER] ✅ Artifact ${catalogId} registered successfully`);

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        catalog_id: catalogId,
        image_url: imageUrl,
        event_date: eventDate,
        caption: data.caption,
        tag: data.tag,
        is_featured: data.is_featured,
      },
    });

  } catch (error) {
    console.error('[UPLOAD_REGISTER] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to register image',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
