import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Modal, TextInput, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  MessageCircle, User, Star, Briefcase, Vote, Sparkles, 
  Settings, Globe, Smartphone, X, Apple, Mail, CheckCircle,
  Menu, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Shield
} from 'lucide-react-native';
import { useChatStore, useAuthStore } from '../utils/auth';
import { useTheme } from '../utils/ThemeContext';
import { Image } from 'expo-image';
import { supabase } from '../utils/supabase';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/pDXYmMhf';
const DOCK_WIDTH = 72;

export default function WebLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const auth = useAuthStore(state => state.auth);
  const [showGetApp, setShowGetApp] = useState(false);
  const [androidEmail, setAndroidEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [townwallUserId, setTownwallUserId] = useState(null);
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

  useEffect(() => {
    if (auth?.id) {
      supabase.from('rusers').select('is_admin, is_moderator').eq('id', auth.id).single()
        .then(({ data }) => {
          const admin = !!(data?.is_admin || data?.is_moderator);
          setIsAdmin(admin);
        });
    } else {
      setIsAdmin(false);
    }
  }, [auth?.id]);

  useEffect(() => {
    supabase.from('rusers').select('id').eq('username', 'townwall').single()
      .then(({ data }) => { if (data?.id) setTownwallUserId(data.id); });
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
    setMobileNavOpen(false);
    router.push(path);
  };

  const dockItems = [
    { icon: Globe, label: 'Feed', onPress: () => navigate('/'), path: '/' },
    { icon: MessageCircle, label: 'Chat', onPress: () => { useChatStore.getState().open(); }, path: null },
    { icon: User, label: 'Profile', onPress: () => navigate('/profile'), path: '/profile' },
    { icon: Star, label: 'Talent', onPress: () => navigate('/talent'), path: '/talent' },
    { icon: Briefcase, label: 'Business', onPress: () => navigate('/businesses'), path: '/businesses' },
    { icon: Vote, label: 'Polls', onPress: () => navigate('/polls'), path: '/polls' },
    { icon: Sparkles, label: 'Towny AI', onPress: () => navigate('/help'), path: '/help', color: '#FBBF24' },
    { icon: Settings, label: 'Settings', onPress: () => navigate('/settings'), path: '/settings' },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', onPress: () => navigate('/admin-page-gYI'), path: '/admin-page-gYI', color: '#EF4444' }] : []),
    { icon: Smartphone, label: 'Get App', onPress: () => setShowGetApp(true), path: null, color: '#8B85FF' },
  ];

  const mobileNavItems = [
    { icon: Globe, label: 'Feed', onPress: () => navigate('/') },
    { icon: Star, label: 'Talent', onPress: () => navigate('/talent') },
    { icon: Briefcase, label: 'Business', onPress: () => navigate('/businesses') },
    { icon: User, label: 'Profile', onPress: () => navigate('/profile') },
    { icon: Sparkles, label: 'Towny', onPress: () => navigate('/help'), color: '#FBBF24' },
    { icon: Settings, label: 'Settings', onPress: () => navigate('/settings') },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', onPress: () => navigate('/admin-page-gYI'), color: '#EF4444' }] : []),
  ];

  // ─── MOBILE WEB ───
  if (isMobileWeb) {
    return (
      <View style={styles.root}>
        <View style={[styles.mainContent, { backgroundColor: theme.colors.background }]}>
          {children}
        </View>

        {/* Collapsed: semicircle up-arrow tab at bottom center */}
        {!mobileNavOpen && (
          <TouchableOpacity
            onPress={() => setMobileNavOpen(true)}
            activeOpacity={0.8}
            style={styles.mobileHandle}
          >
            <ChevronUp size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Expanded: floating pill */}
        {mobileNavOpen && (
          <View style={styles.pillWrapper}>
            <View style={styles.pillNav}>
              {mobileNavItems.map((item, i) => (
                <TouchableOpacity key={i} onPress={item.onPress} style={styles.pillNavItem} activeOpacity={0.7}>
                  <item.icon size={20} color={item.color || 'rgba(255,255,255,0.6)'} />
                  <Text style={styles.pillNavLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setMobileNavOpen(false)} style={styles.pillNavItem} activeOpacity={0.7}>
                <ChevronDown size={20} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ─── DESKTOP: Floating Dock ───
  return (
    <View style={styles.root}>
      {/* Collapsed: semicircle tab on left edge */}
      {dockCollapsed && (
        <TouchableOpacity
          onPress={() => setDockCollapsed(false)}
          activeOpacity={0.8}
          style={styles.dockHandle}
        >
          <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* Floating Dock */}
      {!dockCollapsed && (
      <View style={styles.dock}>
        <View style={styles.dockInner}>
          {/* Logo — click to go to Town Wall profile */}
          <TouchableOpacity onPress={() => townwallUserId ? navigate(`/profile?userId=${townwallUserId}`) : navigate('/profile')} activeOpacity={0.8} style={styles.dockLogoWrap}>
            <Image 
              source={require("../../assets/images/icon.png")} 
              style={styles.dockLogo} 
              contentFit="contain" 
            />
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          {/* Collapse button */}
          <TouchableOpacity
            onPress={() => setDockCollapsed(true)}
            activeOpacity={0.7}
            style={styles.dockCollapseBtn}
          >
            <ChevronLeft size={14} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          {/* Nav Icons */}
          {dockItems.map((item, i) => {
            const isActive = item.path && pathname === item.path;
            const isHovered = hoveredIndex === i;
            return (
              <TouchableOpacity
                key={i}
                onPress={item.onPress}
                activeOpacity={0.7}
                style={[
                  styles.dockItem,
                  isActive && styles.dockItemActive,
                  isHovered && styles.dockItemHover,
                ]}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(-1)}
              >
                <item.icon
                  size={20}
                  color={item.color || (isActive ? '#FFF' : 'rgba(255,255,255,0.45)')}
                />
                {/* Tooltip on hover */}
                {isHovered && (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>{item.label}</Text>
                  </View>
                )}
                {isActive && <View style={styles.dockActiveDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      )}

      {/* Main Content */}
      <View style={[styles.mainContent, { backgroundColor: theme.colors.background, marginLeft: dockCollapsed ? 0 : DOCK_WIDTH }]}>
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

  // ─── Desktop Dock ───
  dock: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: DOCK_WIDTH,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dockInner: {
    backgroundColor: 'rgba(20,20,30,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  dockLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dockLogo: {
    width: 40,
    height: 40,
  },
  dockDivider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
  dockItem: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dockItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dockItemHover: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ scale: 1.1 }],
  },
  dockActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  tooltip: {
    position: 'absolute',
    left: 56,
    backgroundColor: 'rgba(20,20,30,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 1000,
    whiteSpace: 'nowrap',
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // ─── Dock Handle (collapsed semicircle) ───
  dockHandle: {
    position: 'fixed',
    left: 0,
    top: '50%',
    transform: [{ translateY: -24 }],
    width: 20,
    height: 48,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    backgroundColor: 'rgba(20,20,30,0.85)',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    cursor: 'pointer',
  },
  dockCollapseBtn: {
    width: 36,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },

  // ─── Main Content ───
  mainContent: {
    flex: 1,
    overflow: 'hidden',
  },

  // ─── Mobile Handle (collapsed) — semicircle tab ───
  mobileHandle: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -32 }],
    width: 64,
    height: 28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(30,30,40,0.92)',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // ─── Mobile Pill (expanded) ───
  pillWrapper: {
    position: 'fixed',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  pillNav: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    maxWidth: 420,
    width: '100%',
    backgroundColor: 'rgba(20,20,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  pillNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    flex: 1,
  },
  pillNavLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.5)',
  },

  // ─── Modal ───
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
