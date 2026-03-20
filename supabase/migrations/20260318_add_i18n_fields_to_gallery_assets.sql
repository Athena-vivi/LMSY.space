ALTER TABLE lmsy_archive.gallery_assets
  ADD COLUMN IF NOT EXISTS title_i18n jsonb;

ALTER TABLE lmsy_archive.gallery_assets
  ADD COLUMN IF NOT EXISTS caption_i18n jsonb;

ALTER TABLE lmsy_archive.gallery_assets
  ADD COLUMN IF NOT EXISTS excerpt_i18n jsonb;

COMMENT ON COLUMN lmsy_archive.gallery_assets.title_i18n
IS 'Localized asset title: {"en":"","zh":"","th":""}';

COMMENT ON COLUMN lmsy_archive.gallery_assets.caption_i18n
IS 'Localized asset caption: {"en":"","zh":"","th":""}';

COMMENT ON COLUMN lmsy_archive.gallery_assets.excerpt_i18n
IS 'Localized asset excerpt: {"en":"","zh":"","th":""}';
