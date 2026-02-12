import React, { useState } from 'react';
import { View, Platform, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import Constants from 'expo-constants';
import { Flag, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { crossAlert } from '../utils/alert';

let RNBannerAd, BannerAdSize, TestIds;

const AD_REPORT_REASONS = [
  'Inappropriate content',
  'Misleading or scam',
  'Offensive or harmful',
  'Not relevant to me',
  'Seen too many times',
  'Other',
];

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    RNBannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch (e) {
  }
}

const adUnitId = __DEV__ 
  ? (TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111') 
    : Platform.select({
        ios: 'ca-app-pub-1505977777207758/8766030770', 
        android: 'ca-app-pub-1505977777207758/9856407709',
      });

export function BannerAd() {
  const [showReportModal, setShowReportModal] = useState(false);

  const handleReportAd = (reason) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowReportModal(false);
    crossAlert(
      'Ad Reported',
      'Thank you for your feedback. We take ad quality seriously and will review this report.',
      [{ text: 'OK' }]
    );
  };

  const renderReportModal = () => (
    <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report This Ad</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Why are you reporting this ad?</Text>
          {AD_REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={styles.reasonBtn}
              onPress={() => handleReportAd(reason)}
            >
              <Text style={styles.reasonText}>{reason}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.cancelBtn}>
            <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!RNBannerAd || !BannerAdSize) {
    return (
      <View style={styles.placeholderContainer}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>AD SPACE</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReportModal(true); }}
          style={styles.reportBtn}
        >
          <Flag size={12} color="#6B7280" />
        </TouchableOpacity>
        {renderReportModal()}
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer}>
      <RNBannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
      <TouchableOpacity 
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReportModal(true); }}
        style={styles.reportBtn}
      >
        <Flag size={12} color="#6B7280" />
      </TouchableOpacity>
      {renderReportModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
    position: 'relative',
  },
  placeholderContainer: {
    position: 'relative',
    marginHorizontal: 15,
  },
  placeholder: {
    height: 60,
    marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  reportBtn: {
    position: 'absolute',
    top: 12,
    right: 4,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
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
    color: '#FFF',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: '#9CA3AF',
  },
  reasonBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
});
