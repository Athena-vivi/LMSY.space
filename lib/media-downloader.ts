/**
 * Media Downloader Service
 *
 * 用于从社交媒体 URL 下载媒体文件（图片/视频）
 * 注意：此文件仅限服务端使用
 */

// 🔒 SECURITY: Server-side only
if (typeof window !== 'undefined') {
  throw new Error(
    'CRITICAL SECURITY ERROR: Media downloader must only be used on the server side.'
  );
}

import sharp from 'sharp';
import { createHash } from 'crypto';

/**
 * 媒体下载结果接口
 */
export interface MediaDownloadResult {
  success: boolean;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
  extension?: string;
  size?: number;
  fileHash?: string;  // SHA256 哈希（用于去重）
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // 视频时长（秒）
    format?: string;
  };
  error?: string;
}

/**
 * 支持的图片扩展名
 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif'];

/**
 * 支持的视频扩展名
 */
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];

/**
 * User-Agent 池（模拟真实浏览器访问）
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

/**
 * 随机获取 User-Agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 根据内容类型推断文件扩展名
 */
function getExtensionFromContentType(contentType: string): string | null {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
  };

  return typeMap[contentType] || null;
}

/**
 * 从 URL 中提取文件扩展名
 */
function getExtensionFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 匹配最后的扩展名（如 .jpg, .png, .mp4）
    const match = pathname.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext)) {
        return ext;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 判断是否为图片类型
 */
export function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/');
}

/**
 * 判断是否为视频类型
 */
export function isVideoType(contentType: string): boolean {
  return contentType.startsWith('video/');
}

/**
 * 从 URL 下载媒体文件
 *
 * @param url - 媒体文件 URL
 * @param options - 下载选项
 * @returns 下载结果
 */
