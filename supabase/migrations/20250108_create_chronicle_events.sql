-- Create chronicle_events table for timeline management
CREATE TABLE IF NOT EXISTS lmsy_archive.chronicle_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('gallery', 'project', 'custom')),
  image_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE lmsy_archive.chronicle_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access on chronicle_events" ON lmsy_archive.chronicle_events;
DROP POLICY IF EXISTS "Allow authenticated insert on chronicle_events" ON lmsy_archive.chronicle_events;
DROP POLICY IF EXISTS "Allow authenticated update on chronicle_events" ON lmsy_archive.chronicle_events;
DROP POLICY IF EXISTS "Allow authenticated delete on chronicle_events" ON lmsy_archive.chronicle_events;

-- Create policies for public read access
CREATE POLICY "Allow public read access on chronicle_events"
  ON lmsy_archive.chronicle_events FOR SELECT
  TO anon
  USING (true);

-- Create policies for authenticated CRUD operations
CREATE POLICY "Allow authenticated insert on chronicle_events"
  ON lmsy_archive.chronicle_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on chronicle_events"
  ON lmsy_archive.chronicle_events FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete on chronicle_events"
  ON lmsy_archive.chronicle_events FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chronicle_events_date ON lmsy_archive.chronicle_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_chronicle_events_type ON lmsy_archive.chronicle_events(event_type);

-- Add comments for documentation
COMMENT ON TABLE lmsy_archive.chronicle_events IS 'Timeline events for the Chronicle page - can reference gallery images or projects';
COMMENT ON COLUMN lmsy_archive.chronicle_events.event_type IS 'Type of event: gallery (references gallery images), project (references projects), or custom (standalone event)';
COMMENT ON COLUMN lmsy_archive.chronicle_events.image_ids IS 'Array of gallery image IDs associated with this event';
