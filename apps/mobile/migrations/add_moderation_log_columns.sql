-- Add columns to rmoderation_logs for better tracking and undo functionality
-- Run this in your Supabase SQL Editor

-- Add previous_state column to store the state before the action (for undo)
ALTER TABLE rmoderation_logs 
ADD COLUMN IF NOT EXISTS previous_state JSONB;

-- Add post metadata for easier display in admin panel
ALTER TABLE rmoderation_logs 
ADD COLUMN IF NOT EXISTS post_title TEXT;

ALTER TABLE rmoderation_logs 
ADD COLUMN IF NOT EXISTS post_user_id BIGINT;

-- Add is_undone flag to track if action was reversed
ALTER TABLE rmoderation_logs 
ADD COLUMN IF NOT EXISTS is_undone BOOLEAN DEFAULT FALSE;

-- Add undone_by to track who undid the action
ALTER TABLE rmoderation_logs 
ADD COLUMN IF NOT EXISTS undone_by BIGINT REFERENCES rusers(id);

-- Add undone_at timestamp
ALTER TABLE rmoderation_logs 
ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_target ON rmoderation_logs(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_moderator ON rmoderation_logs(moderator_id);
CREATE INDEX IF NOT EXISTS idx_rmoderation_logs_created ON rmoderation_logs(created_at DESC);
