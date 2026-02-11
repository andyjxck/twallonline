import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const APP_STORE_URL = 'https://apps.apple.com/app/town-wall/id6742704937';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.andysocial.townwall';

export const isWeb = Platform.OS === 'web';

export const MobileOnlyFeature = ({ 
  featureName = 'This feature',
  compact = false,
  style,
}) => {
  if (!isWeb) return null;

  const handleDownload = () => {
    Linking.openURL(APP_STORE_URL);
  };

  if (compact) {
    return (
      <TouchableOpacity onPress={handleDownload} style={[styles.compactContainer, style]}>
        <Smartphone size={14} color="#8B85FF" />
        <Text style={styles.compactText}>
          {featureName} — get the app
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(108,99,255,0.08)', 'rgba(59,130,246,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconCircle}>
          <Smartphone size={24} color="#8B85FF" />
        </View>
        <Text style={styles.title}>{featureName}</Text>
        <Text style={styles.subtitle}>
          This feature is available on the mobile app for the best experience.
        </Text>
        <TouchableOpacity onPress={handleDownload} style={styles.button}>
          <LinearGradient
            colors={['#6C63FF', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Smartphone size={16} color="#FFF" />
            <Text style={styles.buttonText}>Get the Mobile App</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

export const withMobileOnly = (callback, featureName) => {
  if (isWeb) {
    return () => {
      if (typeof alert !== 'undefined') {
        alert(`${featureName || 'This feature'} is only available on the mobile app. Download Town Wall from the App Store or Google Play!`);
      }
    };
  }
  return callback;
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.15)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(108,99,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(108,99,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compactText: {
    fontSize: 12,
    color: '#8B85FF',
    fontWeight: '600',
  },
});

export default MobileOnlyFeature;
