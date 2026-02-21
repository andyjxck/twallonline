import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function HashtagText({ 
  text, 
  onHashtagPress, 
  style, 
  textStyle, 
  hashtagStyle,
  users = []
}) {
  const router = useRouter();
  
  if (!text) return null;
  
  // Strip HTML tags from text and handle line breaks
  const cleanText = text
    .replace(/<div>/g, '')
    .replace(/<\/div>/g, '\n')
    .replace(/<br>/g, '\n')
    .replace(/<br\s*\/>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>?/gm, '')
    .trim();
  
  // Debug logging
  console.log('HashtagText users:', users);
  console.log('HashtagText text:', text);
  console.log('HashtagText cleanText:', cleanText);
  
  const parseHashtags = (text) => {
    const hashtagRegex = /#([a-zA-Z0-9_\-]+)/g;
    const matches = [];
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        tag: match[1],
        index: match.index,
        length: match[0].length
      });
    }
    
    return matches;
  };
  
  const parseMentions = (text, users) => {
    const mentionRegex = /@(\w+)/g;
    const matches = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const user = users.find(u => u.username === match[1]);
      console.log('Found mention:', match[1], 'User found:', user);
      console.log('Available users:', users);
      // For testing, create a mock user if none found
      if (!user && (match[1] === 'testuser' || match[1] === 'townwall')) {
        const mockUser = { id: 'mock-id', username: match[1] };
        matches.push({
          text: match[0],
          user: mockUser,
          index: match.index,
          length: match[0].length
        });
      } else if (user) {
        matches.push({
          text: match[0],
          user: user,
          index: match.index,
          length: match[0].length
        });
      }
    }
    
    console.log('Parsed mentions:', matches);
    return matches;
  };
  
  const hashtags = parseHashtags(cleanText);
  const mentions = parseMentions(cleanText, users);
  
  // Combine all markers and sort by position
  const markers = [...hashtags, ...mentions].sort((a, b) => a.index - b.index);
  
  console.log('All markers:', markers);
  
  const handlePress = (marker) => {
    console.log('Pressed marker:', marker);
    if (marker.tag) {
      onHashtagPress && onHashtagPress(marker.tag);
    } else if (marker.user) {
      console.log('Navigating to profile:', marker.user.id);
      router.push(`/profile?userId=${marker.user.id}`);
    }
  };
  
  const elements = [];
  let lastIndex = 0;
  
  markers.forEach((marker, index) => {
    // Add text before marker
    if (marker.index > lastIndex) {
      const textBefore = cleanText.slice(lastIndex, marker.index);
      // Process markdown in text before marker
      const parts = textBefore.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
      const processedParts = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={`bold-${index}-${partIndex}`} style={[textStyle, style, { fontWeight: 'bold' }]}>
              {part.slice(2, -2)}
            </Text>
          );
        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return (
            <Text key={`italic-${index}-${partIndex}`} style={[textStyle, style, { fontStyle: 'italic' }]}>
              {part.slice(1, -1)}
            </Text>
          );
        } else if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={`code-${index}-${partIndex}`} style={[textStyle, style, { backgroundColor: '#f0f0f0', fontFamily: 'monospace' }]}>
              {part.slice(1, -1)}
            </Text>
          );
        } else if (part === '\n') {
          return <Text key={`br-${index}-${partIndex}`} style={[textStyle, style]}>{'\n'}</Text>;
        } else {
          return (
            <Text key={`text-${index}-${partIndex}`} style={[textStyle, style]}>
              {part}
            </Text>
          );
        }
      });
      elements.push(...processedParts);
    }
    
    // Add hashtag
    if (marker.tag) {
      elements.push(
        <Text
          key={`hashtag-${index}`}
          style={[
            textStyle, 
            style,
            { color: '#007AFF', fontWeight: '600' },
            hashtagStyle
          ]}
          onPress={() => handlePress(marker)}
        >
          {marker.text}
        </Text>
      );
    }
    
    // Add mention
    if (marker.user) {
      elements.push(
        <Text
          key={`mention-${index}`}
          style={[
            textStyle, 
            style,
            { color: '#3B82F6', fontWeight: '600' }
          ]}
          onPress={() => handlePress(marker)}
        >
          {marker.text}
        </Text>
      );
    }
    
    lastIndex = marker.index + marker.length;
  });
  
  // Add remaining text
  if (lastIndex < cleanText.length) {
    const remainingText = cleanText.slice(lastIndex);
    // Process markdown in remaining text
    const parts = remainingText.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
    const processedParts = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={`bold-final-${partIndex}`} style={[textStyle, style, { fontWeight: 'bold' }]}>
            {part.slice(2, -2)}
          </Text>
        );
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return (
          <Text key={`italic-final-${partIndex}`} style={[textStyle, style, { fontStyle: 'italic' }]}>
            {part.slice(1, -1)}
          </Text>
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Text key={`code-final-${partIndex}`} style={[textStyle, style, { backgroundColor: '#f0f0f0', fontFamily: 'monospace' }]}>
            {part.slice(1, -1)}
          </Text>
        );
      } else if (part === '\n') {
        return <Text key={`br-final-${partIndex}`} style={[textStyle, style]}>{'\n'}</Text>;
      } else {
        return (
          <Text key={`text-final-${partIndex}`} style={[textStyle, style]}>
            {part}
          </Text>
        );
      }
    });
    elements.push(...processedParts);
  }
  
  return (
    <Text style={[textStyle, style]}>
      {elements}
    </Text>
  );
}
