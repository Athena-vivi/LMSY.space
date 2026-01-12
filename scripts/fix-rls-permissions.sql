-- ============================================================================
-- 🔒 RLS PERMISSIONS FIX FOR LMSY_ARCHIVE
-- ============================================================================
-- This script ensures that the 'anon' (anonymous visitor) role has proper
-- SELECT permissions on all tables in the lmsy_archive schema.
--
-- Run this in Supabase SQL Editor:
-- 1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/sql
-- 2. Paste and execute this script
-- ============================================================================

-- 1. Grant USAGE on the lmsy_archive schema to anon (if not already granted)
GRANT USAGE ON SCHEMA lmsy_archive TO anon;

-- 2. Grant SELECT on all tables in lmsy_archive schema
GRANT SELECT ON ALL TABLES IN SCHEMA lmsy_archive TO anon;

-- 3. Ensure future tables also get SELECT permission
ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
GRANT SELECT ON TABLES TO anon;

-- 4. Verify permissions (run this to check)
SELECT
    schemaname,
    tablename,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE schemaname = 'lmsy_archive'
  AND grantee = 'anon'
  AND privilege_type = 'SELECT'
ORDER BY tablename;

-- ============================================================================
-- EXPECTED OUTPUT:
-- You should see something like:
-- schemaname   | tablename  | grantee | privilege_type
-- -------------+------------+---------+---------------
-- lmsy_archive | gallery    | anon    | SELECT
-- lmsy_archive | projects   | anon    | SELECT
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING:
-- If you see "permission denied" errors, make sure:
-- 1. You're running this as the postgres superuser
-- 2. The lmsy_archive schema exists
-- 3. The tables (projects, gallery) exist in lmsy_archive
--
-- To check if schema exists:
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'lmsy_archive';
--
-- To check if tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'lmsy_archive';
-- ============================================================================
