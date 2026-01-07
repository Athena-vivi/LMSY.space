-- Create publications table for magazine editorials
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mag_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  cover_url TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  credits JSONB DEFAULT '{}'::jsonb,

  -- Credits structure:
  -- {
  --   "photographer": "Name",
  --   "stylist": "Name",
  --   "makeup": "Name",
  --   "hair": "Name",
  --   "wardrobe": "Name",
  --   "retouching": "Name"
  -- }

  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_publications_slug ON publications(slug);

-- Create index on issue_date for sorting
CREATE INDEX IF NOT EXISTS idx_publications_issue_date ON publications(issue_date DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Public read access"
  ON publications
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow service role full access (for admin)
CREATE POLICY "Service role full access"
  ON publications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert sample data (optional - remove in production)
INSERT INTO publications (mag_name, slug, issue_date, cover_url, images, credits, description) VALUES
  (
    'Vogue Thailand January 2025',
    'vogue-thailand-jan-2025',
    '2025-01-15',
    'https://example.com/covers/vogue-jan-2025.jpg',
    '["https://example.com/editorial/vogue-1.jpg", "https://example.com/editorial/vogue-2.jpg"]'::jsonb,
    '{
      "photographer": "Pongthorn Nitinun",
      "stylist": "Pichaya Kladphan",
      "makeup": "Nattaya Chaiprasit",
      "hair": "Thanakorn Sritrakul",
      "wardrobe": "Dior Thailand",
      "retouching": "Studio 7"
    }'::jsonb,
    'A stunning editorial featuring LMSY in modern elegance, showcasing the latest Dior collection.'
  ),
  (
    'L''Officiel Thailand December 2024',
    'lofficiel-thailand-dec-2024',
    '2024-12-20',
    'https://example.com/covers/lofficiel-dec-2024.jpg',
    '["https://example.com/editorial/lofficiel-1.jpg", "https://example.com/editorial/lofficiel-2.jpg"]'::jsonb,
    '{
      "photographer": "Surutchai Sunkhamani",
      "stylist": "Kullawit Rojanarit",
      "makeup": "Pimlapas Phakseree",
      "hair": "Chayut Sribhum",
      "wardrobe": "Gucci Thailand",
      "retouching": "Color Lab Bangkok"
    }'::jsonb,
    'An artistic black and white series capturing the timeless beauty of Lookmhee and Sonya.'
  )
ON CONFLICT (slug) DO NOTHING;
