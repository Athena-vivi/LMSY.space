-- Door 1 (drama_work) classification, 2026-10-23.
--
-- Two boundaries were ambiguous in the data:
--   1. a Premiere is a screening with the cast present, not part of the cut,
--      so it gets its own shelf instead of sitting inside series_body next to
--      "Final Episode";
--   2. Series Stills are official episode stills - the spec's STILL code lives
--      under series_body - so they move out of footage, which is left to mean
--      real behind-the-scenes material (highlights, reactions, pilot, unseen).
--
-- The subtype whitelist gains `premiere` for this door. It used to be a
-- public_appearance value until 2026-10-23, when that shelf was renamed to
-- `company`; the word is free again and means exactly what it says here.

alter table lmsy_archive.projects drop constraint if exists projects_subtype_check;

alter table lmsy_archive.projects add constraint projects_subtype_check check (
  subtype is null or subtype = any (array[
    'company', 'awards', 'fashion', 'brand_stage', 'industry', 'charity',
    'fanmeeting', 'concert', 'fansign', 'brand_event', 'birthday',
    'feature', 'press', 'tv_news', 'duo', 'lookmhee', 'sonya',
    'series_body', 'premiere', 'music', 'novel', 'promo', 'award', 'footage'
  ]::text[])
);

update lmsy_archive.projects
   set subtype = 'premiere'
 where category = 'drama_work'
   and project_kind = 'event'
   and subtype = 'series_body'
   and title = 'Premiere';

update lmsy_archive.projects
   set subtype = 'series_body'
 where category = 'drama_work'
   and project_kind = 'event'
   and subtype = 'footage'
   and title = 'Series Stills';
