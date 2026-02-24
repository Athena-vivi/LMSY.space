/**
 * Telegram Webhook API
 *
 * Receives updates from Telegram Bot API when users send messages to the bot.
 * Extracts photos and captions, then processes them through the main pipeline:
 * - Download to R2
 * - AI Translation
 * - Save to draft_items
 *
 * Telegram Webhook docs: https://core.telegram.org/bots/api#update
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { downloadAndSaveToR2 } from '@/lib/media-downloader';
import { translateDraftItem } from '@/lib/ai-translator';

// =====================================================
// TYPES
// =====================================================

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  width: number;
  height: number;
}

interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

interface TelegramWebhookRequest {
  updates?: TelegramUpdate[];
}

interface GetFileResponse {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path: string;
  };
}

// =====================================================
// CONFIGURATION
// =====================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  console.warn('[TELEGRAM_WEBHOOK] TELEGRAM_BOT_TOKEN not set in environment');
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get file info from Telegram Bot API
 * Returns the file_path which can be used to construct the download URL
 */
async function getTelegramFileInfo(fileId: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[TELEGRAM_WEBHOOK] No bot token configured');
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });

    const data: GetFileResponse = await response.json();

    if (data.ok && data.result?.file_path) {
      return data.result.file_path;
    }

    console.error('[TELEGRAM_WEBHOOK] getFile failed:', data);
    return null;
  } catch (error) {
    console.error('[TELEGRAM_WEBHOOK] Error calling getFile:', error);
    return null;
  }
}

/**
 * Build direct download URL from file path
 * Format: https://api.telegram.org/file/bot<TOKEN>/<file_path>
 */
function buildTelegramFileUrl(filePath: string): string {
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
}

/**
 * Get highest resolution photo from photo array
 * Telegram sends photos in multiple sizes, last one is highest resolution
 */
function getLargestPhoto(photo: TelegramPhotoSize[]): TelegramPhotoSize | null {
  if (!photo || photo.length === 0) return null;
  // Last photo in array has highest resolution
  return photo[photo.length - 1];
}

/**
 * Extract text content from message
 */
function extractMessageText(message: TelegramMessage): string {
  return message.caption || message.text || '';
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  return url.split('?')[0].split('#')[0];
}

/**
 * Check if file already exists by file_hash
 */
async function checkDuplicateByFileHash(
  fileHash: string
): Promise<{ isDuplicate: boolean; existingItem?: any }> {
  if (!fileHash) return { isDuplicate: false };

  const { data, error } = await supabaseAdmin
    .from('draft_items')
    .select('id, source_url, title')
    .eq('file_hash', fileHash)
    .maybeSingle();

  if (!error && data) {
    console.log('[TELEGRAM_WEBHOOK] Duplicate by file_hash:', fileHash.substring(0, 16));
    return { isDuplicate: true, existingItem: data };
  }

  return { isDuplicate: false };
}

// =====================================================
// MAIN HANDLERS
// =====================================================

/**
 * POST /api/webhooks/telegram
 * Main webhook handler - receives updates from Telegram
 */
