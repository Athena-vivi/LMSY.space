-- Add project_id and blur_data columns to gallery table
-- This enables gallery items to be associated with magazine projects

-- Add project_id foreign key column
ALTER TABLE lmsy_archive.gallery
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES lmsy_archive.projects(id) ON DELETE SET NULL;

-- Add blur_data column for progressive image loading
ALTER TABLE lmsy_archive.gallery
ADD COLUMN IF NOT EXISTS blur_data TEXT;

-- Add event_date column for archival organization
ALTER TABLE lmsy_archive.gallery
ADD COLUMN IF NOT EXISTS event_date DATE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_gallery_project_id ON lmsy_archive.gallery(project_id);
CREATE INDEX IF NOT EXISTS idx_gallery_event_date ON lmsy_archive.gallery(event_date DESC);

-- Add comments for documentation
COMMENT ON COLUMN lmsy_archive.gallery.project_id IS 'References the parent project (e.g., magazine issue) when this image belongs to a project';
COMMENT ON COLUMN lmsy_archive.gallery.blur_data IS 'Base64 blur placeholder for progressive image loading';
COMMENT ON COLUMN lmsy_archive.gallery.event_date IS 'Event date for archival organization and catalog ID generation';
