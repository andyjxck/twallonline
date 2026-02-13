import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Modal, TextInput, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  MessageCircle, User, Star, Briefcase, Vote, Sparkles, 
  Settings, Globe, Smartphone, X, Apple, Mail, CheckCircle,
  Menu, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Shield,
  MoreVertical, Bell, LogOut, UserPlus, Store
} from 'lucide-react-native';
import { crossAlert } from '../utils/alert';
import { logoutUser } from '../utils/user';
import { useChatStore, useAuthStore } from '../utils/auth';
import { useTheme } from '../utils/ThemeContext';
import { Image } from 'expo-image';
import { supabase } from '../utils/supabase';
import StoriesBar from './StoriesBar';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/pDXYmMhf';
const DOCK_WIDTH = 72;
const STORIES_WIDTH = 90;

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
  const [storiesCollapsed, setStoriesCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [townwallUserId, setTownwallUserId] = useState(null);
  const [showListingsMenu, setShowListingsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userEmoji, setUserEmoji] = useState(null);
  const bubbleHidden = useChatStore(state => state.bubbleHidden);
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
      supabase.from('rusers').select('is_admin, is_moderator, avatar_url, emoji_icon, account_type, active_identity, talent_showcase_id, business_showcase_id').eq('id', auth.id).single()
        .then(async ({ data }) => {
          const admin = !!(data?.is_admin || data?.is_moderator);
          setIsAdmin(admin);
          // If in B/T identity, fetch showcase avatar
          let avatar = data?.avatar_url || null;
          let emoji = data?.emoji_icon || null;
          if (data?.active_identity === 'talent' && data?.talent_showcase_id) {
            const { data: t } = await supabase.from('rtalent').select('avatar_url').eq('id', data.talent_showcase_id).single();
            if (t?.avatar_url) avatar = t.avatar_url;
          } else if (data?.active_identity === 'business' && data?.business_showcase_id) {
            const { data: b } = await supabase.from('rbusinesses').select('avatar_url').eq('id', data.business_showcase_id).single();
            if (b?.avatar_url) avatar = b.avatar_url;
          }
          setUserAvatar(avatar);
          setUserEmoji(emoji);
        });
    } else {
      setIsAdmin(false);
      setUserAvatar(null);
      setUserEmoji(null);
    }
  }, [auth?.id, auth?.active_identity]);

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
    ...(bubbleHidden ? [{ icon: MessageCircle, label: 'Chat', onPress: () => { useChatStore.getState().open(); useChatStore.getState().setBubbleHidden(false); }, path: null }] : []),
    { icon: Store, label: 'Listings', onPress: () => setShowListingsMenu(v => !v), path: null, hasSubmenu: true },
    { icon: Sparkles, label: 'Towny AI', onPress: () => navigate('/help'), path: '/help', color: '#FBBF24' },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', onPress: () => navigate('/admin-page-gYI'), path: '/admin-page-gYI', color: '#EF4444' }] : []),
    { icon: MoreVertical, label: 'More', onPress: () => setShowMoreMenu(v => !v), path: null, hasSubmenu: true },
  ];

  const handleSwitchIdentity = async (identity) => {
    if (!auth?.id) return;
    try {
      const { error } = await supabase.from('rusers').update({ active_identity: identity }).eq('id', auth.id);
      if (error) throw error;
      useAuthStore.getState().setAuth({ ...auth, active_identity: identity });
      setShowProfileMenu(false);
    } catch (e) {
      console.error('Failed to switch identity:', e);
    }
  };

  const handleSignOut = () => {
    crossAlert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => {
        await logoutUser();
        useAuthStore.getState().setAuth(null);
        router.replace('/auth');
      }},
    ]);
  };

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

        {/* Bottom bar with key icons */}
        <View style={styles.mobileBottomBar}>
            <TouchableOpacity onPress={() => navigate('/')} style={styles.mobileBottomItem} activeOpacity={0.7}>
              <Globe size={20} color={pathname === '/' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('/talent')} style={styles.mobileBottomItem} activeOpacity={0.7}>
              <Star size={20} color={pathname === '/talent' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMobileNavOpen(true)} style={styles.mobileBottomMenuBtn} activeOpacity={0.8}>
              <Menu size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('/businesses')} style={styles.mobileBottomItem} activeOpacity={0.7}>
              <Briefcase size={20} color={pathname === '/businesses' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate('/profile')} style={styles.mobileBottomItem} activeOpacity={0.7}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={{ width: 24, height: 24, borderRadius: 12 }} />
              ) : (
                <User size={20} color={pathname === '/profile' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
              )}
            </TouchableOpacity>
          </View>

        {/* Popup menu above center button */}
        {mobileNavOpen && (
          <>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setMobileNavOpen(false)} 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
            />
            <View style={styles.mobilePopup}>
              {mobileNavItems.filter(item => !['Feed', 'Talent', 'Business', 'Settings'].includes(item.label)).map((item, i) => (
                <TouchableOpacity key={i} onPress={item.onPress} style={styles.mobilePopupItem} activeOpacity={0.7}>
                  <item.icon size={16} color={item.color || 'rgba(255,255,255,0.7)'} />
                  <Text style={[styles.mobilePopupText, item.color && { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              {/* Identity switcher */}
              {auth?.account_type && auth.account_type !== 'personal' && (
                <>
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2, letterSpacing: 0.5 }}>SWITCH IDENTITY</Text>
                  <TouchableOpacity style={styles.mobilePopupItem} onPress={() => { handleSwitchIdentity('personal'); setMobileNavOpen(false); }} activeOpacity={0.7}>
                    <User size={16} color={auth?.active_identity === 'personal' ? '#10B981' : 'rgba(255,255,255,0.7)'} />
                    <Text style={[styles.mobilePopupText, auth?.active_identity === 'personal' && { color: '#10B981' }]}>Personal</Text>
                    {auth?.active_identity === 'personal' && <Text style={{ color: '#10B981', fontSize: 10, marginLeft: 'auto' }}>✓</Text>}
                  </TouchableOpacity>
                  {(auth.account_type === 'business' || auth.account_type === 'both') && (
                    <TouchableOpacity style={styles.mobilePopupItem} onPress={() => { handleSwitchIdentity('business'); setMobileNavOpen(false); }} activeOpacity={0.7}>
                      <Briefcase size={16} color={auth?.active_identity === 'business' ? '#8B5CF6' : 'rgba(255,255,255,0.7)'} />
                      <Text style={[styles.mobilePopupText, auth?.active_identity === 'business' && { color: '#8B5CF6' }]}>Business</Text>
                      {auth?.active_identity === 'business' && <Text style={{ color: '#8B5CF6', fontSize: 10, marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                  {(auth.account_type === 'talent' || auth.account_type === 'both') && (
                    <TouchableOpacity style={styles.mobilePopupItem} onPress={() => { handleSwitchIdentity('talent'); setMobileNavOpen(false); }} activeOpacity={0.7}>
                      <Star size={16} color={auth?.active_identity === 'talent' ? '#F59E0B' : 'rgba(255,255,255,0.7)'} />
                      <Text style={[styles.mobilePopupText, auth?.active_identity === 'talent' && { color: '#F59E0B' }]}>Talent</Text>
                      {auth?.active_identity === 'talent' && <Text style={{ color: '#F59E0B', fontSize: 10, marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 }} />
              <TouchableOpacity onPress={() => navigate('/settings')} style={styles.mobilePopupItem} activeOpacity={0.7}>
                <Settings size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.mobilePopupText}>Settings</Text>
              </TouchableOpacity>
              {auth?.id && (
                <TouchableOpacity onPress={handleSignOut} style={styles.mobilePopupItem} activeOpacity={0.7}>
                  <LogOut size={16} color="#EF4444" />
                  <Text style={[styles.mobilePopupText, { color: '#EF4444' }]}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
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
          onPress={() => { setDockCollapsed(false); useChatStore.getState().setDockCollapsed(false); }}
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

          {/* Nav Icons */}
          {dockItems.map((item, i) => {
            const isActive = item.path && pathname === item.path;
            const isHovered = hoveredIndex === i;
            return (
              <View key={i} style={{ position: 'relative' }}>
                <TouchableOpacity
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
                  {isHovered && !item.hasSubmenu && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>{item.label}</Text>
                    </View>
                  )}
                  {isActive && <View style={styles.dockActiveDot} />}
                </TouchableOpacity>

                {/* Listings submenu */}
                {item.label === 'Listings' && showListingsMenu && (
                  <View style={styles.submenu}>
                    <TouchableOpacity style={styles.submenuItem} onPress={() => { navigate('/talent'); setShowListingsMenu(false); }}>
                      <Star size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.submenuText}>Talent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submenuItem} onPress={() => { navigate('/businesses'); setShowListingsMenu(false); }}>
                      <Briefcase size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.submenuText}>Business</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* More submenu */}
                {item.label === 'More' && showMoreMenu && (
                  <View style={styles.submenu}>
                    <TouchableOpacity style={styles.submenuItem} onPress={() => { navigate('/settings'); setShowMoreMenu(false); }}>
                      <Settings size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.submenuText}>Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submenuItem} onPress={() => { navigate('/polls'); setShowMoreMenu(false); }}>
                      <Vote size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.submenuText}>Polls</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submenuItem} onPress={() => { setShowGetApp(true); setShowMoreMenu(false); }}>
                      <Smartphone size={16} color="#8B85FF" />
                      <Text style={styles.submenuText}>Get App</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.dockDivider} />

          {/* Profile icon in dock */}
          {auth?.id && (
            <TouchableOpacity
              onPress={() => navigate('/profile')}
              onLongPress={() => setShowProfileMenu(v => !v)}
              activeOpacity={0.7}
              style={styles.dockProfileBtn}
            >
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.dockProfileImg} />
              ) : (
                <Text style={{ fontSize: 16 }}>{userEmoji || '👤'}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Collapse button */}
          <TouchableOpacity
            onPress={() => { setDockCollapsed(true); useChatStore.getState().setDockCollapsed(true); }}
            activeOpacity={0.7}
            style={styles.dockCollapseBtn}
          >
            <ChevronLeft size={14} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Profile menu popout - rendered at root level */}
      {showProfileMenu && (
        <View style={styles.profileDropdownFixed}>
          {auth?.account_type && auth.account_type !== 'personal' && (
            <>
              <Text style={styles.profileDropdownLabel}>SWITCH IDENTITY</Text>
              <TouchableOpacity style={styles.submenuItem} onPress={() => handleSwitchIdentity('personal')}>
                <User size={16} color={auth?.active_identity === 'personal' ? '#10B981' : 'rgba(255,255,255,0.7)'} />
                <Text style={[styles.submenuText, auth?.active_identity === 'personal' && { color: '#10B981' }]}>Personal</Text>
                {auth?.active_identity === 'personal' && <Text style={{ color: '#10B981', fontSize: 10, marginLeft: 'auto' }}>✓</Text>}
              </TouchableOpacity>
              {(auth.account_type === 'business' || auth.account_type === 'both') && (
                <TouchableOpacity style={styles.submenuItem} onPress={() => handleSwitchIdentity('business')}>
                  <Briefcase size={16} color={auth?.active_identity === 'business' ? '#8B5CF6' : 'rgba(255,255,255,0.7)'} />
                  <Text style={[styles.submenuText, auth?.active_identity === 'business' && { color: '#8B5CF6' }]}>Business</Text>
                  {auth?.active_identity === 'business' && <Text style={{ color: '#8B5CF6', fontSize: 10, marginLeft: 'auto' }}>✓</Text>}
                </TouchableOpacity>
              )}
              {(auth.account_type === 'talent' || auth.account_type === 'both') && (
                <TouchableOpacity style={styles.submenuItem} onPress={() => handleSwitchIdentity('talent')}>
                  <Star size={16} color={auth?.active_identity === 'talent' ? '#F59E0B' : 'rgba(255,255,255,0.7)'} />
                  <Text style={[styles.submenuText, auth?.active_identity === 'talent' && { color: '#F59E0B' }]}>Talent</Text>
                  {auth?.active_identity === 'talent' && <Text style={{ color: '#F59E0B', fontSize: 10, marginLeft: 'auto' }}>✓</Text>}
                </TouchableOpacity>
              )}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 6 }} />
            </>
          )}
          <TouchableOpacity style={styles.submenuItem} onPress={() => { handleSignOut(); setShowProfileMenu(false); }}>
            <LogOut size={16} color="#EF4444" />
            <Text style={[styles.submenuText, { color: '#EF4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dismiss menus overlay */}
      {(showListingsMenu || showMoreMenu || showProfileMenu) && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => { setShowListingsMenu(false); setShowMoreMenu(false); setShowProfileMenu(false); }}
        />
      )}

      {/* Main Content */}
      <View style={[styles.mainContent, { backgroundColor: theme.colors.background, marginLeft: dockCollapsed ? 0 : DOCK_WIDTH, marginRight: storiesCollapsed ? 0 : STORIES_WIDTH }]}>
        {children}
      </View>

      {/* Stories Right Dock */}
      {!storiesCollapsed && (
        <View style={styles.storiesDock}>
          <View style={styles.storiesDockInner}>
            <StoriesBar vertical reversed />
            <TouchableOpacity
              onPress={() => setStoriesCollapsed(true)}
              style={styles.storiesCollapseBtn}
            >
              <ChevronRight size={12} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stories collapsed handle */}
      {storiesCollapsed && (
        <TouchableOpacity
          onPress={() => setStoriesCollapsed(false)}
          activeOpacity={0.8}
          style={styles.storiesHandle}
        >
          <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

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

  // ─── Submenu (pops out from dock) ───
  submenu: {
    position: 'absolute',
    left: 56,
    top: 0,
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    zIndex: 2000,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  submenuText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Dock Profile Button ───
  dockProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  dockProfileImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileDropdownLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  profileDropdownFixed: {
    position: 'fixed',
    bottom: 80,
    left: 80,
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 180,
    zIndex: 2000,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  profileDropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
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

  // ─── Stories Right Dock (mirrors left dock) ───
  storiesDock: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: STORIES_WIDTH,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  storiesDockInner: {
    backgroundColor: 'rgba(20,20,30,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    maxHeight: '80%',
  },
  storiesCollapseBtn: {
    width: 36,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    cursor: 'pointer',
  },
  storiesHandle: {
    position: 'fixed',
    right: 0,
    top: '50%',
    transform: [{ translateY: -24 }],
    width: 20,
    height: 48,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(20,20,30,0.85)',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    cursor: 'pointer',
  },

  // ─── Main Content ───
  mainContent: {
    flex: 1,
    overflow: 'hidden',
  },

  // ─── Mobile Bottom Bar ───
  mobileBottomBar: {
    position: 'fixed',
    bottom: 12,
    left: 20,
    right: 20,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20,20,30,0.85)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    zIndex: 9999,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    paddingBottom: 0,
  },
  mobileBottomItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  mobileBottomMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Mobile Popup Menu ───
  mobilePopup: {
    position: 'fixed',
    bottom: 64,
    left: '50%',
    transform: [{ translateX: -80 }],
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    zIndex: 9999,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  mobilePopupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mobilePopupText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
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
