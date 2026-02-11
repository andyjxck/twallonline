import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;

export const ShareCard = ({ post }) => {
  if (!post) return null;

  const hasImage = post.image_urls?.length > 0 || post.image_url;
  const imageUri = post.image_urls?.[0] || post.image_url;
  const zoneName = (post.city_id === 321 || !post.zone_id) ? "Global" : (post.zone?.name || "Featured");
  const displayName = post.is_anonymous ? "Anonymous" : (post.user?.username || 'user');
  const emoji = post.is_anonymous ? "👤" : (post.user?.emoji_icon || "👤");
  const bodyText = post.text
    ?.replace(/<\/p>|<div>|<\/div>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim() || "";
  const truncatedBody = bodyText;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0F', '#12121A', '#1A1A2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Accent line at top */}
        <LinearGradient
          colors={['#6C63FF', '#3B82F6', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <Text style={styles.appTitle}>TOWN WALL</Text>
          </View>
          <View style={styles.tag}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText}>{zoneName}</Text>
          </View>
        </View>

        {/* Post image */}
        {hasImage && (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,15,0.8)']}
              style={styles.imageOverlay}
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            {post.title || "Latest Update"}
          </Text>

          {truncatedBody ? (
            <Text style={styles.body}>
              {truncatedBody}
            </Text>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.userInfo}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>{emoji}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.username}>@{displayName}</Text>
              <Text style={styles.date}>
                {new Date(post.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Branding bar */}
        <View style={styles.branding}>
          <LinearGradient
            colors={['rgba(108,99,255,0.15)', 'rgba(59,130,246,0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.brandingBg}
          >
            <Text style={styles.brandingText}>townwall.co.uk</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    // Subtle outer glow via border
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.2)',
  },
  card: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 0,
    minHeight: 280,
  },
  accentLine: {
    height: 3,
    marginHorizontal: -24,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#FFFFFF',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,99,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C63FF',
  },
  tagText: {
    color: '#A5A0FF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'rgba(108,99,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(108,99,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 16,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
    marginTop: 1,
  },
  branding: {
    alignItems: 'center',
  },
  brandingBg: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  brandingText: {
    fontSize: 14,
    color: '#8B85FF',
    letterSpacing: 2,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
