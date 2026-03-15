alter table lmsy_archive.gallery_assets
  add column if not exists rotation integer not null default 0;

alter table lmsy_archive.gallery_assets
  drop constraint if exists gallery_assets_rotation_check;

alter table lmsy_archive.gallery_assets
  add constraint gallery_assets_rotation_check
  check (rotation in (0, 90, 180, 270));
