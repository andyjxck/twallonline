import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Plus, X, Camera, Type, ChevronLeft, ChevronRight, Eye } from 'lucide-react-native';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';
import { useAuthStore } from '../utils/auth';
import { useLocationStore } from '../utils/locationStore';
import { getBlockedUserIds } from '../utils/blocking';
import { moderateContent } from '../utils/ai';
import { toast } from 'sonner-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_SIZE = 68;
const STORY_RING_SIZE = 74;
const STORY_DURATION = 5000;

const BACKGROUND_COLORS = [
  '#000000', '#1a1a2e', '#16213e', '#0f3460',
  '#e94560', '#533483', '#2b2d42', '#8d99ae',
  '#ef476f', '#ffd166', '#06d6a0', '#118ab2',
  '#073b4c', '#264653', '#2a9d8f', '#e76f51',
];

export default function StoriesBar() {
  const { theme, isLight } = useTheme();
  const user = useAuthStore(state => state.auth);
  const { city_id, zone_id, feedView } = useLocationStore();

  const [stories, setStories] = useState([]);
  const [groupedStories, setGroupedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState([]);

  // Creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState(null); // 'photo' | 'text'
  const [storyImage, setStoryImage] = useState(null);
  const [storyText, setStoryText] = useState('');
  const [storyBgColor, setStoryBgColor] = useState('#000000');
  const [uploading, setUploading] = useState(false);

  // Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressTimer = useRef(null);

  const styles = useMemo(() => createStyles(theme), [theme]);

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
      setBlockedUserIds(blocked);

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

      // Sort: current user first, then by latest story
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

  // Fetch viewed stories
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

  // Check if user has an active story
  const userHasStory = groupedStories.some(g => g.userId === user?.id);

  // Check if a group has all stories viewed
  const isGroupViewed = (group) => {
    return group.stories.every(s => viewedStoryIds.has(s.id));
  };

  // ─── CREATION ───────────────────────────────────────────

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled) {
      setStoryImage(result.assets[0]);
      setCreateMode('photo');
    }
  };

  const handleCreateStory = async () => {
    if (!user?.id) {
      toast.error('Please sign in to post a story');
      return;
    }
    if (createMode === 'text' && !storyText.trim()) {
      toast.error('Please enter some text');
      return;
    }
    if (createMode === 'photo' && !storyImage) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      // Moderate content
      const textToModerate = storyText || '';
      if (textToModerate.trim()) {
        const modResult = await moderateContent(textToModerate);
        if (modResult.status === 'rejected') {
          toast.error(modResult.reason || 'Content not allowed');
          setUploading(false);
          return;
        }
      }

      let imageUrl = null;
      if (createMode === 'photo' && storyImage) {
        const fileExt = storyImage.uri.split('.').pop() || 'jpg';
        const fileName = `story_${user.id}_${Date.now()}.${fileExt}`;
        const arrayBuffer = await (await fetch(storyImage.uri)).arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, arrayBuffer, { contentType: `image/${fileExt}`, upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('rstories').insert({
        user_id: user.id,
        image_url: imageUrl,
        text: storyText.trim() || null,
        background_color: createMode === 'text' ? storyBgColor : '#000000',
        city_id: city_id !== 321 ? city_id : null,
        zone_id: zone_id || null,
      });

      if (error) throw error;

      toast.success('Story posted!');
      resetCreateState();
      fetchStories();
    } catch (err) {
      console.error('Error creating story:', err);
      toast.error('Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  const resetCreateState = () => {
    setShowCreateModal(false);
    setCreateMode(null);
    setStoryImage(null);
    setStoryText('');
    setStoryBgColor('#000000');
  };

  // ─── VIEWER ─────────────────────────────────────────────

  const openViewer = (groupIndex) => {
    setViewerGroupIndex(groupIndex);
    setViewerStoryIndex(0);
    setViewerVisible(true);
    markAsViewed(groupedStories[groupIndex]?.stories[0]?.id);
    startProgress();
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeViewer = () => {
    setViewerVisible(false);
    stopProgress();
  };

  const startProgress = () => {
    progressAnim.setValue(0);
    stopProgress();
    progressTimer.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
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
      startProgress();
    } else if (viewerGroupIndex < groupedStories.length - 1) {
      const nextGroupIdx = viewerGroupIndex + 1;
      setViewerGroupIndex(nextGroupIdx);
      setViewerStoryIndex(0);
      markAsViewed(groupedStories[nextGroupIdx]?.stories[0]?.id);
      startProgress();
    } else {
      closeViewer();
    }
  };

  const goPrevStory = () => {
    if (viewerStoryIndex > 0) {
      const prevIdx = viewerStoryIndex - 1;
      setViewerStoryIndex(prevIdx);
      startProgress();
    } else if (viewerGroupIndex > 0) {
      const prevGroupIdx = viewerGroupIndex - 1;
      const prevGroup = groupedStories[prevGroupIdx];
      setViewerGroupIndex(prevGroupIdx);
      setViewerStoryIndex(prevGroup.stories.length - 1);
      startProgress();
    }
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
    const hrs = Math.floor(mins / 60);
    return `${hrs}h`;
  };

  // Current story in viewer
  const currentViewerGroup = groupedStories[viewerGroupIndex];
  const currentViewerStory = currentViewerGroup?.stories[viewerStoryIndex];

  // ─── RENDER ─────────────────────────────────────────────

  if (loading && stories.length === 0) return null;

  return (
    <View>
      {/* Stories horizontal scroll bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {/* Your Story / Add button */}
        <TouchableOpacity
          style={styles.storyItem}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (userHasStory) {
              const idx = groupedStories.findIndex(g => g.userId === user?.id);
              if (idx >= 0) openViewer(idx);
            } else {
              setShowCreateModal(true);
            }
          }}
          onLongPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.storyRing, userHasStory ? styles.storyRingActive : styles.storyRingAdd]}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.storyAvatar} />
            ) : (
              <View style={[styles.storyEmojiContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.storyEmoji}>{user?.emoji_icon || '👤'}</Text>
              </View>
            )}
            {!userHasStory && (
              <View style={[styles.addBadge, { backgroundColor: theme.colors.primary }]}>
                <Plus size={12} color={isLight ? '#FFF' : '#000'} />
              </View>
            )}
          </View>
          <Text style={[styles.storyUsername, { color: theme.colors.text }]} numberOfLines={1}>
            {userHasStory ? 'Your story' : 'Add story'}
          </Text>
        </TouchableOpacity>

        {/* Other users' stories */}
        {groupedStories.filter(g => g.userId !== user?.id).map((group, idx) => {
          const actualIdx = groupedStories.indexOf(group);
          const viewed = isGroupViewed(group);
          return (
            <TouchableOpacity
              key={group.userId}
              style={styles.storyItem}
              onPress={() => openViewer(actualIdx)}
              activeOpacity={0.7}
            >
              <View style={[styles.storyRing, viewed ? styles.storyRingViewed : styles.storyRingActive]}>
                {group.user?.avatar_url ? (
                  <Image source={{ uri: group.user.avatar_url }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyEmojiContainer, { backgroundColor: theme.colors.surface }]}>
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

      {/* ─── CREATE MODAL ─────────────────────────────── */}
      <Modal visible={showCreateModal} animationType="slide" transparent={false}>
        <View style={[styles.createContainer, { backgroundColor: createMode === 'text' ? storyBgColor : theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.createHeader, { paddingTop: Platform.OS === 'web' ? 16 : 50 }]}>
            <TouchableOpacity onPress={resetCreateState} style={styles.createCloseBtn}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.createTitle}>
              {createMode ? (createMode === 'photo' ? 'Photo Story' : 'Text Story') : 'New Story'}
            </Text>
            {createMode && (
              <TouchableOpacity
                onPress={handleCreateStory}
                disabled={uploading}
                style={[styles.createPostBtn, { backgroundColor: theme.colors.primary }]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={isLight ? '#FFF' : '#000'} />
                ) : (
                  <Text style={[styles.createPostBtnText, { color: isLight ? '#FFF' : '#000' }]}>Post</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Mode selection */}
          {!createMode && (
            <View style={styles.modeSelection}>
              <TouchableOpacity
                style={[styles.modeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => pickImage()}
              >
                <Camera size={40} color={theme.colors.primary} />
                <Text style={[styles.modeBtnText, { color: theme.colors.text }]}>Photo</Text>
                <Text style={[styles.modeBtnDesc, { color: theme.colors.textSecondary }]}>Upload a photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setCreateMode('text')}
              >
                <Type size={40} color={theme.colors.primary} />
                <Text style={[styles.modeBtnText, { color: theme.colors.text }]}>Text</Text>
                <Text style={[styles.modeBtnDesc, { color: theme.colors.textSecondary }]}>Colored background</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Photo preview */}
          {createMode === 'photo' && storyImage && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: storyImage.uri }} style={styles.photoPreviewImage} contentFit="contain" />
              <View style={styles.photoTextOverlay}>
                <TextInput
                  style={styles.photoTextInput}
                  placeholder="Add text (optional)..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={storyText}
                  onChangeText={setStoryText}
                  multiline
                  maxLength={200}
                />
              </View>
            </View>
          )}

          {/* Text story editor */}
          {createMode === 'text' && (
            <View style={styles.textEditor}>
              <TextInput
                style={styles.textStoryInput}
                placeholder="Type your story..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={storyText}
                onChangeText={setStoryText}
                multiline
                maxLength={300}
                autoFocus
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {BACKGROUND_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      storyBgColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setStoryBgColor(color)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* ─── STORY VIEWER ─────────────────────────────── */}
      <Modal visible={viewerVisible} animationType="fade" transparent={Platform.OS === 'web'}>
        <View style={[styles.viewerContainer, Platform.OS === 'web' && styles.viewerContainerWeb]}>
          {currentViewerStory && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleViewerTap}
              style={styles.viewerTouchable}
            >
              {/* Background */}
              {currentViewerStory.image_url ? (
                <Image
                  source={{ uri: currentViewerStory.image_url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: currentViewerStory.background_color || '#000' }]} />
              )}

              {/* Dark overlay for readability */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

              {/* Progress bars */}
              <View style={[styles.progressContainer, { paddingTop: Platform.OS === 'web' ? 16 : 50 }]}>
                {currentViewerGroup.stories.map((s, i) => (
                  <View key={s.id} style={styles.progressBarBg}>
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
                  </View>
                ))}
              </View>

              {/* User info header */}
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

              {/* Story text */}
              {currentViewerStory.text && (
                <View style={styles.viewerTextContainer}>
                  <Text style={styles.viewerText}>{currentViewerStory.text}</Text>
                </View>
              )}
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
    scrollContainer: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 12,
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
    storyAvatar: {
      width: STORY_SIZE,
      height: STORY_SIZE,
      borderRadius: STORY_SIZE / 2,
    },
    storyEmojiContainer: {
      width: STORY_SIZE,
      height: STORY_SIZE,
      borderRadius: STORY_SIZE / 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    storyEmoji: {
      fontSize: 28,
    },
    addBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    storyUsername: {
      fontSize: 11,
      marginTop: 4,
      textAlign: 'center',
      fontWeight: '500',
    },

    // Create modal
    createContainer: {
      flex: 1,
    },
    createHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      zIndex: 10,
    },
    createCloseBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    createTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFF',
    },
    createPostBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
    },
    createPostBtnText: {
      fontSize: 15,
      fontWeight: '700',
    },
    modeSelection: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
      paddingHorizontal: 20,
    },
    modeBtn: {
      width: 150,
      height: 180,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      gap: 8,
    },
    modeBtnText: {
      fontSize: 17,
      fontWeight: '700',
    },
    modeBtnDesc: {
      fontSize: 12,
    },
    photoPreview: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoPreviewImage: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    photoTextOverlay: {
      position: 'absolute',
      bottom: 80,
      left: 20,
      right: 20,
    },
    photoTextInput: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      color: '#FFF',
      fontSize: 16,
      padding: 12,
      borderRadius: 12,
      textAlign: 'center',
      maxHeight: 100,
    },
    textEditor: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
    },
    textStoryInput: {
      color: '#FFF',
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      maxHeight: 300,
      width: '100%',
    },
    colorPicker: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
    },
    colorOption: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginHorizontal: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorOptionSelected: {
      borderColor: '#FFF',
      transform: [{ scale: 1.15 }],
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
    viewerTextContainer: {
      position: 'absolute',
      bottom: 80,
      left: 20,
      right: 20,
      alignItems: 'center',
    },
    viewerText: {
      color: '#FFF',
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
  });
}
