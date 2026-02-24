/**
 * Supabase 数据库类型定义
 *
 * 此文件包含所有数据库表的 TypeScript 接口
 * 与 Supabase 数据库表结构保持同步
 */

// 成员表 (members)
export interface Member {
  id: string;
  name: string;
  nickname: string;
  birthday: string | null;
  height: string | null;
  bio: string | null;
  avatar_url: string | null;
  ig_handle: string | null;
  x_handle: string | null;
  weibo_handle: string | null;
  xhs_handle: string | null;
  created_at: string;
}

// 项目表 (projects)
export type ProjectCategory = 'series' | 'editorial' | 'appearance' | 'daily' | 'travel' | 'commercial';

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  release_date: string | null;
  description: string | null;
  cover_url: string | null;
  watch_url: string | null;
  tags: string[] | null;
  created_at: string;
}

// 图库表 (gallery)
export type GalleryCategoryTag = 'official_stills' | 'bts' | 'press_events' | null;
export type MilestonePriority = 1 | 2 | 3 | 4 | 5 | null;  // 1=2022, 2=2023, 3=2024, 4=2025, 5=∞

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  tag: string | null;
  is_featured: boolean;
  catalog_id: string | null;  // LMSY-2026-XXX
  is_editorial: boolean;  // 策展特别推荐
  curator_note: string | null;  // Markdown 格式的策展笔记
  blur_data: string | null;  // Blur placeholder for image optimization
  category_tag: GalleryCategoryTag;  // 项目内分类标签 (stills/bts/press)
  project_id: string | null;  // 关联项目ID
  milestone_priority: MilestonePriority;  // 首页里程碑显示优先级: 1=2022, 2=2023, 3=2024, 4=2025, 5=∞
  created_at: string;
}

// 日程表 (schedule)
export interface Schedule {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  link: string | null;
  created_at: string;
}

// 杂志特辑表 (editorials)
export interface Editorial {
  id: string;
  mag_name: string;
  slug: string;
  issue_date: string;
  cover_url: string;
  images: string[];
  credits: Record<string, string>;
  description: string;
  created_at: string;
}

// 时间线事件表 (timeline_events)
export interface TimelineEvent {
  id: string;
  event_date: string;
  event_type: 'milestone' | 'photoshoot' | 'project' | 'schedule';
  title: string;
  description: string | null;
  image_url: string | null;
  related_id: string | null;  // 关联项目、日程等的 ID
  created_at: string;
}

// 留言表 (whispers)
export interface Whisper {
  id: string;
  content: string;
  author: string;
  location: string | null;
  color_pref: 'yellow' | 'blue';
  is_approved: boolean;  // 是否已审核
  created_at: string;
}

// =====================================================
// 草稿箱 / 物料摄入表 (Draft Items / Content Ingestion)
// =====================================================

// 来源平台枚举
export type SourcePlatform = 'twitter' | 'instagram' | 'weibo' | 'xiaohongshu' | 'youtube' | 'tiktok' | 'manual';

// 媒体类型枚举
export type MediaType = 'image' | 'video';

// 内容状态枚举
export type DraftItemStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

// 摄入阶段枚举
export type IngestionStage = 'pending' | 'downloading' | 'uploading' | 'translating' | 'ready' | 'failed';

// AI 翻译状态枚举
export type AiTranslationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

// 支持的语言
export type SupportedLanguage = 'en' | 'zh' | 'th';

// 多语言内容接口
export interface MultilingualContent {
  en: string;
  zh: string;
  th: string;
}

// 媒体元数据接口
export interface MediaMetadata {
  width: number | null;
  height: number | null;
  duration: number | null;  // 视频时长（秒）
  size: number | null;      // 文件大小（字节）
  format: string | null;    // 格式（如 'jpg', 'mp4'）
}

// 草稿项主接口
export interface DraftItem {
  id: string;

  // 来源信息
  source_url: string | null;
  source_platform: SourcePlatform | null;
  source_post_id: string | null;  // 原始平台帖子ID（用于去重）

  // 媒体信息
  r2_media_url: string | null;
  r2_key: string | null;  // R2 对象键
  media_type: MediaType;
  media_metadata: MediaMetadata;
  file_hash: string | null;  // SHA256 哈希（用于终极去重）

  // 多语言内容
  title: MultilingualContent;
  description: MultilingualContent;

