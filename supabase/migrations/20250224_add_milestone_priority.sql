-- Add milestone_priority field to gallery table
-- This allows selecting specific images for each year's milestone display on homepage
-- NULL = not a milestone image
-- 1 = 2022, 2 = 2023, 3 = 2024, 4 = 2025, 5 = ∞ (infinity)

ALTER TABLE lmsy_archive.gallery
ADD COLUMN milestone_priority INTEGER NULL;

-- Add comment for documentation
COMMENT ON COLUMN lmsy_archive.gallery.milestone_priority IS 'Milestone display priority: 1=2022, 2=2023, 3=2024, 4=2025, 5=infinity, NULL=not a milestone';

-- Add index for faster queries
CREATE INDEX idx_gallery_milestone_priority ON lmsy_archive.gallery(milestone_priority) WHERE milestone_priority IS NOT NULL;
