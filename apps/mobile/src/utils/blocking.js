import { supabase } from './supabase';
import { crossAlert } from './alert';

export const BLOCK_REASONS = [
  'Harassment or bullying',
  'Spam or scam',
  'Inappropriate content',
  'Hate speech',
  'Impersonation',
  'Other',
];

export async function blockUser({ blockerId, blockedId, source, reason, postId = null }) {
  if (!blockerId || !blockedId || !reason) {
    throw new Error('Missing required blocking parameters');
  }

  if (blockerId === blockedId) {
    throw new Error('You cannot block yourself');
  }

  const { data: existing } = await supabase
    .from('rblocks')
    .select('id')
    .eq('blocker_user_id', blockerId)
    .eq('blocked_user_id', blockedId)
    .single();

  if (existing) {
    throw new Error('User is already blocked');
  }

  const { data, error } = await supabase
    .from('rblocks')
    .insert({
      blocker_user_id: blockerId,
      blocked_user_id: blockedId,
      source: source,
      reason: reason,
      post_id: postId,
    })
    .select()
    .single();

  if (error) throw error;

  if (source === 'post' && postId) {
    await supabase.from('rreports').insert({
      reporter_id: blockerId,
      post_id: postId,
      reason: `Block from post: ${reason}`,
      report_type: 'post',
      status: 'pending',
    });
  }

  return data;
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase
    .from('rblocks')
    .delete()
    .eq('blocker_user_id', blockerId)
    .eq('blocked_user_id', blockedId);

  if (error) throw error;
  return true;
}

export async function getBlockedUsers(userId) {
  const { data, error } = await supabase
    .from('rblocks')
    .select(`
      id,
      blocked_user_id,
      source,
      reason,
      created_at,
      blocked_user:rusers!rblocks_blocked_user_id_fkey(id, username, emoji_icon, avatar_url)
    `)
    .eq('blocker_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getBlockedUserIds(userId) {
  if (!userId) return [];

  const { data: blockedByMe } = await supabase
    .from('rblocks')
    .select('blocked_user_id')
    .eq('blocker_user_id', userId);

  const { data: blockedMe } = await supabase
    .from('rblocks')
    .select('blocker_user_id')
    .eq('blocked_user_id', userId);

  const ids = new Set();
  (blockedByMe || []).forEach(b => ids.add(b.blocked_user_id));
  (blockedMe || []).forEach(b => ids.add(b.blocker_user_id));

  return Array.from(ids);
}

export async function isBlocked(userId1, userId2) {
  if (!userId1 || !userId2) return false;

  const { data } = await supabase
    .from('rblocks')
    .select('id')
    .or(`and(blocker_user_id.eq.${userId1},blocked_user_id.eq.${userId2}),and(blocker_user_id.eq.${userId2},blocked_user_id.eq.${userId1})`)
    .limit(1);

  return data && data.length > 0;
}

export async function checkAndAlertBlocked(currentUserId, targetUserId) {
  const blocked = await isBlocked(currentUserId, targetUserId);
  if (blocked) {
    crossAlert('User Unavailable', 'This user is not available.');
    return true;
  }
  return false;
}

export async function getBlockLogs() {
  const { data, error } = await supabase
    .from('rblocks')
    .select(`
      id,
      blocker_user_id,
      blocked_user_id,
      source,
      reason,
      post_id,
      created_at,
      blocker:rusers!rblocks_blocker_user_id_fkey(username),
      blocked:rusers!rblocks_blocked_user_id_fkey(username)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
