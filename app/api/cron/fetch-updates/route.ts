/**
 * CRON: Automated Radar - Daily Data Collection
 *
 * Runs daily at 2 AM to:
 * 1. Fetch from preset RSS URLs
 * 2. Parse and filter entries with media (last 24 hours)
 * 3. Check duplicates by source_url
 * 4. Ingest new items (download to R2, AI translate, save to draft_items)
 *
 * Endpoint: GET /api/cron/fetch-updates
 * Schedule: Daily at 2 AM UTC (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// =====================================================
// RSS SOURCES CONFIGURATION
// =====================================================

interface RSSSource {
  name: string;
  platform: string;
  url: string;
  enabled: boolean;
}

// RSS 源配置 - 请在这里添加真实的 RSS URL
const RSS_SOURCES: RSSSource[] = [
  // NOTE: RSSHub is blocked by Cloudflare. For production, either:
  // 1. Host your own RSSHub instance
  // 2. Use a paid RSS service
  // 3. Find alternative RSS sources

  // ===== TESTING =====
  // NASA Image of the Day - Public RSS with reliable images
  {
    name: 'NASA IOTD Test',
    platform: 'manual',
    url: 'https://www.nasa.gov/rss/dyn/lg_image_of_the_day.rss',
    enabled: false,  // Enable for testing
  },

  // Weibo via RSSHub (BLOCKED BY CLOUDFLARE)
  {
    name: 'Q统计量',
    platform: 'weibo',
    url: 'https://rsshub.app/weibo/user/3991117808',
    enabled: false,  // Cloudflare blocks requests from servers
  },

  // Twitter / X via RSSHub (also likely blocked by Cloudflare)
  {
    name: 'Lookmhee Official',
    platform: 'twitter',
    url: 'https://rsshub.app/twitter/user/lookmhee_official',
    enabled: false,
  },
  {
    name: 'Sonya Official',
    platform: 'twitter',
    url: 'https://rsshub.app/twitter/user/sonya_official',
    enabled: false,
  },

  // Instagram via RSSHub (if available)
  // {
  //   name: 'Lookmhee Instagram',
  //   platform: 'instagram',
  //   url: 'https://rsshub.app/instagram/user/lookmhee',
  //   enabled: true,
  // },

  // Weibo via RSSHub
  // {
  //   name: 'Lookmhee Weibo',
  //   platform: 'weibo',
  //   url: 'https://rsshub.app/weibo/user/lookmhee',
  //   enabled: true,
  // },

  // Xiaohongshu via RSSHub
  // {
  //   name: 'Lookmhee Xiaohongshu',
  //   platform: 'xiaohongshu',
  //   url: 'https://rsshub.app/xiaohongshu/user/lookmhee',
  //   enabled: true,
  // },
];

// =====================================================
// RSS PARSING UTILITIES
// =====================================================

interface RSSEntry {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  enclosure?: {
    url: string;
    type: string;
  };
  media?: Array<{
    url: string;
    type: string;
  }>;
}

/**
 * Parse RSSHub JSON response
 */
function parseRSSHubJSON(data: any): RSSEntry[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((item: any) => ({
    title: item.title || '',
    link: item.url || item.link || '',
    description: item.description || item.summary || '',
    pubDate: item.date || item.pubDate || item.published || '',
    enclosure: item.enclosure,
    media: item.media_content || item.media,
  }));
}

/**
 * Parse XML RSS feed
 */
function parseRSSXML(xmlText: string): RSSEntry[] {
  const entries: RSSEntry[] = [];

  // Simple XML parsing - extract items using regex
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemPattern.exec(xmlText)) !== null) {
    const itemText = match[1];

    const titleMatch = itemText.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemText.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/);
    const descMatch = itemText.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const pubDateMatch = itemText.match(/<pubDate>(.*?)<\/pubDate>/);
    const enclosureMatch = itemText.match(/<enclosure\s+url="([^"]+)"/i);
    const mediaMatch = itemText.match(/<media:content\s+url="([^"]+)"/i);

    entries.push({
      title: titleMatch ? titleMatch[1].trim() : '',
      link: linkMatch ? linkMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
      enclosure: enclosureMatch ? { url: enclosureMatch[1], type: 'image/jpeg' } : undefined,
      media: mediaMatch ? [{ url: mediaMatch[1], type: 'image/jpeg' }] : undefined,
    });
  }

  return entries;
}

