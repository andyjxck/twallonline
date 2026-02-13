import { AnimatePresence, MotiView } from "moti";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
    Modal,
    Dimensions,
    Alert,
    Share,
    TextInput as RNTextInput,
    ScrollView,
    Platform,
} from "react-native";
import { crossAlert } from '../utils/alert';
import { toast } from 'sonner-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
    Plus,
    Menu,
    Shield,
    HelpCircle,
    Bell,
    ListFilter,
    User,
    Search,
    Star,
    Briefcase,
    Vote,
    WifiOff,
    CloudUpload,
    MessageCircle,
    Sparkles,
    Globe,
    MapPin,
    ChevronDown,
    Check,
    Settings,
    X,
    Image as ImageIcon,
    BarChart2,
    Users,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { getDeviceId } from "../utils/deviceId";
import { supabase } from "../utils/supabase";
import * as Haptics from "expo-haptics";
import { theme as defaultTheme } from "../utils/theme";
import { getStoredUser } from "../utils/user";
import { useAuthStore, useChatStore, useFeedHighlightStore } from "../utils/auth";
import { useTheme } from "../utils/ThemeContext";
import NotificationPanel from "./NotificationPanel";
import { PostComposer } from "./PostComposer";
import { ShareManager } from "./ShareManager";
import { BannerAd } from "@/components/BannerAd";
import AdBanner from "./AdBanner";
import PostItem from "./PostItem";
import StoriesBar from "./StoriesBar";
import { subscribeToUnreadCount, sendNotification, sendReactionNotification } from "../utils/notifications";
import { offlineStorage, syncService, subscribeToNetworkChanges, checkNetworkStatus } from "../utils/offline";
import { useLocationStore } from "../utils/locationStore";
import { fetchZonesForCity } from "../utils/location";
import { getBlockedUserIds } from "../utils/blocking";

