import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

export const parseMentions = (text, users = []) => {
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const user = users.find(u => u.username === username);
    
    if (user) {
      mentions.push({
        username,
        user_id: user.id,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  return mentions;
};

export const renderTextWithMentions = (text, mentions, navigation, style) => {
  if (!text || mentions.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  const elements = [];
  let lastIndex = 0;

  mentions.forEach((mention, index) => {
    // Add text before the mention
    if (mention.start > lastIndex) {
      elements.push(
        <Text key={`text-${index}`} style={style}>
          {text.substring(lastIndex, mention.start)}
        </Text>
      );
    }

    // Add the mention as a clickable link
    elements.push(
      <Text
        key={`mention-${index}`}
        style={[style, { color: '#3B82F6', fontWeight: '600' }]}
        onPress={() => navigation.push(`/profile?userId=${mention.user_id}`)}
      >
        @{mention.username}
      </Text>
    );

    lastIndex = mention.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(
      <Text key={`text-final`} style={style}>
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return <Text>{elements}</Text>;
};

export const extractMentionsFromText = (text) => {
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
};
