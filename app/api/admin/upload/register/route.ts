import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAdminEmail } from '@/lib/security/api-auth';
import { validateObjectKey } from '@/lib/security/upload-guard';
import { apiServerError } from '@/lib/security/http';

// Object-key prefixes this route is allowed to register.
const ALLOWED_R2_PREFIXES = ['draft/', 'magazines/', 'gallery/'];

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://e5b4187c5c945697f59cdf3cc036cb98.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function rollbackR2Upload(imageUrl: string): Promise<void> {
  try {
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1);
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: 'lmsy-archive',
        Key: key,
      })
    );
  } catch (error) {
    console.error('[UPLOAD_REGISTER] Failed to rollback R2 file:', error);
  }
}

async function verifyR2FileExists(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
  if (authResult.user.email !== adminEmail) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  let draftRecordId: string | null = null;

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
    } = body;

    if (!catalogId || !imageUrl || !eventDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['catalogId', 'imageUrl', 'eventDate'],
        },
        { status: 400 }
      );
    }

    // This route registers an already-uploaded object, so validate the
    // client-supplied R2 key (derived from imageUrl) instead of a File.
    let r2Key: string;
    try {
      r2Key = new URL(imageUrl).pathname.replace(/^\/+/, '');
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid image URL' },
        { status: 400 }
      );
    }

    const keyValidation = validateObjectKey(r2Key, ALLOWED_R2_PREFIXES);
    if (!keyValidation.ok) {
      return NextResponse.json(
        { success: false, error: keyValidation.error },
        { status: keyValidation.status }
      );
    }

    const fileExists = await verifyR2FileExists(imageUrl);
    if (!fileExists) {
      return NextResponse.json(
        {
          error: 'File verification failed',
          details: `Uploaded file not found in R2: ${imageUrl}`,
        },
        { status: 400 }
      );
    }

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
        { error: 'Year mismatch', catalogYear, eventYear },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .insert({
        source_platform: 'manual',
        source_url: null,
        source_post_id: catalogId,
        r2_media_url: imageUrl,
        r2_key: r2Key,
        media_type: 'image',
        media_metadata: {},
        title: { en: caption || '', zh: '', th: '' },
        description: { en: '', zh: '', th: '' },
        event_date: eventDate,
        raw_event_date: eventDate,
        status: 'draft',
        ingestion_stage: 'ready',
        ai_translation_status: 'skipped',
        curator_note: null,
        tags: tag ? [tag] : [],
        is_featured: isFeatured || false,
        project_id: projectId && projectId !== '' ? projectId : null,
      })
      .select()
      .single();

    if (error || !data) {
      await rollbackR2Upload(imageUrl);
      throw new Error(error?.message || 'Draft insert failed');
    }

    draftRecordId = data.id;

    return NextResponse.json({
      success: true,
      data: {
        id: draftRecordId,
        catalog_id: catalogId,
        image_url: imageUrl,
        event_date: eventDate,
        project_id: projectId || null,
      },
      _atomic: {
        draft_record: true,
      },
    });
  } catch (error) {
    if (draftRecordId) {
      try {
        await getSupabaseAdmin().from('draft_items').delete().eq('id', draftRecordId);
      } catch (rollbackError) {
        console.error('[UPLOAD_REGISTER] Failed to rollback draft record:', rollbackError);
      }
    }

    return apiServerError('admin/upload/register', error);
  }
}
