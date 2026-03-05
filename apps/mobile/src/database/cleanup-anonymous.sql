-- Delete all anonymous users (users with 'Anon' prefix in username)
-- This will clean up all the test/development anonymous profiles

-- First, let's see what we're deleting (run this first to review)
SELECT 
  id, 
  username, 
  device_id, 
  created_at,
  (SELECT COUNT(*) FROM rposts WHERE user_id = rusers.id) as post_count,
  (SELECT COUNT(*) FROM rcomments WHERE user_id = rusers.id) as comment_count
FROM rusers 
WHERE username LIKE 'Anon%' 
ORDER BY created_at DESC;

-- Delete anonymous users (only run this after reviewing the above)
-- WARNING: This will permanently delete all anonymous users and their content

-- Delete comments from anonymous users
DELETE FROM rcomments WHERE user_id IN (
  SELECT id FROM rusers WHERE username LIKE 'Anon%'
);

-- Delete posts from anonymous users  
DELETE FROM rposts WHERE user_id IN (
  SELECT id FROM rusers WHERE username LIKE 'Anon%'
);

-- Delete mentions involving anonymous users
DELETE FROM rmentions WHERE mentioned_user_id IN (
  SELECT id FROM rusers WHERE username LIKE 'Anon%'
);

DELETE FROM rmentions WHERE mentioning_user_id IN (
  SELECT id FROM rusers WHERE username LIKE 'Anon%'
);

-- Delete notifications for anonymous users
DELETE FROM rnotifications WHERE user_id IN (
  SELECT id FROM rusers WHERE username LIKE 'Anon%'
);

DELETE FROM rnotifications WHERE from_user_id IN (
  SELECT id FROM rusers WHERE username LIKE 'Anon%'
);

-- Finally delete the anonymous users
DELETE FROM rusers WHERE username LIKE 'Anon%';

-- Verify cleanup
SELECT COUNT(*) as remaining_anon_users FROM rusers WHERE username LIKE 'Anon%';
