-- ============================================================================
-- 🔍 LMSY_ARCHIVE SCHEMA HEARTBEAT CHECK
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose schema access issues
-- ============================================================================

-- 1. Check if lmsy_archive schema exists
SELECT
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name = 'lmsy_archive';

-- Expected output:
-- schema_name  | schema_owner
-- -------------+--------------
-- lmsy_archive | postgres (or your admin role)

-- ============================================================================
-- 2. Check if tables exist in lmsy_archive
-- ============================================================================
SELECT
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'lmsy_archive'
ORDER BY table_name;

-- Expected output:
-- table_schema  | table_name | table_type
-- ---------------+------------+------------
-- lmsy_archive  | gallery    | BASE TABLE
-- lmsy_archive  | projects   | BASE TABLE

-- ============================================================================
-- 3. Check row counts in lmsy_archive tables
-- ============================================================================
SELECT
    'projects' as table_name,
    COUNT(*) as row_count
FROM lmsy_archive.projects
UNION ALL
SELECT
    'gallery' as table_name,
    COUNT(*) as row_count
FROM lmsy_archive.gallery;

-- Expected output:
-- table_name | row_count
-- ------------+-----------
-- projects   | [number > 0]
-- gallery    | [number > 0]

-- ============================================================================
-- 4. Check sample data from projects table
-- ============================================================================
SELECT
    id,
    title,
    category,
    cover_url,
    release_date
FROM lmsy_archive.projects
ORDER BY release_date DESC
LIMIT 5;

-- Expected output: Sample of your actual project data

-- ============================================================================
-- 5. Check distinct category values in projects
-- ============================================================================
SELECT
    category,
    COUNT(*) as count
FROM lmsy_archive.projects
GROUP BY category
ORDER BY count DESC;

-- Expected output: Shows all category values (e.g., editorial, magazine, series)

-- ============================================================================
-- 6. Check foreign key relationship
-- ============================================================================
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'lmsy_archive'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Expected output: Shows gallery.project_id → projects.id relationship

-- ============================================================================
-- 7. Test SERVICE_ROLE_KEY access (simulate admin client query)
-- ============================================================================
-- This simulates what your API does:
-- SELECT * FROM lmsy_archive.projects;
--
-- If this works, your SERVICE_ROLE_KEY has access
-- If this fails with "permission denied", check RLS policies

-- ============================================================================
-- 8. Check RLS policies on lmsy_archive tables
-- ============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'lmsy_archive';

-- Expected output: Shows all RLS policies (if any)

-- ============================================================================
-- 9. Check if RLS is enabled on lmsy_archive tables
-- ============================================================================
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'lmsy_archive';

-- Expected output:
-- schemaname   | tablename  | rowsecurity
-- --------------+------------+-------------
-- lmsy_archive | gallery    | f (disabled) or t (enabled)
-- lmsy_archive | projects   | f (disabled) or t (enabled)

-- ============================================================================
-- TROUBLESHOOTING GUIDE
-- ============================================================================
--
-- If Step 1 returns no rows:
--   → Schema doesn't exist. Run: CREATE SCHEMA lmsy_archive;
--
-- If Step 2 returns no rows:
--   → Tables don't exist. Run your migration script.
--
-- If Step 3 returns 0 for projects:
--   → Database is empty. Need to sync data from R2.
--
-- If Step 5 shows no rows or unexpected categories:
--   → Category values don't match API filter. Check data.
--
-- If Step 9 shows rowsecurity = true:
--   → RLS is enabled. Check Step 8 for policies.
--   → SERVICE_ROLE_KEY should bypass RLS, but verify.
--
-- If you get "permission denied" on any query:
--   → Your current role doesn't have access.
--   → Make sure you're authenticated as postgres or service_role.
--
-- ============================================================================
