-- Add comment_id column to rreports table for comment reporting
-- Run this in your Supabase SQL Editor

ALTER TABLE rreports 
ADD COLUMN IF NOT EXISTS comment_id BIGINT REFERENCES rcomments(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rreports_comment_id ON rreports(comment_id);

-- Update RLS policy if needed (optional - depends on your existing policies)
-- This allows users to insert reports for comments they don't own
