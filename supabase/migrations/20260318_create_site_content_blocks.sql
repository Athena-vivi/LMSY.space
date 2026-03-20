CREATE TABLE IF NOT EXISTS lmsy_archive.site_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key text NOT NULL UNIQUE,
  content_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lmsy_archive.site_content_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access on site_content_blocks" ON lmsy_archive.site_content_blocks;
DROP POLICY IF EXISTS "Authenticated write access on site_content_blocks" ON lmsy_archive.site_content_blocks;

CREATE POLICY "Public read access on site_content_blocks"
  ON lmsy_archive.site_content_blocks
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated write access on site_content_blocks"
  ON lmsy_archive.site_content_blocks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE lmsy_archive.site_content_blocks
IS 'Structured multilingual content blocks for homepage and other curated static sections.';

COMMENT ON COLUMN lmsy_archive.site_content_blocks.block_key
IS 'Stable content key, e.g. homepage_preface';

COMMENT ON COLUMN lmsy_archive.site_content_blocks.content_i18n
IS 'Structured per-language content, e.g. {"en": {...}, "zh": {...}, "th": {...}}';
