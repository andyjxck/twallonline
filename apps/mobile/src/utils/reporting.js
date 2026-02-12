import { supabase } from './supabase';
import { crossAlert } from './alert';

export const REPORT_REASONS = [
  'Harassment or bullying',
  'Spam or scam',
  'Hate speech or discrimination',
  'Inappropriate or explicit content',
  'Violence or threats',
  'Misinformation',
  'Impersonation',
  'Other',
];

export async function reportPost(reporterId, postId, reason) {
  if (!reporterId || !postId || !reason) {
    throw new Error('Missing required report parameters');
  }

  const { data: existing } = await supabase
    .from('rreports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('post_id', postId)
    .eq('report_type', 'post')
    .single();

  if (existing) {
    crossAlert('Already Reported', 'You have already reported this post.');
    return null;
  }

  const { data, error } = await supabase
    .from('rreports')
    .insert({
      reporter_id: reporterId,
      post_id: postId,
      report_type: 'post',
      reason: reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function reportComment(reporterId, commentId, postId, reason) {
  if (!reporterId || !commentId || !reason) {
    throw new Error('Missing required report parameters');
  }

  const { data: existing } = await supabase
    .from('rreports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('comment_id', commentId)
    .eq('report_type', 'comment')
    .single();

  if (existing) {
    crossAlert('Already Reported', 'You have already reported this comment.');
    return null;
  }

  const { data, error } = await supabase
    .from('rreports')
    .insert({
      reporter_id: reporterId,
      comment_id: commentId,
      post_id: postId,
      report_type: 'comment',
      reason: reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function reportUser(reporterId, targetId, reason) {
  if (!reporterId || !targetId || !reason) {
    throw new Error('Missing required report parameters');
  }

  if (reporterId === targetId) {
    throw new Error('You cannot report yourself');
  }

  const { data: existing } = await supabase
    .from('rreports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('target_id', targetId)
    .eq('report_type', 'user')
    .single();

  if (existing) {
    crossAlert('Already Reported', 'You have already reported this user.');
    return null;
  }

  const { data, error } = await supabase
    .from('rreports')
    .insert({
      reporter_id: reporterId,
      target_id: targetId,
      report_type: 'user',
      reason: reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
