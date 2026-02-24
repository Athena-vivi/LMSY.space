-- Create admin_users table for admin access control
CREATE TABLE IF NOT EXISTS lmsy_archive.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON lmsy_archive.admin_users(user_id);
CREATE INDEX IF NOT EXISTS admin_users_is_active_idx ON lmsy_archive.admin_users(is_active);

-- Enable Row Level Security
ALTER TABLE lmsy_archive.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view admin users
CREATE POLICY "Only admins can view admin users"
  ON lmsy_archive.admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lmsy_archive.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Policy: Only admins can insert admin users
CREATE POLICY "Only admins can insert admin users"
  ON lmsy_archive.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lmsy_archive.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Policy: Only admins can update admin users
CREATE POLICY "Only admins can update admin users"
  ON lmsy_archive.admin_users
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

-- Add helpful comments
COMMENT ON TABLE lmsy_archive.admin_users IS 'Admin user management for access control';
COMMENT ON COLUMN lmsy_archive.admin_users.user_id IS 'Reference to Supabase auth.users.id';
COMMENT ON COLUMN lmsy_archive.admin_users.email IS 'Admin email for reference';
COMMENT ON COLUMN lmsy_archive.admin_users.is_active IS 'Whether this admin has active access';
