-- ============================================================================
-- PHASE 1 DATA INTEGRITY FIXES
-- ============================================================================
-- Every statement here is idempotent and non-destructive:
--   - no DELETE / UPDATE / TRUNCATE
--   - constraints are only re-created with a SUPERSET of values, so existing
--     rows cannot violate them
--   - unique indexes are created only when the data is already clean; if a
--     duplicate exists the block raises a NOTICE and skips instead of failing
--     the whole migration.
--
-- Run order: after 20261015_phase1_baseline_gallery_assets.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. draft_items.source_platform: production uses 'telegram' but the committed
--    migration only allowed ('twitter','instagram','weibo','xiaohongshu',
--    'youtube','tiktok','manual'). The live constraint was changed outside
--    version control. Re-create it with the union so both the file and the
--    database agree.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the existing CHECK constraint on source_platform, whatever it is called.
  SELECT con.conname
    INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'lmsy_archive'
    AND rel.relname = 'draft_items'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%source_platform%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE lmsy_archive.draft_items DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped old source_platform constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No existing source_platform CHECK constraint found (nothing to drop).';
  END IF;
END $$;

ALTER TABLE lmsy_archive.draft_items
  DROP CONSTRAINT IF EXISTS draft_items_source_platform_check;

ALTER TABLE lmsy_archive.draft_items
  ADD CONSTRAINT draft_items_source_platform_check
  CHECK (
    source_platform IS NULL
    OR source_platform IN (
      'twitter', 'instagram', 'weibo', 'xiaohongshu', 'youtube', 'tiktok',
      'telegram', 'manual'
    )
  );

COMMENT ON COLUMN lmsy_archive.draft_items.source_platform
IS 'Platform: twitter, instagram, weibo, xiaohongshu, youtube, tiktok, telegram, manual';

-- ----------------------------------------------------------------------------
-- 2. catalog_id uniqueness.
--    Catalog IDs are allocated in application code with a read-max-then-add-one
--    pattern, which can collide under concurrent uploads. A partial unique index
--    makes the database the final authority; the application retries on 23505.
--    Verified on 2026-10-15: 312 non-null catalog_id values, 0 duplicates.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT catalog_id
    FROM lmsy_archive.gallery_assets
    WHERE catalog_id IS NOT NULL
    GROUP BY catalog_id
    HAVING count(*) > 1
  ) d;

  IF dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_gallery_assets_catalog_id
      ON lmsy_archive.gallery_assets (catalog_id)
      WHERE catalog_id IS NOT NULL;
    RAISE NOTICE 'Created unique index uq_gallery_assets_catalog_id.';
  ELSE
    RAISE NOTICE 'SKIPPED unique index on gallery_assets.catalog_id: % duplicate value(s) found. Resolve duplicates first, then re-run this block.', dup_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. draft_items.file_hash deduplication.
--    Same pattern: a partial unique index turns duplicate submissions into a
--    hard database error that the ingest code can catch and report, instead of
--    silently creating a second draft.
--    Verified on 2026-10-15: no duplicate file_hash among existing drafts.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT file_hash
    FROM lmsy_archive.draft_items
    WHERE file_hash IS NOT NULL
    GROUP BY file_hash
    HAVING count(*) > 1
  ) d;

  IF dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_draft_items_file_hash
      ON lmsy_archive.draft_items (file_hash)
      WHERE file_hash IS NOT NULL;
    RAISE NOTICE 'Created unique index uq_draft_items_file_hash.';
  ELSE
    RAISE NOTICE 'SKIPPED unique index on draft_items.file_hash: % duplicate value(s) found.', dup_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Project detail page ordering support.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gallery_assets_project_sequence
  ON lmsy_archive.gallery_assets (project_id, sequence);

-- ----------------------------------------------------------------------------
-- VERIFICATION (run manually after applying)
-- ----------------------------------------------------------------------------
-- a) Required tables exist:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'lmsy_archive' ORDER BY table_name;
--
-- b) source_platform constraint now includes telegram:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'draft_items_source_platform_check';
--
-- c) Unique indexes present:
--   SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'lmsy_archive'
--     AND indexname IN ('uq_gallery_assets_catalog_id', 'uq_draft_items_file_hash');
--
-- d) No duplicate catalog ids / hashes (both must return zero rows):
--   SELECT catalog_id, count(*) FROM lmsy_archive.gallery_assets
--   WHERE catalog_id IS NOT NULL GROUP BY catalog_id HAVING count(*) > 1;
--   SELECT file_hash, count(*) FROM lmsy_archive.draft_items
--   WHERE file_hash IS NOT NULL GROUP BY file_hash HAVING count(*) > 1;