export async function downloadMedia(
  url: string,
  options: {
    timeout?: number; // 超时时间（毫秒）
    maxSize?: number; // 最大文件大小（字节）
    userAgent?: string; // 自定义 User-Agent
    referer?: string; // 自定义 Referer（用于防盗链）
  } = {}
): Promise<MediaDownloadResult> {
  const { timeout = 30000, maxSize = 50 * 1024 * 1024 } = options;

  console.log(`[DOWNLOADER] Starting download: ${url}`);

  try {
    // 验证 URL
    new URL(url);

    // 构建请求头
    const headers: Record<string, string> = {
      'User-Agent': options.userAgent || getRandomUserAgent(),
      'Accept': 'image/*,video/*,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    // 添加 Referer 用于防盗链处理（特别是 Weibo）
    if (options.referer) {
      headers['Referer'] = options.referer;
    } else if (url.includes('weibo') || url.includes('weibo.cn') || url.includes('sinaimg.cn')) {
      headers['Referer'] = 'https://weibo.com';
    }

    // 发起下载请求
    const response = await fetch(url, {
      headers,
      // @ts-ignore - Next.js fetch supports timeout
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 获取内容类型
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // 检查文件大小
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > maxSize) {
        throw new Error(`File too large: ${size} bytes (max: ${maxSize} bytes)`);
      }
    }

    // 获取文件内容
    const buffer = Buffer.from(await response.arrayBuffer());

    // 最终大小检查
    if (buffer.length > maxSize) {
      throw new Error(`File too large: ${buffer.length} bytes (max: ${maxSize} bytes)`);
    }

    // 确定文件扩展名
    let extension = getExtensionFromUrl(url) || getExtensionFromContentType(contentType);

    // 如果没有扩展名，尝试从内容推断
    if (!extension) {
      if (isImageType(contentType)) {
        extension = 'jpg';
      } else if (isVideoType(contentType)) {
        extension = 'mp4';
      }
    }

    // 生成文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${random}.${extension}`;

    // 获取图片元数据（仅限图片）
    let metadata: MediaDownloadResult['metadata'] = {
      format: extension || undefined,
    };

    if (isImageType(contentType)) {
      try {
        const imageMeta = await sharp(buffer).metadata();
        metadata.width = imageMeta.width;
        metadata.height = imageMeta.height;
        metadata.format = imageMeta.format;
      } catch (err) {
        console.warn('[DOWNLOADER] Failed to extract image metadata:', err);
      }
    }

    console.log(`[DOWNLOADER] Download successful:`, {
      url,
      contentType,
      size: buffer.length,
      extension,
      metadata,
    });

    // 计算 SHA256 哈希（用于终极去重）
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    return {
      success: true,
      buffer,
      contentType,
      fileName,
      extension,
      size: buffer.length,
      fileHash,
      metadata,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DOWNLOADER] Download failed: ${url}`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 生成 R2 存储路径
 *
 * @param platform - 来源平台
 * @param mediaType - 媒体类型
 * @param fileName - 文件名
 * @returns R2 存储路径
 */
export function generateR2Path(
  platform: string,
  mediaType: 'image' | 'video',
  fileName: string
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `draft/${platform}/${year}/${month}/${day}/${fileName}`;
}

/**
 * 下载并保存到 R2（一站式操作）
 *
 * @param url - 媒体 URL
 * @param platform - 来源平台
 * @param options - 下载选项
 * @returns 包含 R2 URL 和元数据的结果
 */
export async function downloadAndSaveToR2(
  url: string,
  platform: string,
  options: {
    timeout?: number;
    maxSize?: number;
  } = {}
): Promise<{
  success: boolean;
  r2Url?: string;
  r2Key?: string;
  mediaType?: 'image' | 'video';
  fileHash?: string;  // SHA256 哈希
  metadata?: MediaDownloadResult['metadata'];
  error?: string;
}> {
  // 动态导入以避免客户端引用
  const { uploadToR2 } = await import('./r2-client');

  // 1. 下载媒体
  const downloadResult = await downloadMedia(url, options);

  if (!downloadResult.success || !downloadResult.buffer) {
    return {
      success: false,
      error: downloadResult.error || 'Download failed',
    };
  }

  // 2. 确定媒体类型
  const mediaType: 'image' | 'video' = isImageType(downloadResult.contentType || '')
    ? 'image'
    : 'video';

  // 3. 生成 R2 路径
  const r2Key = generateR2Path(platform, mediaType, downloadResult.fileName || 'media.bin');

  // 4. 上传到 R2
  const uploadResult = await uploadToR2(downloadResult.buffer, r2Key, downloadResult.contentType);

  if (!uploadResult.success) {
    return {
      success: false,
      error: uploadResult.error || 'R2 upload failed',
    };
  }

  console.log(`[DOWNLOADER] Successfully saved to R2:`, {
    r2Key,
    r2Url: uploadResult.url,
    mediaType,
    fileHash: downloadResult.fileHash,
  });

  return {
    success: true,
    r2Url: uploadResult.url,
    r2Key,
    mediaType,
    fileHash: downloadResult.fileHash,
    metadata: downloadResult.metadata,
  };
}

/**
 * 从 URL 判断媒体类型（不下载）
 */
export function detectMediaTypeFromUrl(url: string): 'image' | 'video' | 'unknown' {
  const lowerUrl = url.toLowerCase();

  // 检查常见图片扩展名
  if (IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(`.${ext}`))) {
    return 'image';
  }

  // 检查常见视频扩展名
  if (VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(`.${ext}`))) {
    return 'video';
  }

  return 'unknown';
}

/**
 * 从 URL 判断来源平台
 */
export function detectPlatformFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    const platformPatterns: Record<string, RegExp> = {
      'twitter': /(?:twitter\.com|x\.com)/,
      'instagram': /instagram\.com/,
      'weibo': /weibo\.com/,
      'xiaohongshu': /(?:xiaohongshu\.com|xhslink\.com)/,
      'youtube': /(?:youtube\.com|youtu\.be)/,
      'tiktok': /tiktok\.com/,
    };

    for (const [platform, pattern] of Object.entries(platformPatterns)) {
      if (pattern.test(hostname)) {
        return platform;
      }
    }

    return 'manual';
  } catch {
    return null;
  }
}
