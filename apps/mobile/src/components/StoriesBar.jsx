import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, ScrollView, Image as RNImage, TextInput, ActivityIndicator, FlatList, Linking, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Plus, X, Trash2, AlertTriangle, EyeOff, Type, MoreVertical, Eye, Ban, Music } from 'lucide-react-native';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';
import { useAuthStore } from '../utils/auth';
import { useLocationStore } from '../utils/locationStore';
import { getBlockedUserIds, blockUser } from '../utils/blocking';
import ModerationModal from './ModerationModal';
import StoryModerationModal from './StoryModerationModal';
import { toast } from 'sonner-native';
import SpotifyEmbed, { isValidSpotifyUrl } from './SpotifyEmbed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_SIZE = 68;
const STORY_RING_SIZE = 74;
const DEFAULT_DURATION = 5000;
const MIN_DURATION = 3;
const MAX_DURATION = 15;
const MAX_CAPTION_LENGTH = 150;

export default function StoriesBar({ vertical = false, reversed = false, onModerationRequest = null }) {
  const { theme, isLight } = useTheme();
  const user = useAuthStore(state => state.auth);
  const { city_id, zone_id, feedView } = useLocationStore();

  const [stories, setStories] = useState([]);
  const [groupedStories, setGroupedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  // Caption state
  const [captionInput, setCaptionInput] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [pendingAsset, setPendingAsset] = useState(null);
  const [storySpotifyUrl, setStorySpotifyUrl] = useState('');
  const [storyDuration, setStoryDuration] = useState(5);

  // Mod/delete state
  const [showStoryActions, setShowStoryActions] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [selectedStoryForModeration, setSelectedStoryForModeration] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingModeration, setPendingModeration] = useState(null);

  // Story viewers state
  const [storyViewCount, setStoryViewCount] = useState(0);
  const [storyViewers, setStoryViewers] = useState([]);
  const [showViewersList, setShowViewersList] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [blockConfirmUser, setBlockConfirmUser] = useState(null);

  // Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);

    const viewerGroupIndexRef = useRef(0);
  const viewerStoryIndexRef = useRef(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressTimer = useRef(null);
  const videoRef = useRef(null);

  
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isVideo = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.webm') || lower.includes('video');
  };

  // Fetch stories
  const fetchStories = useCallback(async () => {
    try {
      let query = supabase
        .from('rstories')
        .select('*, user:rusers(id, username, emoji_icon, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (feedView === 'city' && city_id && city_id !== 349) {
        query = query.eq('city_id', city_id);
      } else if (feedView === 'zone' && zone_id) {
        query = query.eq('zone_id', zone_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const blocked = await getBlockedUserIds(user?.id);
      const filtered = (data || []).filter(s => !blocked.includes(s.user_id));
      setStories(filtered);

      // Group by user
      const groups = {};
      filtered.forEach(story => {
        const uid = story.user_id;
        if (!groups[uid]) {
          groups[uid] = {
            user: story.user,
            userId: uid,
            stories: [],
            latestAt: story.created_at,
          };
        }
        groups[uid].stories.push(story);
      });

      const sorted = Object.values(groups).sort((a, b) => {
        if (a.userId === user?.id) return -1;
        if (b.userId === user?.id) return 1;
        return new Date(b.latestAt) - new Date(a.latestAt);
      });

      setGroupedStories(sorted);
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, city_id, zone_id, feedView]);

  const fetchViewedStories = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('rstory_views')
        .select('story_id')
        .eq('viewer_id', user.id);
      setViewedStoryIds(new Set((data || []).map(v => v.story_id)));
    } catch (err) {
      console.error('Error fetching viewed stories:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStories();
    fetchViewedStories();

    const sub = supabase
      .channel('stories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rstories' }, () => {
        fetchStories();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchStories, fetchViewedStories]);

  // Check if user is moderator
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('rusers').select('is_admin, is_moderator').eq('id', user.id).single()
      .then(({ data }) => {
        setIsModerator(!!(data?.is_admin || data?.is_moderator));
      });
  }, [user?.id]);

  const userHasStory = groupedStories.some(g => g.userId === user?.id);

  const isGroupViewed = (group) => {
    return group.stories.every(s => viewedStoryIds.has(s.id));
  };

  // ─── CREATION ───────────────────────────────────────────

  const pickAndUploadMedia = async () => {
    if (!user?.id) {
      toast.error('Sign in to post a story');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setPendingAsset(asset);
    setCaptionInput('');
    setShowCaptionInput(true);
  };

  const postStory = async () => {
    if (!pendingAsset || !user?.id) return;
    const asset = pendingAsset;
    const isVid = asset.type === 'video';

    setShowCaptionInput(false);
    setUploading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const fileExt = asset.uri.split('.').pop() || (isVid ? 'mp4' : 'jpg');
      const fileName = `story_${user.id}_${Date.now()}.${fileExt}`;
      const contentType = isVid ? `video/${fileExt}` : `image/${fileExt}`;
      const arrayBuffer = await (await fetch(asset.uri)).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);

      const { data: newStory } = await supabase.from('rstories').insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: captionInput.trim() || null,
        spotify_url: isValidSpotifyUrl(storySpotifyUrl) ? storySpotifyUrl.trim() : null,
        duration: storyDuration,
        city_id: city_id !== 349 ? city_id : null,
        zone_id: zone_id || null,
      }).select('id').single();

      // Process hashtags for new story
      if (newStory && captionInput.trim()) {
        const { hashtagService } = await import('../utils/hashtagService');
        await hashtagService.processHashtags(newStory.id, 'story', captionInput.trim());
      }

      toast.success('Story posted');
      setCaptionInput('');
      setStorySpotifyUrl('');
      setStoryDuration(5);
      setPendingAsset(null);
      fetchStories();
    } catch (err) {
      console.error('Error creating story:', err);
      toast.error(err?.message || 'Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  // ─── DELETE STORY ──────────────────────────────────────

  const deleteStory = async (storyId) => {
    try {
      const currentGroup = groupedStories[viewerGroupIndex];
      const storyCount = currentGroup?.stories?.length || 0;

      await supabase.from('rstories').delete().eq('id', storyId);
      setShowDeleteConfirm(false);
      setShowStoryActions(false);

      if (storyCount <= 1) {
        // Last story in group — close viewer, then refresh
        closeViewer();
      } else {
        // More stories remain — go to previous index or stay at 0
        const newIdx = viewerStoryIndexRef.current > 0 ? viewerStoryIndexRef.current - 1 : 0;
        setViewerStoryIndex(newIdx);
        viewerStoryIndexRef.current = newIdx;
        startProgress(getStoryDuration(currentViewerStory));
      }

      await fetchStories();
      toast.success('Story deleted');
    } catch (err) {
      console.error('Error deleting story:', err);
      toast.error('Failed to delete story');
    }
  };

  // ─── MOD: BLUR STORY ───────────────────────────────────

  const blurStory = async (storyId, reason) => {
    try {
      await supabase.from('rstories').update({ is_blurred: true, blur_reason: reason }).eq('id', storyId);
      // Log moderation action
      try {
        await supabase.from('rmoderation_logs').insert({
          moderator_id: user?.id,
          target_id: storyId,
          target_type: 'story',
          action: 'blur',
          reason: reason || 'Story blurred by moderator',
        });
      } catch (logErr) {
        console.warn('Failed to log mod action:', logErr);
      }
      toast.success('Story blurred');
      setShowModerationModal(false);
      setShowStoryActions(false);
      fetchStories();
    } catch (err) {
      console.error('Error blurring story:', err);
      toast.error('Failed to blur story');
    }
  };

  const unblurStory = async (storyId) => {
    console.log('=== UNBLUR STORY CALLED ===');
    console.log('storyId:', storyId);
    try {
      console.log('UPDATING DATABASE...');
      await supabase.from('rstories').update({ is_blurred: false, blur_reason: null }).eq('id', storyId);
      console.log('DATABASE UPDATED SUCCESSFULLY');
      try {
        await supabase.from('rmoderation_logs').insert({
          moderator_id: user?.id,
          target_id: storyId,
          target_type: 'story',
          action: 'unblur',
          reason: 'Blur removed by moderator',
        });
      } catch (logErr) {
        console.warn('Failed to log mod action:', logErr);
      }
      toast.success('Blur removed');
      setShowStoryActions(false);
      fetchStories();
    } catch (err) {
      console.error('Error unblurring story:', err);
      toast.error('Failed to remove blur');
    }
  };

  const modDeleteStory = async (storyId) => {
    try {
      const currentGroup = groupedStories[viewerGroupIndex];
      const storyCount = currentGroup?.stories?.length || 0;

      // Log before deleting
      try {
        await supabase.from('rmoderation_logs').insert({
          moderator_id: user?.id,
          target_id: storyId,
          target_type: 'story',
          action: 'delete',
          reason: 'Story deleted by moderator',
        });
      } catch (logErr) {
        console.warn('Failed to log mod action:', logErr);
      }
      await supabase.from('rstories').delete().eq('id', storyId);
      setShowDeleteConfirm(false);
      setShowStoryActions(false);

      if (storyCount <= 1) {
        closeViewer();
      } else {
        const newIdx = viewerStoryIndexRef.current > 0 ? viewerStoryIndexRef.current - 1 : 0;
        setViewerStoryIndex(newIdx);
        viewerStoryIndexRef.current = newIdx;
        startProgress(getStoryDuration(currentViewerStory));
      }

      await fetchStories();
      toast.success('Story deleted by mod');
    } catch (err) {
      console.error('Error deleting story:', err);
      toast.error('Failed to delete story');
    }
  };

  // ─── STORY VIEW COUNT & VIEWERS ────────────────────────

  const fetchStoryViewCount = async (storyId) => {
    if (!storyId) return;
    try {
      const { count, error } = await supabase
        .from('rstory_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);
      if (!error) setStoryViewCount(count || 0);
    } catch (err) {
      console.error('Error fetching view count:', err);
    }
  };

  const fetchStoryViewers = async (storyId) => {
    if (!storyId) return;
    setLoadingViewers(true);
    try {
      const { data, error } = await supabase
        .from('rstory_views')
        .select('*, viewer:rusers!rstory_views_viewer_id_fkey(id, username, emoji_icon, avatar_url)')
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false });
      if (!error) setStoryViewers(data || []);
    } catch (err) {
      console.error('Error fetching viewers:', err);
    } finally {
      setLoadingViewers(false);
    }
  };

  const openViewersList = () => {
    if (!currentViewerStory?.id) return;
    stopProgress();
    fetchStoryViewers(currentViewerStory.id);
    setShowViewersList(true);
  };

  const handleBlockFromStory = async (targetUser) => {
    if (!user?.id || !targetUser?.id) return;
    try {
      await blockUser({
        blockerId: user.id,
        blockedId: targetUser.id,
        source: 'story',
        reason: 'Blocked from story viewers',
      });
      toast.success(`Blocked ${targetUser.username || 'user'}`);
      setBlockConfirmUser(null);
      // Refresh viewers list
      fetchStoryViewers(currentViewerStory?.id);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      toast.error(err?.message || 'Failed to block user');
    }
  };

  // ─── VIEWER ─────────────────────────────────────────────

  const openViewer = (groupIndex) => {
    setViewerGroupIndex(groupIndex);
    viewerGroupIndexRef.current = groupIndex;
    setViewerStoryIndex(0);
    viewerStoryIndexRef.current = 0;
    setViewerVisible(true);
    setShowViewersList(false);
    setBlockConfirmUser(null);
    markAsViewed(groupedStories[groupIndex]?.stories[0]?.id);
    const story = groupedStories[groupIndex]?.stories[0];
    if (!isVideo(story?.image_url)) startProgress(getStoryDuration(story));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Fetch view count for own stories
    if (groupedStories[groupIndex]?.userId === user?.id && story?.id) {
      fetchStoryViewCount(story.id);
    }
  };

  const closeViewer = () => {
    setViewerVisible(false);
    setShowStoryActions(false);
    setShowDeleteConfirm(false);
    setShowViewersList(false);
    setBlockConfirmUser(null);
    stopProgress();
  };

  const startProgress = (duration) => {
    progressAnim.setValue(0);
    stopProgress();
    progressTimer.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    progressTimer.current.start(({ finished }) => {
      if (finished) goNextStory();
    });
  };

  const stopProgress = () => {
    if (progressTimer.current) {
      progressTimer.current.stop();
    }
  };

  const goNextStory = () => {
    const gi = viewerGroupIndexRef.current;
    const si = viewerStoryIndexRef.current;
    const currentGroup = groupedStories[gi];
    if (!currentGroup) { closeViewer(); return; }

    if (si < currentGroup.stories.length - 1) {
      const nextIdx = si + 1;
      setViewerStoryIndex(nextIdx);
      viewerStoryIndexRef.current = nextIdx;
      markAsViewed(currentGroup.stories[nextIdx]?.id);
      const nextStory = currentGroup.stories[nextIdx];
      if (!isVideo(nextStory?.image_url)) startProgress(getStoryDuration(nextStory));
      else stopProgress();
      if (currentGroup.userId === user?.id) fetchStoryViewCount(nextStory?.id);
    } else if (gi < groupedStories.length - 1) {
      const nextGroupIdx = gi + 1;
      setViewerGroupIndex(nextGroupIdx);
      viewerGroupIndexRef.current = nextGroupIdx;
      setViewerStoryIndex(0);
      viewerStoryIndexRef.current = 0;
      markAsViewed(groupedStories[nextGroupIdx]?.stories[0]?.id);
      const nextStory = groupedStories[nextGroupIdx]?.stories[0];
      if (!isVideo(nextStory?.image_url)) startProgress(getStoryDuration(nextStory));
      else stopProgress();
      if (groupedStories[nextGroupIdx]?.userId === user?.id) fetchStoryViewCount(nextStory?.id);
    } else {
      closeViewer();
    }
  };

  const goPrevStory = () => {
    const gi = viewerGroupIndexRef.current;
    const si = viewerStoryIndexRef.current;
    if (si > 0) {
      const prevIdx = si - 1;
      setViewerStoryIndex(prevIdx);
      viewerStoryIndexRef.current = prevIdx;
      const prevStory = groupedStories[gi]?.stories[prevIdx];
      if (!isVideo(prevStory?.image_url)) startProgress(getStoryDuration(prevStory));
      else stopProgress();
      if (groupedStories[gi]?.userId === user?.id) fetchStoryViewCount(prevStory?.id);
    } else if (gi > 0) {
      const prevGroupIdx = gi - 1;
      const prevGroup = groupedStories[prevGroupIdx];
      setViewerGroupIndex(prevGroupIdx);
      viewerGroupIndexRef.current = prevGroupIdx;
      const lastIdx = prevGroup.stories.length - 1;
      setViewerStoryIndex(lastIdx);
      viewerStoryIndexRef.current = lastIdx;
      const prevStory = prevGroup.stories[prevGroup.stories.length - 1];
      if (!isVideo(prevStory?.image_url)) startProgress(getStoryDuration(prevStory));
      else stopProgress();
      if (prevGroup.userId === user?.id) fetchStoryViewCount(prevStory?.id);
    }
  };

  const getStoryDuration = (story) => {
    return (story?.duration || 5) * 1000;
  };

  const handleVideoEnd = () => {
    goNextStory();
  };

  const markAsViewed = async (storyId) => {
    if (!storyId || !user?.id) return;
    if (viewedStoryIds.has(storyId)) return;
    setViewedStoryIds(prev => new Set([...prev, storyId]));
    try {
      await supabase.from('rstory_views').upsert(
        { story_id: storyId, viewer_id: user.id },
        { onConflict: 'story_id,viewer_id' }
      );
    } catch (err) {
      console.error('Error marking story as viewed:', err);
    }
  };

  const handleViewerTap = (evt) => {
    const x = evt.nativeEvent.locationX || evt.nativeEvent.pageX;
    if (x < SCREEN_WIDTH / 3) {
      goPrevStory();
    } else {
      goNextStory();
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  // Current story in viewer
  const currentViewerGroup = groupedStories[viewerGroupIndex];
  const currentViewerStory = currentViewerGroup?.stories[viewerStoryIndex];
  const currentIsVideo = isVideo(currentViewerStory?.image_url);
  const isOwnStory = currentViewerGroup?.userId === user?.id;
  const storyIsBlurred = currentViewerStory?.is_blurred;

  // ─── RENDER ─────────────────────────────────────────────

  if (loading && stories.length === 0) return null;

  // Get the latest story thumbnail for a group (for the circle icon)
  const getGroupThumb = (group) => group.stories[0]?.image_url;

  const isMobileWeb = Platform.OS === 'web' && Dimensions.get('window').width < 768;
  const THUMB = vertical ? 44 : isMobileWeb ? 48 : STORY_SIZE;
  const RING = vertical ? 50 : isMobileWeb ? 54 : STORY_RING_SIZE;

  const renderStoryCircle = (group, isUser = false) => {
    const actualIdx = groupedStories.indexOf(group);
    const viewed = !isUser && isGroupViewed(group);
    const thumb = getGroupThumb(group);
    const hasStory = isUser && userHasStory;

    return (
      <TouchableOpacity
        key={isUser ? 'user-story' : group.userId}
        style={vertical ? styles.storyItemVertical : [styles.storyItem, isMobileWeb && { width: 60 }]}
        onPress={() => {
          if (isUser) {
            if (hasStory) {
              const idx = groupedStories.findIndex(g => g.userId === user?.id);
              if (idx >= 0) openViewer(idx);
            } else {
              pickAndUploadMedia();
            }
          } else {
            openViewer(actualIdx);
          }
        }}
        onLongPress={isUser ? () => pickAndUploadMedia() : undefined}
        activeOpacity={0.7}
      >
        <View style={[{ width: RING, height: RING, borderRadius: RING / 2, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, padding: 2 },
          isUser ? (hasStory ? styles.storyRingActive : styles.storyRingAdd) : (viewed ? styles.storyRingViewed : styles.storyRingActive)
        ]}>
          {isUser && !hasStory ? (
            uploading ? (
              <View style={[{ width: THUMB, height: THUMB, borderRadius: THUMB / 2, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <View style={[{ width: THUMB, height: THUMB, borderRadius: THUMB / 2, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: theme.colors.surface }]}>
                <Plus size={vertical ? 18 : 28} color={theme.colors.textSecondary} />
              </View>
            )
          ) : thumb ? (
            <Image source={{ uri: thumb }} style={{ width: THUMB, height: THUMB, borderRadius: THUMB / 2 }} />
          ) : (
            <View style={[{ width: THUMB, height: THUMB, borderRadius: THUMB / 2, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: theme.colors.surface }]}>
              <Text style={{ fontSize: vertical ? 18 : 28 }}>{(isUser ? user?.emoji_icon : group.user?.emoji_icon) || '👤'}</Text>
            </View>
          )}
        </View>
        {!vertical && (
          <Text style={[styles.storyUsername, { color: isUser ? theme.colors.text : (viewed ? theme.colors.textSecondary : theme.colors.text) }]} numberOfLines={1}>
            {isUser ? (uploading ? 'Posting...' : hasStory ? 'Your story' : 'Add story') : (group.user?.username || 'User')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const friendGroups = groupedStories.filter(g => g.userId !== user?.id);
  const displayFriends = vertical ? friendGroups.slice(0, 6) : friendGroups;

  return (
    <View>
      <ScrollView
        horizontal={!vertical}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={vertical ? styles.scrollContainerVertical : styles.scrollContainer}
        style={vertical ? styles.scrollViewVertical : styles.scrollView}
      >
        {reversed ? (
          <>
            {displayFriends.map(group => renderStoryCircle(group, false))}
            {renderStoryCircle(groupedStories.find(g => g.userId === user?.id) || { userId: user?.id, user, stories: [] }, true)}
          </>
        ) : (
          <>
            {renderStoryCircle(groupedStories.find(g => g.userId === user?.id) || { userId: user?.id, user, stories: [] }, true)}
            {displayFriends.map(group => renderStoryCircle(group, false))}
          </>
        )}
      </ScrollView>

      {/* ─── STORY VIEWER ─────────────────────────────── */}
      <Modal visible={viewerVisible} animationType="fade" transparent={Platform.OS === 'web'}>
        <View style={[styles.viewerContainer, Platform.OS === 'web' && styles.viewerContainerWeb]}>
          {currentViewerStory && (
            <View style={{ flex: 1 }}>
              {/* Media (non-interactive) */}
              {currentIsVideo ? (
                <Video
                  ref={videoRef}
                  source={{ uri: currentViewerStory.image_url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping={false}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.didJustFinish) handleVideoEnd();
                  }}
                />
              ) : (
                <Image
                  source={{ uri: currentViewerStory.image_url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                />
              )}

              {/* Blur overlay */}
              {storyIsBlurred && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }]}>
                  <TouchableOpacity 
                    style={{ justifyContent: 'center', alignItems: 'center', marginTop: -100 }}
                    onPress={() => setShowStoryActions(true)}
                    activeOpacity={1}
                  >
                  <AlertTriangle size={40} color="#F59E0B" />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12 }}>Content Warning</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                    {(() => {
                      try {
                        const reasonData = JSON.parse(currentViewerStory.blur_reason);
                        const violations = reasonData.violations || [];
                        return violations.length > 0 ? violations[0].label : 'This story has been flagged by a moderator.';
                      } catch (e) {
                        return 'This story has been flagged by a moderator.';
                      }
                    })()}
                  </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Dim overlay */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} pointerEvents="none" />

              {/* Progress bars */}
              <View style={[styles.progressContainer, { paddingTop: Platform.OS === 'web' ? 16 : 50 }]} pointerEvents="none">
                {currentViewerGroup.stories.map((s, i) => (
                  <View key={s.id} style={styles.progressBarBg}>
                    {currentIsVideo && i === viewerStoryIndex ? (
                      <View style={[styles.progressBarFill, { width: '100%', opacity: 0.5 }]} />
                    ) : (
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            width: i < viewerStoryIndex ? '100%' :
                              i === viewerStoryIndex ? progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              }) : '0%',
                          },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>

              {/* User info + action buttons */}
              <View style={[styles.viewerHeader, { top: Platform.OS === 'web' ? 30 : 60 }]}>
                <View style={styles.viewerUserInfo}>
                  {currentViewerGroup.user?.avatar_url ? (
                    <Image source={{ uri: currentViewerGroup.user.avatar_url }} style={styles.viewerAvatar} />
                  ) : (
                    <Text style={styles.viewerEmojiAvatar}>{currentViewerGroup.user?.emoji_icon || '👤'}</Text>
                  )}
                  <Text style={styles.viewerUsername}>{currentViewerGroup.user?.username || 'User'}</Text>
                  <Text style={styles.viewerTime}>{getTimeAgo(currentViewerStory.created_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {(isOwnStory || isModerator) && (
                    <TouchableOpacity onPress={() => { stopProgress(); setShowStoryActions(true); }} style={styles.viewerCloseBtn}>
                      <MoreVertical size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={closeViewer} style={styles.viewerCloseBtn}>
                    <X size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Unblur button for mods */}
              {storyIsBlurred && isModerator && (
                <View style={{ position: 'absolute', bottom: '40%', alignSelf: 'center', zIndex: 30 }}>
                  <TouchableOpacity 
                    onPress={() => { 
                      console.log('=== OVERLAY REMOVE BLUR CLICKED ===');
                      console.log('currentViewerStory.id:', currentViewerStory?.id);
                      unblurStory(currentViewerStory?.id);
                    }} 
                    style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, zIndex: 30 }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Remove Blur (Mod)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Caption */}
              {currentViewerStory.caption && !storyIsBlurred && (
                <View style={styles.captionContainer} pointerEvents="none">
                  <Text style={styles.captionText}>{currentViewerStory.caption}</Text>
                </View>
              )}

              {/* Spotify embed */}
              {currentViewerStory.spotify_url && !storyIsBlurred && (
                <View style={{ position: 'absolute', bottom: Platform.OS === 'web' ? 80 : 100, left: 16, right: 16, zIndex: 15 }}>
                  <SpotifyEmbed url={currentViewerStory.spotify_url} compact />
                </View>
              )}

              {/* View count (own stories only) */}
              {isOwnStory && !showViewersList && !showStoryActions && !showDeleteConfirm && (
                <TouchableOpacity 
                  onPress={openViewersList} 
                  style={{ position: 'absolute', bottom: Platform.OS === 'web' ? 16 : 40, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}
                >
                  <Eye size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>{storyViewCount}</Text>
                </TouchableOpacity>
              )}

              {/* Left/right tap zones for prev/next — rendered after overlays so taps work */}
              {!showViewersList && !showStoryActions && !showDeleteConfirm && (
                <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', zIndex: 5 }]} pointerEvents="box-none">
                  <TouchableOpacity activeOpacity={1} onPress={goPrevStory} style={{ flex: 1 }} />
                  <TouchableOpacity activeOpacity={1} onPress={goNextStory} style={{ flex: 2 }} />
                </View>
              )}

              {/* ─── VIEWERS LIST (inside viewer modal) ─── */}
              {showViewersList && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                  <TouchableOpacity activeOpacity={1} onPress={() => { setShowViewersList(false); setBlockConfirmUser(null); startProgress(getStoryDuration(currentViewerStory)); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                  <View style={[styles.actionSheet, { backgroundColor: theme.colors.surface, maxHeight: '60%' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Eye size={18} color={theme.colors.text} />
                        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>Viewed by {storyViewCount}</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setShowViewersList(false); setBlockConfirmUser(null); startProgress(getStoryDuration(currentViewerStory)); }}>
                        <X size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {loadingViewers ? (
                      <ActivityIndicator style={{ padding: 30 }} color={theme.colors.primary} />
                    ) : storyViewers.length === 0 ? (
                      <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: 30, fontSize: 14 }}>No views yet</Text>
                    ) : (
                      <FlatList
                        data={storyViewers}
                        keyExtractor={(item) => item.id?.toString() || item.viewer_id}
                        renderItem={({ item }) => (
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
                            {item.viewer?.avatar_url ? (
                              <Image source={{ uri: item.viewer.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} />
                            ) : (
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                <Text style={{ fontSize: 18 }}>{item.viewer?.emoji_icon || '👤'}</Text>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{item.viewer?.username || 'Unknown'}</Text>
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>{getTimeAgo(item.viewed_at)}</Text>
                            </View>
                            {item.viewer_id !== user?.id && (
                              <TouchableOpacity 
                                onPress={() => setBlockConfirmUser(item.viewer)} 
                                style={{ padding: 8 }}
                              >
                                <Ban size={16} color={theme.colors.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      />
                    )}
                  </View>

                  {/* Block confirm inline */}
                  {blockConfirmUser && (
                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                      <TouchableOpacity activeOpacity={1} onPress={() => setBlockConfirmUser(null)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                      <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, width: '80%', maxWidth: 300 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Block {blockConfirmUser.username}?</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 20 }}>They won't be able to see your stories or posts, and you won't see theirs.</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity 
                            onPress={() => setBlockConfirmUser(null)} 
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                          >
                            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleBlockFromStory(blockConfirmUser)} 
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.error, alignItems: 'center' }}
                          >
                            <Text style={{ color: '#FFF', fontWeight: '600' }}>Block</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ─── INLINE ACTION SHEET (inside viewer modal) ─── */}
              {showStoryActions && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                  <TouchableOpacity activeOpacity={1} onPress={() => { setShowStoryActions(false); startProgress(getStoryDuration(currentViewerStory)); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                  <View style={[styles.actionSheet, { backgroundColor: theme.colors.surface }]}>
                    {isOwnStory && (
                      <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowDeleteConfirm(true); }}>
                        <Trash2 size={20} color={theme.colors.error} />
                        <Text style={[styles.actionItemText, { color: theme.colors.error }]}>Delete Story</Text>
                      </TouchableOpacity>
                    )}
                    {isModerator && !isOwnStory && (
                      <>
                        {!storyIsBlurred ? (
                          <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== BLUR BUTTON PRESSED ===');
                                  console.log('onModerationRequest:', onModerationRequest);
                                  console.log('currentViewerStory:', currentViewerStory);
                                  // Close stories and request moderation modal
                                  closeViewer(); // Close everything properly
                                  if (onModerationRequest) {
                                    console.log('CALLING onModerationRequest');
                                    onModerationRequest({
                                      type: 'story',
                                      id: currentViewerStory?.id,
                                      name: `Story by ${currentViewerStory?.user?.username || 'User'}`
                                    });
                                  } else {
                                    console.log('NO onModerationRequest CALLBACK');
                                  }
                                }}>
                                <EyeOff size={20} color="#F59E0B" />
                                <Text style={[styles.actionItemText, { color: '#F59E0B' }]}>BLUR STORY 2025</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== REMOVE BLUR CLICKED ===');
                                  console.log('currentViewerStory?.id:', currentViewerStory?.id);
                                  unblurStory(currentViewerStory?.id);
                                }}>
                                <EyeOff size={20} color="#10B981" />
                                <Text style={[styles.actionItemText, { color: '#10B981' }]}>Remove Blur</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowDeleteConfirm(true); }}>
                              <Trash2 size={20} color={theme.colors.error} />
                              <Text style={[styles.actionItemText, { color: theme.colors.error }]}>Delete Story (Mod)</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {isModerator && isOwnStory && (
                          <>
                            {!storyIsBlurred ? (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== BLUR BUTTON PRESSED ===');
                                  console.log('onModerationRequest:', onModerationRequest);
                                  console.log('currentViewerStory:', currentViewerStory);
                                  // Close stories and request moderation modal
                                  closeViewer(); // Close everything properly
                                  if (onModerationRequest) {
                                    console.log('CALLING onModerationRequest');
                                    onModerationRequest({
                                      type: 'story',
                                      id: currentViewerStory?.id,
                                      name: `Story by ${currentViewerStory?.user?.username || 'User'}`
                                    });
                                  } else {
                                    console.log('NO onModerationRequest CALLBACK');
                                  }
                                }}>
                                <EyeOff size={20} color="#F59E0B" />
                                <Text style={[styles.actionItemText, { color: '#F59E0B' }]}>BLUR STORY 2025</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== REMOVE BLUR CLICKED ===');
                                  console.log('currentViewerStory?.id:', currentViewerStory?.id);
                                  unblurStory(currentViewerStory?.id);
                                }}>
                                <EyeOff size={20} color="#10B981" />
                                <Text style={[styles.actionItemText, { color: '#10B981' }]}>Remove Blur</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                    <TouchableOpacity style={[styles.actionItem, { borderTopWidth: 1, borderTopColor: theme.colors.border }]} onPress={() => { setShowStoryActions(false); startProgress(getStoryDuration(currentViewerStory)); }}>
                      <Text style={[styles.actionItemText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ─── INLINE DELETE CONFIRM (inside viewer modal) ─── */}
              {showDeleteConfirm && (
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                  <TouchableOpacity activeOpacity={1} onPress={() => setShowDeleteConfirm(false)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                  <View style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Delete Story?</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 20 }}>This can't be undone.</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity 
                        onPress={() => setShowDeleteConfirm(false)} 
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                      >
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => isOwnStory ? deleteStory(currentViewerStory?.id) : modDeleteStory(currentViewerStory?.id)} 
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.error, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

                          </View>
          )}
        </View>
      </Modal>

      {/* ─── STORY PREVIEW + CAPTION OVERLAY ────────── */}
      <Modal visible={showCaptionInput} animationType="fade" transparent={Platform.OS === 'web'}>
        <View style={[styles.viewerContainer, Platform.OS === 'web' && styles.viewerContainerWeb]}>
          {pendingAsset && (
            <>
              {/* Full-screen media preview */}
              {pendingAsset.type === 'video' ? (
                <Video
                  source={{ uri: pendingAsset.uri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                />
              ) : (
                <Image
                  source={{ uri: pendingAsset.uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

              {/* Top bar: close + post */}
              <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 16 : 54, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
                <TouchableOpacity onPress={() => { setShowCaptionInput(false); setPendingAsset(null); setCaptionInput(''); setStorySpotifyUrl(''); setStoryDuration(5); }} style={styles.viewerCloseBtn}>
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={postStory} 
                  style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Post</Text>
                </TouchableOpacity>
              </View>

              {/* Duration selector */}
              <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 70 : 110, left: 16, right: 16, zIndex: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600', marginRight: 10 }}>⏱ {storyDuration}s</Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {[3, 5, 7, 10, 15].map(d => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setStoryDuration(d)}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: storyDuration === d ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <Text style={{ color: storyDuration === d ? '#FFF' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' }}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Caption input overlaid on media */}
              <View style={{ position: 'absolute', bottom: Platform.OS === 'web' ? 30 : 50, left: 16, right: 16, zIndex: 20 }}>
                {captionInput.length > 0 && (
                  <View style={styles.captionPreviewBubble} pointerEvents="none">
                    <Text style={styles.captionText}>{captionInput}</Text>
                  </View>
                )}
                <View style={styles.captionInputRow}>
                  <TextInput
                    value={captionInput}
                    onChangeText={(t) => setCaptionInput(t.slice(0, MAX_CAPTION_LENGTH))}
                    placeholder="Add a caption..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.captionOverlayInput}
                    multiline
                    maxLength={MAX_CAPTION_LENGTH}
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>{captionInput.length}/{MAX_CAPTION_LENGTH}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Music size={16} color="#1DB954" style={{ marginRight: 8 }} />
                  <TextInput
                    value={storySpotifyUrl}
                    onChangeText={setStorySpotifyUrl}
                    placeholder="Paste Spotify link (optional)"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={{ flex: 1, color: '#FFF', fontSize: 13 }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {isValidSpotifyUrl(storySpotifyUrl) && (
                  <SpotifyEmbed url={storySpotifyUrl} compact style={{ marginTop: 8 }} />
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

    </View>
  );

  // This is the actual return statement that gets rendered
  return (
    <>
      <View>
        <ScrollView
          horizontal={!vertical}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={vertical ? styles.scrollContainerVertical : styles.scrollContainer}
          style={vertical ? styles.scrollViewVertical : styles.scrollView}
        >
          {reversed ? (
            <>
              {displayFriends.map(group => renderStoryCircle(group, false))}
              {renderStoryCircle(groupedStories.find(g => g.userId === user?.id) || { userId: user?.id, user, stories: [] }, true)}
            </>
          ) : (
            <>
              {renderStoryCircle(groupedStories.find(g => g.userId === user?.id) || { userId: user?.id, user, stories: [] }, true)}
              {displayFriends.map(group => renderStoryCircle(group, false))}
            </>
          )}
        </ScrollView>

        {/* ─── STORY VIEWER ─────────────────────────────── */}
        <Modal visible={viewerVisible} animationType="fade" transparent={Platform.OS === 'web'}>
          <View style={[styles.viewerContainer, Platform.OS === 'web' && styles.viewerContainerWeb]}>
            {currentViewerStory && (
              <View style={{ flex: 1 }}>
                {/* Media (non-interactive) */}
                {currentIsVideo ? (
                  <Video
                    ref={videoRef}
                    source={{ uri: currentViewerStory.image_url }}
                    style={[styles.viewerImage, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={currentViewerStory?.id === currentViewerStory?.id && !storyIsBlurred}
                    isLooping
                    isMuted={isMuted}
                    onPlaybackStatusUpdate={handleVideoEnd}
                  />
                ) : (
                  <Image
                    source={{ uri: currentViewerStory.image_url }}
                    style={[styles.viewerImage, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
                    contentFit="cover"
                  />
                )}

                {/* Text overlay */}
                {currentViewerStory.text && (
                  <View style={styles.textOverlay}>
                    <Text style={[styles.storyText, { color: '#FFF' }]}>{currentViewerStory.text}</Text>
                  </View>
                )}

                {/* Story blur overlay */}
                {storyIsBlurred && (
                  <View style={styles.blurOverlay}>
                    <EyeOff size={24} color="#FFF" />
                    <Text style={styles.blurTextContent}>
                      {(() => {
                        try {
                          const reasonData = JSON.parse(currentViewerStory.blur_reason);
                          const violations = reasonData.violations || [];
                          const customReason = reasonData.custom_reason;
                          const moderatorName = reasonData.moderator_username || 'Moderator';
                          const timestamp = new Date(reasonData.timestamp).toLocaleDateString();
                          
                          let text = `STORY MODERATED\n\nBy: ${moderatorName} • ${timestamp}`;
                          
                          if (violations.length > 0) {
                            text += `\nViolations: ${violations.map(v => v.label).join(', ')}`;
                          }
                          
                          if (customReason) {
                            text += `\nNote: ${customReason}`;
                          }
                          
                          return text;
                        } catch (e) {
                          // Fallback for old format
                          return `Story blurred: ${currentViewerStory.blur_reason}`;
                        }
                      })()}
                    </Text>
                    <TouchableOpacity 
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        // Show detailed moderation info
                        Alert.alert(
                          'Moderation Details',
                          `This story was moderated for violations of the Terms of Service.\n\nModerator: ${(() => {
                            try {
                              const reasonData = JSON.parse(currentViewerStory.blur_reason);
                              return reasonData.moderator_username || 'Moderator';
                            } catch (e) {
                              return 'Moderator';
                            }
                          })()}\nDate: ${(() => {
                            try {
                              const reasonData = JSON.parse(currentViewerStory.blur_reason);
                              return new Date(reasonData.timestamp).toLocaleString();
                            } catch (e) {
                              return 'Unknown';
                            }
                          })()}\n\nViolations:\n${(() => {
                            try {
                              const reasonData = JSON.parse(currentViewerStory.blur_reason);
                              return reasonData.violations.map(v => `• ${v.label}`).join('\n');
                            } catch (e) {
                              return currentViewerStory.blur_reason;
                            }
                          })()}`,
                          [{ text: 'OK', style: 'default' }]
                        );
                      }}
                      delayLongPress={500}
                    >
                      <Text style={styles.tapToRevealText}>Tap to reveal • Long press for details</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Progress bar */}
                <View style={[styles.progressBarContainer, { bottom: Platform.OS === 'web' ? 20 : 34 }]}>
                  <Animated.View style={[styles.progressBar, { width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp'
                  })}]} />
                </View>

                {/* Story actions */}
                <TouchableOpacity
                  style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
                  activeOpacity={1}
                  onPress={() => setShowStoryActions(!showStoryActions)}
                />

                {/* Story actions overlay */}
                {showStoryActions && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', zIndex: 20 }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowStoryActions(false); setShowDeleteConfirm(false); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20 }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, zIndex: 21 }]}>
                      <View style={[styles.actionSheet, { padding: 20 }]}>
                        {isOwnStory && (
                          <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowDeleteConfirm(true); }}>
                            <Trash2 size={20} color={theme.colors.error} />
                            <Text style={[styles.actionItemText, { color: theme.colors.error }]}>Delete Story</Text>
                          </TouchableOpacity>
                        )}
                        {isModerator && !isOwnStory && (
                          <>
                            {!storyIsBlurred ? (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== BLUR BUTTON PRESSED ===');
                                  console.log('onModerationRequest:', onModerationRequest);
                                  console.log('currentViewerStory:', currentViewerStory);
                                  // Close stories and request moderation modal
                                  closeViewer(); // Close everything properly
                                  if (onModerationRequest) {
                                    console.log('CALLING onModerationRequest');
                                    onModerationRequest({
                                      type: 'story',
                                      id: currentViewerStory?.id,
                                      name: `Story by ${currentViewerStory?.user?.username || 'User'}`
                                    });
                                  } else {
                                    console.log('NO onModerationRequest CALLBACK');
                                  }
                                }}>
                                <EyeOff size={20} color="#F59E0B" />
                                <Text style={[styles.actionItemText, { color: '#F59E0B' }]}>BLUR STORY 2025</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== REMOVE BLUR CLICKED ===');
                                  console.log('currentViewerStory?.id:', currentViewerStory?.id);
                                  unblurStory(currentViewerStory?.id);
                                }}>
                                <EyeOff size={20} color="#10B981" />
                                <Text style={[styles.actionItemText, { color: '#10B981' }]}>Remove Blur</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowDeleteConfirm(true); }}>
                              <Trash2 size={20} color={theme.colors.error} />
                              <Text style={[styles.actionItemText, { color: theme.colors.error }]}>Delete Story (Mod)</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {isModerator && isOwnStory && (
                          <>
                            {!storyIsBlurred ? (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== BLUR BUTTON PRESSED ===');
                                  console.log('onModerationRequest:', onModerationRequest);
                                  console.log('currentViewerStory:', currentViewerStory);
                                  // Close stories and request moderation modal
                                  closeViewer(); // Close everything properly
                                  if (onModerationRequest) {
                                    console.log('CALLING onModerationRequest');
                                    onModerationRequest({
                                      type: 'story',
                                      id: currentViewerStory?.id,
                                      name: `Story by ${currentViewerStory?.user?.username || 'User'}`
                                    });
                                  } else {
                                    console.log('NO onModerationRequest CALLBACK');
                                  }
                                }}>
                                <EyeOff size={20} color="#F59E0B" />
                                <Text style={[styles.actionItemText, { color: '#F59E0B' }]}>BLUR STORY 2025</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={styles.actionItem} onPress={() => { 
                                  console.log('=== REMOVE BLUR CLICKED ===');
                                  console.log('currentViewerStory?.id:', currentViewerStory?.id);
                                  unblurStory(currentViewerStory?.id);
                                }}>
                                <EyeOff size={20} color="#10B981" />
                                <Text style={[styles.actionItemText, { color: '#10B981' }]}>Remove Blur</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                        <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowViewersList(false); }}>
                          <Eye size={20} color={theme.colors.text} />
                          <Text style={styles.actionItemText}>Viewers ({storyViewCount})</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Viewers list */}
                {showViewersList && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowViewersList(false); setBlockConfirmUser(null); startProgress(getStoryDuration(currentViewerStory)); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>Story Viewers</Text>
                        <TouchableOpacity onPress={() => { setShowViewersList(false); setBlockConfirmUser(null); startProgress(getStoryDuration(currentViewerStory)); }}>
                          <X size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                        {loadingViewers ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          storyViewers.length > 0 ? (
                            storyViewers.map((viewer, index) => (
                              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                <Image source={{ uri: viewer.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{viewer.username}</Text>
                                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{getTimeAgo(viewer.viewed_at)}</Text>
                                </View>
                                {isModerator && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      setBlockConfirmUser(viewer);
                                    }}
                                    style={{ padding: 4, backgroundColor: theme.colors.error + '20', borderRadius: 4 }}
                                  >
                                    <Ban size={12} color={theme.colors.error} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))
                          ) : (
                            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No viewers yet</Text>
                        ))}
                      </ScrollView>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowDeleteConfirm(false); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Delete Story?</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>This action cannot be undone. The story will be permanently removed.</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity 
                          onPress={() => { setShowDeleteConfirm(false); }} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => isOwnStory ? deleteStory(currentViewerStory?.id) : modDeleteStory(currentViewerStory?.id)} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.error, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '600' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Caption input overlay */}
                {showCaptionInput && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowCaptionInput(false); setCaptionInput(''); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Add Caption</Text>
                      <TextInput
                        value={captionInput}
                        onChangeText={setCaptionInput}
                        placeholder="What's happening in this story?"
                        placeholderTextColor={theme.colors.textSecondary}
                        style={{ backgroundColor: theme.colors.background, color: theme.colors.text, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border }}
                        multiline
                        maxLength={MAX_CAPTION_LENGTH}
                      />
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity 
                          onPress={() => { setShowCaptionInput(false); setCaptionInput(''); }} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => addCaptionToStory(currentViewerStory?.id)} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#000', fontWeight: '600' }}>Add Caption</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* View count (own stories only) */}
                {isOwnStory && !showViewersList && !showStoryActions && !showDeleteConfirm && (
                  <TouchableOpacity 
                    onPress={openViewersList} 
                    style={{ position: 'absolute', bottom: Platform.OS === 'web' ? 16 : 40, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}
                  >
                    <Eye size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>{storyViewCount}</Text>
                  </TouchableOpacity>
                )}

                {/* Left/right tap zones for prev/next — rendered after overlays so taps work */}
                {!showViewersList && !showStoryActions && !showDeleteConfirm && (
                  <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', zIndex: 5 }]} pointerEvents="box-none">
                    <TouchableOpacity activeOpacity={1} onPress={goPrevStory} style={{ flex: 1 }} />
                    <TouchableOpacity activeOpacity={1} onPress={goNextStory} style={{ flex: 2 }} />
                  </View>
                )}

                {/* ─── VIEWERS LIST (inside viewer modal) ─── */}
                {showViewersList && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowViewersList(false); setBlockConfirmUser(null); startProgress(getStoryDuration(currentViewerStory)); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>Story Viewers</Text>
                        <TouchableOpacity onPress={() => { setShowViewersList(false); setBlockConfirmUser(null); startProgress(getStoryDuration(currentViewerStory)); }}>
                          <X size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                        {loadingViewers ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          storyViewers.length > 0 ? (
                            storyViewers.map((viewer, index) => (
                              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                <Image source={{ uri: viewer.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{viewer.username}</Text>
                                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{getTimeAgo(viewer.viewed_at)}</Text>
                                </View>
                                {isModerator && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      setBlockConfirmUser(viewer);
                                    }}
                                    style={{ padding: 4, backgroundColor: theme.colors.error + '20', borderRadius: 4 }}
                                  >
                                    <Ban size={12} color={theme.colors.error} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))
                          ) : (
                            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No viewers yet</Text>
                        ))}
                      </ScrollView>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowDeleteConfirm(false); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Delete Story?</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>This action cannot be undone. The story will be permanently removed.</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity 
                          onPress={() => { setShowDeleteConfirm(false); }} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => isOwnStory ? deleteStory(currentViewerStory?.id) : modDeleteStory(currentViewerStory?.id)} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.error, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '600' }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Caption input overlay */}
                {showCaptionInput && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { setShowCaptionInput(false); setCaptionInput(''); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                    <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
                      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Add Caption</Text>
                      <TextInput
                        value={captionInput}
                        onChangeText={setCaptionInput}
                        placeholder="What's happening in this story?"
                        placeholderTextColor={theme.colors.textSecondary}
                        style={{ backgroundColor: theme.colors.background, color: theme.colors.text, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border }}
                        multiline
                        maxLength={MAX_CAPTION_LENGTH}
                      />
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity 
                          onPress={() => { setShowCaptionInput(false); setCaptionInput(''); }} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => addCaptionToStory(currentViewerStory?.id)} 
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#000', fontWeight: '600' }}>Add Caption</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </Modal>
      </View>

      {/* Story Moderation Modal */}
      <StoryModerationModal
        visible={showModerationModal}
        onClose={() => {
          setShowModerationModal(false);
          setPendingModeration(null);
        }}
        storyData={pendingModeration}
      />
    </>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    scrollView: {
      marginBottom: 8,
    },
    scrollViewVertical: {
      flex: 1,
    },
    scrollContainer: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 12,
    },
    scrollContainerVertical: {
      paddingVertical: 8,
      paddingHorizontal: 4,
      gap: 12,
      alignItems: 'center',
    },
    storyItem: {
      alignItems: 'center',
      width: 76,
    },
    storyItemVertical: {
      alignItems: 'center',
    },
    storyRing: {
      width: STORY_RING_SIZE,
      height: STORY_RING_SIZE,
      borderRadius: STORY_RING_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2.5,
      padding: 2,
    },
    storyRingActive: {
      borderColor: '#e94560',
    },
    storyRingViewed: {
      borderColor: '#22C55E',
    },
    storyRingAdd: {
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    storyThumb: {
      width: STORY_SIZE,
      height: STORY_SIZE,
      borderRadius: STORY_SIZE / 2,
    },
    storyThumbPlaceholder: {
      width: STORY_SIZE,
      height: STORY_SIZE,
      borderRadius: STORY_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    storyEmoji: {
      fontSize: 28,
    },
    storyUsername: {
      fontSize: 11,
      marginTop: 4,
      textAlign: 'center',
      fontWeight: '500',
    },

    // Viewer
    viewerContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    viewerContainerWeb: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
    },
    viewerTouchable: {
      flex: 1,
      justifyContent: 'center',
    },
    progressContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      paddingHorizontal: 8,
      gap: 4,
      zIndex: 10,
    },
    progressBarBg: {
      flex: 1,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#FFF',
      borderRadius: 2,
    },
    viewerHeader: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      zIndex: 10,
    },
    viewerUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    viewerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    viewerEmojiAvatar: {
      fontSize: 24,
    },
    viewerUsername: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    viewerTime: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
    },
    viewerCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Caption display (viewer)
    captionContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'web' ? 30 : 60,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      zIndex: 10,
    },
    captionText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '500',
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      overflow: 'hidden',
    },

    // Caption creation (preview screen)
    captionPreviewBubble: {
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 10,
      alignSelf: 'center',
      maxWidth: '90%',
    },
    captionInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
    },
    captionOverlayInput: {
      flex: 1,
      color: '#FFF',
      fontSize: 15,
      fontWeight: '500',
      maxHeight: 80,
      paddingVertical: 0,
    },

    // Action modals
    actionOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    actionSheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Platform.OS === 'web' ? 20 : 34,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    actionItemText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
