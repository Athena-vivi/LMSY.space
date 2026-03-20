import type { LocalizedText } from '@/lib/localized-content';

/**
 * Shared Supabase-facing TypeScript types.
 * Keep these aligned with the database schema and API payloads used by the app.
 */

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

export type ProjectCategory =
  | 'series'
  | 'editorial'
  | 'appearance'
  | 'daily'
  | 'travel'
  | 'commercial';

export interface Project {
  id: string;
  title: string;
  title_i18n?: LocalizedText | null;
  category: ProjectCategory;
  release_date: string | null;
  description: string | null;
  description_i18n?: LocalizedText | null;
  cover_url: string | null;
  watch_url: string | null;
  tags: string[] | null;
  portal_visible?: boolean | null;
  portal_priority?: number | null;
  homepage_featured?: boolean | null;
  homepage_excerpt?: string | null;
  homepage_excerpt_i18n?: LocalizedText | null;
  homepage_cover_url?: string | null;
  theme_statement?: string | null;
  theme_statement_i18n?: LocalizedText | null;
  curation_status?: 'draft' | 'published' | 'archived' | null;
  created_at: string;
}

export type GalleryCategoryTag = 'official_stills' | 'bts' | 'press_events' | null;
export type MilestonePriority = 1 | 2 | 3 | 4 | 5 | null;

export interface GalleryItem {
  id: string;
  image_url: string;
  title?: string | null;
  title_i18n?: LocalizedText | null;
  excerpt?: string | null;
  excerpt_i18n?: LocalizedText | null;
  caption: string | null;
  caption_i18n?: LocalizedText | null;
  tag: string | null;
  is_featured: boolean;
  catalog_id: string | null;
  is_editorial: boolean;
  curator_note: string | null;
  blur_data: string | null;
  category_tag: GalleryCategoryTag;
  project_id: string | null;
  milestone_priority: MilestonePriority;
  display_role?: 'regular' | 'cover' | 'milestone' | 'editorial' | 'portal' | null;
  integrity_status?: 'unchecked' | 'ok' | 'broken' | 'missing' | 'hidden' | null;
  is_cover?: boolean | null;
  is_portal_candidate?: boolean | null;
  rotation?: 0 | 90 | 180 | 270 | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  link: string | null;
  created_at: string;
}

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

export interface TimelineEvent {
  id: string;
  event_date: string;
  event_type: 'milestone' | 'photoshoot' | 'project' | 'schedule';
  title: string;
  description: string | null;
  image_url: string | null;
  related_id: string | null;
  created_at: string;
}

export interface Whisper {
  id: string;
  content: string;
  author: string;
  location: string | null;
  color_pref: 'yellow' | 'blue';
  is_approved: boolean;
  created_at: string;
}

export type SourcePlatform =
  | 'twitter'
  | 'instagram'
  | 'weibo'
  | 'xiaohongshu'
  | 'youtube'
  | 'tiktok'
  | 'manual';

export type MediaType = 'image' | 'video';
export type DraftItemStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type IngestionStage = 'pending' | 'downloading' | 'uploading' | 'translating' | 'ready' | 'failed';
export type AiTranslationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
export type SupportedLanguage = 'en' | 'zh' | 'th';

export interface MultilingualContent {
  en: string;
  zh: string;
  th: string;
}

export interface MediaMetadata {
  width: number | null;
  height: number | null;
  duration: number | null;
  size: number | null;
  format: string | null;
}

export interface DraftItem {
  id: string;

  source_url: string | null;
  source_platform: SourcePlatform | null;
  source_post_id: string | null;

  r2_media_url: string | null;
  r2_key: string | null;
  media_type: MediaType;
  media_metadata: MediaMetadata;
  file_hash: string | null;

  title: MultilingualContent;
  description: MultilingualContent;

  event_date: string | null;
  raw_event_date: string | null;

  status: DraftItemStatus;
  ingestion_stage: IngestionStage;

  ai_translation_status: AiTranslationStatus;
  ai_translation_error: string | null;
  ai_translation_model: string | null;
  ai_processed_at: string | null;

  curator_note: string | null;
  tags: string[];
  is_featured: boolean;
  sequence_order: number | null;
  chronicle_title?: string | null;
  chronicle_visible?: boolean;
  chronicle_excerpt?: string | null;
  chronicle_title_i18n?: LocalizedText | null;
  chronicle_excerpt_i18n?: LocalizedText | null;

  created_at: string;
  updated_at: string;
  published_at: string | null;

  project_id: string | null;
}

export interface DraftItemCreateInput {
  source_url?: string;
  source_platform?: SourcePlatform;
  source_post_id?: string;

  r2_media_url?: string;
  r2_key?: string;
  media_type?: MediaType;
  media_metadata?: Partial<MediaMetadata>;
  file_hash?: string;

  title?: Partial<MultilingualContent>;
  description?: Partial<MultilingualContent>;

  event_date?: string;
  raw_event_date?: string;

  status?: DraftItemStatus;
  ingestion_stage?: IngestionStage;

  curator_note?: string;
  tags?: string[];
  is_featured?: boolean;
  sequence_order?: number | null;
  project_id?: string;
}

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
  sequence_order?: number | null;
  project_id?: string;
}

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

export interface IngestApiRequest {
  source_url: string;
  source_platform: SourcePlatform;
  source_post_id?: string;

  media_url?: string;
  media_type?: MediaType;

  title?: Partial<MultilingualContent>;
  description?: Partial<MultilingualContent>;
  original_text?: string;

  event_date?: string;
  raw_event_date?: string;

  tags?: string[];
}

export interface IngestApiResponse {
  success: boolean;
  draft_item_id: string | null;
  status: DraftItemStatus | null;
  ingestion_stage: IngestionStage | null;
  message: string;
  error?: string;
  is_duplicate?: boolean;
  existing_item?: {
    id: string;
    title?: MultilingualContent;
    source_url?: string;
  };
}

export interface BulkIngestRequest {
  items: IngestApiRequest[];
  options?: {
    skip_duplicates?: boolean;
    auto_translate?: boolean;
    auto_publish?: boolean;
  };
}

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
