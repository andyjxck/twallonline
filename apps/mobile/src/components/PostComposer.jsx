import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronRight, Image as ImageIcon, Shield, BarChart2, Plus, ChevronLeft, WifiOff, MessageCircle, Users, Layout, Check, Camera, MapPin, User, ChevronDown, Bold, Italic, Underline, Star, Briefcase, Music } from "lucide-react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { getStoredUser } from "../utils/user";
import { getDeviceId } from "../utils/deviceId";
import { supabase } from "../utils/supabase";
import { moderateContent } from '../utils/ai';
import { crossAlert } from '../utils/alert';
import { toast } from 'sonner-native';
import { theme } from "../utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import SpotifyEmbed, { isValidSpotifyUrl } from "./SpotifyEmbed";
import { RichTextEditor } from "../components/RichTextEditor";
import HippieBackground from "../components/HippieBackground";
import { offlineStorage, checkNetworkStatus } from "../utils/offline";
import { sendNewPostNotification, sendFollowerPostNotification } from "../utils/notifications";
import { useLocationStore } from "../utils/locationStore";
import { fetchZonesForCity } from "../utils/location";

const EMOJIS = ["👤", "🐱", "🐶", "🦊", "🦁", "🐨", "🐸", "🐷", "🐵", "🦄", "🐲", "🤖", "👻", "👾", "👽", "💩"];

