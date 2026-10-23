-- 2026-10-23 live_event: add city column, widen subtype whitelist,
-- split fanmeeting into concert / fansign, and move the Hangzhou FoamDream
-- day back to brand_event.
--
-- Snapshot before this migration: temp/20261023_live_event_snapshot.json
-- Rollback: temp/20261023_live_event_rollback.sql

begin;

-- 1) city: the structured filter field. location stays as free text.
alter table lmsy_archive.projects add column if not exists city text;

-- 2) subtype whitelist gains concert + fansign (nothing removed).
alter table lmsy_archive.projects drop constraint if exists projects_subtype_check;
alter table lmsy_archive.projects add constraint projects_subtype_check
  check (
    subtype is null or subtype = any (array[
      'fanmeeting'::text, 'concert'::text, 'fansign'::text, 'brand_event'::text,
      'birthday'::text, 'premiere'::text, 'awards'::text, 'fashion'::text,
      'brand_stage'::text, 'industry'::text, 'charity'::text, 'feature'::text,
      'press'::text, 'tv_news'::text, 'duo'::text, 'lookmhee'::text, 'sonya'::text,
      'series_body'::text, 'music'::text, 'novel'::text, 'promo'::text,
      'award'::text, 'footage'::text
    ])
  );

-- 3) backfill city from the existing free-text location.
--    '泰国' is a country, not a city, so it is left for a manual fill.
update lmsy_archive.projects
set city = btrim(location)
where category = 'live_event'
  and city is null
  and location is not null
  and btrim(location) <> ''
  and btrim(location) <> '泰国';

-- 4) concert: one fan concert + the four EVERAFTER stops.
update lmsy_archive.projects set subtype = 'concert'
where id in (
  'e3b45d11-6f10-4feb-8b6c-611442ba2d97', -- Be My Romance FanCon
  '6ade9054-6d82-4469-8c1b-1d78c6df0a53', -- EVERAFTER: BEGIN in Manila
  '911a7f6d-2155-40ac-93be-cbc37d873505', -- EVERAFTER: UNFOLD in Ho Chi Minh City
  '9505b4ff-c039-4e1f-81f5-c43b94c6ab08', -- EVERAFTER: BLOOM in Sao Paulo
  '5e6f21c6-f9d3-4155-9d40-dc4bb7c7b595'  -- EVERAFTER: REMEMBER in Mexico City
);

-- 5) fansign: signing sessions only.
update lmsy_archive.projects set subtype = 'fansign'
where id in (
  '64b88370-1615-4b05-b901-a1d0ae5f95b7', -- Tianjin Fan sign PB
  '3c33f99d-2b93-42a4-baa5-d9f390e8512e', -- 1st Fan Sign in Tianjin
  'd4ee26b6-14c1-4ef7-82d5-4579dfb4c489', -- 1st Fansign in Chongqing
  'd6400365-d8fc-4fe9-bcdf-eb288662f161', -- Harmony Secret Photobook Fansign
  'aa272531-7c2a-4cca-84de-508aae5ca828', -- Spring Letter Fansign - Sonya
  '051cb8db-c671-45f5-8be2-fa6b49363269', -- Whispers of Spring Fansign - Lookmhee
  '92c51db8-5f1d-4faa-9f48-75c9a1dd3fed', -- LMSY Shanghai Duo Fansign
  '990a1012-8bf0-4aa1-8c53-dc9f9d1ad47e'  -- LMSY Fan Sign in Shenzhen
);

-- 6) Hangzhou 2025-11-01 was a FoamDream brand day, not a fan meeting.
update lmsy_archive.projects
set subtype = 'brand_event', city = '杭州'
where id = '5de0b75a-d489-4a24-84cd-0c170d47daf0';

-- 7) city fills for rows that had no location text.
update lmsy_archive.projects set city = '天津'   where id = '64b88370-1615-4b05-b901-a1d0ae5f95b7';
update lmsy_archive.projects set city = '圣保罗' where id = '9505b4ff-c039-4e1f-81f5-c43b94c6ab08';
update lmsy_archive.projects set city = '曼谷'   where id = 'd4edde80-23bf-4ebf-aa3b-89da1e952262';

commit;
