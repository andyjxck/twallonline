import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { 
  isExpoGo,
  NativeAdView, 
  CallToActionView, 
  HeadlineView, 
  IconView, 
  TaglineView, 
  AdvertiserView, 
  NativeMediaView 
} from './NativeAd';
import { useTheme } from '../utils/ThemeContext';
import { User, Sparkles, Flag, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { crossAlert } from '../utils/alert';

const adUnitId = __DEV__ 
  ? 'ca-app-pub-3940256099942544/2247696110'
  : Platform.select({
      ios: 'ca-app-pub-1505977777207758/1579458289', 
      android: 'ca-app-pub-1505977777207758/8372995132',
    });

const AD_REPORT_REASONS = [
  'Inappropriate content',
  'Misleading or scam',
  'Offensive or harmful',
  'Not relevant to me',
  'Seen too many times',
  'Other',
];

export function FeedNativeAd() {
  const nativeAdRef = useRef(null);
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { theme } = useTheme();

  const handleReportAd = (reason) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowReportModal(false);
    crossAlert(
      'Ad Reported',
      'Thank you for your feedback. We take ad quality seriously and will review this report.',
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    // Only attempt to load if the component is valid and available
    if (NativeAdView && nativeAdRef.current) {
      try {
        nativeAdRef.current.loadAd();
      } catch (e) {
        console.warn('Failed to load feed ad:', e.message);
      }
    }
  }, []);

  const renderContent = (isPlaceholder = false) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface }]}>
          {isPlaceholder ? (
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
              <Sparkles size={20} color={theme.colors.primary} />
            </View>
          ) : (
            <IconView style={styles.avatar} />
          )}
        </View>
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isPlaceholder ? (
                <Text style={[styles.username, { color: theme.colors.text }]}>Featured Partner</Text>
              ) : (
                <HeadlineView style={[styles.username, { color: theme.colors.text }]} />
              )}
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>SPONSORED</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isPlaceholder ? (
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>Local Business</Text>
              ) : (
                <AdvertiserView style={[styles.metaText, { color: theme.colors.textSecondary }]} />
              )}
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>• Ad</Text>
            </View>
          </View>
      </View>

      <View style={styles.mainContent}>
        <View style={{ flex: 1 }}>
          {isPlaceholder ? (
            <Text style={[styles.bodyText, { color: theme.colors.text }]}>
              This is a placeholder for a native AdMob ad. In a dev build or production, this will show a flush native ad with video support.
            </Text>
          ) : (
            <TaglineView 
              style={[styles.bodyText, { color: theme.colors.text }]} 
              numberOfLines={4} 
            />
          )}
        </View>
      </View>

      {isPlaceholder ? (
        <View style={[styles.mediaView, { justifyContent: 'center', alignItems: 'center' }]}>
          <Sparkles size={48} color="rgba(255,255,255,0.1)" />
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 10, fontWeight: '700' }}>MEDIA PLACEHOLDER</Text>
        </View>
      ) : (
        <NativeMediaView style={styles.mediaView} />
      )}

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            {isPlaceholder ? (
              <View style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.ctaButtonText}>Learn More</Text>
              </View>
            ) : (
              <CallToActionView
                style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
                textStyle={styles.ctaButtonText}
              />
            )}
          </View>
          <TouchableOpacity 
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReportModal(true); }}
            style={styles.reportAdBtn}
          >
            <Flag size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderReportModal = () => (
    <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Report This Ad</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
            Why are you reporting this ad?
          </Text>
          {AD_REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reasonBtn, { borderColor: theme.colors.border }]}
              onPress={() => handleReportAd(reason)}
            >
              <Text style={[styles.reasonText, { color: theme.colors.text }]}>{reason}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.cancelBtn}>
            <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Robust check for a valid NativeAdView component
  // In version 16, it might be a component object with $$typeof
  const isComponentValid = !!NativeAdView && (
    typeof NativeAdView === 'function' || 
    (typeof NativeAdView === 'object' && NativeAdView.$$typeof)
  );
  
  const usePlaceholder = isExpoGo || !isComponentValid;

  if (usePlaceholder) {
    return (
      <View style={[styles.container, { borderBottomColor: theme.colors.border, minHeight: 300 }]}>
        {renderContent(true)}
        {renderReportModal()}
      </View>
    );
  }

  return (
    <>
      <NativeAdView
        ref={nativeAdRef}
        adUnitID={adUnitId}
        onAdLoaded={() => {
          // Delay setting state to ensure internal library state is ready
          setTimeout(() => setIsAdLoaded(true), 100);
        }}
        onAdFailedToLoad={(error) => {
          console.warn('Feed Ad failed to load:', error);
          setIsAdLoaded(false);
        }}
        style={[
          styles.container, 
          { borderBottomColor: theme.colors.border, minHeight: isAdLoaded ? 300 : 50 }
        ]}
      >
        {/* 
          CRITICAL: We only render AdMob components IF the ad is confirmed loaded.
          This prevents the internal "responseId" error by ensuring the library 
          has data before children try to access it.
        */}
        {isAdLoaded ? renderContent(false) : renderContent(true)}
      </NativeAdView>
      {renderReportModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    paddingBottom: 20 
  },
  card: { 
    paddingHorizontal: 15 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { 
    width: 40, 
    height: 40 
  },
  headerInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  username: { 
    fontWeight: '700', 
    fontSize: 15 
  },
  sponsoredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sponsoredText: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  metaText: { 
    fontSize: 12, 
    marginTop: 2 
  },
  mainContent: {
    marginBottom: 12,
  },
  bodyText: { 
    fontSize: 15, 
    lineHeight: 22 
  },
  mediaView: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  footer: { 
    paddingTop: 10 
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
  reportAdBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  reasonBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
});
