/**
 * Ingest API - 核心数据摄入接口 (终极去重版本)
 *
 * 由 OpenClaw Agent 调用，用于:
 * 1. 接收社交媒体 URL
 * 2. 下载媒体并上传到 R2 (计算 SHA256 哈希)
 * 3. 基于 file_hash 检查重复
 * 4. AI 翻译生成多语言内容
 * 5. 存入草稿箱数据库
 *
 * Endpoint: POST /api/ingest
 * Authentication: Bearer token (service role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  IngestApiRequest,
  IngestApiResponse,
  DraftItemStatus,
  IngestionStage,
} from '@/lib/supabase/types';
import {
  downloadMedia,
  saveDownloadToR2,
  isImageType,
  detectPlatformFromUrl,
  detectMediaTypeFromUrl,
  maskUrlForLog,
} from '@/lib/media-downloader';
import { translateDraftItem } from '@/lib/ai-translator';
import { requireMachineKey } from '@/lib/security/machine-auth';
import { describeError } from '@/lib/security/http';
import { isDuplicateFileHash } from '@/lib/catalog-id';

/**
 * URL 清洗函数 - 去除查询参数和片段
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  // 移除查询参数 (?xxx) 和片段 (#xxx)
  return url.split('?')[0].split('#')[0];
}

/**
 * 检查 file_hash 是否已存在（终极去重）
 */
async function checkDuplicateByFileHash(
  fileHash: string
): Promise<{ isDuplicate: boolean; existingItem?: any }> {
  const { data, error } = await supabaseAdmin
    .from('draft_items')
    .select('id, source_url, title, status')
    .eq('file_hash', fileHash)
    .maybeSingle();

  if (!error && data) {
    console.log('[INGEST_API] Duplicate by file_hash:', fileHash);
    return { isDuplicate: true, existingItem: data };
  }

  return { isDuplicate: false };
}

/**
 * 构建 MultilingualContent 对象
 */
function buildMultilingualContent(
  partial?: Record<string, string>
): { en: string; zh: string; th: string } {
  return {
    en: partial?.en || '',
    zh: partial?.zh || '',
    th: partial?.th || '',
  };
}

/**
 * POST /api/ingest - 主入口
 */