/**
 * Check if entry has media (image or video)
 */
function hasMedia(entry: RSSEntry): boolean {
  // Check enclosure
  if (entry.enclosure?.url) {
    const type = entry.enclosure.type || '';
    return type.startsWith('image/') || type.startsWith('video/');
  }

  // Check media elements
  if (entry.media && entry.media.length > 0) {
    return entry.media.some(m => {
      const type = m.type || '';
      return type.startsWith('image/') || type.startsWith('video/');
    });
  }

  // Check description for img/video tags
  if (entry.description) {
    return /<(img|video|iframe)/i.test(entry.description) ||
           /http.*\.(jpg|jpeg|png|gif|webp|mp4|webm)/i.test(entry.description);
  }

  return false;
}

/**
 * Extract media URL from entry
 */
function extractMediaURL(entry: RSSEntry): string | null {
  // Try enclosure first
  if (entry.enclosure?.url) {
    return entry.enclosure.url;
  }

  // Try media elements
  if (entry.media && entry.media.length > 0) {
    return entry.media[0].url;
  }

  // Try to extract from description
  if (entry.description) {
    // Look for img src
    const imgMatch = entry.description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];

    // Look for direct image URLs
    const urlMatch = entry.description.match(/(https?:\/\/[^\s"'>]+\.(?:jpg|jpeg|png|gif|webp|mp4|webm))/i);
    if (urlMatch) return urlMatch[1];
  }

  return null;
}

/**
 * Check if entry is within time window
 * NOTE: Extended to 30 days for testing purposes to ensure we capture data
 */
function isWithinLast24Hours(pubDate?: string): boolean {
  if (!pubDate) return true; // If no date, include it

  try {
    const entryDate = new Date(pubDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60);

    // Extended from 24 hours to 30 days (720 hours) for testing
    return hoursDiff <= 24 * 30 && hoursDiff >= 0;
  } catch {
    return true; // If date parsing fails, include it
  }
}

// =====================================================
// DUPLICATE CHECK
// =====================================================

/**
 * Check if source_url already exists in draft_items
 */
async function isDuplicate(sourceUrl: string): Promise<boolean> {
  try {
    const normalizedUrl = sourceUrl.split('?')[0].split('#')[0];

    const { data } = await supabaseAdmin
      .from('draft_items')
      .select('id')
      .eq('source_url', normalizedUrl)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

// =====================================================
// INGEST INTEGRATION
// =====================================================

/**
 * Ingest a new entry by calling the internal ingest logic
 */
async function ingestEntry(source: RSSSource, entry: RSSEntry, mediaUrl: string | null) {
  const ingestPayload = {
    source_url: entry.link,
    source_platform: source.platform,
    source_post_id: extractPostId(entry.link, source.platform),
    media_url: mediaUrl || undefined,
    media_type: mediaUrl?.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image',
    title: {
      en: entry.title,
      zh: '',
      th: '',
    },
    description: {
      en: stripHTML(entry.description || ''),
      zh: '',
      th: '',
    },
    event_date: entry.pubDate ? new Date(entry.pubDate).toISOString().split('T')[0] : undefined,
    raw_event_date: entry.pubDate || undefined,
    tags: [source.name],
  };

  // Call the ingest API internally
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INGEST_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(ingestPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Ingest failed');
  }

  return await response.json();
}

/**
 * Extract post ID from URL
 */
function extractPostId(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);

    switch (platform) {
      case 'twitter':
        const twitterMatch = urlObj.pathname.match(/status\/(\d+)/);
        return twitterMatch ? twitterMatch[1] : null;

      case 'instagram':
        const instaMatch = urlObj.pathname.match(/\/p\/([^\/]+)/);
        return instaMatch ? instaMatch[1] : null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// =====================================================
// MAIN CRON HANDLER
// =====================================================

export async function GET(request: NextRequest) {
  // Security: Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.nextUrl.searchParams.get('secret');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing or invalid cron secret' },
      { status: 401 }
    );
  }

  console.log('[CRON] ========== AUTOMATED RADAR STARTED ==========');
  console.log('[CRON] Time:', new Date().toISOString());

  const results = {
    total: 0,
    fetched: 0,
    filtered: 0,
    duplicates: 0,
    ingested: 0,
    failed: 0,
    sources: [] as Array<{
      name: string;
      url: string;
      entries: number;
      ingested: number;
    }>,
    errors: [] as Array<{
      source: string;
      error: string;
    }>,
  };

  // Process each RSS source
  for (const source of RSS_SOURCES) {
    if (!source.enabled) {
      console.log(`[CRON] ⏭️  Skipping disabled source: ${source.name}`);
      continue;
    }

    try {
      console.log(`[CRON] 📡 Fetching from: ${source.name} (${source.url})`);

      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'LMSY-Archive-Crawler/1.0',
        },
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let entries: RSSEntry[] = [];

      // Parse based on content type
      if (contentType.includes('json')) {
        const data = await response.json();
        entries = parseRSSHubJSON(data);
      } else {
        // Try XML
        const text = await response.text();
        entries = parseRSSXML(text);
      }

      console.log(`[CRON] ✅ Fetched ${entries.length} entries from ${source.name}`);
      results.fetched += entries.length;

      // Filter and ingest entries
      let sourceIngested = 0;
      const MAX_ENTRIES_PER_SOURCE = 2; // STRICT LIMIT FOR TESTING

      for (const entry of entries) {
        results.total++;

        // Check if we've reached the limit
        if (sourceIngested >= MAX_ENTRIES_PER_SOURCE) {
          console.log(`[CRON] ⏹️  Reached limit of ${MAX_ENTRIES_PER_SOURCE} entries for ${source.name}, stopping`);
          break;
        }

        // Check date filter (last 24 hours)
        if (!isWithinLast24Hours(entry.pubDate)) {
          console.log(`[CRON] ⏰ Skipped (too old): ${entry.title?.substring(0, 50)}...`);
          continue;
        }

        // Check for media
        if (!hasMedia(entry)) {
          console.log(`[CRON] 🚫 Skipped (no media): ${entry.title?.substring(0, 50)}...`);
          results.filtered++;
          continue;
        }

        // Check duplicate
        const duplicate = await isDuplicate(entry.link);
        if (duplicate) {
          console.log(`[CRON] ♻️  Duplicate skipped: ${entry.link}`);
          results.duplicates++;
          continue;
        }

        // Extract media URL
        const mediaUrl = extractMediaURL(entry);

        // Ingest
        try {
          await ingestEntry(source, entry, mediaUrl);
          console.log(`[CRON] ✅ Ingested: ${entry.title?.substring(0, 50)}...`);
          sourceIngested++;
          results.ingested++;
        } catch (error) {
          console.error(`[CRON] ❌ Ingest failed for: ${entry.link}`, error);
          results.failed++;
          results.errors.push({
            source: source.name,
            error: `${entry.link}: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      results.sources.push({
        name: source.name,
        url: source.url,
        entries: entries.length,
        ingested: sourceIngested,
      });

    } catch (error) {
      console.error(`[CRON] ❌ Source failed: ${source.name}`, error);
      results.errors.push({
        source: source.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log('[CRON] ========== AUTOMATED RADAR COMPLETE ==========');
  console.log('[CRON] Results:', JSON.stringify(results, null, 2));

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

/**
 * POST endpoint for manual triggering
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing or invalid cron secret' },
      { status: 401 }
    );
  }

  // Call GET handler
  return GET(request);
}
