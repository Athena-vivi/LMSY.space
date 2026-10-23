-- 2026-10-23 public_appearance: premiere -> company, city backfill,
-- Changeverse title split.
--
-- Snapshot before this migration: temp/20261023_public_appearance_snapshot.json
-- Rollback: temp/20261023_public_appearance_rollback.sql
-- The airport row is removed by 20261023_public_appearance_airport_removal.sql
--
-- Every statement below is scoped by explicit id; nothing matches on
-- category alone.

begin;

-- 1) The subtype value premiere is renamed company. The shelf label has
--    read "Company Events" since 2026-10-23; the value and the URL now
--    agree with it. Order matters: the old whitelist has no company, so
--    it is dropped before the rows are rewritten and re-added after.
alter table lmsy_archive.projects drop constraint if exists projects_subtype_check;

update lmsy_archive.projects
   set subtype = 'company'
 where id in ('0b6e7174-2960-443a-a642-5fd46e379ce5','168f1ee9-9065-4676-9f2a-82896c3b4d1a','540fc848-3e3a-43a4-a12b-66d5ff6ceac4','5190badb-957f-4b5b-80fa-9251172d1b89','0328a99c-10e5-4ce5-9759-bb9fe58cd36f');

alter table lmsy_archive.projects add constraint projects_subtype_check
  check (subtype is null or subtype = any (array[
    'company'::text, 'awards'::text, 'fashion'::text, 'brand_stage'::text,
    'industry'::text, 'charity'::text,
    'fanmeeting'::text, 'concert'::text, 'fansign'::text, 'brand_event'::text,
    'birthday'::text,
    'feature'::text, 'press'::text, 'tv_news'::text, 'duo'::text,
    'lookmhee'::text, 'sonya'::text, 'series_body'::text, 'music'::text,
    'novel'::text, 'promo'::text, 'award'::text, 'footage'::text
  ]));

-- 2) City backfill. Every appearance except Manila Fashion Week is a
--    Bangkok booking - the venues named in the source list (Paragon Hall,
--    ICONSIAM, EMSPHERE, GMM Grammy Place, Central Rama 3, Siam Center)
--    are all in Bangkok.
update lmsy_archive.projects set city = '曼谷' where id in (
  '0b6e7174-2960-443a-a642-5fd46e379ce5','1fda606b-46c0-413b-843f-035353ac9a19','325a91e6-36be-4957-8a95-41319672d2b1','dfa3b225-ba38-4fac-8685-4ea7712d84a6',
  '879eb2a3-c767-455b-ba51-b9e1155e01de','effecdff-f717-400f-b537-bceb0887ed96','bbf19f1b-bb10-4610-bf2b-cfb74398bda5','36492b68-49c1-4257-990d-a13c6d74b6d7',
  'ecc68d6b-1102-4625-bd5c-345a8834818c','c5f234e7-21da-4258-8bcb-4a21d2e9b0e7','e3aeef1f-af0e-48b7-8fed-1b26d070c895','a4f827dd-f76a-4233-9027-13ecfeb4d029',
  '53097bdf-87a7-465e-ba70-607fcccafa57','268f8489-463f-4cc7-8b80-20283d748294','fb5a3b01-eabb-41c1-be9e-fad558257362','0aa44012-1714-4fb0-9280-aa3e427e29b5',
  '1170e04e-da04-4f60-a0ab-9c81b027c880','967ca3dc-33aa-4a7d-be61-b943688eda70','3b40f9bc-34f6-4e9d-a725-f10a6647751d','168f1ee9-9065-4676-9f2a-82896c3b4d1a',
  '925a1fc6-8222-4eb0-b825-fa2f8f1efaf9','4dbc9ca1-9154-46d4-83a7-ab06426b49e5','d80e79c4-562c-43da-bda1-56a2326f3023','9a14a763-6392-4b2a-9baf-2d7b344e1dc5',
  'c09cb190-8138-42e5-b81f-3d308879b07b','bb5e9009-5478-41ee-8359-cb3ec2c0f14c','f0e0adbd-be18-43a5-b82c-6be66f67f9b7','7462d573-f1a6-454e-b7db-3db0dc273727',
  'ed22224c-f6a3-4d85-85d2-31f7754c22df','e025726f-8353-446a-a48e-fce90f9e1515','3ea2808f-3c91-4717-8c95-3a153310fb3e','436ed94f-0586-4dfe-a2dc-18cb4e1810ed',
  '540fc848-3e3a-43a4-a12b-66d5ff6ceac4','5190badb-957f-4b5b-80fa-9251172d1b89','f8d43f0c-3fa1-41aa-8c61-166841b9e4f4','242cf042-d265-4685-8f8b-afe7f9bcca63',
  '0c368d15-54e7-4f30-9e63-aff9e181189b','bfbae8e5-c18a-41a3-8ca0-bcf49b91255a','d36ae63f-6fb9-46b1-a502-64d4844011b9','0328a99c-10e5-4ce5-9759-bb9fe58cd36f',
  '3a3f69d0-2528-4a6a-bb96-8456bd211bf1','a55f2cd5-bd27-476b-94ed-cded4bff43ac','44438cab-e574-4146-ad51-9dc1a2d31767','4664498e-597c-49cc-9535-1b360fd42c63',
  '62555e4d-a6b5-4d1f-b0bb-bfcaea7d521b','4d5a326e-321c-4954-89bf-cfadcf0e78e4','2ff0b241-6e54-49b5-99be-7657a5499458'
);

update lmsy_archive.projects set city = '马尼拉' where id in ('5f6b8ae4-bb24-4e50-a532-a56f220060a3');

-- 3) Two rows describe the same event (the CHANGE2561 2026 lineup reveal):
--    the archive import and the stage photo set. Both are kept; the titles
--    now say which is which.
update lmsy_archive.projects set title = 'CHANGEVERSE 2026 · 年度推介会'
 where id = 'f8d43f0c-3fa1-41aa-8c61-166841b9e4f4';
update lmsy_archive.projects set title = 'CHANGEVERSE 2026 · 现场图集'
 where id = '5190badb-957f-4b5b-80fa-9251172d1b89';

commit;
