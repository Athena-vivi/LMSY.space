-- ============================================================================
-- PHASE 1 RLS / PERMISSION HARDENING for schema lmsy_archive
-- ============================================================================
-- PROBLEM (audit finding P1-1)
--   20250110_fix_permissions_patch.sql ran:
--       GRANT ALL ON ALL TABLES IN SCHEMA lmsy_archive TO authenticated;
--   and schema.sql created write policies of the form
--       ... FOR INSERT TO authenticated WITH CHECK (true);
--   Together that means ANY self-registered Supabase user (the anon key can
--   create accounts when sign-ups are open) could INSERT/UPDATE/DELETE rows in
--   every business table.
--
-- DESIGN
--   The application never writes with the anon/authenticated role:
--   every mutation goes through a Next.js API route that uses the service_role
--   key (lib/supabase/admin.ts), and service_role bypasses RLS.
--   Therefore:
--     - anon / authenticated keep SELECT only, and only on the tables the
--       public site actually reads;
--     - all INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER grants are revoked;
--     - permissive '*' write policies are dropped;
--     - RLS is enabled on every table; tables outside the public-read list get
--       no policy at all, which means no access for anon/authenticated;
--     - sensitive tables (draft queue, admin roster) additionally lose SELECT.
--
-- SAFETY
--   - No data is modified.
--   - Table existence is checked before every ALTER: tables referenced by old
--     migrations but absent in production (members, schedule, messages, music)
--     are skipped instead of raising errors.
--   - service_role behaviour is unchanged, so the admin UI keeps working.
--
-- Run order: after 20261015_phase1_data_integrity.sql
-- ============================================================================

DO $$
DECLARE
  t record;

  -- Tables the public frontend reads with the anon key (verified by scanning
  -- app/**, components/** on 2026-10-15: gallery_assets, projects, gallery,
  -- schedule, members).
  public_read text[] := ARRAY[
    'gallery_assets',
    'gallery',
    'projects',
    'schedule',
    'members',
    'chronicle_events',
    'site_content_blocks'
  ];

  -- Admin-only content: no anon/authenticated read at all.
  deny_read text[] := ARRAY[
    'draft_items',
    'admin_users'
  ];
BEGIN
  -- 1. Revoke every write privilege, and enable RLS, on each existing table.
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'lmsy_archive'
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON lmsy_archive.%I FROM anon, authenticated',
      t.tablename
    );

    EXECUTE format('ALTER TABLE lmsy_archive.%I ENABLE ROW LEVEL SECURITY', t.tablename);

    IF t.tablename = ANY (public_read) THEN
      EXECUTE format('DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.%I', t.tablename);
      EXECUTE format(
        'CREATE POLICY phase1_public_read ON lmsy_archive.%I FOR SELECT TO anon, authenticated USING (true)',
        t.tablename
      );
      RAISE NOTICE 'public read kept: %', t.tablename;
    END IF;

    IF t.tablename = ANY (deny_read) THEN
      EXECUTE format('REVOKE SELECT ON lmsy_archive.%I FROM anon, authenticated', t.tablename);
      RAISE NOTICE 'read denied to anon/authenticated: %', t.tablename;
    END IF;
  END LOOP;

  -- 2. Drop legacy permissive write policies, whatever table they sit on.
  FOR t IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'lmsy_archive'
      AND (
        policyname ILIKE '%authenticated insert%'
        OR policyname ILIKE '%authenticated update%'
        OR policyname ILIKE '%authenticated delete%'
        OR (cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') AND roles::text ILIKE '%authenticated%')
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON lmsy_archive.%I', t.policyname, t.tablename);
    RAISE NOTICE 'dropped legacy write policy % on %', t.policyname, t.tablename;
  END LOOP;
END $$;

-- 3. Stop future tables from inheriting write access.
ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- 4. Keep read access explicit for anon/authenticated (SELECT only).
GRANT USAGE ON SCHEMA lmsy_archive TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
  GRANT SELECT ON TABLES TO anon, authenticated;

-- ============================================================================
-- VERIFICATION (run manually after applying)
-- ============================================================================
-- a) No table grants write privileges to anon / authenticated (expect zero rows):
--   SELECT table_name, grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'lmsy_archive'
--     AND grantee IN ('anon', 'authenticated')
--     AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');
--
-- b) RLS enabled everywhere (expect zero rows):
--   SELECT c.relname
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'lmsy_archive' AND c.relkind = 'r' AND NOT c.relrowsecurity;
--
-- c) Policies now in place:
--   SELECT tablename, policyname, cmd, roles
--   FROM pg_policies WHERE schemaname = 'lmsy_archive' ORDER BY tablename;
--
-- d) Functional checks (run from the app, not SQL):
--   - public gallery page still lists images (anon SELECT on gallery_assets)
--   - public projects page still lists projects (anon SELECT on projects)
--   - admin UI can still create / edit / publish (service_role bypasses RLS)
--   - a signed-in NON-admin user cannot read draft_items or write anything
--     (test with the anon key and a throwaway account, then delete the account)