export function PostComposer({ postId, onClose, onSuccess, isInline = false }) {
  const { isHippie } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [zones, setZones] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [step, setStep] = useState('write');
  const [media, setMedia] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [user, setUser] = useState(null);

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [hasPoll, setHasPoll] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const [ctaType, setCtaType] = useState('none');
  const [ctaGroupId, setCtaGroupId] = useState(null);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [showSpotifyInput, setShowSpotifyInput] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("👥");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState(null);
  const [showGroupIconPicker, setShowGroupIconPicker] = useState(false);
  const [myGroups, setMyGroups] = useState([]);

  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [postingAs, setPostingAs] = useState('personal');
  const [showcaseInfo, setShowcaseInfo] = useState(null);
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });

  const { city_id, zone_id, feedView } = useLocationStore();

  const applyFormat = (formatType) => {
    const { start, end } = textSelection;
    if (start === end) return;
    
    const selectedText = text.substring(start, end);
    let formattedText = selectedText;
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
    }
    
    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setText(newText);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    checkNetworkStatus().then(setIsOnline);
    getDeviceId().then(setDeviceId);
    getStoredUser().then(u => {
      setUser(u);
      if (u?.active_identity) setPostingAs(u.active_identity);
      // Pre-fetch showcase info
      if (u?.talent_showcase_id) {
        supabase.from('rtalent').select('name, avatar_url').eq('id', u.talent_showcase_id).single().then(({ data }) => {
          if (data) setShowcaseInfo(prev => ({ ...prev, talent: data }));
        });
      }
      if (u?.business_showcase_id) {
        supabase.from('rbusinesses').select('name, avatar_url').eq('id', u.business_showcase_id).single().then(({ data }) => {
          if (data) setShowcaseInfo(prev => ({ ...prev, business: data }));
        });
      }
    });
    fetchData();
    if (postId) fetchPostData();
    fetchMyGroups();
  }, [postId]);

  const fetchMyGroups = async () => {
    const storedUser = await getStoredUser();
    if (!storedUser) return;
    const { data } = await supabase
      .from('rchat_members')
      .select('chat_id, chat:rchats(*)')
      .eq('user_id', storedUser.id)
      .eq('chat.is_group', true);
    setMyGroups(data?.map(d => d.chat) || []);
  };

  const handleSelectGroupEmoji = (emoji) => {
    setNewGroupIcon(emoji);
    setGroupAvatarUrl(null);
    setShowGroupIconPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePickGroupAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        const image = result.assets[0];
        const fileName = `group_avatar_${Date.now()}.jpg`;
        const arrayBuffer = await (await fetch(image.uri)).arrayBuffer();
        await supabase.storage.from('avatars').upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        
        setGroupAvatarUrl(publicUrl);
        setNewGroupIcon(null);
        setShowGroupIconPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Error uploading group avatar:', error);
        toast.error('Failed to upload avatar');
      }
    }
  };

  const fetchPostData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('rposts').select('*').eq('id', postId).single();
      if (data) {
        const storedUser = await getStoredUser();
        if (data.user_id !== storedUser?.id) {
          toast.error("You cannot edit someone else's post.");
          onClose?.();
          return;
        }
        setTitle(data.title || "");
        setText(data.text || "");
        setIsAnonymous(data.is_anonymous);
        if (data.spotify_url) setSpotifyUrl(data.spotify_url);
        if (data.image_urls) setMedia(data.image_urls.map(url => ({ uri: url, fromRemote: true, type: data.media_type || 'image' })));
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchData = async () => {
    const [zRes, tRes] = await Promise.all([
      city_id ? fetchZonesForCity(city_id) : supabase.from('rzones').select('*').order('name').then(r => r.data),
      supabase.from('rtags').select('*').order('name')
    ]);
    const zonesData = Array.isArray(zRes) ? zRes : (zRes?.data || []);
    setZones(zonesData);
    setTags(tRes.data || []);
    if (zonesData.length && !postId) {
      const defaultZone = zone_id ? zonesData.find(z => z.id === zone_id) : zonesData[0];
      setSelectedZone(defaultZone || zonesData[0]);
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) setMedia([...media, ...result.assets]);
  };

  const handlePost = async () => {
    if (!text?.trim()) { toast.error("Please write something before posting"); return; }
    if (!selectedTag) { toast.error("Please select a tag before posting"); return; }
    if (!deviceId) { toast.error("Device not ready, please try again"); return; }
    setLoading(true);
    
    const online = await checkNetworkStatus();
    
    try {
      let moderation = { status: 'approved', reason: '' };
      if (online) {
        moderation = await moderateContent(`${title}\n${text}`);
      }

      const postData = {
        title: title.trim(),
        text: text.trim(),
        zone_id: selectedZone?.id,
        tag_id: selectedTag?.id,
        device_id: deviceId,
        user_id: user?.id,
        is_anonymous: isAnonymous,
        moderation_status: moderation.status,
        moderation_reason: moderation.reason,
        is_deleted: moderation.status === 'rejected',
        localMedia: media,
        city_id: city_id,
      };

      if (!online) {
        await offlineStorage.savePendingPost(postData);
        toast.success("Post saved offline. It will upload when you're back online.");
        crossAlert(
          "Saved Offline",
          "Your post has been saved and will be uploaded when you're back online.",
          [{ text: "OK", onPress: () => onSuccess?.() }]
        );
        return;
      }

      let createdPollId = null;
      if (hasPoll && moderation.status !== 'rejected') {
        const { data: poll } = await supabase.from('rpolls').insert({ question: pollQuestion.trim(), is_active: true }).select().single();
        createdPollId = poll.id;
        await supabase.from('rpoll_options').insert(pollOptions.filter(o => o.trim()).map(o => ({ poll_id: poll.id, option_text: o.trim() })));
      }

      const imageUrls = [];
      for (const item of media) {
        if (item.fromRemote) { imageUrls.push(item.uri); continue; }
        const fileExt = item.uri.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const arrayBuffer = await (await fetch(item.uri)).arrayBuffer();
        await supabase.storage.from('posts').upload(fileName, arrayBuffer);
        imageUrls.push(supabase.storage.from('posts').getPublicUrl(fileName).data.publicUrl);
      }

      const dbPostData = {
        title: title.trim(),
        text: text.trim(),
        zone_id: selectedZone?.id,
        tag_id: selectedTag?.id,
        device_id: deviceId,
        user_id: user?.id,
        is_anonymous: isAnonymous,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        poll_id: createdPollId,
        moderation_status: moderation.status,
        moderation_reason: moderation.reason,
        is_deleted: moderation.status === 'rejected',
        city_id: city_id,
        cta_type: ctaType,
        cta_group_id: ctaGroupId,
        posted_as_identity: isAnonymous ? 'personal' : postingAs,
        spotify_url: isValidSpotifyUrl(spotifyUrl) ? spotifyUrl.trim() : null,
      };

      if (postId) await supabase.from('rposts').update(dbPostData).eq('id', postId);
      else {
        const { data: newPost } = await supabase.from('rposts').insert(dbPostData).select('id').single();
        if (newPost && !isAnonymous && moderation.status === 'approved') {
          await sendNewPostNotification({
            posterId: user.id,
            posterUsername: user.username,
            postId: newPost.id
          });
          if (user.account_type && user.account_type !== 'personal' && user.active_identity !== 'personal') {
            sendFollowerPostNotification({
              posterId: user.id,
              posterUsername: user.username,
              postId: newPost.id,
              postTitle: title.trim()
            });
          }
        }
      }

      if (moderation.status === 'rejected') {
        toast.error(moderation.reason);
      }

      onSuccess?.();
    } catch (error) { 
      console.error(error);
      toast.error("Failed to post"); 
    }
    finally { setLoading(false); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    setLoading(true);
    try {
      const { data: chat, error } = await supabase
        .from('rchats')
        .insert({
          is_group: true,
          group_name: newGroupName.trim(),
          group_icon: groupAvatarUrl || newGroupIcon,
          status: 'accepted'
        })
        .select()
        .single();

      if (chat) {
        await supabase.from('rchat_members').insert({
          chat_id: chat.id,
          user_id: user.id,
          is_admin: true
        });
        setMyGroups([...myGroups, chat]);
        setCtaGroupId(chat.id);
        setShowGroupCreator(false);
        setNewGroupName("");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const renderCTA = () => (
    <Modal visible={step === 'cta'} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.ctaModal, { backgroundColor: isHippie ? '#1a1a2e' : '#0F172A' }]}>
          <View style={[styles.ctaModalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.ctaModalTitle, { color: theme.colors.text }]}>Call to Action</Text>
            <TouchableOpacity onPress={() => setStep('write')}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.ctaModalContent}>
            <View style={styles.ctaTypeGrid}>
              {[
                { id: 'none', label: 'None', icon: X, desc: 'No action button' },
                { id: 'chat', label: 'Chat to me', icon: MessageCircle, desc: 'DM the poster' },
                { id: 'group', label: 'Join group', icon: Users, desc: 'Join a group chat' },
              ].map(type => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setCtaType(type.id);
                    if (type.id !== 'group') setCtaGroupId(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.ctaTypeCard,
                    { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: theme.colors.border },
                    ctaType === type.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '15' }
                  ]}
                >
                  <type.icon size={22} color={ctaType === type.id ? theme.colors.primary : "rgba(255,255,255,0.4)"} />
                  <Text style={[styles.ctaTypeLabel, { color: ctaType === type.id ? theme.colors.primary : "rgba(255,255,255,0.8)" }]}>{type.label}</Text>
                  <Text style={styles.ctaTypeDesc}>{type.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {ctaType === 'group' && (
              <View style={{ marginTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Select Group</Text>
                  <TouchableOpacity onPress={() => setShowGroupCreator(true)} style={styles.addGroupBtn}>
                    <Plus size={14} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>New</Text>
                  </TouchableOpacity>
                </View>

                {showGroupCreator ? (
                  <View style={[styles.groupCreator, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: theme.colors.border }]}>
                    <View style={styles.groupCreatorHeader}>
                      <Text style={{ color: '#FFF', fontWeight: '700' }}>Create Group</Text>
                      <TouchableOpacity onPress={() => setShowGroupCreator(false)}>
                        <X size={16} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.groupInputRow}>
                      <TouchableOpacity 
                        onPress={() => setShowGroupIconPicker(true)}
                        style={[styles.groupIconInput, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                      >
                        {groupAvatarUrl ? (
                          <Image source={{ uri: groupAvatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                        ) : (
                          <Text style={{ fontSize: 20 }}>{newGroupIcon || '👥'}</Text>
                        )}
                      </TouchableOpacity>
                      <TextInput
                        value={newGroupName}
                        onChangeText={setNewGroupName}
                        style={[styles.groupNameInput, { backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF' }]}
                        placeholder="Group Name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />
                    </View>
                    <TouchableOpacity 
                      onPress={handleCreateGroup}
                      disabled={loading || !newGroupName.trim()}
                      style={[styles.groupCreateSubmit, { backgroundColor: theme.colors.primary }]}
                    >
                      {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={{ fontWeight: '800' }}>Create & Link</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.groupList}>
                    {myGroups.length === 0 ? (
                      <Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 20 }}>No groups yet</Text>
                    ) : (
                      myGroups.map(group => (
                        <TouchableOpacity
                          key={group.id}
                          onPress={() => setCtaGroupId(group.id)}
                          style={[
                            styles.groupItem,
                            { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: theme.colors.border },
                            ctaGroupId === group.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
                          ]}
                        >
                          <Text style={styles.groupItemIcon}>{group.group_icon?.startsWith('http') ? '🖼️' : (group.group_icon || '👥')}</Text>
                          <Text style={[styles.groupItemName, { color: '#FFF' }]}>{group.group_name}</Text>
                          {ctaGroupId === group.id && <Check size={18} color={theme.colors.primary} />}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity 
            onPress={() => setStep('write')}
            style={[styles.ctaApplyBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.ctaApplyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPoll = () => (
    <Modal visible={step === 'poll'} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.ctaModal, { backgroundColor: isHippie ? '#1a1a2e' : '#0F172A' }]}>
          <View style={[styles.ctaModalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.ctaModalTitle, { color: theme.colors.text }]}>Add Poll</Text>
            <TouchableOpacity onPress={() => setStep('write')}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.ctaModalContent}>
            <Text style={styles.inputLabel}>Question</Text>
            <TextInput
              placeholder="What do you want to ask?"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={pollQuestion}
              onChangeText={setPollQuestion}
              style={[styles.pollInput, { color: theme.colors.text }]}
            />

            <Text style={styles.inputLabel}>Options</Text>
            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.pollOptionRow}>
                <TextInput
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={opt}
                  onChangeText={(val) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = val;
                    setPollOptions(newOpts);
                  }}
                  style={[styles.pollInput, { flex: 1, color: theme.colors.text }]}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity 
                    onPress={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                    style={styles.removeOption}
                  >
                    <X size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {pollOptions.length < 5 && (
              <TouchableOpacity 
                onPress={() => setPollOptions([...pollOptions, ""])}
                style={styles.addOptionBtn}
              >
                <Plus size={16} color={theme.colors.primary} />
                <Text style={[styles.addOptionText, { color: theme.colors.primary }]}>Add Option</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity 
            onPress={() => {
              if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
                toast.error("Please provide a question and at least 2 options.");
                return;
              }
              setHasPoll(true);
              setStep('write');
            }}
            style={[styles.ctaApplyBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.ctaApplyBtnText}>Add Poll</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderZoneDropdown = () => (
    <Modal visible={showZoneDropdown} animationType="fade" transparent>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowZoneDropdown(false)}>
        <View style={[styles.dropdownMenu, { backgroundColor: '#1E293B' }]}>
          <ScrollView style={{ maxHeight: 300 }}>
            {zones.map(zone => (
              <TouchableOpacity 
                key={zone.id} 
                onPress={() => { 
                  setSelectedZone(zone); 
                  setShowZoneDropdown(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }} 
                style={[styles.dropdownItem, selectedZone?.id === zone.id && styles.dropdownItemSelected]}
              >
                <Text style={[styles.dropdownItemText, { color: selectedZone?.id === zone.id ? theme.colors.primary : '#FFF' }]}>{zone.name}</Text>
                {selectedZone?.id === zone.id && <Check size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTagDropdown = () => (
    <Modal visible={showTagDropdown} animationType="fade" transparent>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowTagDropdown(false)}>
        <View style={[styles.dropdownMenu, { backgroundColor: '#1E293B' }]}>
          <ScrollView style={{ maxHeight: 300 }}>
            {tags.map(tag => (
              <TouchableOpacity 
                key={tag.id} 
                onPress={() => { 
                  setSelectedTag(tag); 
                  setShowTagDropdown(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }} 
                style={[styles.dropdownItem, selectedTag?.id === tag.id && styles.dropdownItemSelected]}
              >
                <Text style={[styles.dropdownItemText, { color: selectedTag?.id === tag.id ? theme.colors.primary : '#FFF' }]}>{tag.name}</Text>
                {selectedTag?.id === tag.id && <Check size={16} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const mainContent = (
    <View style={styles.mainWrapper}>
      {!isInline && (
        <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: isHippie ? 'rgba(255,255,255,0.1)' : theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {postId ? "Edit Post" : "Create Post"}
            </Text>
            {!isOnline && <WifiOff size={14} color={theme.colors.error} style={{ marginLeft: 6 }} />}
          </View>
          <TouchableOpacity 
            onPress={handlePost} 
            disabled={loading}
            style={[styles.publishBtn, { backgroundColor: isHippie ? '#FFF' : theme.colors.primary }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[styles.publishBtnText, { color: '#000' }]}>
                {isOnline ? (postId ? "Update" : "Post") : "Save"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <WifiOff size={14} color={theme.colors.error} />
          <Text style={[styles.offlineBannerText, { color: theme.colors.error }]}>
            Offline Mode: Post will be synced later
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
{isInline && (
              <View style={styles.inlineHeader}>
                <View style={styles.inlineHeaderLeft}>
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsAnonymous(!isAnonymous);
                    }}
                    style={[styles.inlineAvatar, isAnonymous && { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                  >
                    {isAnonymous ? (
                      <Shield size={20} color="rgba(255,255,255,0.7)" />
                    ) : (postingAs !== 'personal' && showcaseInfo?.[postingAs]?.avatar_url) ? (
                      <Image source={{ uri: showcaseInfo[postingAs].avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : user?.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <Text style={{ fontSize: 18 }}>{user?.emoji_icon || '👤'}</Text>
                    )}
                  </TouchableOpacity>
                  <View style={styles.inlineHeaderInfo}>
                    <TouchableOpacity 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAnonymous(!isAnonymous);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Text style={[styles.inlineHeaderName, { color: theme.colors.text }]}>
                        {isAnonymous ? 'Anonymous' : (postingAs !== 'personal' && showcaseInfo?.[postingAs]?.name) ? showcaseInfo[postingAs].name : (user?.username || 'Anonymous')}
                      </Text>
                      <View style={[styles.anonBadge, { backgroundColor: isAnonymous ? theme.colors.primary : 'rgba(255,255,255,0.1)' }]}>
                        <Shield size={10} color={isAnonymous ? '#000' : 'rgba(255,255,255,0.4)'} />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.inlineLocationRow}>
                      <TouchableOpacity onPress={() => setShowZoneDropdown(true)} style={styles.inlineMetaBtn}>
                        <MapPin size={11} color={theme.colors.textSecondary} />
                        <Text style={[styles.inlineMetaText, { color: theme.colors.textSecondary }]}>{selectedZone?.name || 'Zone'}</Text>
                      </TouchableOpacity>
                      <Text style={{ color: 'rgba(255,255,255,0.3)' }}>·</Text>
                      <TouchableOpacity onPress={() => setShowTagDropdown(true)} style={styles.inlineMetaBtn}>
                        <Text style={[styles.inlineMetaText, { color: theme.colors.textSecondary }]}>#{selectedTag?.name || 'tag'}</Text>
                      </TouchableOpacity>
                      {!isAnonymous && user?.account_type && user.account_type !== 'personal' && (
                        <>
                          <Text style={{ color: 'rgba(255,255,255,0.3)' }}>·</Text>
                          <TouchableOpacity
                            onPress={() => {
                              const identities = ['personal'];
                              if (user.account_type === 'talent' || user.account_type === 'both') identities.push('talent');
                              if (user.account_type === 'business' || user.account_type === 'both') identities.push('business');
                              const idx = identities.indexOf(postingAs);
                              setPostingAs(identities[(idx + 1) % identities.length]);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[styles.inlineMetaBtn, { backgroundColor: postingAs === 'talent' ? '#F59E0B30' : postingAs === 'business' ? '#8B5CF630' : '#10B98130', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }]}
                          >
                            {postingAs === 'talent' ? <Star size={10} color="#F59E0B" /> : postingAs === 'business' ? <Briefcase size={10} color="#8B5CF6" /> : <User size={10} color="#10B981" />}
                            <Text style={[styles.inlineMetaText, { color: postingAs === 'talent' ? '#F59E0B' : postingAs === 'business' ? '#8B5CF6' : '#10B981', fontWeight: '700' }]}>
                              {postingAs === 'talent' ? 'Talent' : postingAs === 'business' ? 'Business' : 'Personal'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.inlineCloseBtn}>
                  <X size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

          {!isInline && (
            <View style={styles.metadataContainer}>
              <View style={styles.metadataRow}>
                {feedView !== "global" && (
                  <TouchableOpacity onPress={() => setShowZoneDropdown(true)} style={styles.selectBtn}>
                    <MapPin size={14} color={theme.colors.primary} />
                    <Text style={styles.selectBtnText}>{selectedZone?.name || "Zone"}</Text>
                    <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => setShowTagDropdown(true)} style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>#{selectedTag?.name || "Tag"}</Text>
                  <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsAnonymous(!isAnonymous);
                  }}
                  style={[styles.anonToggle, isAnonymous && { backgroundColor: theme.colors.primary }]}
                >
                  <Shield size={14} color={isAnonymous ? "#000" : "rgba(255,255,255,0.5)"} />
                  <Text style={[styles.anonToggleText, { color: isAnonymous ? "#000" : "rgba(255,255,255,0.6)" }]}>Anon</Text>
                </TouchableOpacity>

                {!isAnonymous && user?.account_type && user.account_type !== 'personal' && (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => { setPostingAs('personal'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.anonToggle, postingAs === 'personal' && { backgroundColor: '#10B981' }]}
                    >
                      <User size={14} color={postingAs === 'personal' ? '#000' : 'rgba(255,255,255,0.5)'} />
                    </TouchableOpacity>
                    {(user.account_type === 'talent' || user.account_type === 'both') && (
                      <TouchableOpacity
                        onPress={() => { setPostingAs('talent'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.anonToggle, postingAs === 'talent' && { backgroundColor: '#F59E0B' }]}
                      >
                        <Star size={14} color={postingAs === 'talent' ? '#000' : 'rgba(255,255,255,0.5)'} />
                      </TouchableOpacity>
                    )}
                    {(user.account_type === 'business' || user.account_type === 'both') && (
                      <TouchableOpacity
                        onPress={() => { setPostingAs('business'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.anonToggle, postingAs === 'business' && { backgroundColor: '#8B5CF6' }]}
                      >
                        <Briefcase size={14} color={postingAs === 'business' ? '#000' : 'rgba(255,255,255,0.5)'} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          <TextInput 
            placeholder="Give your post a title..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={title} 
            onChangeText={setTitle} 
            style={[styles.titleInput, isInline && styles.titleInputInline, { color: theme.colors.text }]} 
            multiline
          />

            <TextInput 
              placeholder="Share what's on your mind..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={text} 
              onChangeText={setText} 
              onSelectionChange={(e) => setTextSelection(e.nativeEvent.selection)}
              style={[styles.textInput, { color: theme.colors.text }]} 
              multiline
            />

          {media.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreview}>
              {media.map((m, i) => (
                <View key={i} style={styles.mediaThumbWrapper}>
                  <Image source={{ uri: m.uri }} style={styles.mediaThumb} />
                  <TouchableOpacity 
                    style={styles.removeMedia}
                    onPress={() => setMedia(media.filter((_, idx) => idx !== i))}
                  >
                    <X size={10} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {hasPoll && (
            <View style={styles.pollPreview}>
              <BarChart2 size={14} color={theme.colors.primary} />
              <Text style={styles.pollPreviewText}>Poll: {pollQuestion}</Text>
              <TouchableOpacity onPress={() => { setHasPoll(false); setPollQuestion(''); setPollOptions(['', '']); }}>
                <X size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          )}

          {ctaType !== 'none' && (
            <View style={styles.ctaPreview}>
              {ctaType === 'chat' ? <MessageCircle size={14} color={theme.colors.primary} /> : <Users size={14} color={theme.colors.primary} />}
              <Text style={styles.ctaPreviewText}>{ctaType === 'chat' ? 'Chat to me' : 'Join group'} button active</Text>
              <TouchableOpacity onPress={() => { setCtaType('none'); setCtaGroupId(null); }}>
                <X size={14} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          )}

            <View style={[styles.bottomBar, isInline && styles.bottomBarInline]}>
              <View style={styles.bottomActions}>
                <TouchableOpacity onPress={() => applyFormat('bold')} style={styles.actionBtn}>
                  <Bold size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => applyFormat('italic')} style={styles.actionBtn}>
                  <Italic size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => applyFormat('underline')} style={styles.actionBtn}>
                  <Underline size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <View style={styles.actionSeparator} />
                <TouchableOpacity onPress={pickMedia} style={styles.actionBtn}>
                  <ImageIcon size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('poll')} style={styles.actionBtn}>
                  <BarChart2 size={20} color={hasPoll ? theme.colors.primary : "rgba(255,255,255,0.6)"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('cta')} style={styles.actionBtn}>
                  <MessageCircle size={20} color={ctaType !== 'none' ? theme.colors.primary : "rgba(255,255,255,0.6)"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSpotifyInput(!showSpotifyInput)} style={styles.actionBtn}>
                  <Music size={20} color={spotifyUrl ? '#1DB954' : "rgba(255,255,255,0.6)"} />
                </TouchableOpacity>
              </View>

              {showSpotifyInput && (
                <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Music size={16} color="#1DB954" style={{ marginRight: 8 }} />
                    <TextInput
                      value={spotifyUrl}
                      onChangeText={setSpotifyUrl}
                      placeholder="Paste Spotify link..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{ flex: 1, color: '#FFF', fontSize: 13 }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {spotifyUrl.length > 0 && (
                      <TouchableOpacity onPress={() => setSpotifyUrl('')} style={{ padding: 4 }}>
                        <X size={14} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {isValidSpotifyUrl(spotifyUrl) && (
                    <SpotifyEmbed url={spotifyUrl} compact />
                  )}
                </View>
              )}

            {isInline && (
              <TouchableOpacity 
                onPress={handlePost}
                disabled={loading || !text.trim()}
                style={[styles.postBtn, { backgroundColor: text.trim() ? theme.colors.primary : 'rgba(255,255,255,0.1)' }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.postBtnText, { color: text.trim() ? '#000' : 'rgba(255,255,255,0.3)' }]}>Post</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {renderZoneDropdown()}
      {renderTagDropdown()}
      {renderCTA()}
      {renderPoll()}

      <Modal visible={showGroupIconPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.iconPickerModal, { backgroundColor: '#0F172A' }]}>
            <Text style={styles.iconPickerTitle}>Choose Group Icon</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => handleSelectGroupEmoji(emoji)} style={styles.emojiItem}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handlePickGroupAvatar} style={styles.photoBtn}>
              <Camera size={18} color="#FFF" />
              <Text style={styles.photoBtnText}>Upload image</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowGroupIconPicker(false)} style={styles.pickerCloseBtn}>
              <Text style={styles.pickerCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const wrapper = (
    <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
      {mainContent}
    </View>
  );

  return isHippie ? <HippieBackground>{wrapper}</HippieBackground> : wrapper;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainWrapper: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingBottom: 12, 
    borderBottomWidth: 1 
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  publishBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center'
  },
  publishBtnText: { fontWeight: '700', fontSize: 14 },
  offlineBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8, 
    paddingVertical: 8
  },
  offlineBannerText: { fontSize: 12, fontWeight: '600' },
  scrollView: { flex: 1 },
  form: { padding: 16, paddingBottom: 120 },
  
  metadataContainer: { marginBottom: 16 },
  metadataRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  selectBtnText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  anonToggleText: { fontSize: 13, fontWeight: '600' },

  titleInput: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 8,
    paddingVertical: 4,
  },
  titleInputInline: { fontSize: 18 },
  
  textInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  mediaPreview: { marginTop: 12 },
  mediaThumbWrapper: { position: 'relative', marginRight: 8 },
  mediaThumb: { width: 60, height: 60, borderRadius: 8 },
  removeMedia: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pollPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 12,
  },
  pollPreviewText: { flex: 1, color: '#FFF', fontSize: 13 },

  ctaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
  },
  ctaPreviewText: { flex: 1, color: '#FFF', fontSize: 13 },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bottomBarInline: { marginTop: 12, paddingTop: 12 },
  
  bottomActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionBtn: { padding: 10 },
  actionSeparator: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postBtnText: { fontWeight: '700', fontSize: 14 },

  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inlineHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  inlineAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inlineHeaderInfo: { flex: 1 },
  inlineHeaderName: { fontSize: 15, fontWeight: '600' },
  inlineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  inlineLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  inlineMetaBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  inlineMetaText: { fontSize: 12 },
  inlineCloseBtn: { padding: 4 },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownItemSelected: { backgroundColor: 'rgba(255,255,255,0.05)' },
  dropdownItemText: { fontSize: 15, fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  ctaModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  ctaModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  ctaModalTitle: { fontSize: 18, fontWeight: '700' },
  ctaModalContent: { padding: 20 },

  ctaTypeGrid: { gap: 10 },
  ctaTypeCard: { 
    padding: 16, 
    borderRadius: 14, 
    borderWidth: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaTypeLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  ctaTypeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  ctaApplyBtn: { margin: 20, padding: 16, borderRadius: 24, alignItems: 'center' },
  ctaApplyBtnText: { fontWeight: '800', fontSize: 15 },

  addGroupBtn: { flexDirection: 'row', alignItems: 'center' },
  groupCreator: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  groupCreatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupInputRow: { flexDirection: 'row', gap: 8 },
  groupIconInput: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  groupNameInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12 },
  groupCreateSubmit: { padding: 12, borderRadius: 10, alignItems: 'center' },
  groupList: { gap: 8 },
  groupItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  groupItemIcon: { fontSize: 20, marginRight: 10 },
  groupItemName: { flex: 1, fontSize: 14, fontWeight: '600' },

  inputLabel: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: 'rgba(255,255,255,0.4)', 
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  pollInput: { 
    padding: 14, 
    borderRadius: 12, 
    fontSize: 15, 
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pollOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  removeOption: { padding: 8 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  addOptionText: { fontSize: 14, fontWeight: '700' },

  iconPickerModal: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    alignSelf: 'center',
    marginBottom: 40,
  },
  iconPickerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  emojiItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emojiText: { fontSize: 22 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12
  },
  photoBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  pickerCloseBtn: { padding: 12, alignItems: 'center' },
  pickerCloseBtnText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  anonBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