export default function UniversalFeed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
    const { theme, isHippie, isUnlocked, toggleHippie } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [posts, setPosts] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  
    const [selectedZone, setSelectedZone] = useState(null);
    const [zoneSearch, setZoneSearch] = useState("");
    const [sortBy, setSortBy] = useState('newest');
  const [showMenu, setShowMenu] = useState(false);
  const [showFilterSort, setShowFilterSort] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const user = useAuthStore(state => state.auth);
  const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [blockedUserIds, setBlockedUserIds] = useState([]);
    const shareRef = useRef();
  const reactionLockRef = useRef(new Set());
  const [isOnline, setIsOnline] = useState(true);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  
    const { city_id, city_name, zone_id, zone_name, feedView, setFeedView, savedCity } = useLocationStore();
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const flatListRef = useRef(null);
    const { highlightedPostId, clearHighlight } = useFeedHighlightStore();
    const [isComposerExpanded, setIsComposerExpanded] = useState(false);

    const postsWithAds = useMemo(() => {
      const offlinePosts = pendingPosts.map(p => ({
        ...p,
        isPending: true,
        user: null,
        zone: null,
        tag: null,
        reactions: [],
      }));
      return [...offlinePosts, ...posts];
    }, [posts, pendingPosts]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleClick = () => {
      setShowMenu(false);
      setShowLocationPicker(false);
      setShowFilterSort(false);
      setShowNotifications(false);
    };
    if (showMenu || showLocationPicker || showFilterSort || showNotifications) {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [showMenu, showLocationPicker, showFilterSort, showNotifications]);

    useEffect(() => {

    getDeviceId().then(setDeviceId);
    fetchZones();
    checkModerator();
    loadPendingPosts();
    checkNetworkStatus().then(setIsOnline);
    loadBlockedUsers();

    const unsubscribeNetwork = subscribeToNetworkChanges(async (online) => {
      setIsOnline(online);
      if (online) {
        await syncPendingPosts();
      }
    });

    const postsSub = supabase
      .channel('public:rposts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rposts' }, () => fetchPosts(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rreactions' }, () => fetchPosts(true))
      .subscribe();

return () => { 
        supabase.removeChannel(postsSub); 
        unsubscribeNetwork();
      };
    }, [selectedZone, sortBy, city_id, feedView]);

  useEffect(() => {
    if (!highlightedPostId) return;
    
    const fetchHighlightedPost = async () => {
      try {
        const { data: highlightedPost } = await supabase
          .from("rposts")
          .select(`id, title, text, created_at, user_id, zone_id, tag_id, image_url, image_urls, is_anonymous, moderation_status, is_deleted, is_blurred, blur_reason, comments_disabled, city_id, cta_type, cta_group_id, posted_as_identity, user:rusers (*), zone:rzones (name), tag:rtags (name), poll_id, reactions:rreactions (reaction_type, device_id, user_id)`)
          .eq("id", highlightedPostId)
          .single();
        
        if (highlightedPost) {
          setPosts(prevPosts => {
            const filtered = prevPosts.filter(p => p.id !== highlightedPostId);
            return [{ ...highlightedPost, isHighlighted: true }, ...filtered];
          });
          
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
          
          setTimeout(() => {
            setPosts(prevPosts => prevPosts.map(p => ({ ...p, isHighlighted: false })));
            clearHighlight();
          }, 3000);
        }
      } catch (err) {
        console.error('Error fetching highlighted post:', err);
        clearHighlight();
      }
    };
    
    fetchHighlightedPost();
  }, [highlightedPostId]);

  const loadPendingPosts = async () => {
    const pending = await offlineStorage.getPendingPosts();
    setPendingPosts(pending);
  };

  const syncPendingPosts = async () => {
    const pending = await offlineStorage.getPendingPosts();
    if (pending.length === 0) return;
    
    setSyncing(true);
    const { synced, failed } = await syncService.syncPendingPosts();
    setSyncing(false);
    
    if (synced > 0) {
      await loadPendingPosts();
      await fetchPosts(true);
      toast.success(`${synced} post(s) uploaded successfully.`);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToUnreadCount(user.id, (count) => {
      setUnreadCount(count);
    });
    return () => unsubscribe();
  }, [user?.id]);

  const loadUnreadCount = async () => {
    const user = await getStoredUser();
    if (user) {
      const { count } = await supabase.from('rnotifications').select('*', { count: 'exact' }).eq('user_id', user.id).eq('is_read', false).limit(1);
      setUnreadCount(count || 0);
    }
  };

  const checkModerator = async () => {
    const user = await getStoredUser();
    if (user) {
      const { data } = await supabase.from('rusers').select('is_admin, is_moderator').eq('id', user.id).single();
      setIsModerator(!!data?.is_admin || !!data?.is_moderator);
    }
  };

  const fetchZones = async () => {
    if (!city_id) return;
    const zonesData = await fetchZonesForCity(city_id);
    setZones(zonesData || []);
  };

  const loadBlockedUsers = async () => {
    const storedUser = await getStoredUser();
    if (storedUser?.id) {
      const ids = await getBlockedUserIds(storedUser.id);
      setBlockedUserIds(ids);
    }
  };

    const fetchPosts = async (isRefreshing = false) => {
      if (!isRefreshing) setLoading(true);
        try {
        let query = supabase.from("rposts").select(`id, title, text, created_at, user_id, zone_id, tag_id, image_url, image_urls, is_anonymous, moderation_status, is_deleted, is_blurred, blur_reason, comments_disabled, city_id, cta_type, cta_group_id, posted_as_identity, user:rusers (*), zone:rzones (name), tag:rtags (name), poll_id, reactions:rreactions (reaction_type, device_id, user_id)`).eq("is_deleted", false).eq("moderation_status", "approved");
        
        if (feedView === "global") {
          query = query.eq("city_id", 349);
        } else if (feedView === "city" && city_id) {
          query = query.eq("city_id", city_id);
          if (selectedZone) query = query.eq("zone_id", selectedZone);
        } else if (feedView === "zone" && zone_id) {
          query = query.eq("zone_id", zone_id);
        }

        if (sortBy === 'popular') {
          query = query.order("created_at", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: sortBy === 'oldest' });
        }

        const limitCount = sortBy === 'popular' ? 100 : 50;
        const { data } = await query.limit(limitCount);
        
        let finalData = data || [];
        
        if (blockedUserIds.length > 0) {
          finalData = finalData.filter(p => !blockedUserIds.includes(p.user_id));
        }
        
        if (sortBy === 'popular') {
          finalData = [...finalData].sort((a, b) => {
            const aCount = (a.reactions || []).filter(r => r.reaction_type === 'superlike').length;
            const bCount = (b.reactions || []).filter(r => r.reaction_type === 'superlike').length;
            return bCount - aCount;
          });
        }
        
        setPosts(finalData);
      } catch (err) { console.error(err); }
      finally { setLoading(false); setRefreshing(false); }
    };


  const handleModAction = async (postId, action, reason = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const post = posts.find(p => p.id === postId);
      const previousState = post ? {
        is_deleted: post.is_deleted,
        comments_disabled: post.comments_disabled,
        is_blurred: post.is_blurred,
        blur_reason: post.blur_reason,
      } : null;

      if (action === 'delete') {
        await supabase.from('rposts').update({ is_deleted: true }).eq('id', postId);
        toast.success("Post deleted");
      } else if (action === 'toggle_comments') {
        await supabase.from('rposts').update({ comments_disabled: !post?.comments_disabled }).eq('id', postId);
        toast.success(post?.comments_disabled ? "Comments enabled" : "Comments disabled");
      } else if (action === 'blur') {
        await supabase.from('rposts').update({ is_blurred: true, blur_reason: reason }).eq('id', postId);
        toast.success("Post blurred");
      } else if (action === 'unblur') {
        await supabase.from('rposts').update({ is_blurred: false, blur_reason: null }).eq('id', postId);
        toast.success("Blur removed");
      }

      // Log the moderation action
      try {
        await supabase.from('rmoderation_logs').insert({
          moderator_id: user?.id,
          target_id: postId,
          target_type: 'post',
          action: action,
          reason: reason || `Mod action: ${action}`,
          previous_state: previousState,
          post_title: post?.title,
          post_user_id: post?.user_id,
        });
      } catch (logError) {
        console.warn("Failed to log moderation action:", logError);
      }

      fetchPosts(true);
    } catch (e) { 
      console.error(e); 
      toast.error("Failed to perform action");
    }
  };

  const handleReaction = async (postId, type, currentlyReacted) => {
    if (!deviceId) return;
    const lockKey = `${postId}_${type}`;
    if (reactionLockRef.current.has(lockKey)) return;
    reactionLockRef.current.add(lockKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (currentlyReacted) {
        // Delete by user_id if logged in, fallback to device_id for anonymous
        const deleteMatch = user?.id
          ? { post_id: postId, reaction_type: type, user_id: user.id }
          : { post_id: postId, reaction_type: type, device_id: deviceId };
        await supabase.from('rreactions').delete().match(deleteMatch);
      } else {
        // Check if user already reacted (from another device)
        if (user?.id) {
          const { data: existing } = await supabase.from('rreactions')
            .select('id')
            .eq('post_id', postId)
            .eq('reaction_type', type)
            .eq('user_id', user.id)
            .maybeSingle();
          if (existing) {
            fetchPosts(true);
            return;
          }
        }
        const { data: reactionData } = await supabase.from('rreactions').insert({ 
          post_id: postId, 
          reaction_type: type, 
          device_id: deviceId,
          user_id: user?.id 
        }).select('*, post:rposts(user_id, title)').single();

            if (reactionData?.post?.user_id && reactionData.post.user_id !== user?.id) {
              await sendReactionNotification({
                reactorUsername: user?.username || 'Someone',
                reactorId: user?.id,
                postOwnerId: reactionData.post.user_id,
                postId: postId,
                postTitle: reactionData.post.title,
                reactionType: type
              });
            }
      }
      fetchPosts(true);
    } catch (e) { console.error(e); }
    finally { reactionLockRef.current.delete(lockKey); }
  };

  const onRefresh = useCallback(() => { 
    setRefreshing(true); 
    loadPendingPosts();
if (isOnline) syncPendingPosts();
      fetchPosts(true); 
    }, [selectedZone, sortBy, isOnline, city_id, feedView]);
    useEffect(() => { fetchPosts(); }, [selectedZone, sortBy, city_id, feedView]);

    const [logoClicks, setLogoClicks] = useState(0);

    const handleLogoClick = () => {
        const newClicks = logoClicks + 1;
        setLogoClicks(newClicks);
        if (newClicks >= 15) {
            setLogoClicks(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push("/secret-hippie");
        } else if (newClicks > 5) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const getLocationDisplayText = () => {
        if (feedView === "global") return "Global";
        if (zone_id && zone_name) {
          // Truncate long zone names to prevent header overflow
          return zone_name.length > 20 ? zone_name.substring(0, 18) + '...' : zone_name;
        }
        if (feedView === "city" && city_name && city_name !== "Global") return city_name;
        return savedCity?.name || "Select Location";
      };

    const handleLocationSelect = (view) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFeedView(view);
        if (view === "city" || view === "global") {
          setSelectedZone(null);
          useLocationStore.getState().setZone(null);
        }
        setShowLocationPicker(false);
      };

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
  <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 16 : insets.top + 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity onPress={handleLogoClick} activeOpacity={0.7}>
                    <Image source={require("../../assets/images/icon.png")} style={{ width: 32, height: 32, borderRadius: 10 }} contentFit="contain" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowLocationPicker(true)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                  <Text style={[styles.cityNameText, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{getLocationDisplayText()}</Text>
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
          <View style={styles.headerActions}>
            {isUnlocked && Platform.OS !== 'web' && (
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  toggleHippie(!isHippie);
                }} 
                style={styles.headerIcon}
              >
                <Sparkles color={isHippie ? theme.colors.primary : theme.colors.text} size={24} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowFilterSort(true)} style={styles.headerIcon}>
              <ListFilter color={theme.colors.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.headerIcon}>
              <Bell color={theme.colors.text} size={24} />
              {unreadCount > 0 && <View style={[styles.badge, { backgroundColor: theme.colors.error }]} />}
            </TouchableOpacity>
            {Platform.OS !== 'web' && (
              <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.headerIcon}>
                <Menu color={theme.colors.text} size={24} />
              </TouchableOpacity>
            )}
          </View>
        </View>
  
          <AnimatePresence>
            {showMenu && (
              <View style={styles.dropdownWrapper} pointerEvents="box-none">
                {Platform.OS !== 'web' && (
                  <TouchableOpacity 
                    activeOpacity={1} 
                    style={styles.dropdownOverlay} 
                    onPress={() => setShowMenu(false)} 
                  />
                )}
                <MotiView
                  from={{ translateY: -20, opacity: 0, scale: 0.95 }}
                  animate={{ translateY: 0, opacity: 1, scale: 1 }}
                  exit={{ translateY: -20, opacity: 0, scale: 0.95 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={[
                    styles.menu, 
                      { 
                        top: insets.top + 60,
                        right: 20,
                        backgroundColor: isHippie ? '#1a1a1a' : (Platform.OS === 'web' ? theme.colors.surface : theme.colors.surface + 'CC'), 
                        borderColor: theme.colors.border, 
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 5,
                      }
                  ]}
                >
                  <BlurView intensity={80} tint={isHippie || theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                  <View style={{ padding: 10 }}>
                    <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => useChatStore.getState().open(), 100); }} style={styles.menuItem}><MessageCircle size={20} color={theme.colors.text} /><Text style={styles.menuText}>Chat</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => router.push("/profile"), 100); }} style={styles.menuItem}><User size={20} color={theme.colors.text} /><Text style={styles.menuText}>Profile</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => router.push("/talent"), 100); }} style={styles.menuItem}><Star size={20} color={theme.colors.text} /><Text style={styles.menuText}>Local Talent</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => router.push("/businesses"), 100); }} style={styles.menuItem}><Briefcase size={20} color={theme.colors.text} /><Text style={styles.menuText}>Local Business</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => router.push("/polls"), 100); }} style={styles.menuItem}><Vote size={20} color={theme.colors.text} /><Text style={styles.menuText}>Polls & Features</Text></TouchableOpacity>
                    {isModerator && <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => router.push("/admin-page-gYI"), 100); }} style={styles.menuItem}><Shield size={20} color={theme.colors.error} /><Text style={styles.menuText}>Admin</Text></TouchableOpacity>}
                    <TouchableOpacity onPress={() => { setShowMenu(false); setTimeout(() => router.push("/help"), 100); }} style={styles.menuItem}><Sparkles size={20} color="#FBBF24" /><Text style={styles.menuText}>Towny</Text></TouchableOpacity>
                  </View>
                </MotiView>
              </View>
            )}
          </AnimatePresence>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={14} color="#92400E" />
            <Text style={styles.offlineBannerText}>You're offline</Text>
          </View>
        )}

        {pendingPosts.length > 0 && isOnline && (
          <TouchableOpacity onPress={syncPendingPosts} disabled={syncing} style={styles.syncBanner}>
            {syncing ? (
              <ActivityIndicator size="small" color="#1E40AF" />
            ) : (
              <CloudUpload size={14} color="#1E40AF" />
            )}
            <Text style={styles.syncBannerText}>
              {syncing ? 'Syncing...' : `${pendingPosts.length} pending post(s) - Tap to sync`}
            </Text>
          </TouchableOpacity>
        )}

          <FlatList
            ref={flatListRef}
            data={postsWithAds}
          ListHeaderComponent={
            <View style={{ paddingTop: 12 }}>
              {(Platform.OS !== 'web' || Dimensions.get('window').width < 768) && <StoriesBar />}
              {Platform.OS === 'web' ? <AdBanner width={Dimensions.get('window').width < 768 ? 320 : 728} height={Dimensions.get('window').width < 768 ? 50 : 90} /> : <BannerAd />}
              {isComposerExpanded ? (
                  <View style={[styles.inlineComposerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <PostComposer 
                      isInline={true} 
                      onClose={() => setIsComposerExpanded(false)} 
                      onSuccess={() => {
                        setIsComposerExpanded(false);
                        fetchPosts(true);
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setIsComposerExpanded(true);
                    }}
                    activeOpacity={0.9}
                    style={[styles.compactComposerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <View style={styles.compactPlusCircle}>
                      <Plus size={20} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.compactPlaceholderText, { color: theme.colors.textSecondary }]}>
                      What's happening in your neighborhood?
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          }
            renderItem={({ item }) => (
              <PostItem 
                item={item} 
                deviceId={deviceId} 
                onReaction={handleReaction} 
                user={{ ...user, is_admin: isModerator, is_moderator: isModerator }} 
                onComment={() => fetchPosts(true)} 
                onShare={(p) => shareRef.current?.share(p)} 
                onEdit={(p) => router.push(`/post?id=${p.id}`)}
                onFilterZone={(zoneId) => setSelectedZone(zoneId)}
                onFilterTag={() => {}}
                onModAction={handleModAction}
                isHighlighted={item.isHighlighted}
              />
            )}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
            ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : <View style={styles.empty}><Text style={styles.emptyText}>No posts found</Text></View>}
          />

          <AnimatePresence>
          {showLocationPicker && (
            <View style={styles.dropdownWrapper} pointerEvents="box-none">
              {Platform.OS !== 'web' && (
                <TouchableOpacity 
                  activeOpacity={1} 
                  style={styles.dropdownOverlay} 
                  onPress={() => setShowLocationPicker(false)} 
                />
              )}
                <MotiView
                  from={{ translateY: -20, opacity: 0, scale: 0.95 }}
                  animate={{ translateY: 0, opacity: 1, scale: 1 }}
                  exit={{ translateY: -20, opacity: 0, scale: 0.95 }}
                  transition={{ type: 'timing', duration: 200 }}
                    style={[
                      styles.modalContent, 
                      { 
                        top: insets.top + 60,
                        backgroundColor: isHippie ? '#1a1a1a' : (Platform.OS === 'web' ? theme.colors.background : theme.colors.background),
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 5,
                      }
                    ]}
                >
                  <BlurView intensity={80} tint={isHippie || theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                  <View style={{ padding: 20 }}>
                    <Text style={[styles.modalTitle, isHippie && { color: '#FFF' }]}>Choose Feed</Text>
                    
                    <TouchableOpacity onPress={() => handleLocationSelect("global")} style={[styles.locationOption, feedView === "global" && { backgroundColor: theme.colors.primary + '20' }]}>
                      <View style={styles.locationOptionLeft}>
                        <Globe size={22} color={feedView === "global" ? theme.colors.primary : theme.colors.textSecondary} />
                        <View>
                          <Text style={[styles.locationOptionTitle, { color: theme.colors.text }]}>Global</Text>
                          <Text style={[styles.locationOptionDesc, { color: theme.colors.textSecondary }]}>Posts from everyone worldwide</Text>
                        </View>
                      </View>
                      {feedView === "global" && <Check size={20} color={theme.colors.primary} />}
                    </TouchableOpacity>

                    {savedCity && (
                      <TouchableOpacity onPress={() => handleLocationSelect("city")} style={[styles.locationOption, feedView === "city" && !zone_id && { backgroundColor: theme.colors.primary + '20' }]}>
                        <View style={styles.locationOptionLeft}>
                          <MapPin size={22} color={feedView === "city" && !zone_id ? theme.colors.primary : theme.colors.textSecondary} />
                          <View>
                            <Text style={[styles.locationOptionTitle, { color: theme.colors.text }]}>Your City</Text>
                            <Text style={[styles.locationOptionDesc, { color: theme.colors.textSecondary }]}>{savedCity.name}</Text>
                          </View>
                        </View>
                        {feedView === "city" && !zone_id && <Check size={20} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    )}

                    {savedCity && zones.length > 0 && (
                      <>
                        <Text style={[styles.locationSectionLabel, { color: theme.colors.textSecondary }]}>NEIGHBOURHOODS</Text>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                          {zones.map((zone) => (
                            <TouchableOpacity 
                              key={zone.id} 
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                useLocationStore.getState().setZone(zone);
                                setSelectedZone(zone.id);
                                setShowLocationPicker(false);
                              }} 
                              style={[styles.locationOption, { paddingVertical: 12 }, zone_id === zone.id && { backgroundColor: theme.colors.primary + '20' }]}
                            >
                              <View style={styles.locationOptionLeft}>
                                <Users size={18} color={zone_id === zone.id ? theme.colors.primary : theme.colors.textSecondary} />
                                <Text style={[styles.locationOptionTitle, { color: theme.colors.text, fontSize: 14 }]}>{zone.name}</Text>
                              </View>
                              {zone_id === zone.id && <Check size={18} color={theme.colors.primary} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}

                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 15 }} />

                    <TouchableOpacity onPress={() => { setShowLocationPicker(false); router.push("/onboarding/terms"); }} style={styles.locationOption}>
                      <View style={styles.locationOptionLeft}>
                        <Settings size={22} color={theme.colors.textSecondary} />
                        <View>
                          <Text style={[styles.locationOptionTitle, { color: theme.colors.text }]}>Change City</Text>
                          <Text style={[styles.locationOptionDesc, { color: theme.colors.textSecondary }]}>Select a different town</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowLocationPicker(false)} style={[styles.closeBtn, { backgroundColor: theme.colors.surface, marginTop: 20 }]}>
                      <Text style={[styles.closeBtnText, { color: theme.colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </MotiView>
            </View>
          )}
        </AnimatePresence>

        <NotificationPanel visible={showNotifications} onClose={() => setShowNotifications(false)} />
        <ShareManager ref={shareRef} />

        <AnimatePresence>
          {showFilterSort && (
            <View style={styles.dropdownWrapper} pointerEvents="box-none">
              {Platform.OS !== 'web' && (
                <TouchableOpacity 
                  activeOpacity={1} 
                  style={styles.dropdownOverlay} 
                  onPress={() => setShowFilterSort(false)} 
                />
              )}
                <MotiView
                  from={{ translateY: -100, opacity: 0, scale: 0.9 }}
                  animate={{ translateY: 0, opacity: 1, scale: 1 }}
                  exit={{ translateY: -100, opacity: 0, scale: 0.9 }}
                  transition={{ type: 'timing', duration: 250 }}
                    style={[
                      styles.filterWindow, 
                      { 
                        top: insets.top + 60, 
                        right: 20,
                        backgroundColor: isHippie ? '#1a1a1a' : (Platform.OS === 'web' ? theme.colors.background : theme.colors.background + '80'),
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 5,
                      }
                    ]}
                >
                  <BlurView intensity={80} tint={isHippie || theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                  <View style={{ padding: 20 }}>
                    <Text style={[styles.modalTitle, isHippie && { color: '#FFF' }, { marginBottom: 10 }]}>Filters & Sorting</Text>
                    
                    <Text style={[styles.label, isHippie && { color: '#AAA' }]}>Sort By</Text>
                    <View style={styles.row}>
                      {['newest', 'oldest', 'popular'].map(s => (
                        <TouchableOpacity 
                          key={s} 
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSortBy(s);
                          }} 
                          style={[
                            styles.pill, 
                            isHippie && { backgroundColor: '#333' }, 
                            sortBy === s && { backgroundColor: theme.colors.primary }
                          ]}
                        >
                          <Text style={[styles.pillText, (isHippie || sortBy === s) && { color: sortBy === s ? '#000' : '#FFF' }]}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {feedView !== "global" && (
                      <>
                        <Text style={[styles.label, isHippie && { color: '#AAA' }]}>Zone</Text>
                        <View style={[styles.searchContainer, isHippie && { backgroundColor: '#333' }]}>
                          <Search size={18} color={isHippie ? "#AAA" : "#666"} />
                          <RNTextInput
                            style={[styles.searchInput, isHippie && { color: '#FFF' }]}
                            placeholder="Search neighborhoods..."
                            placeholderTextColor={isHippie ? "#666" : "#999"}
                            value={zoneSearch}
                            onChangeText={setZoneSearch}
                          />
                        </View>
                        <View style={{ maxHeight: 200, marginTop: 10 }}>
                          <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                            <View style={styles.zoneGrid}>
                              <TouchableOpacity 
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setSelectedZone(null);
                                }} 
                                style={[
                                  styles.pill, 
                                  { marginBottom: 8 }, 
                                  isHippie && { backgroundColor: '#333' }, 
                                  !selectedZone && { backgroundColor: theme.colors.primary }
                                ]}
                              >
                                <Text style={[styles.pillText, (isHippie || !selectedZone) && { color: !selectedZone ? '#000' : '#FFF' }]}>All Zones</Text>
                              </TouchableOpacity>
                              {filteredZones.map(z => (
                                <TouchableOpacity 
                                  key={z.id} 
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedZone(z.id);
                                  }} 
                                  style={[
                                    styles.pill, 
                                    { marginBottom: 8 }, 
                                    isHippie && { backgroundColor: '#333' }, 
                                    selectedZone === z.id && { backgroundColor: theme.colors.primary }
                                  ]}
                                >
                                  <Text style={[styles.pillText, (isHippie || selectedZone === z.id) && { color: selectedZone === z.id ? '#000' : '#FFF' }]}>{z.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      </>
                    )}

                    <TouchableOpacity 
                      onPress={() => { 
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowFilterSort(false); 
                        setZoneSearch(""); 
                      }} 
                      style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </MotiView>
            </View>
          )}
        </AnimatePresence>
      </View>
    );
}


  const createStyles = (theme) => StyleSheet.create({
      container: { 
        flex: 1, 
        ...(Platform.OS === 'web' ? {
          width: '100%',
          alignSelf: 'stretch',
          backgroundColor: theme.colors.background,
        } : {})
      },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  logo: { fontSize: 24, fontWeight: 'bold' },
  cityNameText: { fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 15 },
  headerIcon: { position: 'relative' },
  badge: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#FFF' },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: 10, paddingHorizontal: 20 },
  offlineBannerText: { fontSize: 13, color: '#92400E' },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DBEAFE', padding: 10, paddingHorizontal: 20 },
  syncBannerText: { fontSize: 13, color: '#1E40AF' },
  filterBar: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  filterScroll: { paddingHorizontal: 15, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  filterPillActive: { backgroundColor: theme.colors.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' },
  filterPillTextActive: { color: '#000' },
  filterDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
    dropdownWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      ...(Platform.OS === 'web' ? { position: 'fixed', pointerEvents: 'box-none' } : {})
    },
    menu: { 
      position: 'absolute', 
      right: 20, 
      width: 180, 
      borderRadius: 10, 
      zIndex: 1001, 
      borderWidth: 1, 
      elevation: 5,
      ...(Platform.OS === 'web' ? { pointerEvents: 'auto' } : {})
    },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  menuText: { fontSize: 16, color: theme.colors.text },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  expandedComposerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  compactComposerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 10,
  },
  compactComposer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactComposerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  compactComposerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactComposerText: {
    flex: 1,
    fontSize: 15,
  },
  inlineComposerCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    marginTop: 12,
  },
  compactComposerCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactPlusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactPlaceholderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  compactComposerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactComposerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactComposerAvatarEmoji: {
    fontSize: 20,
  },
  compactComposerInfo: {
    flex: 1,
  },
  compactComposerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactComposerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  compactComposerClose: {
    padding: 4,
  },
  compactComposerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  compactComposerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 16,
  },
  toolbarBtn: {
    fontSize: 16,
    paddingHorizontal: 4,
  },
  compactComposerPlaceholder: {
    fontSize: 15,
    marginBottom: 16,
    minHeight: 60,
  },
  compactComposerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  compactComposerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  compactPostBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compactPostBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
    modalOverlay: { 
      flex: 1, 
      backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0,0,0,0.5)', 
      justifyContent: Platform.OS === 'web' ? 'flex-start' : 'flex-end' 
    },
    modalContent: { 
      position: 'absolute',
      left: 20,
      width: 300,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      zIndex: 1001,
      ...(Platform.OS === 'web' ? { pointerEvents: 'auto' } : {})
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
    row: { flexDirection: 'row', gap: 10 },
    pill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EEE' },
    pillText: { fontSize: 14 },
      closeBtn: { marginTop: 30, padding: 15, borderRadius: 10, alignItems: 'center' },
      closeBtnText: { color: '#000', fontWeight: 'bold' },
      searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
      searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 14 },
      zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
      locationOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 8 },
    locationOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
      locationOptionTitle: { fontSize: 16, fontWeight: '600' },
      locationOptionDesc: { fontSize: 13, marginTop: 2 },
      locationSectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 8, marginLeft: 4 },
      dropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0,0,0,0.3)',
      },
    filterWindow: {
      position: 'absolute',
      right: 20,
      width: 320,
      maxWidth: SCREEN_WIDTH - 40,
      borderRadius: 20,
      zIndex: 1001,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      ...(Platform.OS === 'web' ? { pointerEvents: 'auto' } : {})
    },
    applyBtn: {
      marginTop: 20,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
    },
    applyBtnText: {
      color: '#000',
      fontWeight: '700',
      fontSize: 16,
    },
});

