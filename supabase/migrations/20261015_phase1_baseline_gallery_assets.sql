-- ============================================================================
-- PHASE 1 BASELINE: lmsy_archive.gallery_assets
-- ============================================================================
-- WHY THIS FILE EXISTS
--   The audit found that gallery_assets was created by hand directly in the
--   production database: the repository contains ALTER TABLE statements for it
--   (20260316 rotation, 20260318 i18n) but no CREATE TABLE. A fresh environment
--   built from migrations could therefore never reproduce production.
--
-- SCOPE
--   This migration is a BASELINE definition, safe to run on:
--     - an existing database (every statement is IF NOT EXISTS, nothing is
--       dropped, no data is touched), and
--     - an empty database (bootstraps the table).
--   Column definitions were read from the live production schema via the
--   PostgREST OpenAPI description on 2026-10-15.
--
--   It intentionally does NOT create row level security policies; those live in
--   20261015_phase1_rls_hardening.sql.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS lmsy_archive;

CREATE TABLE IF NOT EXISTS lmsy_archive.gallery_assets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url           text NOT NULL,
  title               text,
  caption             text,
  excerpt             text,
  tag                 text,
  catalog_id          text,
  is_featured         boolean NOT NULL DEFAULT false,
  is_editorial        boolean NOT NULL DEFAULT false,
  is_cover            boolean NOT NULL DEFAULT false,
  is_portal_candidate boolean NOT NULL DEFAULT false,
  curator_note        text,
  category            varchar(255),
  category_tag        text,
  author              varchar(255),
  read_time           varchar(255),
  credits             text,
  blur_data           text,
  magazine_issue      varchar(255),
  project_id          uuid,
  event_date          date,
  milestone_priority  integer,
  display_role        text DEFAULT 'regular',
  integrity_status    text DEFAULT 'unchecked',
  sequence            integer,
  rotation            integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  title_i18n          jsonb,
  caption_i18n        jsonb,
  excerpt_i18n        jsonb,
  CONSTRAINT gallery_assets_rotation_check CHECK (rotation IN (0, 90, 180, 270))
);

COMMENT ON TABLE lmsy_archive.gallery_assets
IS 'Published gallery assets (project pages, editorial, vault). Baseline definition added in phase 1; the table originally existed in production without a CREATE TABLE migration.';

COMMENT ON COLUMN lmsy_archive.gallery_assets.title_i18n
IS 'Localized asset title: {"en":"","zh":"","th":""}';

COMMENT ON COLUMN lmsy_archive.gallery_assets.caption_i18n
IS 'Localized asset caption: {"en":"","zh":"","th":""}';

COMMENT ON COLUMN lmsy_archive.gallery_assets.excerpt_i18n
IS 'Localized asset excerpt: {"en":"","zh":"","th":""}';

-- The project detail page reads: WHERE project_id = $1 ORDER BY created_at.
CREATE INDEX IF NOT EXISTS idx_gallery_assets_project_id
  ON lmsy_archive.gallery_assets (project_id);

CREATE INDEX IF NOT EXISTS idx_gallery_assets_event_date
  ON lmsy_archive.gallery_assets (event_date);
