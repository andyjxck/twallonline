import { supabase } from './supabase';

export const mentionService = {
  // Create mentions for a post
  async createMentions(postId, mentions, mentioningUserId) {
    if (!mentions || mentions.length === 0) return [];
    
    // First get user IDs for the mentioned usernames
    const { data: mentionedUsers } = await supabase
      .from('rusers')
      .select('id, username')
      .in('username', mentions);

    if (!mentionedUsers || mentionedUsers.length === 0) return [];

    const mentionRecords = mentionedUsers.map(user => ({
      post_id: postId,
      mentioned_user_id: user.id,
      mentioning_user_id: mentioningUserId,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('rmentions')
      .insert(mentionRecords)
      .select();

    if (error) {
      console.log('Mentions table might not exist yet, skipping for now');
      return [];
    }
    return data;
  },

  // Create mentions for a comment
  async createCommentMentions(commentId, mentions, mentioningUserId) {
    if (!mentions || mentions.length === 0) return [];
    
    // First get user IDs for the mentioned usernames
    const { data: mentionedUsers } = await supabase
      .from('rusers')
      .select('id, username')
      .in('username', mentions);

    if (!mentionedUsers || mentionedUsers.length === 0) return [];

    const mentionRecords = mentionedUsers.map(user => ({
      comment_id: commentId,
      mentioned_user_id: user.id,
      mentioning_user_id: mentioningUserId,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('rmentions')
      .insert(mentionRecords)
      .select();

    if (error) {
      console.log('Mentions table might not exist yet, skipping for now');
      return [];
    }
    return data;
  },

  // Get mentions for a user
  async getUserMentions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('rmentions')
        .select(`
          *,
          post:rposts(id, title, text, created_at, user_id, rusers(username)),
          comment:rcomments(id, text, created_at, user_id, post_id, rusers(username)),
          mentioning_user:rusers(username, emoji_icon)
        `)
        .eq('mentioned_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.log('Mentions table might not exist yet');
        return [];
      }
      return data;
    } catch (error) {
      console.log('Error getting mentions:', error);
      return [];
    }
  },

  // Get users mentioned in content
  async getMentionedUsers(content) {
    const usernames = this.extractUsernames(content);
    if (usernames.length === 0) return [];

    const { data, error } = await supabase
      .from('rusers')
      .select('id, username')
      .in('username', usernames);

    if (error) throw error;
    return data;
  },

  // Extract usernames from text
  extractUsernames(text) {
    if (!text) return [];
    
    const mentionRegex = /@(\w+)/g;
    const usernames = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      usernames.push(match[1]);
    }
    
    return [...new Set(usernames)];
  }
};
