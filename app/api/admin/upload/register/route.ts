import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/lib/security/api-auth';
import { purgeCdnUrls } from '@/lib/cloudflare-purge';
import { validateObjectKey } from '@/lib/security/upload-guard';
import { apiServerError } from '@/lib/security/http';
import { buildManualDraftRecord } from '@/lib/manual-draft';
import { isValidCatalogId, parseCatalogId } from '@/lib/catalog-id';

// Object-key prefixes this route is allowed to register.
// Canonical layout is <person>/<door>/<year>/ (naming spec section 7);
// 'magazines/' is the legacy layout, kept until the old objects are retired.
const ALLOWED_R2_PREFIXES = ['lmsy/', 'lm/', 'sy/', 'draft/', 'magazines/', 'gallery/'];

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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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

    if (!isValidCatalogId(catalogId)) {
      return NextResponse.json(
        {
          error: 'Invalid catalog ID format',
          expected: '<PERSON>-<DOOR>-<SUBJECT>[-<THEME>]-<YYYYMMDD>-<NNN>',
          example: 'LMSY-MAG-THER-HEARTBEATFORYOU-20250801-001',
          catalogId,
        },
        { status: 400 }
      );
    }

    const catalogYear = parseCatalogId(catalogId)?.date?.substring(0, 4) ?? null;
    const eventYear = new Date(eventDate).getFullYear().toString();
    if (catalogYear !== eventYear) {
      return NextResponse.json(
        { error: 'Year mismatch', catalogYear, eventYear },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Phase 3: shared manual-draft payload (lib/manual-draft.ts). The previous
    // inline insert wrote source_platform='manual' with source_url=null, which
    // violates the draft_items_source_platform_required CHECK and made every
    // registration fail; both stay NULL here and 'manual' lives in tags[0].
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .insert(
        buildManualDraftRecord({
          catalogId,
          r2Key,
          imageUrl,
          eventDate,
          caption: caption || null,
          tag: tag || null,
          projectId: projectId || null,
          isFeatured: isFeatured || false,
        })
      )
      .select()
      .single();

    if (error || !data) {
      await rollbackR2Upload(imageUrl);
      throw new Error(error?.message || 'Draft insert failed');
    }

    draftRecordId = data.id;

    // Browser-direct upload: the key comes from the client-supplied catalog
    // id, so an overwrite is possible - drop the stale edge copy.
    await purgeCdnUrls([r2Key]);

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
