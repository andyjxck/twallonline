import { supabase } from './supabase';
import { sendNotification } from './notifications';

const townyAI = {
  // Ensure towny user exists in database
  async ensureTownyUser() {
    try {
      const { error } = await supabase
        .from('rusers')
        .upsert({
          id: 0,
          username: 'towny',
          password_hash: 'ai-assistant-hash',
          emoji_icon: '🤖',
          is_verified: true,
          is_admin: false,
          is_moderator: false,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error ensuring towny user:', error);
      } else {
        console.log('Towny user ensured in database');
      }
    } catch (error) {
      console.error('Error in ensureTownyUser:', error);
    }
  },

  isTownyMentioned(text) {
    return /@towny\b/i.test(text);
  },

  async moderatePost(postText, postId, mentioningUserId) {
    try {
      console.log('Towny moderation check:', { postText, postId, mentioningUserId });
      
      // Ensure towny user exists in database
      await this.ensureTownyUser();
      
      const canModerate = await this.canRespond(mentioningUserId, postId);
      if (!canModerate) {
        console.log('Towny moderation rate limited for this post');
        return null;
      }

      const { data: post } = await supabase
        .from('rposts')
        .select('*, rusers(username, is_admin, is_moderator)')
        .eq('id', postId)
        .single();

      console.log('Post data for moderation:', post);
      if (!post) {
        console.log('No post found for ID:', postId);
        return null;
      }

      const moderationResult = await this.checkPostGuidelines(postText, post, mentioningUserId);
      
      console.log('Moderation result:', moderationResult);
      
      if (moderationResult.needsAction) {
        // Add realistic delay before taking action
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        // Take moderation action
        const actionResult = await this.takeModerationAction(post, moderationResult, mentioningUserId);
        
        // Send notification to the user who mentioned @towny
        await sendNotification({
          userId: mentioningUserId,
          title: '🤖 Towny Moderation',
          message: moderationResult.notificationMessage,
          type: 'moderation',
          link: `/post/${postId}`
        });

        return actionResult;
      } else {
        // Post is fine, send confirmation
        await sendNotification({
          userId: mentioningUserId,
          title: '✅ Towny Review Complete',
          message: 'This post follows our community guidelines. Thanks for looking out for our community!',
          type: 'moderation',
          link: `/post/${postId}`
        });
        
        return { status: 'approved', message: 'Post follows guidelines' };
      }
    } catch (error) {
      console.error('Error in post moderation:', error);
      console.error('Error details:', error.message, error.stack);
      return null;
    }
  },

  async checkPostGuidelines(postText, post, mentioningUserId) {
    const postTitle = post.title || '';
    const postContent = post.text || '';
    const postAuthor = post.rusers?.username || 'someone';
    const lowerText = postText.toLowerCase();
    
    // Clean HTML from post content for analysis
    const cleanPostContent = postContent.replace(/<[^>]*>/g, '').trim();
    const cleanText = postText.replace(/<[^>]*>/g, '').trim();
    
    const violations = [];
    
    // Check for inappropriate content
    const inappropriateWords = [
      'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'pussy', 'cock',
      'whore', 'slut', 'bastard', 'motherfucker', 'son of a bitch',
      'kill', 'murder', 'suicide', 'die', 'death threats'
    ];
    
    for (const word of inappropriateWords) {
      if (cleanText.includes(word)) {
        violations.push({
          type: 'inappropriate_language',
          severity: 'high',
          message: `Contains inappropriate language: ${word}`,
          action: 'report'
        });
      }
    }
    
    // Check for spam patterns
    if (cleanText.length > 0) {
      const repeatedChars = cleanText.match(/(.)\1{4,}/g);
      if (repeatedChars) {
        violations.push({
          type: 'spam',
          severity: 'medium',
          message: 'Contains repeated characters (possible spam)',
          action: 'flag'
        });
      }
      
      // Check for excessive caps
      const capsRatio = (cleanText.match(/[A-Z]/g) || []).length / cleanText.length;
      if (capsRatio > 0.7 && cleanText.length > 20) {
        violations.push({
          type: 'excessive_caps',
          severity: 'low',
          message: 'Excessive use of capital letters',
          action: 'notify'
        });
      }
    }
    
    // Check for personal information
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    if (emailPattern.test(cleanText)) {
      violations.push({
        type: 'personal_info',
        severity: 'high',
        message: 'Contains email addresses',
        action: 'report'
      });
    }
    
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    if (phonePattern.test(cleanText)) {
      violations.push({
        type: 'personal_info',
        severity: 'high',
        message: 'Contains phone numbers',
        action: 'report'
      });
    }
    
    // Check for harassment patterns
    const harassmentPhrases = [
      'go kill yourself', 'kill yourself', 'end your life',
      'you should die', 'worthless', 'useless', 'garbage',
      'stupid', 'idiot', 'moron', 'retard'
    ];
    
    for (const phrase of harassmentPhrases) {
      if (cleanText.includes(phrase)) {
        violations.push({
          type: 'harassment',
          severity: 'high',
          message: `Contains harassing language: ${phrase}`,
          action: 'report'
        });
      }
    }
    
    // Check for hate speech
    const hateSpeech = [
      'nazi', 'racist', 'sexist', 'homophobic', 'transphobic',
      'white power', 'black lives matter', 'all lives matter'
    ];
    
    for (const term of hateSpeech) {
      if (cleanText.includes(term)) {
        violations.push({
          type: 'hate_speech',
          severity: 'high',
          message: `Contains potentially hateful content: ${term}`,
          action: 'report'
        });
      }
    }
    
    // Check for spam links
    const linkPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const links = cleanText.match(linkPattern);
    if (links && links.length > 2) {
      violations.push({
        type: 'spam_links',
        severity: 'medium',
        message: 'Contains multiple links (possible spam)',
        action: 'flag'
      });
    }
    
    // Determine if action is needed
    const needsAction = violations.length > 0;
    const highestSeverity = violations.reduce((max, v) => 
      v.severity === 'high' ? 'high' : v.severity === 'medium' && max !== 'high' ? 'medium' : max, 
      'low'
    );
    
    return {
      needsAction,
      violations,
      severity: highestSeverity,
      postTitle,
      postAuthor,
      notificationMessage: needsAction 
        ? `I found ${violations.length} issue${violations.length > 1 ? 's' : ''} in "${postTitle}" by ${postAuthor}. ${violations[0].message}`
        : `I reviewed "${postTitle}" by ${postAuthor} and it follows our community guidelines. Thanks for looking out for our community!`
    };
  },

  async takeModerationAction(post, moderationResult, mentioningUserId) {
    const { violations, severity } = moderationResult;
    
    try {
      if (severity === 'high') {
        // Report high severity violations
        const { error } = await supabase
          .from('rmoderation_logs')
          .insert({
            post_id: post.id,
            reporter_id: 0, // Towny AI
            moderator_id: 0, // Towny AI
            reason: violations.map(v => v.message).join('; '),
            severity: 'high',
            action_taken: 'auto_flagged',
            created_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error creating moderation log:', error);
        }
        
        return { status: 'flagged', message: 'Post flagged for review', violations };
      } else if (severity === 'medium') {
        // Add warning to post
        const { error } = await supabase
          .from('rposts')
          .update({
            moderation_reason: 'Auto-detected: ' + violations.map(v => v.message).join('; '),
            moderation_status: 'warning'
          })
          .eq('id', post.id);
        
        if (error) {
          console.error('Error updating post moderation status:', error);
        }
        
        return { status: 'warning', message: 'Post marked with warning', violations };
      } else {
        // Low severity - just log it
        const { error } = await supabase
          .from('rmoderation_logs')
          .insert({
            post_id: post.id,
            reporter_id: 0,
            moderator_id: 0,
            reason: violations.map(v => v.message).join('; '),
            severity: 'low',
            action_taken: 'logged',
            created_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Error creating moderation log:', error);
        }
        
        return { status: 'logged', message: 'Issue logged for review', violations };
      }
    } catch (error) {
      console.error('Error taking moderation action:', error);
      return { status: 'error', message: 'Failed to take action', error };
    }
  },

  async canRespond(userId, postId) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: recentResponses, error } = await supabase
        .from('rcomments')
        .select('created_at')
        .eq('post_id', postId)
        .eq('user_id', 0)
        .gte('created_at', fiveMinutesAgo)
        .limit(1);

      console.log('Rate limit check result:', { recentResponses, error });
      
      if (error) {
        console.error('Rate limit query error:', error);
        return true; // Allow response if query fails
      }

      return !recentResponses || recentResponses.length === 0;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return true;
    }
  },

  isTownyUser(userId) {
    return userId === 0;
  },

  async getTownyProfile() {
    return {
      id: 0,
      username: 'towny',
      emoji_icon: '🤖',
      is_verified: true,
      role: 'AI Assistant',
      bio: "I'm Towny, your friendly neighborhood AI assistant! I'm here to help answer questions and keep our community safe and fun."
    };
  }
};

export default townyAI;
