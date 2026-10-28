-- 2026-10-28
-- Drop three columns that no code path reads and that hold no values.
-- Checked before dropping: 0 non-null rows in each, no index, no FK.
--
--   lmsy_archive.projects.source_published_at   timestamptz   0 values
--   lmsy_archive.gallery_assets.read_time       varchar(50)   0 values
--   lmsy_archive.gallery_assets.event_id        uuid          0 values
--
-- The legacy lmsy_archive.gallery table keeps its own read_time column; it is a
-- pre-restructure table and is not touched here.

ALTER TABLE lmsy_archive.projects DROP COLUMN IF EXISTS source_published_at;
ALTER TABLE lmsy_archive.gallery_assets DROP COLUMN IF EXISTS read_time;
ALTER TABLE lmsy_archive.gallery_assets DROP COLUMN IF EXISTS event_id;
