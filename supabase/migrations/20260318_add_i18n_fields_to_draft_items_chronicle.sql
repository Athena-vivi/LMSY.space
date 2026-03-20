ALTER TABLE lmsy_archive.draft_items
  ADD COLUMN IF NOT EXISTS chronicle_title_i18n jsonb;

ALTER TABLE lmsy_archive.draft_items
  ADD COLUMN IF NOT EXISTS chronicle_excerpt_i18n jsonb;
