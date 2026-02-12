-- Add posted_as_identity to rposts so each post remembers which identity was active when posted
ALTER TABLE rposts ADD COLUMN IF NOT EXISTS posted_as_identity TEXT DEFAULT 'personal';
