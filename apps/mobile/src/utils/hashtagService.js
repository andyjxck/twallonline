import { supabase } from './supabase';

export const hashtagService = {
  // Create or get hashtag
  async getOrCreateHashtag(tagText) {
    const normalizedTag = tagText.toLowerCase().trim();
    
    // Try to get existing hashtag
    const { data: existing } = await supabase
      .from('rhashtags')
      .select('id')
      .eq('tag_text', normalizedTag)
      .single();
    
    if (existing) {
      return existing.id;
    }
    
    // Create new hashtag
    const { data: created } = await supabase
      .from('rhashtags')
      .insert({ tag_text: normalizedTag })
      .select('id')
      .single();
    
    return created.id;
  },

  // Link content to hashtags
  async linkContentToHashtags(contentId, contentType, hashtagIds) {
    const tableName = contentType === 'post' ? 'rpost_hashtags' : 
                      contentType === 'comment' ? 'rcomment_hashtags' : 
                      'rstory_hashtags';
    const contentField = contentType === 'post' ? 'post_id' : 
                        contentType === 'comment' ? 'comment_id' : 
                        'story_id';
    
    const links = hashtagIds.map(hashtagId => ({
      [contentField]: contentId,
      hashtag_id: hashtagId
    }));
    
    const { error } = await supabase
      .from(tableName)
      .upsert(links, { onConflict: `${contentField},hashtag_id` });
    
    return error;
  },

  // Process hashtags from content
  async processHashtags(contentId, contentType, content) {
    const { parseHashtags } = await import('./HashtagParser');
    const hashtags = parseHashtags(content);
    
    if (hashtags.length === 0) return;
    
    // Get or create all hashtags
    const hashtagIds = await Promise.all(
      hashtags.map(h => this.getOrCreateHashtag(h.tag))
    );
    
    // Link content to hashtags
    await this.linkContentToHashtags(contentId, contentType, hashtagIds);
  },

  // Get trending hashtags
  async getTrendingHashtags(limit = 20) {
    // Create some test hashtags if none exist
    const { data: existing } = await supabase.from('rhashtags').select('count');
    if (!existing || existing.length === 0) {
      await this.getOrCreateHashtag('test');
      await this.getOrCreateHashtag('trending');
      await this.getOrCreateHashtag('popular');
    }
    
    const { data, error } = await supabase
      .from('rhashtags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);
    
    return data || [];
  },

  // Get posts by hashtag
  async getPostsByHashtag(tagText, limit = 50) {
    // First get the hashtag ID
    const { data: hashtag } = await supabase
      .from('rhashtags')
      .select('id')
      .eq('tag_text', tagText.toLowerCase())
      .single();
    
    if (!hashtag) return [];
    
    // Then get the post IDs for this hashtag
    const { data: postHashtags } = await supabase
      .from('rpost_hashtags')
      .select('post_id')
      .eq('hashtag_id', hashtag.id);
    
    if (!postHashtags || postHashtags.length === 0) return [];
    
    const postIds = postHashtags.map(ph => ph.post_id);
    
    // Finally get the posts with user data
    const { data } = await supabase
      .from('rposts')
      .select(`
        *,
        rusers!inner(username, avatar_url)
      `)
      .in('id', postIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  },

  // Get stories by hashtag
  async getStoriesByHashtag(tagText, limit = 50) {
    // First get the hashtag ID
    const { data: hashtag } = await supabase
      .from('rhashtags')
      .select('id')
      .eq('tag_text', tagText.toLowerCase())
      .single();
    
    if (!hashtag) return [];
    
    // Then get the story IDs for this hashtag
    const { data: storyHashtags } = await supabase
      .from('rstory_hashtags')
      .select('story_id')
      .eq('hashtag_id', hashtag.id);
    
    if (!storyHashtags || storyHashtags.length === 0) return [];
    
    const storyIds = storyHashtags.map(sh => sh.story_id);
    
    // Finally get the stories with user data
    const { data } = await supabase
      .from('rstories')
      .select(`
        *,
        rusers!inner(username, avatar_url)
      `)
      .in('id', storyIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  },

  // Get comments by hashtag
  async getCommentsByHashtag(tagText, limit = 50) {
    // First get the hashtag ID
    const { data: hashtag } = await supabase
      .from('rhashtags')
      .select('id')
      .eq('tag_text', tagText.toLowerCase())
      .single();
    
    if (!hashtag) return [];
    
    // Then get the comment IDs for this hashtag
    const { data: commentHashtags } = await supabase
      .from('rcomment_hashtags')
      .select('comment_id')
      .eq('hashtag_id', hashtag.id);
    
    if (!commentHashtags || commentHashtags.length === 0) return [];
    
    const commentIds = commentHashtags.map(ch => ch.comment_id);
    
    // Finally get the comments with user and post data
    const { data } = await supabase
      .from('rcomments')
      .select(`
        *,
        rusers!inner(username, avatar_url),
        rposts!inner(title, id)
      `)
      .in('id', commentIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  },

  // Search hashtags
  async searchHashtags(query, limit = 10) {
    const { data } = await supabase
      .from('rhashtags')
      .select('*')
      .ilike('tag_text', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
};
