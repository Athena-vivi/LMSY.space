-- Security hygiene: close anon read on the internal snapshot tables.
--
-- Status: APPLIED to production 2026-10-24 (Supabase management API).
-- Verified after applying: 71/71 tables have RLS on, 0 left RLS-off; anon
-- gets 401 on the snapshots and still 200 on project_people / works /
-- projects / gallery_assets / profiles / site_content_blocks.
--
-- Finding (measured 2026-10-24)
-- -----------------------------
-- `lmsy_archive` holds 57 backup tables created by past data scripts
-- (`*_snap_*`, `snap_*`). None of them has row level security enabled, and
-- every one of them grants SELECT to `anon` and `authenticated`, so the
-- public anon key can read them through PostgREST:
--
--   curl -H "apikey: <anon>" -H "Accept-Profile: lmsy_archive" \
--        "<url>/rest/v1/gallery_assets_snap_m1_20261020?select=*&limit=1"
--   -> 200, a real row
--
-- Those tables are full copies of `projects` / `gallery_assets` / `profiles`
-- taken before an edit, so they contain rows that are NOT public today
-- (portal_visible = false, drafts, deleted-later projects). The site itself
-- never reads them - a grep for `_snap_` / `snap_` across lib, app,
-- components and scripts returns nothing - which is what makes the fix safe.
--
-- Two more tables have RLS disabled for a different reason and are handled
-- separately at the bottom: `works` and `project_people`. Both are real
-- tables the app does read; they only need RLS enabled WITH a read policy,
-- which is behaviour-identical for SELECT and stops the table from being
-- grant-open.
--
-- What this file does
-- -------------------
--   1. revoke SELECT from anon/authenticated on the 57 snapshot tables
--   2. enable RLS on them with no policy -> deny all except the owner and
--      service_role (both bypass RLS), so a future grant cannot re-open them
--   3. enable RLS on `works` / `project_people` and give them the same
--      `USING (true)` read policy as the other public tables, so reads are
--      unchanged and writes stay denied
--
-- The list is explicit, not a pattern match: a `like '%snap%'` loop would
-- also catch a future table that somebody means to expose. Re-runnable.
--
-- NOT in scope, still to decide (reported, untouched):
--   * `publications` - RLS on, anon-readable, and no code references it
--   * `catalog_registry` - RLS on, read policy is TO public, but only
--     /api/admin/catalog-registry reads it
--
-- Rollback: the reverse is one GRANT / one DISABLE per table, printed by the
-- loop's RAISE NOTICE output if it is ever needed; see the note at the bottom.

DO $$
DECLARE
  t text;
  locked text[] := ARRAY[
    'drama_events_snap_d1_20261021',
    'drama_events_snap_m1_20261020',
    'ga_snap_k211_date_20261022',
    'ga_snap_kazz211_20261021',
    'ga_snap_perlalm_20261022',
    'ga_snap_perlalm_rename_20261022',
    'ga_snap_perlasy_20261022',
    'ga_snap_ther_add_20261021',
    'gallery_assets_snap_20261020',
    'gallery_assets_snap_catslot_20261021',
    'gallery_assets_snap_door2c_20261021',
    'gallery_assets_snap_drama_ids_20261023',
    'gallery_assets_snap_kazz217lm_20261021',
    'gallery_assets_snap_kazz217sy_20261021',
    'gallery_assets_snap_m1_20261020',
    'gallery_assets_snap_person_20261023',
    'gallery_assets_snap_rename_20261021',
    'profiles_snap_person_20261023',
    'profiles_snap_rename_20261021',
    'proj_snap_cover_lm_20261022',
    'proj_snap_k211_date_20261022',
    'proj_snap_kazz211_20261021',
    'proj_snap_slug_perlasy_20261022',
    'proj_snap_tianjinpb_door_20261022',
    'projects_snap_20261020',
    'projects_snap_d1_20261020',
    'projects_snap_del_8255cf96_20261021',
    'projects_snap_del_c754261a_20261021',
    'projects_snap_door2_20261021',
    'projects_snap_door2b_20261021',
    'projects_snap_door2c_20261021',
    'projects_snap_drama_ids_20261023',
    'projects_snap_drama_subtype_20261023',
    'projects_snap_eddates_20261021',
    'projects_snap_kazz217_date_20261021',
    'projects_snap_kazz217sy_20261021',
    'projects_snap_m1_20261020',
    'projects_snap_p1_20261020',
    'projects_snap_p2_20261020',
    'projects_snap_person_20261023',
    'projects_snap_rename_20261021',
    'projects_snap_sy_20261021',
    'snap_affair_premiere_assets_20261022',
    'snap_backview_assets_20261022',
    'snap_backview_feat_fix_20261022',
    'snap_kazz_naming_assets_20261022',
    'snap_kazz_naming_projects_20261022',
    'snap_perla_rename_assets_20261022',
    'snap_perla_rename_projects_20261022',
    'snap_ther_bad16_20261022',
    'snap_ther_date_assets_20261022',
    'snap_ther_date_project_20261022',
    'snap_titles_assets_20261022',
    'snap_titles_projects_20261022',
    'snap_umag_010_20261022',
    'works_snap_20261020',
    'works_snap_d1_20261020'
  ];
  kept text[] := ARRAY['works', 'project_people'];
  n integer := 0;
BEGIN
  -- 1+2. internal snapshots: no public read, RLS on with no policy.
  FOREACH t IN ARRAY locked LOOP
    IF to_regclass(format('lmsy_archive.%I', t)) IS NULL THEN
      RAISE NOTICE 'skip (absent): %', t;
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE SELECT ON lmsy_archive.%I FROM anon, authenticated', t);
    EXECUTE format('ALTER TABLE lmsy_archive.%I ENABLE ROW LEVEL SECURITY', t);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'snapshots locked: %', n;

  -- 3. real tables the app reads: keep the read, close the grant-open state.
  FOREACH t IN ARRAY kept LOOP
    IF to_regclass(format('lmsy_archive.%I', t)) IS NULL THEN
      RAISE NOTICE 'skip (absent): %', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE lmsy_archive.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.%I', t);
    EXECUTE format(
      'CREATE POLICY phase1_public_read ON lmsy_archive.%I FOR SELECT TO anon, authenticated USING (true)',
      t
    );
    RAISE NOTICE 'kept public read, RLS on: %', t;
  END LOOP;
END $$;

-- Verification after applying:
--   as anon, every snapshot table must answer 401/404, e.g.
--     <url>/rest/v1/gallery_assets_snap_m1_20261020?select=*&limit=1
--   as anon, the two kept tables must still answer 200 with rows:
--     <url>/rest/v1/project_people?select=*&limit=1
--     <url>/rest/v1/works?select=*&limit=1
--
-- Rollback (per table, if a snapshot ever has to be read through the API):
--   ALTER TABLE lmsy_archive.<t> DISABLE ROW LEVEL SECURITY;
--   GRANT SELECT ON lmsy_archive.<t> TO anon, authenticated;
