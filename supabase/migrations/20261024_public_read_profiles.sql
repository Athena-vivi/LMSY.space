-- ============================================================================
-- PUBLIC READ on lmsy_archive.profiles
-- ============================================================================
-- WHY THIS FILE EXISTS
--   The public people pages (app/people/page.tsx, app/people/[slug]/page.tsx)
--   read profiles with the anon client. Live production already grants anon
--   SELECT on profiles (verified 2026-10-24: anon returns full rows), but the
--   repository had no migration for it - profiles was hand-created like
--   gallery_assets. A fresh environment built from migrations would therefore
--   render an empty people page.
--
--   This baseline matches production: a permissive SELECT policy for
--   anon/authenticated. All columns are public display data the site renders
--   (name, nickname, slug, avatar_url, role_label, bio, bio_i18n, birthday,
--   ig_handle, x_handle); there are no secrets on this table. Writes never come
--   from anon - every mutation goes through a service_role API route, so no
--   INSERT/UPDATE/DELETE policy is added here (and the phase1 hardening
--   migration already revokes write grants).
--
-- SAFETY
--   - Additive only: enables RLS (already enabled in prod) and drops/creates
--     one SELECT policy. No data touched.
--   - Matches the live policy set, so running it against production is a no-op
--     in effect.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'lmsy_archive' AND tablename = 'profiles'
  ) THEN
    ALTER TABLE lmsy_archive.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.profiles;
    CREATE POLICY phase1_public_read ON lmsy_archive.profiles
      FOR SELECT TO anon, authenticated USING (true);

    RAISE NOTICE 'profiles: public read policy ensured';
  ELSE
    RAISE NOTICE 'profiles: table absent, skipped';
  END IF;
END $$;
