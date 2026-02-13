-- ============================================
-- TOWN WALL: Stories Feature - Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 0. Drop if partially created from previous attempt
DROP TABLE IF EXISTS rstory_views CASCADE;
DROP TABLE IF EXISTS rstories CASCADE;

-- 1. Create rstories table
CREATE TABLE rstories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES rusers(id) ON DELETE CASCADE,
  image_url TEXT,
  text TEXT,
  background_color TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  city_id INTEGER,
  zone_id INTEGER
);

-- 2. Create rstory_views table
CREATE TABLE rstory_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES rstories(id) ON DELETE CASCADE,
  viewer_id INTEGER NOT NULL REFERENCES rusers(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rstories_user_id ON rstories(user_id);
CREATE INDEX IF NOT EXISTS idx_rstories_expires_at ON rstories(expires_at);
CREATE INDEX IF NOT EXISTS idx_rstories_city_id ON rstories(city_id);
CREATE INDEX IF NOT EXISTS idx_rstories_zone_id ON rstories(zone_id);
CREATE INDEX IF NOT EXISTS idx_rstory_views_story_id ON rstory_views(story_id);
CREATE INDEX IF NOT EXISTS idx_rstory_views_viewer_id ON rstory_views(viewer_id);

-- 4. Enable RLS
ALTER TABLE rstories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rstory_views ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for rstories (permissive - app handles auth)
CREATE POLICY "Allow all on rstories"
  ON rstories FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. RLS Policies for rstory_views
CREATE POLICY "Allow all on rstory_views"
  ON rstory_views FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Create storage bucket for story images (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true)
-- ON CONFLICT (id) DO NOTHING;

-- 8. Enable realtime for stories
ALTER PUBLICATION supabase_realtime ADD TABLE rstories;
