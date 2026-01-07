-- LMSY Official Fan Site Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS lmsy_archive.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  birthday DATE,
  height TEXT,
  bio TEXT,
  avatar_url TEXT,
  ig_handle TEXT,
  x_handle TEXT,
  weibo_handle TEXT,
  xhs_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS lmsy_archive.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('series', 'music', 'magazine')),
  release_date DATE,
  description TEXT,
  cover_url TEXT,
  watch_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery table
CREATE TABLE IF NOT EXISTS lmsy_archive.gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  tag TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  catalog_id TEXT UNIQUE,  -- LMSY-2026-XXX format
  is_editorial BOOLEAN DEFAULT FALSE,  -- Curatorial special feature
  curator_note TEXT,  -- Markdown-formatted curator's note
  title TEXT,
  excerpt TEXT,
  category VARCHAR(100),
  author VARCHAR(100),
  read_time VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule table
CREATE TABLE IF NOT EXISTS lmsy_archive.schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE lmsy_archive.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmsy_archive.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmsy_archive.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmsy_archive.schedule ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access on members" ON lmsy_archive.members;
DROP POLICY IF EXISTS "Allow public read access on projects" ON lmsy_archive.projects;
DROP POLICY IF EXISTS "Allow public read access on gallery" ON lmsy_archive.gallery;
DROP POLICY IF EXISTS "Allow public read access on schedule" ON lmsy_archive.schedule;
DROP POLICY IF EXISTS "Allow authenticated insert on members" ON lmsy_archive.members;
DROP POLICY IF EXISTS "Allow authenticated update on members" ON lmsy_archive.members;
DROP POLICY IF EXISTS "Allow authenticated insert on projects" ON lmsy_archive.projects;
DROP POLICY IF EXISTS "Allow authenticated update on projects" ON lmsy_archive.projects;
DROP POLICY IF EXISTS "Allow authenticated insert on gallery" ON lmsy_archive.gallery;
DROP POLICY IF EXISTS "Allow authenticated update on gallery" ON lmsy_archive.gallery;
DROP POLICY IF EXISTS "Allow authenticated insert on schedule" ON lmsy_archive.schedule;
DROP POLICY IF EXISTS "Allow authenticated update on schedule" ON lmsy_archive.schedule;

-- Create policies for public read access
CREATE POLICY "Allow public read access on members"
  ON lmsy_archive.members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access on projects"
  ON lmsy_archive.projects FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access on gallery"
  ON lmsy_archive.gallery FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access on schedule"
  ON lmsy_archive.schedule FOR SELECT
  TO anon
  USING (true);

-- Create policies for authenticated insert/update
CREATE POLICY "Allow authenticated insert on members"
  ON lmsy_archive.members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on members"
  ON lmsy_archive.members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on projects"
  ON lmsy_archive.projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on projects"
  ON lmsy_archive.projects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on gallery"
  ON lmsy_archive.gallery FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on gallery"
  ON lmsy_archive.gallery FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on schedule"
  ON lmsy_archive.schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on schedule"
  ON lmsy_archive.schedule FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON lmsy_archive.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_release_date ON lmsy_archive.projects(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_tag ON lmsy_archive.gallery(tag);
CREATE INDEX IF NOT EXISTS idx_gallery_is_featured ON lmsy_archive.gallery(is_featured);
CREATE INDEX IF NOT EXISTS idx_gallery_is_editorial ON lmsy_archive.gallery(is_editorial);
CREATE INDEX IF NOT EXISTS idx_gallery_catalog_id ON lmsy_archive.gallery(catalog_id);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON lmsy_archive.gallery(category);
CREATE INDEX IF NOT EXISTS idx_gallery_author ON lmsy_archive.gallery(author);
CREATE INDEX IF NOT EXISTS idx_schedule_event_date ON lmsy_archive.schedule(event_date DESC);

-- Migration script for existing gallery table
-- Run this in Supabase SQL Editor if gallery table already exists:
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS catalog_id TEXT UNIQUE;
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS is_editorial BOOLEAN DEFAULT FALSE;
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS curator_note TEXT;
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS author VARCHAR(100);
ALTER TABLE lmsy_archive.gallery ADD COLUMN IF NOT EXISTS read_time VARCHAR(50);

-- Function to generate catalog ID
CREATE OR REPLACE FUNCTION generate_catalog_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.catalog_id IS NULL THEN
    NEW.catalog_id := 'LMSY-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('lmsy_archive.gallery_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS lmsy_archive.gallery_seq START 1;

-- Trigger to auto-generate catalog_id
CREATE TRIGGER set_catalog_id
  BEFORE INSERT ON lmsy_archive.gallery
  FOR EACH ROW
  EXECUTE FUNCTION generate_catalog_id();

-- Sample data insertion (optional)
-- Uncomment below to insert sample members

/*
INSERT INTO lmsy_archive.members (name, nickname, birthday, height, bio, avatar_url, ig_handle, x_handle, weibo_handle, xhs_handle) VALUES
('Lookmhee', 'Lookmhee', '2003-05-15', '165cm', 'Thai actress known for her role in Affair', null, '@lookmhee', '@lookmhee_official', '@lookmhee_weibo', '@lookmhee_xhs'),
('Sonya', 'Sonya', '2003-08-22', '168cm', 'Thai actress known for her role in Affair', null, '@sonya', '@sonya_official', '@sonya_weibo', '@sonya_xhs');
*/

-- Storage buckets setup
-- Run these in Supabase Storage section:
-- 1. Create bucket named "avatars" (public)
-- 2. Create bucket named "project-covers" (public)
-- 3. Create bucket named "gallery" (public)
-- 4. Create bucket named "assets" (public)

-- ============================================
-- MIGRATION: Add new columns to existing members table
-- If you already have the members table created, run this ALTER TABLE statement:
-- ============================================

-- ALTER TABLE lmsy_archive.members ADD COLUMN IF NOT EXISTS height TEXT, ADD COLUMN IF NOT EXISTS weibo_handle TEXT, ADD COLUMN IF NOT EXISTS xhs_handle TEXT;
