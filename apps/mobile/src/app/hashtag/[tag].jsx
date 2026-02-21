import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/utils/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackgroundPattern from '@/components/BackgroundPattern';
import { Image } from 'expo-image';
import { hashtagService } from '@/utils/hashtagService';
import PostItem from '@/components/PostItem';
import StoriesBar from '@/components/StoriesBar';
import HashtagText from '@/components/HashtagText';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '@/utils/auth';

export default function HashtagPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { tag } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore(state => state.auth);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  useEffect(() => {
    loadContent();
  }, [tag]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [postsData, storiesData, commentsData] = await Promise.all([
        hashtagService.getPostsByHashtag(tag),
        hashtagService.getStoriesByHashtag(tag),
        hashtagService.getCommentsByHashtag(tag)
      ]);
      setPosts(postsData || []);
      setStories(storiesData || []);
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error loading hashtag content:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }) => {
    // Restructure data to match PostItem expectations
    const postItem = {
      ...item,
      user: item.rusers
    };
    
    return (
      <PostItem
        key={item.id}
        item={postItem}
        user={currentUser}
        onModAction={() => loadContent()}
        onEdit={(p) => router.push(`/post?id=${p.id}`)}
        onComment={() => {}}
        onReaction={() => {}}
        onShare={() => {}}
        onHashtagPress={(clickedTag) => {
          // Don't navigate if already on this hashtag page
          if (clickedTag.toLowerCase() === tag.toLowerCase()) {
            return;
          }
          router.push(`/hashtag/${clickedTag}`);
        }}
      />
    );
  };

  const renderStory = ({ item }) => (
    <View key={item.id} style={styles.storyItem}>
      {/* Story item rendering */}
      <Text style={[styles.storyText, { color: theme.colors.text }]}>Story by {item.rusers?.username}</Text>
    </View>
  );

  const renderComment = ({ item }) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.commentItem}
      onPress={() => router.push(`/post/${item.rposts?.id}`)}
    >
      <View style={styles.commentHeader}>
        <View style={styles.userRow}>
          {item.rusers?.avatar_url ? (
            <Image source={{ uri: item.rusers.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={[styles.avatarText, { color: theme.colors.text }]}>{(item.rusers?.username || 'A')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.commentUser, { color: theme.colors.text }]}>{item.rusers?.username || 'Anonymous'}</Text>
            <Text style={[styles.commentPost, { color: theme.colors.textSecondary }]}>on "{item.rposts?.title || 'Post'}"</Text>
          </View>
        </View>
        <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>{getTimeAgo(new Date(item.created_at))}</Text>
      </View>
      <HashtagText
        text={item.text}
        onHashtagPress={(clickedTag) => {
          // Don't navigate if already on this hashtag page
          if (clickedTag.toLowerCase() === tag.toLowerCase()) {
            return;
          }
          router.push(`/hashtag/${clickedTag}`);
        }}
        textStyle={[styles.commentText, { color: theme.colors.text }]}
      />
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    const data = activeTab === 'posts' ? posts : activeTab === 'stories' ? stories : comments;
    
    if (data.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No {activeTab} found with #{tag}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={data}
        renderItem={activeTab === 'posts' ? renderPost : activeTab === 'stories' ? renderStory : renderComment}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BackgroundPattern />
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Minimalist Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>#{tag}</Text>
        </View>

        {/* Minimalist Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'posts' ? theme.colors.primary : theme.colors.textSecondary }]}>
              Posts ({posts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stories' && styles.activeTab]}
            onPress={() => setActiveTab('stories')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'stories' ? theme.colors.primary : theme.colors.textSecondary }]}>
              Stories ({stories.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
            onPress={() => setActiveTab('comments')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'comments' ? theme.colors.primary : theme.colors.textSecondary }]}>
              Comments ({comments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {renderContent()}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '200',
    letterSpacing: -1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
  },
  tabText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '200',
    opacity: 0.4,
  },
  list: {
    paddingHorizontal: 24,
  },
  storyItem: {
    paddingVertical: 16,
  },
  storyText: {
    fontSize: 16,
    fontWeight: '200',
  },
  commentItem: {
    paddingVertical: 16,
  },
  commentHeader: {
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '300',
  },
  userInfo: {
    flex: 1,
  },
  commentUser: {
    fontSize: 15,
    fontWeight: '500',
  },
  commentPost: {
    fontSize: 14,
    fontWeight: '300',
    opacity: 0.8,
  },
  commentTime: {
    fontSize: 13,
    fontWeight: '200',
    opacity: 0.7,
  },
  commentText: {
    fontSize: 16,
    fontWeight: '200',
    lineHeight: 22,
  },
});
