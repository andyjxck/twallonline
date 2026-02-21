import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/utils/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { ArrowLeft, Heart, MessageSquare, Share2 } from 'lucide-react-native';
import BackgroundPattern from '@/components/BackgroundPattern';
import PostItem from '@/components/PostItem';
import { useAuthStore } from '@/utils/auth';

export default function PostPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore(state => state.auth);
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('DEBUG: Raw id:', id);
      console.log('DEBUG: typeof id:', typeof id);
      console.log('DEBUG: JSON.stringify(id):', JSON.stringify(id));
      
      const postId = parseInt(id);
      console.log('DEBUG: postId:', postId);
      console.log('DEBUG: isNaN(postId):', isNaN(postId));
      
      if (!postId || isNaN(postId)) {
        setError(`Invalid post ID: ${id} (${typeof id})`);
        return;
      }
      
      const { data, error } = await supabase
        .from('rposts')
        .select(`
          id, title, text, created_at, user_id, zone_id, tag_id, image_url, image_urls, is_anonymous, moderation_status, is_deleted, is_blurred, blur_reason, comments_disabled, city_id, cta_type, cta_group_id, posted_as_identity, spotify_url, poll_id,
          user:rusers (*),
          zone:rzones (name),
          tag:rtags (name),
          reactions:rreactions (reaction_type, device_id, user_id)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      
      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      setError('Post not found');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = () => {
    // Handle post reaction
  };

  const handleComment = () => {
    // Handle comment
  };

  const handleShare = () => {
    // Handle share
  };

  const handleEdit = (post) => {
    router.push(`/post?id=${post.id}`);
  };

  const handleModAction = () => {
    loadPost(); // Refresh post after moderation
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <BackgroundPattern />
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Post</Text>
          </View>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <BackgroundPattern />
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Post</Text>
          </View>
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
              {error || 'Post not found'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BackgroundPattern />
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Post</Text>
        </View>

        {/* Post Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <PostItem
            item={post}
            user={currentUser}
            onReaction={handleReaction}
            onComment={handleComment}
            onShare={handleShare}
            onEdit={handleEdit}
            onModAction={handleModAction}
            deviceId={currentUser?.device_id}
            onDelete={() => {}}
            onFilterZone={() => {}}
            onFilterTag={() => {}}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
  },
});