  // 时间与分类
  event_date: string | null;  // ISO date string (YYYY-MM-DD)
  raw_event_date: string | null;  // 原始日期文本

  // 状态管理
  status: DraftItemStatus;
  ingestion_stage: IngestionStage;

  // AI 处理信息
  ai_translation_status: AiTranslationStatus;
  ai_translation_error: string | null;
  ai_translation_model: string | null;
  ai_processed_at: string | null;

  // 内容策展
  curator_note: string | null;  // Markdown format
  tags: string[];
  is_featured: boolean;
  sequence_order: number | null;  // 用于同组内容的排序

  // 审计字段
  created_at: string;
  updated_at: string;
  published_at: string | null;

  // 关联
  project_id: string | null;
}

// 创建草稿项的输入类型（不含自动生成的字段）
export interface DraftItemCreateInput {
  source_url?: string;
  source_platform?: SourcePlatform;
  source_post_id?: string;

  r2_media_url?: string;
  r2_key?: string;
  media_type?: MediaType;
  media_metadata?: Partial<MediaMetadata>;
  file_hash?: string;  // SHA256 哈希（用于终极去重）

  title?: Partial<MultilingualContent>;
  description?: Partial<MultilingualContent>;

  event_date?: string;
  raw_event_date?: string;

  status?: DraftItemStatus;
  ingestion_stage?: IngestionStage;

  curator_note?: string;
  tags?: string[];
  is_featured?: boolean;
  sequence_order?: number | null;  // 用于同组内容的排序
  project_id?: string;
}

// 更新草稿项的输入类型
export interface DraftItemUpdateInput {
  source_url?: string;
  source_platform?: SourcePlatform;
  source_post_id?: string;

  r2_media_url?: string;
  r2_key?: string;
  media_type?: MediaType;
  media_metadata?: Partial<MediaMetadata>;

  title?: Partial<MultilingualContent>;
  description?: Partial<MultilingualContent>;

  event_date?: string;
  raw_event_date?: string;

  status?: DraftItemStatus;
  ingestion_stage?: IngestionStage;

  ai_translation_status?: AiTranslationStatus;
  ai_translation_error?: string;
  ai_translation_model?: string;

  curator_note?: string;
  tags?: string[];
  is_featured?: boolean;
  sequence_order?: number | null;  // 用于同组内容的排序
  project_id?: string;
}

// 用于管理后台的简化视图
export interface DraftItemAdminView {
  id: string;
  source_url: string | null;
  source_platform: SourcePlatform | null;
  media_type: MediaType;
  title_en: string;
  title_zh: string;
  title_th: string;
  event_date: string | null;
  status: DraftItemStatus;
  ingestion_stage: IngestionStage;
  ai_translation_status: AiTranslationStatus;
  is_featured: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Ingest API 请求体（由 OpenClaw Agent 调用）
export interface IngestApiRequest {
  // 来源信息（必填）
  source_url: string;
  source_platform: SourcePlatform;
  source_post_id?: string;

  // 媒体信息（如果已下载）
  media_url?: string;  // 临时媒体 URL（将由 ingest API 下载并上传到 R2）
  media_type?: MediaType;

  // 内容信息（可选，可由 AI 生成）
  title?: Partial<MultilingualContent>;
  description?: Partial<MultilingualContent>;
  original_text?: string;  // 原始文本（用于翻译）

  // 时间信息
  event_date?: string;  // ISO date string
  raw_event_date?: string;

  // 标签
  tags?: string[];
}

// Ingest API 响应体
export interface IngestApiResponse {
  success: boolean;
  draft_item_id: string | null;
  status: DraftItemStatus | null;
  ingestion_stage: IngestionStage | null;
  message: string;
  error?: string;
  is_duplicate?: boolean;  // 是否为重复项
  existing_item?: {
    id: string;
    title?: MultilingualContent;
    source_url?: string;
  };
}

// 批量导入请求（用于历史数据处理）
export interface BulkIngestRequest {
  items: IngestApiRequest[];
  options?: {
    skip_duplicates?: boolean;
    auto_translate?: boolean;
    auto_publish?: boolean;
  };
}

// 批量导入响应
export interface BulkIngestResponse {
  success: boolean;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{
    index: number;
    source_url: string;
    error: string;
  }>;
}
