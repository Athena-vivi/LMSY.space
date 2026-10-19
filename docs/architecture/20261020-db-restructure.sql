-- Snapshot before the 2026-10-20 restructure. Rollback: restore from these.
create table if not exists lmsy_archive.projects_snap_20261020 as
  select * from lmsy_archive.projects;

create table if not exists lmsy_archive.gallery_assets_snap_20261020 as
  select * from lmsy_archive.gallery_assets;

create table if not exists lmsy_archive.works_snap_20261020 as
  select * from lmsy_archive.works;

select
  (select count(*) from lmsy_archive.projects_snap_20261020) as projects_snap,
  (select count(*) from lmsy_archive.gallery_assets_snap_20261020) as assets_snap,
  (select count(*) from lmsy_archive.works_snap_20261020) as works_snap;

-- 1. category vocabulary: + interview / variety / radio / live_stream
alter table lmsy_archive.projects drop constraint if exists projects_category_check;
alter table lmsy_archive.projects add constraint projects_category_check
  check (category is null or category in (
    'drama_work','editorial','live_event','public_appearance','commercial',
    'interview','variety','radio','live_stream',
    'behind_the_scenes','personal_travel','early_archive'
  ));

-- 2. works.kind: songs, novels, magazines and endorsement identities are works too
alter table lmsy_archive.works drop constraint if exists works_kind_check;
alter table lmsy_archive.works add constraint works_kind_check
  check (kind in ('series','film','stage_play','song','novel','magazine','endorsement','other'));

-- 3. one shared subtype column for the in-hall tabs.
--    fanmeeting / brand_event / birthday   -> live_event
--    premiere / awards / fashion / fanday  -> public_appearance
--    feature / press / tv_news             -> interview
alter table lmsy_archive.projects add column if not exists subtype text;
alter table lmsy_archive.projects drop constraint if exists projects_subtype_check;
alter table lmsy_archive.projects add constraint projects_subtype_check
  check (subtype is null or subtype in (
    'fanmeeting','brand_event','birthday',
    'premiere','awards','fashion','fanday',
    'feature','press','tv_news'
  ));

create index if not exists idx_projects_category_subtype
  on lmsy_archive.projects (category, subtype);

select
  (select pg_get_constraintdef(oid) from pg_constraint where conname='projects_category_check') as cat_check,
  (select pg_get_constraintdef(oid) from pg_constraint where conname='works_kind_check') as kind_check,
  (select count(*) from information_schema.columns
     where table_schema='lmsy_archive' and table_name='projects' and column_name='subtype') as has_subtype;

-- Archive five auto-ingested shells. None of them carries a single image
-- (verified: 0 assets each), so archiving removes nothing a reader could see.
-- Soft archive, not delete: the rows stay for rollback.
update lmsy_archive.projects
set portal_visible = false,
    curation_status = 'archived',
    updated_at = now()
where id in (
  'a8668aeb-1cd6-4f90-aa0a-232defa62cf4',  -- Project 2026-10-19
  'c7aee9fe-36eb-4ef2-97c9-5a1c0d42efb8',  -- Project 2026-03-15 (is_container)
  'abbc104e-c4ae-4bf4-b39d-a06279502ed5',  -- 2025年6月28日
  '315cfd6a-5a34-4d3f-8b07-5d25da644651',  -- Photo from ... March 31, 2026
  '0a24391c-9fbc-44d0-a29f-cb9e7187c4ae'   -- Photo from LMSY自动雷达 10/15/2026 (is_container)
);

-- The Affair premiere was filed under early_archive. It is a public event.
-- Date left null on purpose: the screening date is still being reconciled
-- between the archive site and the press list.
update lmsy_archive.projects
set category = 'public_appearance',
    subtype = 'premiere',
    updated_at = now()
where id = 'd2def39e-c99f-4ecc-88bd-5c1d91d6f11e'
  and category = 'early_archive';

-- MILESTONES_ARCHIVE holds the four per-year homepage photos. It is a
-- container, not an entry, and it was parked in personal_travel.
update lmsy_archive.projects
set is_container = true,
    category = 'early_archive',
    portal_visible = false,
    updated_at = now()
where id = 'a2e6a3e7-3e90-477b-a9ee-1a64b1d4e8de';

select coalesce(category,'(null)') as category,
       count(*) as n,
       count(*) filter (where portal_visible and curation_status is distinct from 'archived'
                          and is_container = false) as visible
from lmsy_archive.projects
group by 1 order by 2 desc;

-- The four ad shoots were titled with a single word and carried no brand.
-- Three of them resolve against the commercial list, and one of those is
-- confirmed visually: the Close gallery has a "foam" prop card and a
-- FOAMTAIL paper bag in frame, matching the FoamDream live stream on the
-- following day. Sweet (2024-02-14) still has no evidence, so it stays null.
update lmsy_archive.projects
set publisher_brand = 'FoamDream', updated_at = now()
where id = 'dd20d8df-a117-419e-a267-724ee84c32ef' and title = 'Close';

update lmsy_archive.projects
set publisher_brand = 'Mistine', updated_at = now()
where id = '32123427-f140-4d52-b7ce-b513b051d7db' and title = 'live';

update lmsy_archive.projects
set publisher_brand = 'Sip The Vibe', updated_at = now()
where id = 'd975076b-3988-457c-8e7f-0323fad1fae7' and title = 'coffee';

select title, coalesce(publisher_brand,'(null)') as brand, category
from lmsy_archive.projects where category = 'commercial' order by title;
