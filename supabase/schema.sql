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
  bio TEXT,
  avatar_url TEXT,
  ig_handle TEXT,
  x_handle TEXT,
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
CREATE INDEX IF NOT EXISTS idx_schedule_event_date ON schedule(event_date DESC);

-- Sample data insertion (optional)
-- Uncomment below to insert sample members

/*
INSERT INTO members (name, nickname, birthday, bio, avatar_url, ig_handle, x_handle) VALUES
('Lookmhee', 'Lookmhee', '2003-05-15', 'Thai actress known for her role in Affair', null, '@lookmhee', '@lookmhee_official'),
('Sonya', 'Sonya', '2003-08-22', 'Thai actress known for her role in Affair', null, '@sonya', '@sonya_official');
*/

-- Storage buckets setup
-- Run these in Supabase Storage section:
-- 1. Create bucket named "avatars" (public)
-- 2. Create bucket named "project-covers" (public)
-- 3. Create bucket named "gallery" (public)
-- 4. Create bucket named "assets" (public)
