-- Add sequence_order column for batch edit ordering
ALTER TABLE lmsy_archive.draft_items
ADD COLUMN IF NOT EXISTS sequence_order INTEGER;

-- Create index for sequence_order
CREATE INDEX IF NOT EXISTS idx_draft_items_sequence_order
ON lmsy_archive.draft_items(sequence_order);

-- Add comment
COMMENT ON COLUMN lmsy_archive.draft_items.sequence_order IS 'Order for items in the same group/event (used in batch edit)';
