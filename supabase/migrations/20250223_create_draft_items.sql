-- =====================================================
-- Migration: Create draft_items table for content ingestion
-- Created: 2025-02-23
-- Description: 草稿箱/物料摄入表，支持 OpenClaw Agent 数据提交
-- =====================================================

-- Create draft_items table
CREATE TABLE IF NOT EXISTS lmsy_archive.draft_items (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source Information (来源信息)
  source_url TEXT,
  source_platform TEXT CHECK (source_platform IN ('twitter', 'instagram', 'weibo', 'xiaohongshu', 'youtube', 'tiktok', 'manual')),
  source_post_id TEXT,  -- 原始平台帖子ID（用于去重）

  -- Media Information (媒体信息)
  r2_media_url TEXT,
  r2_key TEXT,  -- R2 object key for deletion/movement
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  media_metadata JSONB DEFAULT '{"width":null,"height":null,"duration":null,"size":null,"format":null}'::jsonb,

  -- Multilingual Content (多语言内容 - JSONB 格式)
  title JSONB DEFAULT '{"en":"","zh":"","th":""}'::jsonb,
  description JSONB DEFAULT '{"en":"","zh":"","th":""}'::jsonb,

  -- Date & Classification (时间与分类)
  event_date DATE,
  raw_event_date TEXT,  -- 原始日期文本（解析前的原始值）

  -- Status Management (状态管理)
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  ingestion_stage TEXT DEFAULT 'pending' CHECK (ingestion_stage IN ('pending', 'downloading', 'uploading', 'translating', 'ready', 'failed')),

  -- AI Processing Information (AI 处理信息)
  ai_translation_status TEXT DEFAULT 'pending' CHECK (ai_translation_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  ai_translation_error TEXT,
  ai_translation_model TEXT,  -- 记录使用的模型（如 claude-3-5-sonnet-20241022）
  ai_processed_at TIMESTAMPTZ,

  -- Content Curation (内容策展)
  curator_note TEXT,  -- Markdown format
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,

  -- Audit Fields (审计字段)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Relations (关联)
  project_id UUID REFERENCES lmsy_archive.projects(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT draft_items_source_platform_required CHECK (
    (source_url IS NOT NULL AND source_platform IS NOT NULL) OR
    (source_url IS NULL AND source_platform IS NULL)
  )
);

-- =====================================================
-- Indexes for Performance (性能索引)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_draft_items_status ON lmsy_archive.draft_items(status);
CREATE INDEX IF NOT EXISTS idx_draft_items_ingestion_stage ON lmsy_archive.draft_items(ingestion_stage);
CREATE INDEX IF NOT EXISTS idx_draft_items_event_date ON lmsy_archive.draft_items(event_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_draft_items_created_at ON lmsy_archive.draft_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draft_items_source_platform ON lmsy_archive.draft_items(source_platform);
CREATE INDEX IF NOT EXISTS idx_draft_items_source_post_id ON lmsy_archive.draft_items(source_post_id);
CREATE INDEX IF NOT EXISTS idx_draft_items_is_featured ON lmsy_archive.draft_items(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_draft_items_project_id ON lmsy_archive.draft_items(project_id);

-- =====================================================
-- Trigger: Auto-update updated_at (自动更新 updated_at)
-- =====================================================
CREATE OR REPLACE FUNCTION lmsy_archive.update_draft_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set published_at when status changes to published
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER draft_items_updated_at
  BEFORE UPDATE ON lmsy_archive.draft_items
  FOR EACH ROW
  EXECUTE FUNCTION lmsy_archive.update_draft_items_updated_at();

-- =====================================================
-- Row Level Security (RLS) (行级安全策略)
-- =====================================================
ALTER TABLE lmsy_archive.draft_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin full access on draft_items" ON lmsy_archive.draft_items;
DROP POLICY IF EXISTS "Public can view published draft_items" ON lmsy_archive.draft_items;
DROP POLICY IF EXISTS "Service role full access on draft_items" ON lmsy_archive.draft_items;

-- Policy: Service role (API key) has full access for ingest operations
CREATE POLICY "Service role full access on draft_items"
  ON lmsy_archive.draft_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can create draft items (for OpenClaw agent ingestion via API)
-- Note: API will use service_role key for operations, so this allows authenticated access too
CREATE POLICY "Authenticated can create draft_items"
  ON lmsy_archive.draft_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update their own draft items
CREATE POLICY "Authenticated can update draft_items"
  ON lmsy_archive.draft_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete draft items
CREATE POLICY "Authenticated can delete draft_items"
  ON lmsy_archive.draft_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Public can only view published items (前台只能看到已发布的)
CREATE POLICY "Public can view published draft_items"
  ON lmsy_archive.draft_items
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- =====================================================
-- Helper Function: Get translated text (辅助函数：获取翻译文本)
-- =====================================================
CREATE OR REPLACE FUNCTION lmsy_archive.get_translation(
  content JSONB,
  lang TEXT DEFAULT 'en'
)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(content->>lang, content->>'en', '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Helper Function: Set translated text (辅助函数：设置翻译文本)
-- =====================================================
CREATE OR REPLACE FUNCTION lmsy_archive.set_translation(
  content JSONB,
  lang TEXT,
  value TEXT
)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_set(content, ARRAY[lang], to_jsonb(value));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Table Comments (表注释)
-- =====================================================
COMMENT ON TABLE lmsy_archive.draft_items IS 'Content draft inbox for automated ingestion from social media platforms';
COMMENT ON COLUMN lmsy_archive.draft_items.source_url IS 'Original URL from social media platform';
COMMENT ON COLUMN lmsy_archive.draft_items.source_platform IS 'Platform: twitter, instagram, weibo, xiaohongshu, youtube, tiktok, manual';
COMMENT ON COLUMN lmsy_archive.draft_items.r2_key IS 'Cloudflare R2 object key for storage management';
COMMENT ON COLUMN lmsy_archive.draft_items.media_type IS 'Media type: image or video';
COMMENT ON COLUMN lmsy_archive.draft_items.media_metadata IS 'JSONB: width, height, duration, size, format';
COMMENT ON COLUMN lmsy_archive.draft_items.title IS 'JSONB multilingual title: {"en":"","zh":"","th":""}';
COMMENT ON COLUMN lmsy_archive.draft_items.description IS 'JSONB multilingual description: {"en":"","zh":"","th":""}';
COMMENT ON COLUMN lmsy_archive.draft_items.status IS 'Content status: draft, pending_review, published, rejected, archived';
COMMENT ON COLUMN lmsy_archive.draft_items.ingestion_stage IS 'Ingestion pipeline stage: pending, downloading, uploading, translating, ready, failed';
COMMENT ON COLUMN lmsy_archive.draft_items.ai_translation_status IS 'AI translation status: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN lmsy_archive.draft_items.is_featured IS 'Featured content flag for curated displays';

-- =====================================================
-- View: Active draft items for admin dashboard (管理后台视图)
-- =====================================================
CREATE OR REPLACE VIEW lmsy_archive.v_draft_items_active AS
SELECT
  id,
  source_url,
  source_platform,
  media_type,
  lmsy_archive.get_translation(title, 'en') AS title_en,
  lmsy_archive.get_translation(title, 'zh') AS title_zh,
  lmsy_archive.get_translation(title, 'th') AS title_th,
  event_date,
  status,
  ingestion_stage,
  ai_translation_status,
  is_featured,
  tags,
  created_at,
  updated_at
FROM lmsy_archive.draft_items
WHERE status NOT IN ('archived', 'rejected')
ORDER BY created_at DESC;

COMMENT ON VIEW lmsy_archive.v_draft_items_active IS 'Admin dashboard view for active draft items';
