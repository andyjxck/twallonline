import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/utils/ThemeContext';
import { hashtagService } from '@/utils/hashtagService';
import { Hash, TrendingUp } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TrendingHashtagsTicker({ posts = [] }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hashtagCounts, setHashtagCounts] = useState({});

  useEffect(() => {
    loadTrendingHashtags();
  }, []);

  const loadTrendingHashtags = async () => {
    try {
      setLoading(true);
      const hashtags = await hashtagService.getTrendingHashtags(10);
      console.log('DEBUG hashtags:', hashtags);
      setHashtags(hashtags);
      
      // Load counts for each hashtag
      const countsPromises = hashtags.map(async (hashtag) => {
        try {
          const [postsData, storiesData, commentsData] = await Promise.all([
            hashtagService.getPostsByHashtag(hashtag.tag_text),
            hashtagService.getStoriesByHashtag(hashtag.tag_text),
            hashtagService.getCommentsByHashtag(hashtag.tag_text)
          ]);
          return {
            tag: hashtag.tag_text,
            posts: postsData?.length || 0,
            stories: storiesData?.length || 0,
            comments: commentsData?.length || 0
          };
        } catch (error) {
          return {
            tag: hashtag.tag_text,
            posts: 0,
            stories: 0,
            comments: 0
          };
        }
      });
      
      const counts = await Promise.all(countsPromises);
      const countsMap = counts.reduce((acc, count) => {
        acc[count.tag] = count;
        return acc;
      }, {});
      setHashtagCounts(countsMap);
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagPress = (tag) => {
    router.push(`/hashtag/${tag}`);
  };

  const renderHashtag = (item, index) => {
    const counts = hashtagCounts[item.tag_text] || { posts: 0, stories: 0, comments: 0 };

    return (
      <TouchableOpacity
        key={index}
        style={styles.hashtagItem}
        onPress={() => router.push(`/hashtag/${item.tag_text}`)}
      >
        <Hash size={12} color={theme.colors.primary} />
        <Text style={[styles.hashtagText, { color: theme.colors.text }]}>
          #{item.tag_text}
        </Text>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {counts.posts}
        </Text>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          |
        </Text>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {counts.stories}
        </Text>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          |
        </Text>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {counts.comments}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading || hashtags.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hashtags.map((item, index) => renderHashtag(item, index))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  statNumber: {
    fontSize: 10,
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: 16,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  hashtagText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '400',
    marginLeft: 3,
    opacity: 0.7,
  },
});
