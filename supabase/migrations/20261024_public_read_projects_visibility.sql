-- P1-A / D2: make RLS the second line of defence on `projects`.
--
-- Status: APPLIED to production 2026-10-24 (Supabase management API).
-- Verified after applying: anon sees 174 / 182 rows, service_role sees 182;
-- the 8 hidden rows are radar containers, a draft, archived rows and one
-- test project ("TEMP TALK DOOR TEST") - none of which are public content.
--
-- Why this file exists
-- --------------------
-- `projects` currently carries two overlapping permissive SELECT policies,
-- both of them `USING (true)`:
--
--   "Public read access on projects"  roles: public            qual: true
--   "phase1_public_read"              roles: anon,authenticated qual: true
--
-- PostgREST policies are OR-ed, so tightening `phase1_public_read` alone
-- would change nothing: the legacy `public` policy would keep admitting
-- every row. The legacy policy has to go in the same transaction.
--
-- Two consequences of the missing predicate today:
--   * a draft / container project (portal_visible = false) is anon-readable
--     by direct REST, so hiding it is app-side only;
--   * the app-side rule in lib/project-visibility.ts has no backstop.
--
-- What the new predicate is (and is not)
-- --------------------------------------
-- The policy is deliberately a FLOOR, not a copy of the app filter:
--
--   app  (applyPublicProjectFilter): portal_visible = true, is_container = false,
--                                    curation_status <> 'archived'   (NULLs excluded)
--   RLS  (this policy):             portal_visible IS TRUE,
--                                    is_container IS NOT TRUE,
--                                    curation_status IS DISTINCT FROM 'archived'
--
-- The two NULL-safe forms admit a row whose column is NULL where the app
-- filter drops it. That direction is the safe one: RLS never hides a row the
-- public pages were already showing, and the app filter still decides what
-- actually renders. Making RLS stricter than the app is how a page goes
-- blank for no visible reason.
--
-- Expected effect on production data (measured 2026-10-24, 182 rows):
--   app_filter_equiv = 174, strict_eq = 174 -> anon keeps seeing exactly the
--   174 rows it sees today, and loses direct access to the 8 rows that are
--   portal_visible = false (3 of which are is_container).
--
-- Who is unaffected
-- -----------------
--   * every /api/admin/** route and lib/promote.ts -> service_role bypasses RLS
--   * /api/project-gallery, /api/home/*, /api/search (still service-role today)
--   * the public SSR pages apply applyPublicProjectFilter() themselves, so
--     they read the same 174 rows as before.
--
-- Rollback (see the comment at the bottom).

DO $$
BEGIN
  IF to_regclass('lmsy_archive.projects') IS NULL THEN
    RAISE NOTICE 'projects: absent, skipped';
    RETURN;
  END IF;

  -- 1. drop the legacy catch-all policy, otherwise step 2 is a no-op.
  DROP POLICY IF EXISTS "Public read access on projects" ON lmsy_archive.projects;

  -- 2. replace the phase-1 policy with one that carries the visibility rule.
  DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.projects;
  CREATE POLICY phase1_public_read ON lmsy_archive.projects
    FOR SELECT
    TO anon, authenticated
    USING (
      portal_visible IS TRUE
      AND is_container IS NOT TRUE
      AND curation_status IS DISTINCT FROM 'archived'
    );

  RAISE NOTICE 'projects: public read tightened to the visibility rule';
END $$;

-- Verification after applying (run as a read-only check):
--   as anon, expect 174:
--     select count(*) from lmsy_archive.projects;   -- via PostgREST with the anon key
--   as service_role, expect 182:
--     select count(*) from lmsy_archive.projects;
--
-- Rollback
-- --------
-- BEGIN;
--   DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.projects;
--   CREATE POLICY phase1_public_read ON lmsy_archive.projects
--     FOR SELECT TO anon, authenticated USING (true);
--   CREATE POLICY "Public read access on projects" ON lmsy_archive.projects
--     FOR SELECT TO public USING (true);
-- COMMIT;
