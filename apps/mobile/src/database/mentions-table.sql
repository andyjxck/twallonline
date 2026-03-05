-- Mentions table for tracking @username mentions in posts and comments
CREATE TABLE IF NOT EXISTS rmentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES rposts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES rcomments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES rusers(id) ON DELETE CASCADE,
  mentioning_user_id UUID REFERENCES rusers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either post_id or comment_id is set (but not both)
  CONSTRAINT check_content_type CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rmentions_post_id ON rmentions(post_id);
CREATE INDEX IF NOT EXISTS idx_rmentions_comment_id ON rmentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_rmentions_mentioned_user_id ON rmentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_rmentions_mentioning_user_id ON rmentions(mentioning_user_id);
CREATE INDEX IF NOT EXISTS idx_rmentions_created_at ON rmentions(created_at);

-- Towny AI user account (if not exists)
INSERT INTO rusers (id, username, password, emoji_icon, device_id, is_admin, is_moderator, created_at)
VALUES (
  0, 
  'towny', 
  'ai-assistant-hash', 
  '🤖',
  'system',
  false, 
  false, 
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Add posted_as_identity column to comments
ALTER TABLE rcomments ADD COLUMN IF NOT EXISTS posted_as_identity TEXT DEFAULT 'personal';

-- Update existing comments to use personal identity (you can modify this as needed)
UPDATE rcomments SET posted_as_identity = 'personal' WHERE posted_as_identity IS NULL;

-- Remove self-friendships
DELETE FROM rfriends WHERE user_id = friend_id;
