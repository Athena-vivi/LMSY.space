-- =====================================================
-- Migration: Add file_hash for ultimate deduplication
-- Created: 2025-02-23
-- Description: 添加文件哈希实现终极去重方案
-- =====================================================

-- Add file_hash column
ALTER TABLE lmsy_archive.draft_items
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create unique index on file_hash (for non-null values)
-- This is the ultimate deduplication mechanism
CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_items_file_hash_unique
ON lmsy_archive.draft_items(file_hash)
WHERE file_hash IS NOT NULL;

-- Add comment
COMMENT ON COLUMN lmsy_archive.draft_items.file_hash IS
'SHA256 hash of the media file for ultimate deduplication. Same file = same hash, regardless of URL or source.';

COMMENT ON INDEX idx_draft_items_file_hash_unique IS
'Prevents duplicate files - same content = same hash, even if downloaded from different URLs';

-- =====================================================
-- Helper function to normalize URLs (remove query params)
-- =====================================================
CREATE OR REPLACE FUNCTION lmsy_archive.normalize_url(url TEXT)
RETURNS TEXT AS $$
BEGIN
  IF url IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove query parameters and fragments
  -- e.g., https://example.com/image.jpg?size=large&format=webp -> https://example.com/image.jpg
  -- e.g., https://example.com/image.jpg#section -> https://example.com/image.jpg
  RETURN split_part(split_part(url, '?', 1), '#', 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION lmsy_archive.normalize_url IS
'Remove query parameters and fragments from URLs for comparison';
