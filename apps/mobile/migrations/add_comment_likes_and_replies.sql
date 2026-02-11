-- Add comment likes and replies functionality
-- Run this in your Supabase SQL Editor

-- 1. Add parent_comment_id for nested replies
ALTER TABLE rcomments 
ADD COLUMN IF NOT EXISTS parent_comment_id BIGINT REFERENCES rcomments(id) ON DELETE CASCADE;

-- 2. Create comment likes table
CREATE TABLE IF NOT EXISTS rcomment_likes (
  id BIGSERIAL PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES rcomments(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES rusers(id) ON DELETE CASCADE,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id),
  UNIQUE(comment_id, device_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rcomments_parent ON rcomments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_rcomment_likes_comment ON rcomment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_rcomment_likes_user ON rcomment_likes(user_id);

-- 4. Enable RLS
ALTER TABLE rcomment_likes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for comment likes
CREATE POLICY "Anyone can view comment likes" ON rcomment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON rcomment_likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can unlike their own likes" ON rcomment_likes
  FOR DELETE USING (user_id = auth.uid()::bigint OR device_id IS NOT NULL);
