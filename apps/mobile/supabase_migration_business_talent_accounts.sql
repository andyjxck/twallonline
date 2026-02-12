-- ============================================================
-- Migration: Business & Talent Account System
-- Run this in your Supabase SQL Editor
-- rusers.id is INTEGER, not UUID
-- ============================================================

-- 1. Add account_type, active_identity, and showcase columns to rusers
ALTER TABLE rusers 
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal' CHECK (account_type IN ('personal', 'business', 'talent', 'both')),
  ADD COLUMN IF NOT EXISTS active_identity TEXT DEFAULT 'personal' CHECK (active_identity IN ('personal', 'business', 'talent')),
  ADD COLUMN IF NOT EXISTS business_showcase_id INTEGER,
  ADD COLUMN IF NOT EXISTS talent_showcase_id INTEGER;

-- 2. Create rfollows table for following business/talent accounts
CREATE TABLE IF NOT EXISTS rfollows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES rusers(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES rusers(id) ON DELETE CASCADE,
  notify BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfollows_follower ON rfollows(follower_id);
CREATE INDEX IF NOT EXISTS idx_rfollows_following ON rfollows(following_id);
CREATE INDEX IF NOT EXISTS idx_rusers_account_type ON rusers(account_type);

-- 4. Enable RLS on rfollows
ALTER TABLE rfollows ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all follows
CREATE POLICY "Anyone can read follows" ON rfollows
  FOR SELECT USING (true);

-- Allow users to follow/unfollow (match by follower_id = user's rusers.id)
-- Since rusers.id is app-level (not auth.uid()), we use a permissive policy
-- and enforce ownership in app code
CREATE POLICY "Users can follow" ON rfollows
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can unfollow" ON rfollows
  FOR DELETE USING (true);

CREATE POLICY "Users can update follow notify" ON rfollows
  FOR UPDATE USING (true);

-- 5. Helper function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(target_user_id INTEGER)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM rfollows WHERE following_id = target_user_id;
$$ LANGUAGE SQL STABLE;

-- 6. Helper function to check if user is following another
CREATE OR REPLACE FUNCTION is_following(check_follower_id INTEGER, check_following_id INTEGER)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM rfollows WHERE follower_id = check_follower_id AND following_id = check_following_id);
$$ LANGUAGE SQL STABLE;
