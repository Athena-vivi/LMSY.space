-- Add editorial-specific fields to gallery table
-- This migration adds fields needed for the editorial articles feature

ALTER TABLE lmsy_archive.gallery
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS author VARCHAR(100),
  ADD COLUMN IF NOT EXISTS read_time VARCHAR(50);

-- Add indexes for editorial queries
CREATE INDEX IF NOT EXISTS idx_gallery_category ON lmsy_archive.gallery(category);
CREATE INDEX IF NOT EXISTS idx_gallery_author ON lmsy_archive.gallery(author);

-- Add comments for documentation
COMMENT ON COLUMN lmsy_archive.gallery.title IS 'Article title for editorial content';
COMMENT ON COLUMN lmsy_archive.gallery.excerpt IS 'Brief summary/description for editorial articles';
COMMENT ON COLUMN lmsy_archive.gallery.category IS 'Article category (e.g., Feature, Interview, Behind the Scenes)';
COMMENT ON COLUMN lmsy_archive.gallery.author IS 'Article author (default: Astra)';
COMMENT ON COLUMN lmsy_archive.gallery.read_time IS 'Estimated reading time (e.g., "5 min read")';
