-- Migration: add the `press` (媒体群访 / press scrum) category.
-- Date: 2026-10-26
-- Why: 媒体群访 (red-carpet / group scrum) and 深度访谈 (sit-down in-depth
-- interview) are produced and watched for very different reasons, so they must
-- be two separate shelves under /talks instead of one `interview` bucket.
--
-- The previous category CHECK only listed the existing 12 vocabulary values;
-- this rebuilds it with `press` appended. The values are reproduced verbatim
-- from lib/category-registry.ts (PROJECT_CATEGORIES) so the constraint and the
-- TS vocabulary can never drift apart.

ALTER TABLE lmsy_archive.projects
  DROP CONSTRAINT IF EXISTS projects_category_check;

ALTER TABLE lmsy_archive.projects
  ADD CONSTRAINT projects_category_check
  CHECK (category IN (
    'drama_work',
    'editorial',
    'live_event',
    'public_appearance',
    'commercial',
    'interview',
    'variety',
    'radio',
    'live_stream',
    'behind_the_scenes',
    'personal_travel',
    'early_archive',
    'press'
  ));
