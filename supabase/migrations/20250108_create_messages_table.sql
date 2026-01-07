-- Create messages table for Whispers feature
CREATE TABLE IF NOT EXISTS lmsy_archive.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  author VARCHAR(100) NOT NULL CHECK (char_length(author) >= 1 AND char_length(author) <= 100),
  location VARCHAR(200),
  color_pref TEXT NOT NULL CHECK (color_pref IN ('yellow', 'blue')),
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure at least one identification field is present
  CHECK (author IS NOT NULL OR location IS NOT NULL)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_is_approved_idx ON lmsy_archive.messages(is_approved);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON lmsy_archive.messages(created_at DESC);

-- Create index for admin filtering
CREATE INDEX IF NOT EXISTS messages_approval_status_idx ON lmsy_archive.messages(is_approved, created_at DESC);

-- Add Row Level Security (RLS)
ALTER TABLE lmsy_archive.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert messages (no auth required)
CREATE POLICY "Anyone can insert messages"
  ON lmsy_archive.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Anyone can view approved messages
CREATE POLICY "Anyone can view approved messages"
  ON lmsy_archive.messages
  FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

-- Policy: Only admins can view all messages (including pending)
CREATE POLICY "Admins can view all messages"
  ON lmsy_archive.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lmsy_archive.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Policy: Only admins can update messages (approve/reject)
CREATE POLICY "Admins can update messages"
  ON lmsy_archive.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lmsy_archive.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (true);

-- Policy: Only admins can delete messages
CREATE POLICY "Admins can delete messages"
  ON lmsy_archive.messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lmsy_archive.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Add helpful comments
COMMENT ON TABLE lmsy_archive.messages IS 'Visitor messages/submissions for the Whispers feature';
COMMENT ON COLUMN lmsy_archive.messages.content IS 'Message content (1-500 characters)';
COMMENT ON COLUMN lmsy_archive.messages.author IS 'Author name (1-100 characters)';
COMMENT ON COLUMN lmsy_archive.messages.location IS 'Optional location (city/galaxy)';
COMMENT ON COLUMN lmsy_archive.messages.color_pref IS 'Color preference: yellow or blue';
COMMENT ON COLUMN lmsy_archive.messages.is_approved IS 'Whether the message has been approved by admin';
COMMENT ON COLUMN lmsy_archive.messages.created_at IS 'Submission timestamp';
