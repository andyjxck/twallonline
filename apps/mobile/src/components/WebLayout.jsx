import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Modal, TextInput, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  MessageCircle, User, Star, Briefcase, Vote, Sparkles, 
  Settings, Globe, Smartphone, X, Apple, Mail, CheckCircle
} from 'lucide-react-native';
import { useChatStore, useAuthStore } from '../utils/auth';
import { useTheme } from '../utils/ThemeContext';
import { Image } from 'expo-image';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/pDXYmMhf';

export default function WebLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const auth = useAuthStore(state => state.auth);
  const [showGetApp, setShowGetApp] = useState(false);
  const [androidEmail, setAndroidEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width
  );

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    const sub = Dimensions.addEventListener('change', ({ window: w }) => setWindowWidth(w.width));
    return () => sub?.remove();
  }, []);

  if (Platform.OS !== 'web') return children;

  const hideSidebar = pathname?.startsWith('/onboarding') || pathname === '/auth' || pathname === '/forgot-password';
  if (hideSidebar) return <View style={{ flex: 1 }}>{children}</View>;

  const isMobileWeb = windowWidth < 768;

  const handleAndroidSignup = async () => {
    if (!androidEmail || !androidEmail.includes('@')) return;
    setSubmitting(true);
    try {
      const formData = new URLSearchParams();
      formData.append('form-name', 'android-beta');
      formData.append('email', androidEmail);
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      setEmailSubmitted(true);
    } catch (e) {
      setEmailSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const navigate = (path) => {
    useChatStore.getState().close();
    router.push(path);
  };

  const navItems = [
    { icon: Globe, label: 'Feed', onPress: () => navigate('/') },
    { icon: MessageCircle, label: 'Chat', onPress: () => useChatStore.getState().open() },
    { icon: User, label: 'Profile', onPress: () => navigate('/profile') },
    { icon: Star, label: 'Local Talent', onPress: () => navigate('/talent') },
    { icon: Briefcase, label: 'Business', onPress: () => navigate('/businesses') },
    { icon: Vote, label: 'Polls', onPress: () => navigate('/polls') },
    { icon: Sparkles, label: 'Towny AI', onPress: () => navigate('/help'), color: '#FBBF24' },
    { icon: Settings, label: 'Settings', onPress: () => navigate('/settings') },
  ];

  const mobileNavItems = [
    { icon: Globe, label: 'Feed', onPress: () => navigate('/') },
    { icon: Star, label: 'Talent', onPress: () => navigate('/talent') },
    { icon: Briefcase, label: 'Business', onPress: () => navigate('/businesses') },
    { icon: Sparkles, label: 'Towny', onPress: () => navigate('/help'), color: '#FBBF24' },
    { icon: Settings, label: 'More', onPress: () => navigate('/settings') },
  ];

  if (isMobileWeb) {
    return (
      <View style={styles.root}>
        <View style={[styles.mainContent, { backgroundColor: theme.colors.background, paddingBottom: 60 }]}>
          {children}
        </View>
        <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          {mobileNavItems.map((item, i) => (
            <TouchableOpacity key={i} onPress={item.onPress} style={styles.bottomNavItem} activeOpacity={0.7}>
              <item.icon size={20} color={item.color || theme.colors.textSecondary} />
              <Text style={[styles.bottomNavLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Left Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border }]}>
        <View>
          <View style={styles.sidebarHeader}>
            <Image 
              source={require("../../assets/images/icon.png")} 
              style={styles.sidebarLogo} 
              contentFit="contain" 
            />
            <Text style={[styles.sidebarTitle, { color: theme.colors.text }]}>Town Wall</Text>
          </View>

          <View style={styles.navList}>
            {navItems.map((item, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={item.onPress} 
                style={styles.navItem}
                activeOpacity={0.7}
              >
                <item.icon size={20} color={item.color || theme.colors.textSecondary} />
                <Text style={[styles.navLabel, { color: theme.colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity 
            onPress={() => setShowGetApp(true)} 
            style={[styles.downloadBtn, { backgroundColor: 'rgba(108,99,255,0.1)', borderColor: 'rgba(108,99,255,0.2)' }]}
          >
            <Smartphone size={16} color="#8B85FF" />
            <Text style={styles.downloadText}>Get the App</Text>
          </TouchableOpacity>
          <Text style={styles.footerUrl}>townwall.co.uk</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={[styles.mainContent, { backgroundColor: theme.colors.background }]}>
        {children}
      </View>

      {/* Get the App Modal */}
      {showGetApp && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowGetApp(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Get Town Wall</Text>
              <TouchableOpacity onPress={() => setShowGetApp(false)}>
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              The full experience — voice calls, video, notifications & more.
            </Text>

            {/* iOS */}
            <View style={styles.platformSection}>
              <View style={styles.platformBadge}>
                <Apple size={18} color="#FFF" />
                <Text style={styles.platformLabel}>iPhone</Text>
              </View>
              <Text style={styles.platformDesc}>Available now via TestFlight beta</Text>
              <TouchableOpacity 
                onPress={() => Linking.openURL(TESTFLIGHT_URL)} 
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Join TestFlight Beta</Text>
              </TouchableOpacity>
            </View>

            {/* Android */}
            <View style={[styles.platformSection, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 20 }]}>
              <View style={styles.platformBadge}>
                <Smartphone size={18} color="#A3E635" />
                <Text style={styles.platformLabel}>Android</Text>
              </View>
              {emailSubmitted ? (
                <View style={styles.successRow}>
                  <CheckCircle size={18} color="#4ADE80" />
                  <Text style={styles.successText}>You're on the list! We'll email you when the beta is ready.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.platformDesc}>Coming soon — sign up for early access</Text>
                  <View style={styles.emailRow}>
                    <TextInput
                      style={styles.emailInput}
                      placeholder="your@email.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={androidEmail}
                      onChangeText={setAndroidEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity 
                      onPress={handleAndroidSignup} 
                      disabled={submitting || !androidEmail.includes('@')}
                      style={[styles.emailBtn, (!androidEmail.includes('@')) && { opacity: 0.4 }]}
                    >
                      <Mail size={16} color="#000" />
                      <Text style={styles.emailBtnText}>{submitting ? '...' : 'Notify Me'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000000',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navList: {
    flex: 1,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  sidebarFooter: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  downloadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B85FF',
  },
  footerUrl: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    overflow: 'hidden',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 9999,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    flex: 1,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  modalCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 28,
    width: 420,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
    lineHeight: 20,
  },
  platformSection: {
    marginBottom: 20,
    gap: 10,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  platformDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  primaryBtn: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  emailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  emailInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A3E635',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emailBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(74,222,128,0.1)',
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  successText: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
