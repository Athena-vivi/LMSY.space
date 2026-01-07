-- =====================================================
-- Music Table: The Soundscape Archive (声景档案馆)
-- =====================================================
-- This table stores the curated discography for LMSY.space
-- Philosophy: Music is not for "listening" but for "resonance"
-- =====================================================

CREATE TABLE IF NOT EXISTS lmsy_archive.music (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core metadata
  title TEXT NOT NULL,
  subtitle TEXT, -- Optional subtitle or poetic descriptor

  -- Release information
  release_date DATE,

  -- Visual assets
  cover_url TEXT, -- R2 storage URL for cover image (4K)
  visual_url TEXT, -- R2 storage URL for visual accompaniment

  -- Audio assets
  audio_url TEXT NOT NULL, -- R2 storage URL for full audio
  instrumental_url TEXT, -- Optional instrumental version

  -- Multi-lingual lyrics (JSONB format)
  -- Structure: { th: string, zh: string, en: string }
  lyrics JSONB,

  -- Credits and production
  composer TEXT[],
  lyricist TEXT[],
  producer TEXT[],
  vocals TEXT[], -- ['Sonya', 'Lookmhee', 'Duet']

  -- Chronological context
  chronicle_event_id UUID REFERENCES lmsy_archive.chronicle_events(id) ON DELETE SET NULL,

  -- Artistic context
  -- The moment or emotion this song captures
  poetic_context TEXT,

  -- Interview quotes about this song (JSONB array)
  -- Structure: [{ speaker: 'Sonya'|'Lookmhee', quote: string, context: string }]
  interview_quotes JSONB,

  -- Ordering
  track_number INTEGER,
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Publication status
  published BOOLEAN DEFAULT FALSE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_music_display_order ON lmsy_archive.music(display_order DESC) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_music_release_date ON lmsy_archive.music(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_music_chronicle_event ON lmsy_archive.music(chronicle_event_id);

-- Enable Row Level Security
ALTER TABLE lmsy_archive.music ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read published music
CREATE POLICY "Public can view published music"
  ON lmsy_archive.music
  FOR SELECT
  USING (published = TRUE);

-- Policy: Admins can insert and update music
CREATE POLICY "Admins can manage music"
  ON lmsy_archive.music
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM lmsy_archive.admin_users WHERE is_admin = TRUE
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION lmsy_archive.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_music_updated_at
  BEFORE UPDATE ON lmsy_archive.music
  FOR EACH ROW
  EXECUTE FUNCTION lmsy_archive.update_updated_at_column();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE lmsy_archive.music IS 'The Soundscape Archive: Curated discography where music resonates rather than plays';
COMMENT ON COLUMN lmsy_archive.music.title IS 'Song title - the poetic name of this resonance';
COMMENT ON COLUMN lmsy_archive.music.lyrics IS 'Multi-lingual lyrics in JSONB: { th: "Thai lyrics", zh: "Chinese lyrics", en: "English lyrics" }';
COMMENT ON COLUMN lmsy_archive.music.vocals IS 'Array of vocalists: ["Sonya"], ["Lookmhee"], or ["Sonya", "Lookmhee"] for duets';
COMMENT ON COLUMN lmsy_archive.music.poetic_context IS 'The emotional or philosophical context of this song - not description, but essence';
COMMENT ON COLUMN lmsy_archive.music.interview_quotes IS 'Array of interview moments where they spoke about this song: [{ speaker, quote, context }]';

-- =====================================================
-- Example data structure for lyrics JSONB:
-- {
--   "th": "ในที่เงียบสงบของหัวใจ...",
--   "zh": "在心灵的静谧中...",
--   "en": "In the quiet of the heart...",
--   "sections": [
--     { "type": "verse", "number": 1, "timestamp": "0:00" },
--     { "type": "chorus", "timestamp": "1:23" }
--   ]
-- }
--
-- Example data structure for interview_quotes:
-- [
--   {
--     "speaker": "Sonya",
--     "quote": "This song was born in a moment of complete surrender",
--     "context": "Recording session, February 2024"
--   }
-- ]
-- =====================================================