export async function POST(request: NextRequest) {
  // SECURITY: constant-time machine key check. Runs BEFORE parsing the body
  // or touching Supabase/R2. Fails closed (503) when neither secret is set.
  // The legacy "key" query parameter is still accepted (logged as deprecated),
  // and SUPABASE_SERVICE_ROLE_KEY stays as a fallback for the existing cron caller.
  const auth = requireMachineKey(request, {
    envVars: ['INGEST_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    secretHeader: 'x-ingest-key',
    queryParam: 'key',
    label: 'ingest api',
  });
  if (!auth.ok) return auth.response;

  console.log('[INGEST_API] Received request');

  // 2. 解析请求体
  let body: IngestApiRequest;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json<IngestApiResponse>(
      {
        success: false,
        draft_item_id: null,
        status: null,
        ingestion_stage: null,
        message: 'Invalid request body',
        error: 'Request body must be valid JSON',
      },
      { status: 400 }
    );
  }

  // 3. 验证必填字段
  if (!body.source_url || !body.source_platform) {
    return NextResponse.json<IngestApiResponse>(
      {
        success: false,
        draft_item_id: null,
        status: null,
        ingestion_stage: null,
        message: 'Missing required fields',
        error: 'source_url and source_platform are required',
      },
      { status: 400 }
    );
  }

  console.log('[INGEST_API] Processing:', {
    source_url: maskUrlForLog(body.source_url),
    source_platform: body.source_platform,
    has_media_url: !!body.media_url,
  });

  try {
    // 4. Download media (B2-T4: download -> dedupe -> upload, in that order.
    // The previous order uploaded first and deduped afterwards, so every
    // duplicate capture left an unreferenced object in R2.)
    let r2Url: string | null = null;
    let r2Key: string | null = null;
    let fileHash: string | null = null;
    let mediaMetadata: any = null;
    let detectedMediaType: 'image' | 'video' = body.media_type || 'image';

    if (body.media_url) {
      console.log('[INGEST_API] Downloading media from:', maskUrlForLog(body.media_url));

      const download = await downloadMedia(
        body.media_url,
        { timeout: 60000, maxSize: 50 * 1024 * 1024 }
      );

      if (!download.success || !download.buffer) {
        // PHASE 1 FIX (P1-5): a failed download must NOT be reported as a
        // successful capture, and must not create a media-less draft. Return a
        // retryable error and stop before touching the database.
        console.warn('[INGEST_API] Media download failed (no draft created):', download.error);
        return NextResponse.json(
          {
            success: false,
            error: 'Media download failed',
            detail: download.error || null,
            ingestion_stage: 'download_failed',
            retryable: true,
            processed_count: 0,
          },
          { status: 502 }
        );
      }

      fileHash = download.fileHash || null;
      mediaMetadata = download.metadata || null;
      detectedMediaType = isImageType(download.contentType || '') ? 'image' : 'video';

      // Log the hash prefix only - never log full (possibly signed) media URLs.
      console.log('[INGEST_API] Media downloaded:', {
        size: download.size,
        fileHash: fileHash?.substring(0, 16) + '...', // 只打印前16个字符
      });

      // 5. Dedupe by file hash BEFORE uploading anything to R2.
      if (fileHash) {
        const { isDuplicate, existingItem } = await checkDuplicateByFileHash(fileHash);

        if (isDuplicate) {
          // 文件已存在，优雅返回（nothing was uploaded - no orphan possible）
          console.log('[INGEST_API] File already exists, returning gracefully (nothing uploaded)');
          return NextResponse.json<IngestApiResponse>(
            {
              success: true,  // 注意：返回 true 而不是 false
              draft_item_id: existingItem?.id || null,
              status: existingItem?.status || 'draft',
              ingestion_stage: 'duplicate' as IngestionStage,
              message: '图片已存在于库中，跳过抓取',
              is_duplicate: true,
              existing_item: {
                id: existingItem?.id,
                title: existingItem?.title,
                source_url: existingItem?.source_url,
              },
            },
            { status: 200 }  // 返回 200 而不是 409
          );
        }
      }

      // 6. Upload to R2 only after the dedupe check passed.
      const saved = await saveDownloadToR2(
        {
          buffer: download.buffer,
          contentType: download.contentType,
          fileName: download.fileName,
          fileHash: download.fileHash,
          metadata: download.metadata,
        },
        body.source_platform
      );
      if (!saved.ok) {
        console.warn('[INGEST_API] R2 upload failed (no draft created):', saved.error);
        return NextResponse.json(
          {
            success: false,
            error: 'R2 upload failed',
            detail: saved.error,
            ingestion_stage: 'failed',
            retryable: true,
            processed_count: 0,
          },
          { status: 502 }
        );
      }
      r2Url = saved.r2Url;
      r2Key = saved.r2Key;
    }

    // 6. 创建初始草稿记录
    const initialTitle = buildMultilingualContent(body.title);
    const initialDescription = buildMultilingualContent(body.description);

    const { data: newDraft, error: createError } = await supabaseAdmin
      .from('draft_items')
      .insert({
        source_url: normalizeUrl(body.source_url), // 保存清洗后的 URL
        source_platform: body.source_platform,
        source_post_id: body.source_post_id || null,
        status: 'draft' as DraftItemStatus,
        ingestion_stage: 'translating' as IngestionStage,
        title: initialTitle,
        description: initialDescription,
        event_date: body.event_date || null,
        raw_event_date: body.raw_event_date || null,
        tags: body.tags || [],
        media_type: detectedMediaType,
        r2_media_url: r2Url,
        r2_key: r2Key,
        file_hash: fileHash,  // 保存文件哈希
        media_metadata: mediaMetadata || {
          width: null,
          height: null,
          duration: null,
          size: null,
          format: null,
        },
      })
      .select('id')
      .single();

    // 检查唯一约束冲突（file_hash 重复）
    // Uses the shared helper so both the constraint name and the 23505 code
    // created by the new partial unique index are recognised.
    if (isDuplicateFileHash(createError)) {
      console.log('[INGEST_API] Unique constraint violation - file already exists');

      // 查找已存在的记录
      const { data: existingItem } = await supabaseAdmin
        .from('draft_items')
        .select('id, status, title, source_url')
        .eq('file_hash', fileHash)
        .single();

      return NextResponse.json<IngestApiResponse>(
        {
          success: true,
          draft_item_id: existingItem?.id || null,
          status: existingItem?.status || 'draft',
          ingestion_stage: 'duplicate' as IngestionStage,
          message: '图片已存在于库中，跳过抓取',
          is_duplicate: true,
          existing_item: {
            id: existingItem?.id,
            title: existingItem?.title,
            source_url: existingItem?.source_url,
          },
        },
        { status: 200 }
      );
    }

    if (createError || !newDraft) {
      // PHASE 1 FIX: the upload/write pair is not atomic. If the object was
      // written to R2 but the draft row could not be created, remove the object
      // so the bucket does not accumulate orphans that no record points at.
      // Only the object we just created is touched, never a pre-existing one.
      if (r2Key) {
        try {
          const { deleteFromR2 } = await import('@/lib/r2-client');
          const removed = await deleteFromR2(r2Key);
          console.warn(`[INGEST_API] insert failed, compensating delete of ${r2Key}: ${removed ? 'removed' : 'not removed'}`);
        } catch (cleanupError) {
          console.error('[INGEST_API] compensating delete failed:', describeError(cleanupError));
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create draft record',
          ingestion_stage: 'db_write_failed',
          retryable: true,
          processed_count: 0,
        },
        { status: 500 }
      );
    }

    const draftId = newDraft.id;
    console.log('[INGEST_API] Created draft:', draftId);

    // 7. AI 翻译（如果提供了原始文本）
    const hasOriginalText = !!(body.title?.en || body.description?.en || body.original_text);

    if (hasOriginalText) {
      console.log('[INGEST_API] Starting AI translation');

      const originalTitle = body.title?.en || Object.values(body.title || {})[0] || '';
      const originalDescription = body.description?.en || Object.values(body.description || {})[0] || body.original_text || '';

      const translationResult = await translateDraftItem(
        originalTitle || null,
        originalDescription || null,
        {
          sourcePlatform: body.source_platform,
        }
      );

      if (translationResult.success) {
        // 更新翻译结果
        await supabaseAdmin
          .from('draft_items')
          .update({
            title: translationResult.title || initialTitle,
            description: translationResult.description || initialDescription,
            ai_translation_status: 'completed',
            ai_translation_model: translationResult.model || null,
            ai_processed_at: new Date().toISOString(),
          })
          .eq('id', draftId);

        console.log('[INGEST_API] Translation completed');
      } else {
        // 翻译失败，记录错误但不阻止流程
        await supabaseAdmin
          .from('draft_items')
          .update({
            ai_translation_status: 'failed',
            ai_translation_error: translationResult.error || null,
          })
          .eq('id', draftId);

        console.warn('[INGEST_API] Translation failed:', translationResult.error);
      }
    } else {
      // 没有原始文本，跳过翻译
      await supabaseAdmin
        .from('draft_items')
        .update({
          ai_translation_status: 'skipped',
        })
        .eq('id', draftId);
    }

    // 8. 标记为 ready
    await supabaseAdmin
      .from('draft_items')
      .update({
        ingestion_stage: 'ready' as IngestionStage,
      })
      .eq('id', draftId);

    console.log('[INGEST_API] Draft item ready:', draftId);

    // 9. 返回成功响应
    return NextResponse.json<IngestApiResponse>(
      {
        success: true,
        draft_item_id: draftId,
        status: 'draft',
        ingestion_stage: 'ready',
        message: 'Draft item created and processed successfully',
        is_duplicate: false,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('[INGEST_API] Error:', describeError(error));

    // 检查是否是唯一约束冲突
    if (isDuplicateFileHash(error)) {
      return NextResponse.json<IngestApiResponse>(
        {
          success: true,
          draft_item_id: null,
          status: 'draft',
          ingestion_stage: 'duplicate' as IngestionStage,
          message: '图片已存在于库中，跳过抓取',
          is_duplicate: true,
          error: describeError(error),
        },
        { status: 200 }
      );
    }

    return NextResponse.json<IngestApiResponse>(
      {
        success: false,
        draft_item_id: null,
        status: null,
        ingestion_stage: null,
        message: 'Internal server error',
        error: describeError(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest - 健康检查
 */
export async function GET(request: NextRequest) {
  // SECURITY: machine key check (same options as POST).
  const auth = requireMachineKey(request, {
    envVars: ['INGEST_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    secretHeader: 'x-ingest-key',
    queryParam: 'key',
    label: 'ingest api',
  });
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    status: 'ok',
    service: 'LMSY Ingest API',
    version: '2.0.0 (Ultimate Deduplication)',
    timestamp: new Date().toISOString(),
  });
}
