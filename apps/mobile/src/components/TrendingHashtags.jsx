import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/utils/ThemeContext';
import { hashtagService } from '@/utils/hashtagService';
import { Hash, TrendingUp } from 'lucide-react-native';

export default function TrendingHashtags({ limit = 10 }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingHashtags();
  }, []);

  const loadTrendingHashtags = async () => {
    try {
      const trending = await hashtagService.getTrendingHashtags(limit);
      setHashtags(trending);
    } catch (error) {
      console.error('Error loading trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagPress = (tag) => {
    router.push(`/hashtag/${tag}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (hashtags.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <TrendingUp size={16} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Trending</Text>
      </View>
      
      <View style={styles.hashtagList}>
        {hashtags.map((hashtag, index) => (
          <TouchableOpacity
            key={hashtag.id}
            style={styles.hashtagItem}
            onPress={() => handleHashtagPress(hashtag.tag_text)}
          >
            <Hash size={14} color={theme.colors.primary} />
            <Text style={[styles.hashtagText, { color: theme.colors.text }]}>
              #{hashtag.tag_text}
            </Text>
            <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
              {hashtag.usage_count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  hashtagList: {
    gap: 8,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  hashtagText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
