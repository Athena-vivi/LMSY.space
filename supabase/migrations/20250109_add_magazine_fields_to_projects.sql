-- Add magazine-specific fields to projects table
-- This enables catalog IDs and blur data for magazine projects

-- Add catalog_id column
ALTER TABLE lmsy_archive.projects
ADD COLUMN IF NOT EXISTS catalog_id TEXT UNIQUE;

-- Add blur_data column for progressive image loading
ALTER TABLE lmsy_archive.projects
ADD COLUMN IF NOT EXISTS blur_data TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_projects_catalog_id ON lmsy_archive.projects(catalog_id);

-- Add comments for documentation
COMMENT ON COLUMN lmsy_archive.projects.catalog_id IS 'Unique catalog identifier (e.g., LMSY-ED-2024-001)';
COMMENT ON COLUMN lmsy_archive.projects.blur_data IS 'Base64 blur placeholder for progressive image loading';
