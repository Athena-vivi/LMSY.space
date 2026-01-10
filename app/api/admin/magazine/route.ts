import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, generateBlurData } from '@/lib/image-processing';
import {
  generateMagazineCoverCatalogId,
  generateMagazinePageCatalogId,
  getR2PathForCatalogId,
} from '@/lib/catalog-id';

/**
 * Magazine Upload API - Astra 馆长档案标准
 *
 * Creates a magazine project in projects table with cover image,
 * and optionally uploads additional gallery images linked to the project.
 *
 * Catalog ID Format: LMSY-MAG-YYYYMMDD-XXX
 * - Cover: LMSY-MAG-20241023-000
 * - Pages: LMSY-MAG-20241023-001, LMSY-MAG-20241023-002, ...
 *
 * Request format: multipart/form-data
 * - cover: File (required) - Magazine cover image
 * - title: string (required) - Magazine title
 * - event_date: string (required) - Event date (YYYY-MM-DD) - used for catalog ID
 * - description: string (optional) - Magazine description
 * - curator_note: string (optional) - Curator's note (Markdown)
 * - additional_images: File[] (optional) - Additional magazine pages
 */

export async function POST(request: NextRequest) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

    // Auth with SSR client（Schema 锁定到 lmsy_archive）
    const supabaseAuth = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
        db: {
          schema: 'lmsy_archive',
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Double-check admin email
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Verify admin role
    const { data: adminCheck, error: adminError } = await supabaseAuth
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const cover = formData.get('cover') as File;
    const title = formData.get('title') as string;
    const eventDate = formData.get('event_date') as string;
    const description = formData.get('description') as string | null;
    const curatorNote = formData.get('curator_note') as string | null;

    // Validate required fields
    if (!cover || !title || !eventDate) {
      return NextResponse.json(
        { error: 'Missing required fields: cover, title, event_date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate cover file type
    if (!cover.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Cover must be an image file' },
        { status: 400 }
      );
    }

    // Get admin client for database operations
    const supabaseAdmin = getSupabaseAdmin();

    console.log('[MAGAZINE] Event date (local):', eventDate);

    // Generate catalog ID for the magazine cover (always sequence 000)
    const coverCatalogId = await generateMagazineCoverCatalogId(supabaseAdmin, eventDate);
    console.log('[MAGAZINE] Generated cover catalog_id:', coverCatalogId);

    // Process cover image
    console.log('[MAGAZINE] Processing cover image...');
    const coverWebp = await convertToWebP(cover, 90);
    const coverBlur = await generateBlurData(cover);

    // Upload cover to R2 with catalog_id as filename
    const coverR2Path = getR2PathForCatalogId(coverCatalogId);
    console.log('[MAGAZINE] Uploading cover to R2:', coverR2Path);
    const coverUpload = await uploadToR2(coverWebp.buffer, coverR2Path, 'image/webp');

    if (!coverUpload.success) {
      console.error('[MAGAZINE] Cover upload failed:', coverUpload.error);
      return NextResponse.json(
        { error: `Failed to upload cover: ${coverUpload.error}` },
        { status: 500 }
      );
    }

    // Create magazine project record with cover catalog_id
    console.log('[MAGAZINE] Creating project record...');
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        title,
        category: 'magazine',
        release_date: eventDate,
        description,
        cover_url: coverUpload.url,
        catalog_id: coverCatalogId,
        blur_data: coverBlur,
      })
      .select()
      .single();

    if (projectError) {
      console.error('[MAGAZINE] Failed to create project:', projectError);
      return NextResponse.json(
        { error: `Failed to create project: ${projectError.message}` },
        { status: 500 }
      );
    }

    console.log('[MAGAZINE] Project created:', project.id);

    // Process additional images if provided
    const additionalImages: File[] = [];
    formData.forEach((value, key) => {
      if (key === 'additional_images' && value instanceof File) {
        additionalImages.push(value);
      }
    });

    const uploadedGalleryItems: any[] = [];

    if (additionalImages.length > 0) {
      console.log(`[MAGAZINE] Processing ${additionalImages.length} additional images...`);

      for (let i = 0; i < additionalImages.length; i++) {
        const image = additionalImages[i];

        if (!image.type.startsWith('image/')) {
          console.warn(`[MAGAZINE] Skipping non-image file: ${image.name}`);
          continue;
        }

        try {
          // Convert to WebP
          const imageWebp = await convertToWebP(image, 85);
          const imageBlur = await generateBlurData(image);

          // Generate catalog ID for this page (auto-increment sequence)
          const pageCatalogId = await generateMagazinePageCatalogId(supabaseAdmin, eventDate, 'gallery');
          console.log(`[MAGAZINE] Page ${i + 1} catalog_id: ${pageCatalogId}`);

          // Upload to R2 with catalog_id as filename
          const imageR2Path = getR2PathForCatalogId(pageCatalogId);
          const imageUpload = await uploadToR2(imageWebp.buffer, imageR2Path, 'image/webp');

          if (!imageUpload.success) {
            console.error(`[MAGAZINE] Failed to upload image ${i + 1}:`, imageUpload.error);
            continue;
          }

          // Create gallery record linked to project
          const { data: galleryItem, error: galleryError } = await supabaseAdmin
            .from('gallery')
            .insert({
              image_url: imageUpload.url,
              project_id: project.id,
              catalog_id: pageCatalogId,
              blur_data: imageBlur,
              event_date: eventDate,
              caption: formData.get(`caption_${i}`) as string | null,
            })
            .select()
            .single();

          if (galleryError) {
            console.error(`[MAGAZINE] Failed to create gallery record ${i + 1}:`, galleryError);
          } else {
            uploadedGalleryItems.push(galleryItem);
          }
        } catch (err) {
          console.error(`[MAGAZINE] Error processing image ${i + 1}:`, err);
        }
      }

      console.log(`[MAGAZINE] Successfully uploaded ${uploadedGalleryItems.length}/${additionalImages.length} additional images`);
    }

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          catalog_id: coverCatalogId,
          title: project.title,
          event_date: project.release_date,
          cover_url: coverUpload.url,
          artifact_count: uploadedGalleryItems.length + 1, // +1 for cover
        },
        gallery_items: uploadedGalleryItems.length,
        metadata: {
          cover_size: cover.size,
          cover_compressed: coverWebp.sizeBytes,
          cover_catalog_id: coverCatalogId,
          additional_images: additionalImages.length,
          successfully_uploaded: uploadedGalleryItems.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[MAGAZINE] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve magazine upload statistics
 */
export async function GET(request: NextRequest) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

    const supabaseAuth = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
        db: {
          schema: 'lmsy_archive',
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get next catalog ID preview for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if there are any magazine items for today
    const { data: lastItem } = await supabaseAdmin
      .from('gallery')
      .select('catalog_id')
      .like('catalog_id', `LMSY-MAG-${today.replace(/-/g, '')}-%`)
      .order('catalog_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextCoverId = `LMSY-MAG-${today.replace(/-/g, '')}-000`;
    let nextPageSequence = 1;

    if (lastItem?.catalog_id) {
      // Parse the sequence from the last item
      const match = lastItem.catalog_id.match(/-(\d{3})$/);
      if (match) {
        const lastSequence = parseInt(match[1], 10);
        nextPageSequence = lastSequence + 1;
      }
    }

    // Get total magazine count
    const { count } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'magazine');

    return NextResponse.json({
      next_cover_catalog_id: nextCoverId,
      next_page_catalog_id: `LMSY-MAG-${today.replace(/-/g, '')}-${String(nextPageSequence).padStart(3, '0')}`,
      total_magazines: count || 0,
      today: today,
    });
  } catch (error: any) {
    console.error('[MAGAZINE_STATS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}
