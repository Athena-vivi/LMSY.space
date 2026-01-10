-- ============================================================
-- CRITICAL SQL PERMISSIONS PATCH
-- Run this in Supabase SQL Editor to fix 400 Bad Request errors
-- ============================================================

-- Step 1: Ensure all roles can access the lmsy_archive schema
GRANT USAGE ON SCHEMA lmsy_archive TO anon, authenticated, service_role;

-- Step 2: Grant SELECT permissions for read operations (anon and authenticated)
GRANT SELECT ON ALL TABLES IN SCHEMA lmsy_archive TO anon, authenticated;

-- Step 3: Grant full permissions for admin operations (authenticated and service_role)
GRANT ALL ON ALL TABLES IN SCHEMA lmsy_archive TO authenticated, service_role;

-- Step 4: CRITICAL: Grant sequence permissions for auto-increment IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lmsy_archive TO authenticated, service_role;

-- Step 5: Ensure future tables inherit these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
    GRANT SELECT ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
    GRANT ALL ON TABLES TO authenticated, service_role;

-- Step 6: Ensure future sequences inherit permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- Step 7: Grant usage on all functions in schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA lmsy_archive TO authenticated, service_role;

-- Step 8: Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA lmsy_archive
    GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- Verification query (run this after the patch to verify)
-- Shows all table permissions in lmsy_archive schema
-- Note: This query only checks tables that currently exist in the database
SELECT
    t.table_schema AS schemaname,
    t.table_name AS tablename,
    string_agg(
      CASE
        WHEN has_table_privilege('authenticated'::regrole, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'SELECT') THEN 'SELECT '
        WHEN has_table_privilege('authenticated'::regrole, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'INSERT') THEN 'INSERT '
        WHEN has_table_privilege('authenticated'::regrole, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'UPDATE') THEN 'UPDATE '
        WHEN has_table_privilege('authenticated'::regrole, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'DELETE') THEN 'DELETE '
        ELSE ''
      END, ''
    ) AS privileges_for_authenticated,
    string_agg(
      CASE
        WHEN has_table_privilege('anon'::regrole, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'SELECT') THEN 'SELECT '
        ELSE ''
      END, ''
    ) AS privileges_for_anon
FROM information_schema.tables t
WHERE t.table_schema = 'lmsy_archive'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_schema, t.table_name
ORDER BY t.table_name;
