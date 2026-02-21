import React from 'react';
import { Text, TouchableOpacity, View, Pressable, TouchableWithoutFeedback, TouchableHighlight, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { renderTextWithMentions, parseMentions } from '../utils/MentionParser';
import RenderHtml from 'react-native-render-html';
import { useTheme } from '@/utils/ThemeContext';

export default function ContentRenderer({ text, style, onHashtagPress, users = [] }) {
  const router = useRouter();
  
  if (!text) return null;

  // Parse both mentions and hashtags
  const mentions = parseMentions(text, users);
  
  // Parse hashtags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push({
      tag: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // If no mentions or hashtags, render as plain text
  if (mentions.length === 0 && hashtags.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  // Combine all markers (mentions and hashtags)
  const markers = [
    ...mentions.map(m => ({ ...m, type: 'mention' })),
    ...hashtags.map(h => ({ ...h, type: 'hashtag' }))
  ].sort((a, b) => a.start - b.start);

  const handlePress = (event) => {
    // This is a hack - React Native doesn't give us position info easily
    // For now, just handle the first mention/hashtag found
    if (markers.length > 0) {
      const marker = markers[0];
      if (marker.type === 'mention') {
        router.push(`/profile?userId=${marker.user_id}`);
      } else if (marker.type === 'hashtag') {
        onHashtagPress(marker.tag);
      }
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Text style={style}>{text}</Text>
    </TouchableOpacity>
  );
}
