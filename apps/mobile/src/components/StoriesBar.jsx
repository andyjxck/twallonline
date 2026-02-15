import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Animated,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Plus, X, Trash2, AlertTriangle, EyeOff, Type, MoreVertical } from 'lucide-react-native';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';
import { useAuthStore } from '../utils/auth';
import { useLocationStore } from '../utils/locationStore';
import { getBlockedUserIds } from '../utils/blocking';
import { toast } from 'sonner-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_SIZE = 68;
const STORY_RING_SIZE = 74;
const IMAGE_DURATION = 5000;
const MAX_CAPTION_LENGTH = 150;

export default function StoriesBar({ vertical = false, reversed = false }) {
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

  // Mod/delete state
  const [showStoryActions, setShowStoryActions] = useState(false);
  const [showBlurModal, setShowBlurModal] = useState(false);
  const [blurReasonInput, setBlurReasonInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);
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

      const { error } = await supabase.from('rstories').insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: captionInput.trim() || null,
        city_id: city_id !== 349 ? city_id : null,
        zone_id: zone_id || null,
      });

      if (error) throw error;

      toast.success('Story posted');
      setCaptionInput('');
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
      await supabase.from('rstories').delete().eq('id', storyId);
      toast.success('Story deleted');
      setShowDeleteConfirm(false);
      setShowStoryActions(false);
      // If this was the last story in the group, close viewer
      const currentGroup = groupedStories[viewerGroupIndex];
      if (currentGroup && currentGroup.stories.length <= 1) {
        closeViewer();
      } else {
        goNextStory();
      }
      fetchStories();
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
      setShowBlurModal(false);
      setBlurReasonInput('');
      setShowStoryActions(false);
      fetchStories();
    } catch (err) {
      console.error('Error blurring story:', err);
      toast.error('Failed to blur story');
    }
  };

  const unblurStory = async (storyId) => {
    try {
      await supabase.from('rstories').update({ is_blurred: false, blur_reason: null }).eq('id', storyId);
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
      toast.success('Story deleted by mod');
      setShowDeleteConfirm(false);
      setShowStoryActions(false);
      const currentGroup = groupedStories[viewerGroupIndex];
      if (currentGroup && currentGroup.stories.length <= 1) {
        closeViewer();
      } else {
        goNextStory();
      }
      fetchStories();
    } catch (err) {
      console.error('Error deleting story:', err);
      toast.error('Failed to delete story');
    }
  };

  // ─── VIEWER ─────────────────────────────────────────────

  const openViewer = (groupIndex) => {
    setViewerGroupIndex(groupIndex);
    setViewerStoryIndex(0);
    setViewerVisible(true);
    markAsViewed(groupedStories[groupIndex]?.stories[0]?.id);
    const story = groupedStories[groupIndex]?.stories[0];
    if (!isVideo(story?.image_url)) startProgress(IMAGE_DURATION);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeViewer = () => {
    setViewerVisible(false);
    setShowStoryActions(false);
    setShowDeleteConfirm(false);
    setShowBlurModal(false);
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
    const currentGroup = groupedStories[viewerGroupIndex];
    if (!currentGroup) { closeViewer(); return; }

    if (viewerStoryIndex < currentGroup.stories.length - 1) {
      const nextIdx = viewerStoryIndex + 1;
      setViewerStoryIndex(nextIdx);
      markAsViewed(currentGroup.stories[nextIdx]?.id);
      const nextStory = currentGroup.stories[nextIdx];
      if (!isVideo(nextStory?.image_url)) startProgress(IMAGE_DURATION);
      else stopProgress();
    } else if (viewerGroupIndex < groupedStories.length - 1) {
      const nextGroupIdx = viewerGroupIndex + 1;
      setViewerGroupIndex(nextGroupIdx);
      setViewerStoryIndex(0);
      markAsViewed(groupedStories[nextGroupIdx]?.stories[0]?.id);
      const nextStory = groupedStories[nextGroupIdx]?.stories[0];
      if (!isVideo(nextStory?.image_url)) startProgress(IMAGE_DURATION);
      else stopProgress();
    } else {
      closeViewer();
    }
  };

  const goPrevStory = () => {
    if (viewerStoryIndex > 0) {
      const prevIdx = viewerStoryIndex - 1;
      setViewerStoryIndex(prevIdx);
      const prevStory = groupedStories[viewerGroupIndex]?.stories[prevIdx];
      if (!isVideo(prevStory?.image_url)) startProgress(IMAGE_DURATION);
      else stopProgress();
    } else if (viewerGroupIndex > 0) {
      const prevGroupIdx = viewerGroupIndex - 1;
      const prevGroup = groupedStories[prevGroupIdx];
      setViewerGroupIndex(prevGroupIdx);
      setViewerStoryIndex(prevGroup.stories.length - 1);
      const prevStory = prevGroup.stories[prevGroup.stories.length - 1];
      if (!isVideo(prevStory?.image_url)) startProgress(IMAGE_DURATION);
      else stopProgress();
    }
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
            <>
              {/* Tap area for prev/next (behind everything) */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleViewerTap}
                style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
              >
                {/* Media */}
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
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 5 }]}>
                    <AlertTriangle size={40} color="#F59E0B" />
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12 }}>Content Warning</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                      {currentViewerStory.blur_reason || 'This story has been flagged by a moderator.'}
                    </Text>
                  </View>
                )}

                {/* Dim overlay */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
              </TouchableOpacity>

              {/* Progress bars (above tap area) */}
              <View style={[styles.progressContainer, { paddingTop: Platform.OS === 'web' ? 16 : 50, zIndex: 10 }]} pointerEvents="none">
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

              {/* User info + action buttons (above tap area, receives touches) */}
              <View style={[styles.viewerHeader, { top: Platform.OS === 'web' ? 30 : 60, zIndex: 20 }]}>
                <View style={styles.viewerUserInfo} pointerEvents="none">
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

              {/* Unblur button for mods (above tap area) */}
              {storyIsBlurred && isModerator && (
                <View style={{ position: 'absolute', bottom: '40%', alignSelf: 'center', zIndex: 20 }}>
                  <TouchableOpacity 
                    onPress={() => unblurStory(currentViewerStory.id)} 
                    style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Remove Blur (Mod)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Caption (above tap area, no touch) */}
              {currentViewerStory.caption && !storyIsBlurred && (
                <View style={[styles.captionContainer, { zIndex: 10 }]} pointerEvents="none">
                  <Text style={styles.captionText}>{currentViewerStory.caption}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* ─── STORY ACTIONS MODAL ─────────────────────── */}
      <Modal visible={showStoryActions} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setShowStoryActions(false)} style={styles.actionOverlay}>
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
                  <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowBlurModal(true); }}>
                    <EyeOff size={20} color="#F59E0B" />
                    <Text style={[styles.actionItemText, { color: '#F59E0B' }]}>Blur Story</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.actionItem} onPress={() => unblurStory(currentViewerStory?.id)}>
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
                  <TouchableOpacity style={styles.actionItem} onPress={() => { setShowStoryActions(false); setShowBlurModal(true); }}>
                    <EyeOff size={20} color="#F59E0B" />
                    <Text style={[styles.actionItemText, { color: '#F59E0B' }]}>Blur Story</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.actionItem} onPress={() => unblurStory(currentViewerStory?.id)}>
                    <EyeOff size={20} color="#10B981" />
                    <Text style={[styles.actionItemText, { color: '#10B981' }]}>Remove Blur</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity style={[styles.actionItem, { borderTopWidth: 1, borderTopColor: theme.colors.border }]} onPress={() => setShowStoryActions(false)}>
              <Text style={[styles.actionItemText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── DELETE CONFIRM MODAL ────────────────────── */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setShowDeleteConfirm(false)} style={styles.actionOverlay}>
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
        </TouchableOpacity>
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
                <TouchableOpacity onPress={() => { setShowCaptionInput(false); setPendingAsset(null); setCaptionInput(''); }} style={styles.viewerCloseBtn}>
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={postStory} 
                  style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Post</Text>
                </TouchableOpacity>
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
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ─── BLUR REASON MODAL ───────────────────────── */}
      <Modal visible={showBlurModal} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setShowBlurModal(false)} style={styles.actionOverlay}>
          <TouchableOpacity activeOpacity={1} style={[styles.actionSheet, { backgroundColor: theme.colors.surface, padding: 20 }]}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Blur Story</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 12 }}>Users will see a warning with your reason before viewing.</Text>
            <TextInput
              value={blurReasonInput}
              onChangeText={setBlurReasonInput}
              placeholder="Reason for blur (shown to users)..."
              placeholderTextColor={theme.colors.textSecondary}
              style={{ backgroundColor: theme.colors.background, color: theme.colors.text, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border }}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                onPress={() => { setShowBlurModal(false); setBlurReasonInput(''); }} 
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => blurStory(currentViewerStory?.id, blurReasonInput.trim())} 
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F59E0B', alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: '600' }}>Blur</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
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
