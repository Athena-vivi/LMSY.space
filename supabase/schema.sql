-- LMSY Official Fan Site Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS members (
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
CREATE TABLE IF NOT EXISTS projects (
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
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  tag TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  catalog_id TEXT UNIQUE,  -- LMSY-2026-XXX format
  is_editorial BOOLEAN DEFAULT FALSE,  -- Curatorial special feature
  curator_note TEXT,  -- Markdown-formatted curator's note
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access on members" ON members;
DROP POLICY IF EXISTS "Allow public read access on projects" ON projects;
DROP POLICY IF EXISTS "Allow public read access on gallery" ON gallery;
DROP POLICY IF EXISTS "Allow public read access on schedule" ON schedule;
DROP POLICY IF EXISTS "Allow authenticated insert on members" ON members;
DROP POLICY IF EXISTS "Allow authenticated update on members" ON members;
DROP POLICY IF EXISTS "Allow authenticated insert on projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated update on projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated insert on gallery" ON gallery;
DROP POLICY IF EXISTS "Allow authenticated update on gallery" ON gallery;
DROP POLICY IF EXISTS "Allow authenticated insert on schedule" ON schedule;
DROP POLICY IF EXISTS "Allow authenticated update on schedule" ON schedule;

-- Create policies for public read access
CREATE POLICY "Allow public read access on members"
  ON members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access on projects"
  ON projects FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access on gallery"
  ON gallery FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access on schedule"
  ON schedule FOR SELECT
  TO anon
  USING (true);

-- Create policies for authenticated insert/update
CREATE POLICY "Allow authenticated insert on members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on members"
  ON members FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on gallery"
  ON gallery FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on gallery"
  ON gallery FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on schedule"
  ON schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on schedule"
  ON schedule FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_release_date ON projects(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_tag ON gallery(tag);
CREATE INDEX IF NOT EXISTS idx_gallery_is_featured ON gallery(is_featured);
CREATE INDEX IF NOT EXISTS idx_gallery_is_editorial ON gallery(is_editorial);
CREATE INDEX IF NOT EXISTS idx_gallery_catalog_id ON gallery(catalog_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event_date ON schedule(event_date DESC);

-- Migration script for existing gallery table
-- Run this in Supabase SQL Editor if gallery table already exists:
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS catalog_id TEXT UNIQUE;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS is_editorial BOOLEAN DEFAULT FALSE;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS curator_note TEXT;

-- Function to generate catalog ID
CREATE OR REPLACE FUNCTION generate_catalog_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.catalog_id IS NULL THEN
    NEW.catalog_id := 'LMSY-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('gallery_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS gallery_seq START 1;

-- Trigger to auto-generate catalog_id
CREATE TRIGGER set_catalog_id
  BEFORE INSERT ON gallery
  FOR EACH ROW
  EXECUTE FUNCTION generate_catalog_id();

-- Sample data insertion (optional)
-- Uncomment below to insert sample members

/*
INSERT INTO members (name, nickname, birthday, height, bio, avatar_url, ig_handle, x_handle, weibo_handle, xhs_handle) VALUES
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

-- ALTER TABLE members ADD COLUMN IF NOT EXISTS height TEXT, ADD COLUMN IF NOT EXISTS weibo_handle TEXT, ADD COLUMN IF NOT EXISTS xhs_handle TEXT;
