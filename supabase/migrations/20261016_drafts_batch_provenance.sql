-- Batch 2 minimal extension (2026-10-16)
-- EXECUTED on production 2026-10-16 via Management API with
-- "SET search_path TO lmsy_archive;" prefix (draft_items lives in lmsy_archive).
-- Verified: batch_id/source_account columns (text, nullable) + draft_items_batch_id_idx present.
-- Add nullable batch_id and source_account to draft_items.
-- Pure additive: no data changes, no defaults, no not-null constraints.
-- Rollback: DROP INDEX draft_items_batch_id_idx; ALTER TABLE draft_items DROP COLUMN batch_id, DROP COLUMN source_account;

ALTER TABLE draft_items ADD COLUMN IF NOT EXISTS batch_id text;
ALTER TABLE draft_items ADD COLUMN IF NOT EXISTS source_account text;

CREATE INDEX IF NOT EXISTS draft_items_batch_id_idx ON draft_items (batch_id);

-- Verification (expect: column_name batch_id / source_account present, index exists)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'draft_items' AND column_name IN ('batch_id', 'source_account');
