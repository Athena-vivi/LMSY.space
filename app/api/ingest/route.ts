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
  downloadAndSaveToR2,
  detectPlatformFromUrl,
  detectMediaTypeFromUrl,
} from '@/lib/media-downloader';
import { translateDraftItem } from '@/lib/ai-translator';

/**
 * 验证 Bearer Token
 */
function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  // 接受 service role key 或自定义 ingest key
  const validTokens = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.INGEST_API_KEY,
  ].filter(Boolean);

  return validTokens.includes(token);
}

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
  console.log('[INGEST_API] Received request');

  // 1. 验证认证
  if (!validateAuth(request)) {
    console.warn('[INGEST_API] Unauthorized request');
    return NextResponse.json<IngestApiResponse>(
      {
        success: false,
        draft_item_id: null,
        status: null,
        ingestion_stage: null,
        message: 'Unauthorized',
        error: 'Invalid or missing authorization token',
      },
      { status: 401 }
    );
  }

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
    source_url: body.source_url,
    source_platform: body.source_platform,
    has_media_url: !!body.media_url,
  });

  try {
    // 4. 下载并保存媒体（如果提供了 media_url）
    // 先下载以获取 file_hash 进行去重检查
    let r2Url: string | null = null;
    let r2Key: string | null = null;
    let fileHash: string | null = null;
    let mediaMetadata: any = null;
    let detectedMediaType: 'image' | 'video' = body.media_type || 'image';

    if (body.media_url) {
      console.log('[INGEST_API] Downloading media from:', body.media_url);

      const downloadResult = await downloadAndSaveToR2(
        body.media_url,
        body.source_platform,
        { timeout: 60000, maxSize: 50 * 1024 * 1024 }
      );

      if (downloadResult.success) {
        r2Url = downloadResult.r2Url || null;
        r2Key = downloadResult.r2Key || null;
        fileHash = downloadResult.fileHash || null;
        mediaMetadata = downloadResult.metadata || null;
        detectedMediaType = downloadResult.mediaType || 'image';

        console.log('[INGEST_API] Media saved to R2:', {
          r2Url,
          r2Key,
          fileHash: fileHash?.substring(0, 16) + '...', // 只打印前16个字符
        });

        // 5. 终极去重检查 - 基于 file_hash
        if (fileHash) {
          const { isDuplicate, existingItem } = await checkDuplicateByFileHash(fileHash);

          if (isDuplicate) {
            // 文件已存在，优雅返回
            console.log('[INGEST_API] File already exists, returning gracefully');
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
      } else {
        console.warn('[INGEST_API] Media download failed:', downloadResult.error);
      }
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
    if (createError?.message?.includes('unique constraint') ||
        createError?.message?.includes('idx_draft_items_file_hash_unique')) {
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
      throw new Error(`Failed to create draft: ${createError?.message}`);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[INGEST_API] Error:', errorMessage);

    // 检查是否是唯一约束冲突
    if (errorMessage.includes('unique constraint') ||
        errorMessage.includes('idx_draft_items_file_hash_unique')) {
      return NextResponse.json<IngestApiResponse>(
        {
          success: true,
          draft_item_id: null,
          status: 'draft',
          ingestion_stage: 'duplicate' as IngestionStage,
          message: '图片已存在于库中，跳过抓取',
          is_duplicate: true,
          error: errorMessage,
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
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest - 健康检查
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'LMSY Ingest API',
    version: '2.0.0 (Ultimate Deduplication)',
    timestamp: new Date().toISOString(),
  });
}
