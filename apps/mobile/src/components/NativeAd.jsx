import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

const NativeAdView = null;
const CallToActionView = null;
const HeadlineView = null;
const IconView = null;
const StarRatingView = null;
const TaglineView = null;
const AdvertiserView = null;
const ImageView = null;
const NativeMediaView = null;

export { 
  isExpoGo,
  NativeAdView, 
  CallToActionView, 
  HeadlineView, 
  IconView, 
  StarRatingView, 
  TaglineView, 
  AdvertiserView, 
  ImageView, 
  NativeMediaView 
};

export function NativeAd() {
  return (
    <View style={styles.placeholder}>
      <View style={styles.placeholderIcon} />
      <View style={styles.placeholderContent}>
        <View style={styles.placeholderLine} />
        <View style={[styles.placeholderLine, { width: '60%' }]} />
      </View>
      <Text style={styles.placeholderText}>AD</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    marginVertical: 8,
    marginHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  placeholderContent: {
    flex: 1,
    gap: 6,
  },
  placeholderLine: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    width: '80%',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
