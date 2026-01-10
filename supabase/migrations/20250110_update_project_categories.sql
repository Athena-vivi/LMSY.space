-- Migration: Update Project Categories
-- Date: 2025-01-10
-- Description: Update the category column in projects table to support new orbit classification system

-- First, check if there's an existing check constraint and drop it
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the check constraint name for the category column
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'lmsy_archive.projects'::regclass
      AND contype = 'c'
      AND conname LIKE '%category%';

    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lmsy_archive.projects DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Update the category column type with new enum values
ALTER TABLE lmsy_archive.projects
    ALTER COLUMN category TYPE TEXT USING category::TEXT;

-- Add new check constraint with updated categories
ALTER TABLE lmsy_archive.projects
    ADD CONSTRAINT projects_category_check
    CHECK (category IN ('series', 'editorial', 'appearance', 'journal', 'commercial'));

-- Add comment to document the new classification system
COMMENT ON COLUMN lmsy_archive.projects.category IS '
Orbit Classification System:
  - series: TV/Drama content (Catalog prefix: STILL)
  - editorial: Magazine/Editorial content (Catalog prefix: MAG)
  - appearance: Event/Stage appearances (Catalog prefix: STAGE)
  - journal: Daily/Travel documentation (Catalog prefix: JRN)
  - commercial: Advertisements/Brand collaborations (Catalog prefix: AD)
';

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS projects_category_idx
    ON lmsy_archive.projects(category);

-- Migration complete
-- Note: Existing records with old category values ('music', 'magazine') need to be mapped:
--   - 'magazine' -> 'editorial'
--   - 'music' -> 'appearance' (or appropriate category)