export async function POST(request: NextRequest) {
  console.log('[TELEGRAM_WEBHOOK] Received update');

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'Telegram bot not configured' },
      { status: 500 }
    );
  }

  try {
    // Parse the update (Telegram sends either a single update or array)
    const body = await request.json();
    const updates: TelegramUpdate[] = Array.isArray(body) ? body : [body];

    console.log(`[TELEGRAM_WEBHOOK] Processing ${updates.length} update(s)`);

    const results = {
      processed: 0,
      ingested: 0,
      skipped: 0,
      errors: [] as Array<{ update_id: number; error: string }>,
    };

    for (const update of updates) {
      try {
        // Get message from various possible fields
        // Note: channel_post is for messages in channels (when bot is added to a channel)
        const message = update.message ||
                       update.edited_message ||
                       update.channel_post ||
                       update.edited_channel_post;

        if (!message) {
          console.log(`[TELEGRAM_WEBHOOK] Update ${update.update_id} has no message, skipping`);
          results.skipped++;
          continue;
        }

        // Determine message type for better logging
        const messageType = update.message ? 'message' :
                           update.edited_message ? 'edited_message' :
                           update.channel_post ? 'channel_post' :
                           update.edited_channel_post ? 'edited_channel_post' : 'unknown';

        const chatType = message.chat.type; // 'private', 'group', 'supergroup', 'channel'
        const chatName = message.chat.title || message.chat.username || message.chat.first_name || 'Unknown';

        console.log(`[TELEGRAM_WEBHOOK] Processing ${messageType} from ${chatType} "${chatName}" (id: ${message.chat.id})`);

        // Extract photo (must have photo)
        const largestPhoto = getLargestPhoto(message.photo || []);
        if (!largestPhoto) {
          console.log(`[TELEGRAM_WEBHOOK] No photo in message, skipping`);
          results.skipped++;
          continue;
        }

        // Extract text content (optional - use default if missing)
        let text = extractMessageText(message);
        if (!text) {
          // Use default text for images without caption
          const date = new Date(message.date * 1000);
          text = `Photo from ${chatName} - ${date.toLocaleDateString()}`;
          console.log(`[TELEGRAM_WEBHOOK] No caption, using default text: "${text}"`);
        }

        console.log(`[TELEGRAM_WEBHOOK] Found photo: ${largestPhoto.file_id} (${largestPhoto.width}x${largestPhoto.height})`);

        // Get file info from Telegram
        const filePath = await getTelegramFileInfo(largestPhoto.file_id);
        if (!filePath) {
          console.error('[TELEGRAM_WEBHOOK] Failed to get file path');
          results.errors.push({ update_id: update.update_id, error: 'Failed to get file path' });
          continue;
        }

        // Build direct download URL
        const mediaUrl = buildTelegramFileUrl(filePath);
        console.log('[TELEGRAM_WEBHOOK] Media URL:', mediaUrl);

        // Download media to R2
        console.log('[TELEGRAM_WEBHOOK] Downloading to R2...');
        const downloadResult = await downloadAndSaveToR2(
          mediaUrl,
          'telegram',
          { timeout: 60000, maxSize: 50 * 1024 * 1024 }
        );

        if (!downloadResult.success) {
          console.error('[TELEGRAM_WEBHOOK] Download failed:', downloadResult.error);
          results.errors.push({ update_id: update.update_id, error: downloadResult.error || 'Download failed' });
          continue;
        }

        const r2Url = downloadResult.r2Url || null;
        const r2Key = downloadResult.r2Key || null;
        const fileHash = downloadResult.fileHash || null;

        console.log('[TELEGRAM_WEBHOOK] Downloaded to R2:', r2Key);

        // Check for duplicates
        if (fileHash) {
          const { isDuplicate, existingItem } = await checkDuplicateByFileHash(fileHash);
          if (isDuplicate) {
            console.log('[TELEGRAM_WEBHOOK] File already exists, skipping');
            results.skipped++;
            continue;
          }
        }

        // Create source URL (use telegram URL format for reference)
        // For channels: https://t.me/channel_username/msg_id
        // For private/group: https://t.me/c/chat_id/msg_id
        const sourceUrl = `https://t.me/${message.chat.username || `c/${message.chat.id}`}/${message.message_id}`;

        // Build tags: include chat type and channel name for better organization
        const tags = [
          'Telegram',
          chatType === 'channel' ? 'Channel' : chatType,
          chatName
        ];

        // Create draft item
        const { data: newDraft, error: createError } = await supabaseAdmin
          .from('draft_items')
          .insert({
            source_url: normalizeUrl(sourceUrl),
            source_platform: 'telegram',
            source_post_id: String(message.message_id),
            status: 'draft',
            ingestion_stage: 'translating',
            title: { en: text, zh: '', th: '' },
            description: { en: '', zh: '', th: '' },
            event_date: new Date(message.date * 1000).toISOString().split('T')[0],
            raw_event_date: new Date(message.date * 1000).toISOString(),
            tags,
            media_type: 'image',
            r2_media_url: r2Url,
            r2_key: r2Key,
            file_hash: fileHash,
            media_metadata: downloadResult.metadata || {
              width: largestPhoto.width,
              height: largestPhoto.height,
              duration: null,
              size: largestPhoto.file_size || null,
              format: null,
            },
          })
          .select('id')
          .single();

        if (createError || !newDraft) {
          console.error('[TELEGRAM_WEBHOOK] Failed to create draft:', createError);
          results.errors.push({ update_id: update.update_id, error: createError?.message || 'Failed to create draft' });
          continue;
        }

        const draftId = newDraft.id;
        console.log('[TELEGRAM_WEBHOOK] Created draft:', draftId);

        // AI Translation
        console.log('[TELEGRAM_WEBHOOK] Starting AI translation...');
        const translationResult = await translateDraftItem(
          text,
          null,  // No description for telegram posts
          { sourcePlatform: 'telegram' }
        );

        if (translationResult.success) {
          await supabaseAdmin
            .from('draft_items')
            .update({
              title: translationResult.title || { en: text, zh: '', th: '' },
              description: translationResult.description || { en: '', zh: '', th: '' },
              ai_translation_status: 'completed',
              ai_translation_model: translationResult.model || null,
              ai_processed_at: new Date().toISOString(),
            })
            .eq('id', draftId);

          console.log('[TELEGRAM_WEBHOOK] Translation completed');
        } else {
          await supabaseAdmin
            .from('draft_items')
            .update({
              ai_translation_status: 'failed',
              ai_translation_error: translationResult.error || null,
            })
            .eq('id', draftId);

          console.warn('[TELEGRAM_WEBHOOK] Translation failed:', translationResult.error);
        }

        // Mark as ready
        await supabaseAdmin
          .from('draft_items')
          .update({ ingestion_stage: 'ready' })
          .eq('id', draftId);

        console.log('[TELEGRAM_WEBHOOK] ✅ Successfully processed update', update.update_id);
        results.processed++;
        results.ingested++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[TELEGRAM_WEBHOOK] Error processing update ${update.update_id}:`, errorMessage);
        results.errors.push({ update_id: update.update_id, error: errorMessage });
      }
    }

    return NextResponse.json({
      ok: true,
      results,
    });

  } catch (error) {
    console.error('[TELEGRAM_WEBHOOK] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/telegram
 * Health check & webhook info
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'LMSY Telegram Webhook',
    version: '1.0.0',
    configured: !!TELEGRAM_BOT_TOKEN,
    instructions: [
      '1. Set TELEGRAM_BOT_TOKEN in .env.local',
      '2. Expose this endpoint to the internet (ngrok, Cloudflare Tunnel, or deploy)',
      '3. Register webhook with Telegram:',
      `   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d "url=https://your-domain.com/api/webhooks/telegram"`,
    ],
  });
}
