-- Create hashtags table
CREATE TABLE IF NOT EXISTS rhashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_text TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rhashtags_tag_text ON rhashtags(tag_text);
CREATE INDEX IF NOT EXISTS idx_rhashtags_usage_count ON rhashtags(usage_count DESC);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS rpost_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES rposts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES rhashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- Create comment_hashtags junction table
CREATE TABLE IF NOT EXISTS rcomment_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES rcomments(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES rhashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, hashtag_id)
);

-- Create story_hashtags junction table
CREATE TABLE IF NOT EXISTS rstory_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES rstories(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES rhashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, hashtag_id)
);

-- Create indexes for junction tables
CREATE INDEX IF NOT EXISTS idx_rpost_hashtags_post_id ON rpost_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_rpost_hashtags_hashtag_id ON rpost_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_rcomment_hashtags_comment_id ON rcomment_hashtags(comment_id);
CREATE INDEX IF NOT EXISTS idx_rcomment_hashtags_hashtag_id ON rcomment_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_rstory_hashtags_story_id ON rstory_hashtags(story_id);
CREATE INDEX IF NOT EXISTS idx_rstory_hashtags_hashtag_id ON rstory_hashtags(hashtag_id);

-- Function to update hashtag usage count
CREATE OR REPLACE FUNCTION update_hashtag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rhashtags 
  SET usage_count = (
    SELECT COUNT(*) 
    FROM (
      SELECT post_id FROM rpost_hashtags WHERE hashtag_id = NEW.hashtag_id
      UNION ALL
      SELECT comment_id FROM rcomment_hashtags WHERE hashtag_id = NEW.hashtag_id
      UNION ALL
      SELECT story_id FROM rstory_hashtags WHERE hashtag_id = NEW.hashtag_id
    ) AS usage
  )
  WHERE id = NEW.hashtag_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update hashtag counts
CREATE TRIGGER update_post_hashtag_count
  AFTER INSERT OR DELETE ON rpost_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage_count();

CREATE TRIGGER update_comment_hashtag_count
  AFTER INSERT OR DELETE ON rcomment_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage_count();

CREATE TRIGGER update_story_hashtag_count
  AFTER INSERT OR DELETE ON rstory_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage_count();
