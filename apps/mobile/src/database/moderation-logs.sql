-- Create moderation logs table for Towny AI moderation
CREATE TABLE IF NOT EXISTS rmoderation_logs (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES rposts(id) ON DELETE CASCADE,
  reporter_id INTEGER REFERENCES rusers(id) ON DELETE SET NULL,
  moderator_id INTEGER REFERENCES rusers(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  action_taken VARCHAR(20) NOT NULL CHECK (action_taken IN ('logged', 'flagged', 'warning', 'removed', 'auto_flagged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_post_id ON rmoderation_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_severity ON rmoderation_logs(severity);
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_created_at ON rmoderation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_reporter_id ON rmoderation_logs(reporter_id);
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_moderator_id ON rmoderation_logs(moderator_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_moderation_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rmoderation_logs_updated_at
  BEFORE UPDATE ON rmoderation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_logs_updated_at();
