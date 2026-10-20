-- 2026-10-21  /live 的第二层：把 solo 拆成两个人
--
-- Before: duo | solo
-- After:  duo | lookmhee | sonya
--
-- A stream held by one of them is not "a solo stream" - it is Lookmhee's or
-- it is Sonya's, and a fan browsing that shelf is looking for one person, not
-- for the category "single". `solo` is dropped rather than kept alongside the
-- two names, so no row can sit in a shelf that no longer has a card.
--
-- No row is migrated: `lmsy_archive.projects` holds 0 rows with
-- category = 'live_stream' at the time of this migration, and 0 rows with
-- subtype = 'solo' anywhere (verified 2026-10-21 01:2x before running).
--
-- Rollback (restores the previous whitelist exactly):
--   begin;
--   alter table lmsy_archive.projects drop constraint projects_subtype_check;
--   alter table lmsy_archive.projects add constraint projects_subtype_check
--     check (
--       subtype is null or subtype = any (array[
--         'fanmeeting','brand_event','birthday','premiere',
--         'awards','fashion','brand_stage','industry','charity',
--         'feature','press','tv_news',
--         'duo','solo',
--         'series_body','music','novel','promo','award','footage'
--       ]::text[])
--     );
--   commit;
--   (Any row written as lookmhee/sonya must be set back to 'solo' first, or
--    this rollback fails the check.)

begin;

alter table lmsy_archive.projects drop constraint projects_subtype_check;

alter table lmsy_archive.projects add constraint projects_subtype_check
  check (
    subtype is null or subtype = any (array[
      'fanmeeting','brand_event','birthday','premiere',
      'awards','fashion','brand_stage','industry','charity',
      'feature','press','tv_news',
      'duo','lookmhee','sonya',
      'series_body','music','novel','promo','award','footage'
    ]::text[])
  );

commit;
