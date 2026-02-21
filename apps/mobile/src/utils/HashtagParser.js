// Hashtag Parser Utility
// Detects and parses #hashtag patterns in text

export const parseHashtags = (text) => {
  if (!text) return [];
  
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

export const renderTextWithHashtags = (text, onHashtagPress, textStyle, hashtagStyle) => {
  if (!text) return [];
  
  const hashtags = parseHashtags(text);
  const elements = [];
  let lastIndex = 0;
  
  hashtags.forEach((hashtag, index) => {
    // Add text before hashtag
    if (hashtag.index > lastIndex) {
      elements.push({
        key: `text-${index}`,
        text: text.slice(lastIndex, hashtag.index),
        type: 'text'
      });
    }
    
    // Add hashtag
    elements.push({
      key: `hashtag-${index}`,
      text: hashtag.text,
      tag: hashtag.tag,
      type: 'hashtag',
      onPress: () => onHashtagPress(hashtag.tag)
    });
    
    lastIndex = hashtag.index + hashtag.length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push({
      key: 'text-final',
      text: text.slice(lastIndex),
      type: 'text'
    });
  }
  
  return elements;
};

export const extractHashtagsFromContent = (content) => {
  const hashtags = parseHashtags(content);
  return [...new Set(hashtags.map(h => h.tag.toLowerCase()))]; // Remove duplicates
};
