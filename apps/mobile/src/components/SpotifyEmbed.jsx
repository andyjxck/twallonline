import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { Music, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../utils/ThemeContext';

let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').default;
}

/**
 * Extracts the Spotify embed URL from a Spotify link.
 * Supports: track, album, playlist, episode, show
 * Input:  https://open.spotify.com/track/ABC123?si=xyz
 * Output: https://open.spotify.com/embed/track/ABC123
 */
export function getSpotifyEmbedUrl(url) {
  if (!url) return null;
  try {
    // Already an embed URL
    if (url.includes('/embed/')) return url.split('?')[0];

    const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates whether a string is a valid Spotify URL.
 */
export function isValidSpotifyUrl(url) {
  if (!url) return false;
  return /open\.spotify\.com\/(track|album|playlist|episode|show)\/[a-zA-Z0-9]+/.test(url);
}

const EMBED_HEIGHT = 152;
const COMPACT_HEIGHT = 80;

export default function SpotifyEmbed({ url, compact = false, style }) {
  const { theme } = useTheme();
  const [loadError, setLoadError] = useState(false);
  const embedUrl = getSpotifyEmbedUrl(url);
  const height = compact ? COMPACT_HEIGHT : EMBED_HEIGHT;

  if (!embedUrl) return null;

  if (loadError) {
    return (
      <TouchableOpacity
        style={[styles.fallback, { height, backgroundColor: 'rgba(30,215,96,0.1)', borderColor: 'rgba(30,215,96,0.3)' }, style]}
        onPress={() => Linking.openURL(url)}
        activeOpacity={0.7}
      >
        <Music size={20} color="#1DB954" />
        <Text style={[styles.fallbackText, { color: theme.colors.text }]}>Open in Spotify</Text>
        <ExternalLink size={14} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }, style]}>
        <iframe
          src={embedUrl}
          width="100%"
          height={height}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: 12, border: 'none' }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        source={{ uri: embedUrl }}
        style={{ height, borderRadius: 12, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        onError={() => setLoadError(true)}
        onHttpError={() => setLoadError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
