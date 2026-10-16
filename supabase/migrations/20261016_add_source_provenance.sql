-- ============================================================================
-- PHASE 3 BATCH 1: source provenance for gallery_assets
-- ============================================================================
-- AUTHORIZATION: site owner, 2026-10-16 (phase 3 batch 1, provenance only).
-- SCOPE: add nullable provenance columns and backfill ONLY the rows whose
--        origin is still reliably recoverable through the draft queue.
--        Measured scope (2026-10-16 probe): exactly 18 rows match
--        gallery_assets.image_url == draft_items.r2_media_url, with zero
--        duplicate values on either side (0 duplicate image_url rows in
--        gallery_assets, 0 duplicate r2_media_url rows in draft_items), so
--        the equality join is 1:1 and cannot cross-link different images.
--
-- SAFETY
--   - Every statement is idempotent (IF NOT EXISTS / IS DISTINCT FROM).
--   - No DELETE, no TRUNCATE, no changes to any existing column.
--   - Row count of gallery_assets cannot change (no INSERT).
--   - NULL in the new columns means "source unknown (legacy data)" - it is
--     an explicit state, not an error; the frontend hides the source row
--     when it is NULL.
--   - RLS: the new columns are covered by the existing phase1_public_read
--     SELECT policy; writes still go exclusively through service_role.
--
-- EXECUTION
--   PostgREST (anon/service keys) cannot run DDL. Apply either via
--   `SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-20261016-source-provenance.mjs`
--   or by pasting this file into Supabase Dashboard -> SQL Editor.
--   A pre-flight backup is REQUIRED either way (npm run backup:db).
-- ============================================================================

-- 1) New nullable columns -----------------------------------------------------
ALTER TABLE lmsy_archive.gallery_assets
  ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE lmsy_archive.gallery_assets
  ADD COLUMN IF NOT EXISTS source_platform text;
ALTER TABLE lmsy_archive.gallery_assets
  ADD COLUMN IF NOT EXISTS source_account text;

COMMENT ON COLUMN lmsy_archive.gallery_assets.source_url IS
  'URL of the original public page/post this image came from (evidence field). NULL = unknown/legacy. For telegram-sourced images this is the t.me message URL, which identifies the Telegram post, not necessarily the original content page.';
COMMENT ON COLUMN lmsy_archive.gallery_assets.source_platform IS
  'Platform the image was ingested from (same vocabulary as draft_items.source_platform). NULL = unknown/legacy.';
COMMENT ON COLUMN lmsy_archive.gallery_assets.source_account IS
  'Publishing account/channel name, when known. NULL = unknown.';

-- 2) One-time idempotent backfill --------------------------------------------
-- Only rows that resolve 1:1 against a draft object key. Only the three new
-- columns are written; every pre-existing column is untouched.
UPDATE lmsy_archive.gallery_assets ga
SET source_url      = d.source_url,
    source_platform = d.source_platform
FROM lmsy_archive.draft_items d
WHERE d.r2_media_url = ga.image_url
  AND (
    ga.source_url IS DISTINCT FROM d.source_url
    OR ga.source_platform IS DISTINCT FROM d.source_platform
  );

-- ============================================================================
-- VERIFICATION (run after applying)
-- ============================================================================
-- a) Columns exist, all nullable:
--   SELECT column_name, is_nullable FROM information_schema.columns
--    WHERE table_schema='lmsy_archive' AND table_name='gallery_assets'
--      AND column_name IN ('source_url','source_platform','source_account');
--   -> expect 3 rows, all YES.
--
-- b) Backfill affected rows (must equal the pre-measured 18, or whatever the
--    draft queue contained at execution time - re-measure before running):
--   SELECT count(*) FROM lmsy_archive.gallery_assets WHERE source_url IS NOT NULL;
--
-- c) Row count unchanged (must equal the pre-migration count, 330 as of
--    2026-10-16):
--   SELECT count(*) FROM lmsy_archive.gallery_assets;
--
-- d) No cross-linking: every backfilled source_url must come from the draft
--    whose object key equals the asset URL:
--   SELECT ga.id FROM lmsy_archive.gallery_assets ga
--     JOIN lmsy_archive.draft_items d ON d.r2_media_url = ga.image_url
--    WHERE ga.source_url IS NOT NULL AND ga.source_url IS DISTINCT FROM d.source_url;
--   -> expect 0 rows.
--
-- e) anon read still works (RLS policy covers new columns):
--   GET {SUPABASE_URL}/rest/v1/gallery_assets?select=source_url&limit=1
--      with anon key and Accept-Profile: lmsy_archive
--   -> HTTP 200.
