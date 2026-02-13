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
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Plus, X } from 'lucide-react-native';
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

export default function StoriesBar({ vertical = false }) {
  const { theme, isLight } = useTheme();
  const user = useAuthStore(state => state.auth);
  const { city_id, zone_id, feedView } = useLocationStore();

  const [stories, setStories] = useState([]);
  const [groupedStories, setGroupedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);

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

      if (feedView === 'city' && city_id && city_id !== 321) {
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
    const isVid = asset.type === 'video';

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
        city_id: city_id !== 321 ? city_id : null,
        zone_id: zone_id || null,
      });

      if (error) throw error;

      toast.success('Story posted');
      fetchStories();
    } catch (err) {
      console.error('Error creating story:', err);
      toast.error(err?.message || 'Failed to post story');
    } finally {
      setUploading(false);
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

  // ─── RENDER ─────────────────────────────────────────────

  if (loading && stories.length === 0) return null;

  // Get the latest story thumbnail for a group (for the circle icon)
  const getGroupThumb = (group) => group.stories[0]?.image_url;

  return (
    <View>
      <ScrollView
        horizontal={!vertical}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={vertical ? styles.scrollContainerVertical : styles.scrollContainer}
        style={vertical ? styles.scrollViewVertical : styles.scrollView}
      >
        {/* Add story button */}
        <TouchableOpacity
          style={styles.storyItem}
          onPress={() => {
            if (userHasStory) {
              const idx = groupedStories.findIndex(g => g.userId === user?.id);
              if (idx >= 0) openViewer(idx);
            } else {
              pickAndUploadMedia();
            }
          }}
          onLongPress={() => pickAndUploadMedia()}
          activeOpacity={0.7}
        >
          <View style={[styles.storyRing, userHasStory ? styles.storyRingActive : styles.storyRingAdd]}>
            {userHasStory ? (
              <Image source={{ uri: getGroupThumb(groupedStories.find(g => g.userId === user?.id)) }} style={styles.storyThumb} />
            ) : uploading ? (
              <View style={[styles.storyThumbPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <View style={[styles.storyThumbPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Plus size={28} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
          <Text style={[styles.storyUsername, { color: theme.colors.text }]} numberOfLines={1}>
            {uploading ? 'Posting...' : userHasStory ? 'Your story' : 'Add story'}
          </Text>
        </TouchableOpacity>

        {/* Other users' stories */}
        {groupedStories.filter(g => g.userId !== user?.id).map((group) => {
          const actualIdx = groupedStories.indexOf(group);
          const viewed = isGroupViewed(group);
          const thumb = getGroupThumb(group);
          return (
            <TouchableOpacity
              key={group.userId}
              style={styles.storyItem}
              onPress={() => openViewer(actualIdx)}
              activeOpacity={0.7}
            >
              <View style={[styles.storyRing, viewed ? styles.storyRingViewed : styles.storyRingActive]}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.storyThumb} />
                ) : (
                  <View style={[styles.storyThumbPlaceholder, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.storyEmoji}>{group.user?.emoji_icon || '👤'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.storyUsername, { color: viewed ? theme.colors.textSecondary : theme.colors.text }]} numberOfLines={1}>
                {group.user?.username || 'User'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── STORY VIEWER ─────────────────────────────── */}
      <Modal visible={viewerVisible} animationType="fade" transparent={Platform.OS === 'web'}>
        <View style={[styles.viewerContainer, Platform.OS === 'web' && styles.viewerContainerWeb]}>
          {currentViewerStory && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleViewerTap}
              style={styles.viewerTouchable}
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

              {/* Dim overlay */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />

              {/* Progress bars */}
              <View style={[styles.progressContainer, { paddingTop: Platform.OS === 'web' ? 16 : 50 }]}>
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

              {/* User info */}
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
                <TouchableOpacity onPress={closeViewer} style={styles.viewerCloseBtn}>
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        </View>
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
      borderColor: theme.colors.border,
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
  });
}
