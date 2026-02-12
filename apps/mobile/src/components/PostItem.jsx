import { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { crossAlert } from '../utils/alert';
import { toast } from 'sonner-native';
import {
    Heart,
    Star,
    Flag,
    Share as ShareIcon,
    AlertTriangle,
    X,
    User,
    Send,
    Pencil,
    Play,
    MessageCircle,
    MessageSquare,
    CloudOff,
    MoreVertical,
    Trash2,
    MessageSquareOff,
    EyeOff,
    Users,
    UserX,
    ImageIcon,
  } from "lucide-react-native";
let GiphyDialog, GiphyDialogEvent, GiphySDK, GiphyTheme;
if (Platform.OS !== 'web') {
  const Giphy = require('@giphy/react-native-sdk');
  GiphyDialog = Giphy.GiphyDialog;
  GiphyDialogEvent = Giphy.GiphyDialogEvent;
  GiphySDK = Giphy.GiphySDK;
  GiphyTheme = Giphy.GiphyTheme;
}
import { useChatStore } from "../utils/auth";
import { useTheme } from "../utils/ThemeContext";
import { supabase } from "../utils/supabase";
import { moderateContent } from "../utils/ai";
import { sendNotification, sendCommentNotification } from "../utils/notifications";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { getStoredUser, isOnline } from "../utils/user";
import { TextInput } from "react-native-gesture-handler";
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import PollComponent from "./PollComponent";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { theme as defaultTheme } from "../utils/theme";
import { blockUser, BLOCK_REASONS } from "../utils/blocking";
import { reportPost, reportComment, REPORT_REASONS } from "../utils/reporting";
import WebGifPicker from "./WebGifPicker";

const markdownToHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\n/g, '<br/>');
};

const VideoPreview = ({ url, isExpanded, style }) => {
  const player = useVideoPlayer(url, (player) => {
    player.loop = true;
    player.muted = true;
    if (isExpanded) {
      player.play();
    }
  });

  useEffect(() => {
    if (isExpanded) {
      player.play();
    } else {
      player.pause();
    }
  }, [isExpanded, player]);

  return (
    <VideoView
      style={style}
      player={player}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

const FullVideoPlayer = ({ url, style }) => {
  const player = useVideoPlayer(url, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={style}
      player={player}
      contentFit="contain"
      nativeControls={true}
    />
  );
};

export default function PostItem({ item, deviceId, onReaction, onComment, onDelete, onShare, onEdit, user, onFilterZone, onFilterTag, onModAction, isHighlighted }) {
  if (!item) return null;
  const { theme, isHippie, isLight } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const images = item?.image_urls || (item?.image_url ? [item.image_url] : []);
  
  const [revealed, setRevealed] = useState(false);
  const [blurRevealed, setBlurRevealed] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnonComment, setIsAnonComment] = useState(false);
  const [userNickname, setUserNickname] = useState("");
  const [showModMenu, setShowModMenu] = useState(false);
  const [showBlurModal, setShowBlurModal] = useState(false);
  const [blurReasonInput, setBlurReasonInput] = useState("");
  const [selectedGif, setSelectedGif] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  const [commentToReport, setCommentToReport] = useState(null);
  const [commentReportReason, setCommentReportReason] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentLikes, setCommentLikes] = useState({});

  const dynamicStyles = useMemo(() => StyleSheet.create({
    username: { ...styles.username, color: theme.colors.text },
    title: { ...styles.title, color: theme.colors.text },
    bodyText: { ...styles.bodyText, color: theme.colors.text },
    actionText: { ...styles.actionText, color: theme.colors.textSecondary },
    commentText: { ...styles.commentText, color: theme.colors.text },
    commentUser: { ...styles.commentUser, color: theme.colors.primary },
    input: { ...styles.input, color: theme.colors.text },
    userName: { ...styles.userName, color: theme.colors.text },
    modalTitle: { ...styles.modalTitle, color: theme.colors.text },
    ctaButtonText: { ...styles.ctaButtonText, color: isLight ? '#FFF' : '#000' },
  }), [theme, isLight]);

  const tagsStyles = useMemo(() => ({
    body: {
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    p: {
      marginTop: 0,
      marginBottom: 10,
      color: theme.colors.text,
    },
    div: {
      marginTop: 0,
      marginBottom: 10,
      color: theme.colors.text,
    },
    span: {
      color: theme.colors.text,
    },
    b: {
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    i: {
      fontStyle: 'italic',
      color: theme.colors.text,
    },
    u: {
      textDecorationLine: 'underline',
      color: theme.colors.text,
    }
  }), [theme]);

  const reactions = item.reactions || item.rreactions || [];
  const helpfulCount = reactions.filter(r => r.reaction_type === 'helpful').length;
  const superlikeCount = reactions.filter(r => r.reaction_type === 'superlike').length;
  const fakeCount = reactions.filter(r => r.reaction_type === 'fake').length;
  
  const userReactions = {
    helpful: reactions.some(r => r.reaction_type === 'helpful' && r.device_id === deviceId),
    superlike: reactions.some(r => r.reaction_type === 'superlike' && r.device_id === deviceId),
    fake: reactions.some(r => r.reaction_type === 'fake' && r.device_id === deviceId),
  };

  const shouldBlur = fakeCount > 5 && fakeCount > helpfulCount;
  const timeAgo = getTimeAgo(new Date(item.created_at));
  const isVideo = item.media_type === 'video' || (item.image_url && (item.image_url.endsWith('.mp4') || item.image_url.endsWith('.mov')));

  const [loadingLikers, setLoadingLikers] = useState(false);
  const [likers, setLikers] = useState([]);
  const [superlikers, setSuperlikers] = useState([]);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [showSuperlikersModal, setShowSuperlikersModal] = useState(false);
  
  const [ctaLoading, setCtaLoading] = useState(false);

  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 3000); 
      return () => clearInterval(interval);
    }
  }, [images.length]);

  useEffect(() => {
    if (isExpanded) fetchComments();
  }, [isExpanded, item.id]);

      const [showWebGifPicker, setShowWebGifPicker] = useState(false);

      useEffect(() => {
        if (Platform.OS === 'web') return;
        const listener = GiphyDialog.addListener(GiphyDialogEvent.MediaSelected, (e) => {
          setSelectedGif({ url: e.media.url });
          GiphyDialog.hide();
        });
        return () => listener.remove();
      }, []);


  const handleCTA = async () => {
    if (!user) {
      toast.error("Please sign in to use this feature.");
      return;
    }
    
    setCtaLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (item.cta_type === 'chat') {
        if (item.user_id === user.id) {
          toast.info("This is your own post!");
          return;
        }

          const { data: existingChats } = await supabase
            .from('rchats')
            .select('*')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${item.user_id}),and(user1_id.eq.${item.user_id},user2_id.eq.${user.id})`)
            .eq('is_group', false);

          let chatId;
          if (existingChats && existingChats.length > 0) {
            chatId = existingChats[0].id;
            if (existingChats[0].status === 'pending') {
              const { data: friendship } = await supabase
                .from('friends')
                .select('id')
                .match({ user_id: user.id, friend_id: item.user_id, status: 'accepted' })
                .single();
              
              if (friendship) {
                await supabase.from('rchats').update({ status: 'accepted' }).eq('id', chatId);
              }
            }
          } else {
            const { data: friendship } = await supabase
              .from('friends')
              .select('id')
              .match({ user_id: user.id, friend_id: item.user_id, status: 'accepted' })
              .single();
            
            const status = friendship ? 'accepted' : 'pending';

            const { data: newChat } = await supabase
              .from('rchats')
              .insert({
                user1_id: Math.min(user.id, item.user_id),
                user2_id: Math.max(user.id, item.user_id),
                initiated_by: user.id,
                status: status,
                is_group: false,
                last_message: status === 'pending' ? 'Chat Request' : 'Chat started'
              })
              .select()
              .single();
            chatId = newChat.id;
          }
        
        if (chatId) {
          useChatStore.getState().setActiveChatId(chatId);
          useChatStore.getState().open();
        }
        } else if (item.cta_type === 'group' && item.cta_group_id) {
          const { data: membership } = await supabase
            .from('rchat_members')
            .select('*')
            .eq('chat_id', item.cta_group_id)
            .eq('user_id', user.id)
            .single();

          if (!membership) {
            await supabase.from('rchat_members').insert({
              chat_id: item.cta_group_id,
              user_id: user.id,
              is_admin: false
            });

            await supabase.from('rmessages').insert({
              chat_id: item.cta_group_id,
              sender_id: user.id,
              text: `${user.username || 'Someone'} has joined the group`,
              is_system: true
            });

            await supabase.from('rchats').update({
              last_message: `${user.username || 'Someone'} has joined`,
              last_message_at: new Date().toISOString()
            }).eq('id', item.cta_group_id);
          }

          useChatStore.getState().setActiveChatId(item.cta_group_id);
          useChatStore.getState().open();
        }
    } catch (e) {
      console.error(e);
      toast.error("Failed to process request");
    } finally {
      setCtaLoading(false);
    }
  };

  const fetchLikers = async (type) => {
    setLoadingLikers(true);
    try {
      const { data } = await supabase
        .from('rreactions')
        .select('user:rusers!user_id(id, username, emoji_icon, avatar_url, supabase_uid)')
        .eq('post_id', item.id)
        .eq('reaction_type', type);
      const users = data?.map(r => r.user).filter(Boolean) || [];
      if (type === 'helpful') setLikers(users);
      else setSuperlikers(users);
    } catch (e) { console.error(e); }
    finally { setLoadingLikers(false); }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data } = await supabase.from('rcomments').select(`*, user:rusers (username, emoji_icon, avatar_url, nickname, is_admin, is_moderator, is_councillor, councillor_city_id)`).eq('post_id', item.id).order('created_at', { ascending: true });
      setComments((data || []).filter(c => c !== null));
      
      // Fetch likes for all comments
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id);
        const { data: likes } = await supabase
          .from('rcomment_likes')
          .select('comment_id, user_id, device_id')
          .in('comment_id', commentIds);
        
        const likesMap = {};
        (likes || []).forEach(like => {
          if (!likesMap[like.comment_id]) {
            likesMap[like.comment_id] = { count: 0, userLiked: false };
          }
          likesMap[like.comment_id].count++;
          if (like.device_id === deviceId || like.user_id === user?.id) {
            likesMap[like.comment_id].userLiked = true;
          }
        });
        setCommentLikes(likesMap);
      }
      
      const storedUser = await getStoredUser();
      if (storedUser) {
        const { data: profile } = await supabase.from('rusers').select('nickname').eq('id', storedUser.id).single();
        setUserNickname(profile?.nickname || "");
      }
    } catch (error) { console.error(error); }
    finally { setLoadingComments(false); }
  };

  const handleLikeComment = async (commentId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentLike = commentLikes[commentId];
    const isLiked = currentLike?.userLiked;
    
    // Optimistic update
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: {
        count: (prev[commentId]?.count || 0) + (isLiked ? -1 : 1),
        userLiked: !isLiked
      }
    }));

    try {
      if (isLiked) {
        await supabase.from('rcomment_likes').delete().match({ comment_id: commentId, device_id: deviceId });
      } else {
        await supabase.from('rcomment_likes').insert({
          comment_id: commentId,
          user_id: user?.id,
          device_id: deviceId
        });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert on error
      setCommentLikes(prev => ({
        ...prev,
        [commentId]: {
          count: (prev[commentId]?.count || 0) + (isLiked ? 1 : -1),
          userLiked: isLiked
        }
      }));
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() && !selectedGif) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const storedUser = await getStoredUser();
      const gifUrl = selectedGif?.url || null;
      const { data: commentData, error } = await supabase.from('rcomments').insert({
        post_id: item.id,
        user_id: storedUser?.id,
        text: commentText.trim(),
        device_id: deviceId,
        is_anonymous: isAnonComment,
        nickname: isAnonComment ? userNickname : null,
        gif_url: gifUrl,
        parent_comment_id: replyingTo?.id || null
      }).select(`*, user:rusers (username, emoji_icon, avatar_url, nickname)`).single();
      
      if (error) {
        console.error('Comment insert error:', error);
        return;
      }

      // Notify post owner or parent comment owner
      const notifyUserId = replyingTo ? replyingTo.user_id : item.user_id;
      if (notifyUserId && notifyUserId !== storedUser?.id) {
          await sendCommentNotification({
            commenterUsername: storedUser?.username || 'Someone',
            commenterId: storedUser?.id,
            postOwnerId: notifyUserId,
            postId: item.id,
            postTitle: replyingTo ? `reply to your comment` : item.title,
            commentText: commentText.trim()
          });
        }

      setComments([...comments, commentData]);
        setCommentText("");
        setSelectedGif(null);
        setReplyingTo(null);
        if (onComment) onComment(item.id);
    } catch (error) { console.error(error); }
  };

    const isModOrAdmin = !!(user?.is_admin || user?.is_moderator);
    const isOwner = user?.id === item.user_id;
    const isBlurredByMod = !!(item.is_blurred && item.blur_reason);
    const isHeldForModeration = item.moderation_status === 'held';
  const isRedactedMode = !!(shouldBlur || isBlurredByMod || isHeldForModeration);
  const isRevealed = !!((shouldBlur && revealed) || (isBlurredByMod && blurRevealed));
  const isCurrentlyBlurred = !!(isRedactedMode && !isRevealed);


    const handleModAction = async (action, reason = null) => {

    setShowModMenu(false);
    if (onModAction) {
      await onModAction(item.id, action, reason);
    }
  };

  const handleBlurPost = () => {
    if (!blurReasonInput.trim()) return;
    handleModAction('blur', blurReasonInput.trim());
    setShowBlurModal(false);
    setBlurReasonInput("");
  };

  const handleBlockFromPost = async () => {
    if (!blockReason || !user?.id || !item.user_id || item.user_id === user.id) return;
    try {
      await blockUser({
        blockerId: user.id,
        blockedId: item.user_id,
        source: 'post',
        reason: blockReason,
        postId: item.id,
      });
      setShowBlockModal(false);
      setBlockReason("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onDelete) onDelete(item.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReportPost = async () => {
    if (!reportReason || !user?.id) return;
    try {
      const result = await reportPost(user.id, item.id, reportReason);
      if (result) {
        setShowReportModal(false);
        setReportReason("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("Report submitted. Our team will review it within 24 hours.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit report. Please try again.");
    }
  };

  const handleReportComment = async () => {
    if (!commentReportReason || !user?.id || !commentToReport) return;
    try {
      const result = await reportComment(user.id, commentToReport.id, item.id, commentReportReason);
      if (result) {
        setShowCommentReportModal(false);
        setCommentToReport(null);
        setCommentReportReason("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("Report submitted. Our team will review it within 24 hours.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit report. Please try again.");
    }
  };

  return (
    <View style={[
      styles.container, 
      isCurrentlyBlurred && { paddingBottom: 10, marginBottom: 10 },
      isHighlighted && styles.highlightedContainer
    ]}>
      {item.isPending && (
        <View style={styles.pendingBanner}>
          <CloudOff size={14} color="#92400E" />
          <Text style={styles.pendingText}>Pending - Will sync when online</Text>
        </View>
      )}
        <View style={styles.card}>
          <View style={styles.header}>
            {isRedactedMode ? (
              <View style={[styles.avatar, styles.redactedAvatar]}>
                <User size={20} color="rgba(255,255,255,0.3)" />
              </View>
            ) : (
                <TouchableOpacity 
                  onPress={() => {
                    const isUserAnon = !item.user?.supabase_uid;
                    if (!item.is_anonymous && !isUserAnon) {
                      router.push(`/profile?userId=${item.user_id}`);
                    }
                  }} 
                  disabled={item.is_anonymous || !item.user?.supabase_uid}
                >
                  {item.is_anonymous ? (
                    <View style={styles.anonAvatarContainer}>
                      <UserX size={20} color="rgba(255,255,255,0.5)" />
                    </View>
                  ) : item.user?.avatar_url ? (
                    <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <Text style={styles.emojiAvatar}>{item.user?.emoji_icon || "👤"}</Text>
                  )}
                </TouchableOpacity>
            )}

          <View style={styles.headerInfo}>
            {isRedactedMode ? (
              <View style={styles.redactedHeaderContainer}>
                <View style={[styles.redactedBar, { width: 80, height: 14, marginBottom: 6 }]} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={[styles.redactedBar, { width: 50, height: 10 }]} />
                  <View style={[styles.redactedBar, { width: 40, height: 10 }]} />
                </View>
              </View>
            ) : (
              <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {item.is_anonymous ? (
                        <View style={styles.anonUsernameContainer}>
                          <Text style={[styles.anonUsername, { color: theme.colors.textSecondary }]}>Anonymous</Text>
                          <Text style={[styles.anonBadge, { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }]}>Hidden identity</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={dynamicStyles.username}>@{item.user?.username}</Text>
                          {isOnline(item.user?.last_seen) && <View style={styles.onlineDot} />}
                          {item.user?.is_admin && (
                            <View style={[styles.roleBadge, styles.adminBadge]}>
                              <Text style={styles.roleBadgeText}>Admin</Text>
                            </View>
                          )}
                          {item.user?.is_moderator && !item.user?.is_admin && (
                            <View style={[styles.roleBadge, styles.modBadge]}>
                              <Text style={styles.roleBadgeText}>Mod</Text>
                            </View>
                          )}
                          {item.user?.is_councillor && (item.city_id === item.user?.councillor_city_id || item.zone?.city_id === item.user?.councillor_city_id) && (
                            <View style={[styles.roleBadge, styles.councillorBadge]}>
                              <Text style={styles.roleBadgeText}>Councillor</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <TouchableOpacity onPress={() => onFilterZone?.(item.zone_id)} disabled={item.city_id === 321 || !item.zone_id}>
                          <Text style={[styles.metaLink, { color: theme.colors.textSecondary }]}>
                            {(item.city_id === 321 || !item.zone_id) ? "Global" : item.zone?.name}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>•</Text>
                    {item.tag?.name && (
                      <>
                        <TouchableOpacity onPress={() => onFilterTag?.(item.tag_id)}>
                          <Text style={[styles.metaLink, { color: theme.colors.textSecondary }]}>{item.tag?.name}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>•</Text>
                      </>
                    )}
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{timeAgo}</Text>
                  </View>

              </>
            )}
          </View>

          {!isCurrentlyBlurred && user?.id === item.user_id && !isRedactedMode && (
            <TouchableOpacity onPress={() => onEdit?.(item)}><Pencil size={18} color={theme.colors.textSecondary} /></TouchableOpacity>
          )}
          {(isModOrAdmin || isOwner) && (
            <TouchableOpacity onPress={() => setShowModMenu(true)} style={{ marginLeft: 8 }}>
              <MoreVertical size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

          <View style={[styles.mainContent, isCurrentlyBlurred && { marginBottom: 0 }]}>
            <TouchableOpacity 
              onPress={() => {
                if (isCurrentlyBlurred) {
                  if (shouldBlur) setRevealed(true);
                  else if (isBlurredByMod) setBlurRevealed(true);
                } else if (isRedactedMode) {
                  return;
                } else {
                  setIsExpanded(!isExpanded);
                }
              }} 
              style={[styles.body, { flex: 1 }]}
            >
              {isCurrentlyBlurred ? (
                  <View style={styles.blurredContentWrapper}>
                    {isHeldForModeration ? (
                      <View style={styles.modBlurOverlay}>
                        <EyeOff size={18} color="#F59E0B" />
                        <Text style={[styles.blurTextContent, { color: '#F59E0B' }]}>Pending Moderation</Text>
                        <Text style={styles.tapToRevealText}>This post is under review</Text>
                      </View>
                    ) : isBlurredByMod ? (
                      <View style={styles.modBlurOverlay}>
                        <EyeOff size={18} color="#FFF" />
                        <Text style={styles.blurTextContent}>Post blurred: {item.blur_reason}</Text>
                        <Text style={styles.tapToRevealText}>Tap to reveal</Text>
                      </View>
                    ) : (
                      <View style={styles.communityBlurOverlay}>
                        <AlertTriangle size={18} color={theme.colors.error} />
                        <Text style={[styles.blurText, { color: theme.colors.error }]}>Reported Content</Text>
                        <Text style={styles.tapToRevealText}>Tap to reveal</Text>
                      </View>
                    )}
                  </View>
                ) : (
                    <>
                      {item.title && <Text style={[dynamicStyles.title, isRedactedMode && styles.greyedOutText]}>{item.title}</Text>}
                      {isExpanded ? (
                        <RenderHtml
                          contentWidth={width - (images.length > 0 ? 122 : 30)}
                          source={{ html: markdownToHtml(item.text) }}
                          tagsStyles={tagsStyles}
                        />
                      ) : (
                        <Text style={[dynamicStyles.bodyText, isRedactedMode && styles.greyedOutText]} numberOfLines={4}>
                          {item.text?.replace(/<\/p>|<div>|<\/div>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1').trim()}
                        </Text>
                      )}
                      {item.poll_id && <PollComponent pollId={item.poll_id} />}
                    </>

              )}
            </TouchableOpacity>

            {!isCurrentlyBlurred && images.length > 0 && !isRedactedMode && (
              <TouchableOpacity onPress={() => setShowFullImage(true)} style={styles.sideMediaContainer}>
                  {isVideo ? (
                    <VideoPreview
                      url={images[currentImageIndex]}
                      style={styles.sideMedia}
                      isExpanded={isExpanded}
                    />
                  ) : (
                  <Image source={{ uri: images[currentImageIndex] }} style={styles.sideMedia} contentFit="cover" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {!isCurrentlyBlurred && item.cta_type && item.cta_type !== 'none' && (
            <TouchableOpacity 
              onPress={handleCTA}
              disabled={ctaLoading}
              style={[
                styles.ctaButton, 
                { backgroundColor: item.cta_type === 'chat' ? theme.colors.primary : '#4ADE80' }
              ]}
            >
              {ctaLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  {item.cta_type === 'chat' ? (
                    <MessageCircle size={18} color="#000" />
                  ) : (
                    <Users size={18} color="#000" />
                  )}
                  <Text style={styles.ctaButtonText}>
                    {item.cta_type === 'chat' ? "Chat to me" : "Join group"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!isCurrentlyBlurred && (
            <View style={[styles.footer, isRedactedMode && { opacity: 0.5 }]}>
            <View style={styles.actions}>
              <TouchableOpacity 
                onPress={() => !isRedactedMode && onReaction(item.id, "helpful", userReactions.helpful)} 
                style={styles.actionBtn}
                disabled={isRedactedMode}
              >
                <Heart size={20} color={userReactions.helpful ? theme.colors.error : theme.colors.textSecondary} fill={userReactions.helpful ? theme.colors.error : "transparent"} />
                <TouchableOpacity 
                  onPress={() => !isRedactedMode && fetchLikers('helpful').then(() => setShowLikersModal(true))}
                  disabled={isRedactedMode}
                >
                  <Text style={dynamicStyles.actionText}>{helpfulCount}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => !isRedactedMode && onReaction(item.id, "superlike", userReactions.superlike)} 
                style={styles.actionBtn}
                disabled={isRedactedMode}
              >
                <Star size={20} color={userReactions.superlike ? "#FBBF24" : theme.colors.textSecondary} fill={userReactions.superlike ? "#FBBF24" : "transparent"} />
                <TouchableOpacity 
                  onPress={() => !isRedactedMode && fetchLikers('superlike').then(() => setShowSuperlikersModal(true))}
                  disabled={isRedactedMode}
                >
                  <Text style={dynamicStyles.actionText}>{superlikeCount}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
  
              <TouchableOpacity 
                onPress={() => !isRedactedMode && onShare(item)} 
                style={styles.actionBtn}
                disabled={isRedactedMode}
              >
                <ShareIcon size={20} color={theme.colors.textSecondary} />
                <Text style={dynamicStyles.actionText}>{item.share_count || 0}</Text>
              </TouchableOpacity>

            </View>
            <TouchableOpacity 
              onPress={() => !isRedactedMode && onReaction(item.id, "fake", userReactions.fake)}
              disabled={isRedactedMode}
            >
              <Flag size={18} color={userReactions.fake ? theme.colors.error : theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {isExpanded && !isCurrentlyBlurred && !item.comments_disabled && (
          <View style={styles.commentsSection}>
            {loadingComments ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.commentList}>
                {/* Render parent comments first, then replies nested under them */}
                {comments.filter(c => c && !c.parent_comment_id).map(c => {
                  const replies = comments.filter(r => r && r.parent_comment_id === c.id);
                  const likeData = commentLikes[c.id] || { count: 0, userLiked: false };
                  
                  return (
                    <View key={c.id}>
                      <TouchableOpacity 
                        style={styles.commentRow}
                        onLongPress={() => {
                          if (user?.id && c.user_id !== user.id) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setCommentToReport(c);
                            setCommentReportReason("");
                            setShowCommentReportModal(true);
                          }
                        }}
                        delayLongPress={500}
                      >
                        <TouchableOpacity 
                          style={styles.commentAvatarContainer}
                          onPress={() => {
                            if (!c.is_anonymous && c.user?.id) {
                              router.push(`/profile?userId=${c.user_id}`);
                            }
                          }}
                          disabled={c.is_anonymous}
                        >
                          {c.is_anonymous ? (
                            <View style={[styles.miniAvatar, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                              <User size={12} color={theme.colors.textSecondary} />
                            </View>
                          ) : (
                            c.user?.avatar_url ? (
                              <Image source={{ uri: c.user.avatar_url }} style={styles.miniAvatar} />
                            ) : (
                              <Text style={styles.miniEmojiAvatar}>{c.user?.emoji_icon || "👤"}</Text>
                            )
                          )}
                        </TouchableOpacity>
                        <View style={styles.commentContent}>
                          <View style={[styles.commentBubble, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.commentUserRow}>
                              <Text style={dynamicStyles.commentUser}>
                                {c.is_anonymous ? (c.nickname || "Anonymous") : c.user?.username}
                              </Text>
                              {!c.is_anonymous && c.user?.is_admin && (
                                <View style={[styles.roleBadgeSmall, styles.adminBadge]}>
                                  <Text style={styles.roleBadgeTextSmall}>Admin</Text>
                                </View>
                              )}
                              {!c.is_anonymous && c.user?.is_moderator && !c.user?.is_admin && (
                                <View style={[styles.roleBadgeSmall, styles.modBadge]}>
                                  <Text style={styles.roleBadgeTextSmall}>Mod</Text>
                                </View>
                              )}
                              {!c.is_anonymous && c.user?.is_councillor && (item.city_id === c.user?.councillor_city_id || item.zone?.city_id === c.user?.councillor_city_id) && (
                                <View style={[styles.roleBadgeSmall, styles.councillorBadge]}>
                                  <Text style={styles.roleBadgeTextSmall}>Councillor</Text>
                                </View>
                              )}
                            </View>
                            {c.text ? <Text style={dynamicStyles.commentText}>{c.text}</Text> : null}
                            {c.gif_url && (
                              <Image 
                                source={{ uri: c.gif_url }} 
                                style={styles.commentGif} 
                                contentFit="contain"
                              />
                            )}
                            <View style={styles.commentActions}>
                              <TouchableOpacity 
                                style={styles.commentActionBtn}
                                onPress={() => handleLikeComment(c.id)}
                              >
                                <Heart 
                                  size={14} 
                                  color={likeData.userLiked ? theme.colors.error : theme.colors.textSecondary} 
                                  fill={likeData.userLiked ? theme.colors.error : 'transparent'}
                                />
                                {likeData.count > 0 && (
                                  <Text style={[styles.commentActionText, { color: likeData.userLiked ? theme.colors.error : theme.colors.textSecondary }]}>
                                    {likeData.count}
                                  </Text>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.commentActionBtn}
                                onPress={() => {
                                  setReplyingTo(c);
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                              >
                                <MessageSquare size={14} color={theme.colors.textSecondary} />
                                <Text style={[styles.commentActionText, { color: theme.colors.textSecondary }]}>Reply</Text>
                              </TouchableOpacity>
                              <Text style={[styles.commentTime, { color: theme.colors.textSecondary, marginLeft: 'auto' }]}>{getTimeAgo(new Date(c.created_at))}</Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                      
                      {/* Render replies */}
                      {replies.map(reply => {
                        const replyLikeData = commentLikes[reply.id] || { count: 0, userLiked: false };
                        return (
                          <TouchableOpacity 
                            key={reply.id}
                            style={[styles.commentRow, styles.replyRow]}
                            onLongPress={() => {
                              if (user?.id && reply.user_id !== user.id) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setCommentToReport(reply);
                                setCommentReportReason("");
                                setShowCommentReportModal(true);
                              }
                            }}
                            delayLongPress={500}
                          >
                            <TouchableOpacity 
                              style={styles.commentAvatarContainer}
                              onPress={() => {
                                if (!reply.is_anonymous && reply.user?.id) {
                                  router.push(`/profile?userId=${reply.user_id}`);
                                }
                              }}
                              disabled={reply.is_anonymous}
                            >
                              {reply.is_anonymous ? (
                                <View style={[styles.miniAvatar, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                  <User size={10} color={theme.colors.textSecondary} />
                                </View>
                              ) : (
                                reply.user?.avatar_url ? (
                                  <Image source={{ uri: reply.user.avatar_url }} style={[styles.miniAvatar, { width: 20, height: 20 }]} />
                                ) : (
                                  <Text style={[styles.miniEmojiAvatar, { fontSize: 14 }]}>{reply.user?.emoji_icon || "👤"}</Text>
                                )
                              )}
                            </TouchableOpacity>
                            <View style={styles.commentContent}>
                              <View style={[styles.commentBubble, { backgroundColor: theme.colors.surface }]}>
                                <View style={styles.commentUserRow}>
                                  <Text style={[dynamicStyles.commentUser, { fontSize: 12 }]}>
                                    {reply.is_anonymous ? (reply.nickname || "Anonymous") : reply.user?.username}
                                  </Text>
                                </View>
                                {reply.text ? <Text style={[dynamicStyles.commentText, { fontSize: 13 }]}>{reply.text}</Text> : null}
                                {reply.gif_url && (
                                  <Image 
                                    source={{ uri: reply.gif_url }} 
                                    style={[styles.commentGif, { maxHeight: 80 }]} 
                                    contentFit="contain"
                                  />
                                )}
                                <View style={styles.commentActions}>
                                  <TouchableOpacity 
                                    style={styles.commentActionBtn}
                                    onPress={() => handleLikeComment(reply.id)}
                                  >
                                    <Heart 
                                      size={12} 
                                      color={replyLikeData.userLiked ? theme.colors.error : theme.colors.textSecondary} 
                                      fill={replyLikeData.userLiked ? theme.colors.error : 'transparent'}
                                    />
                                    {replyLikeData.count > 0 && (
                                      <Text style={[styles.commentActionText, { color: replyLikeData.userLiked ? theme.colors.error : theme.colors.textSecondary, fontSize: 10 }]}>
                                        {replyLikeData.count}
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                  <Text style={[styles.commentTime, { color: theme.colors.textSecondary, marginLeft: 'auto', fontSize: 10 }]}>{getTimeAgo(new Date(reply.created_at))}</Text>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}
              
              <View style={styles.inputRow}>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {replyingTo && (
                      <View style={[styles.replyingToBar, { backgroundColor: theme.colors.primary + '20', borderLeftColor: theme.colors.primary }]}>
                        <Text style={[styles.replyingToText, { color: theme.colors.primary }]}>
                          Replying to @{replyingTo.is_anonymous ? 'Anonymous' : replyingTo.user?.username}
                        </Text>
                        <TouchableOpacity onPress={() => setReplyingTo(null)}>
                          <X size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {selectedGif && (
                      <View style={styles.gifPreviewContainer}>
                        <Image 
                          source={{ uri: selectedGif.url }} 
                          style={styles.gifPreview} 
                          contentFit="contain"
                        />
                        <TouchableOpacity 
                          onPress={() => setSelectedGif(null)} 
                          style={styles.gifRemoveBtn}
                        >
                          <X size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                    <TextInput 
                      style={dynamicStyles.input} 
                      placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} 
                      placeholderTextColor={theme.colors.textSecondary}
                      value={commentText} 
                      onChangeText={setCommentText}
                      multiline
                    />
                    <View style={[styles.inputActions, { borderTopColor: theme.colors.border }]}>
                      <TouchableOpacity 
                        onPress={() => {
                          setIsAnonComment(!isAnonComment);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }} 
                        style={[
                          styles.anonToggleBtn,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          isAnonComment && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        ]}
                      >
                        <User size={14} color={isAnonComment ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (Platform.OS === 'web') {
                              setShowWebGifPicker(!showWebGifPicker);
                            } else {
                              GiphyDialog.show();
                            }
                          }} 

                        style={[
                          styles.gifToggleBtn,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          selectedGif && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: selectedGif ? (isLight ? "#FFF" : "#000") : theme.colors.textSecondary }}>GIF</Text>
                      </TouchableOpacity>
                      {isAnonComment && (
                        <Text style={[styles.anonLabel, { color: theme.colors.primary }]}>
                          {userNickname || "Anon"}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={handleSendComment} 
                    style={[styles.sendBtn, { backgroundColor: theme.colors.primary }, (!commentText.trim() && !selectedGif) && { opacity: 0.5 }]}
                    disabled={!commentText.trim() && !selectedGif}
                  >
                    <Send size={18} color={isLight ? "#FFF" : "#000"} />
                  </TouchableOpacity>
                </View>
                <WebGifPicker 
                  visible={showWebGifPicker} 
                  onSelect={(gif) => setSelectedGif(gif)} 
                  onClose={() => setShowWebGifPicker(false)} 
                />
            </View>
          )}
        </View>
  
        {isExpanded && item.comments_disabled && !isBlurredByMod && (
            <View style={[styles.commentsDisabledBanner, { backgroundColor: theme.colors.surface }]}>
              <MessageSquareOff size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.commentsDisabledText, { color: theme.colors.textSecondary }]}>Comments are disabled on this post</Text>
            </View>
          )}


          <Modal visible={showFullImage} transparent animationType="fade">
          <View style={styles.fullImageOverlay}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowFullImage(false)}><X color="#FFF" size={32} /></TouchableOpacity>
            {isVideo ? (
              <FullVideoPlayer url={images[currentImageIndex]} style={styles.fullMedia} />
            ) : (
              <Image source={{ uri: images[currentImageIndex] }} style={styles.fullMedia} contentFit="contain" />
            )}
          </View>
        </Modal>

        <Modal visible={showLikersModal || showSuperlikersModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={dynamicStyles.modalTitle}>{showSuperlikersModal ? 'Superlikes' : 'Likes'}</Text>
                <TouchableOpacity onPress={() => { setShowLikersModal(false); setShowSuperlikersModal(false); }}>
                  <X color={theme.colors.text} size={24} />
                </TouchableOpacity>
              </View>
              
              {loadingLikers ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : (
                <View>
                    {(showSuperlikersModal ? superlikers : likers).map((u, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={styles.userRow} 
                        onPress={() => { 
                          if (u.supabase_uid) {
                            setShowLikersModal(false); 
                            setShowSuperlikersModal(false); 
                            router.push(`/profile?userId=${u.id}`); 
                          }
                        }}
                        disabled={!u.supabase_uid}
                      >
                        {u.avatar_url ? (
                          <Image source={{ uri: u.avatar_url }} style={styles.userAvatar} />
                        ) : (
                          <Text style={styles.userEmoji}>{u.emoji_icon || '👤'}</Text>
                        )}
                        <Text style={dynamicStyles.userName}>@{u.username}</Text>
                      </TouchableOpacity>
                    ))}
                  {(showSuperlikersModal ? superlikers : likers).length === 0 && (
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No reactions yet</Text>
                  )}
                </View>
              )}
            </View>
            </View>
          </Modal>
  
            <Modal visible={showModMenu} transparent animationType="slide">
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModMenu(false)}>
                <View style={[styles.modMenuContent, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.modMenuTitle, { color: theme.colors.text }]}>{isModOrAdmin ? "Moderator Actions" : "Post Options"}</Text>
                  
                  <TouchableOpacity style={styles.modMenuItem} onPress={() => { handleModAction('delete'); }}>
                    <Trash2 size={20} color={theme.colors.error} />
                    <Text style={[styles.modMenuText, { color: theme.colors.error }]}>Delete Post</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.modMenuItem} onPress={() => { handleModAction('toggle_comments'); }}>
                    <MessageSquareOff size={20} color={theme.colors.textSecondary} />
                    <Text style={[styles.modMenuText, { color: theme.colors.text }]}>{item.comments_disabled ? 'Enable Comments' : 'Disable Comments'}</Text>
                  </TouchableOpacity>
                  
                  {isModOrAdmin && (
                    <TouchableOpacity style={styles.modMenuItem} onPress={() => { setShowModMenu(false); setShowBlurModal(true); }}>
                      <EyeOff size={20} color="#FBBF24" />
                      <Text style={[styles.modMenuText, { color: '#FBBF24' }]}>Blur Post</Text>
                    </TouchableOpacity>
                  )}
  
                  {isModOrAdmin && item.is_blurred && (
                    <TouchableOpacity style={styles.modMenuItem} onPress={() => { handleModAction('unblur'); }}>
                      <EyeOff size={20} color="#10B981" />
                      <Text style={[styles.modMenuText, { color: '#10B981' }]}>Remove Blur</Text>
                    </TouchableOpacity>
                  )}

                  {!isOwner && !item.is_anonymous && (
                    <TouchableOpacity style={styles.modMenuItem} onPress={() => { setShowModMenu(false); setBlockReason(""); setShowBlockModal(true); }}>
                      <UserX size={20} color={theme.colors.error} />
                      <Text style={[styles.modMenuText, { color: theme.colors.error }]}>Block User</Text>
                    </TouchableOpacity>
                  )}

                  {!isOwner && user?.id && (
                    <TouchableOpacity style={styles.modMenuItem} onPress={() => { setShowModMenu(false); setReportReason(""); setShowReportModal(true); }}>
                      <Flag size={20} color="#F59E0B" />
                      <Text style={[styles.modMenuText, { color: '#F59E0B' }]}>Report Post</Text>
                    </TouchableOpacity>
                  )}
                
                <TouchableOpacity style={[styles.modMenuItem, styles.modMenuCancel]} onPress={() => setShowModMenu(false)}>
                  <Text style={[styles.modMenuCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
  
          <Modal visible={showBlurModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={[styles.blurModalContent, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.modMenuTitle, { color: theme.colors.text }]}>Blur Post</Text>
                <Text style={[styles.blurModalSubtitle, { color: theme.colors.textSecondary }]}>Enter a reason that will be shown to users</Text>
                
                <TextInput
                  style={[styles.blurReasonInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                  placeholder="Reason for blurring..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={blurReasonInput}
                  onChangeText={setBlurReasonInput}
                  multiline
                />
                
                <View style={styles.blurModalButtons}>
                  <TouchableOpacity style={[styles.blurModalCancel, { backgroundColor: theme.colors.surface }]} onPress={() => { setShowBlurModal(false); setBlurReasonInput(""); }}>
                    <Text style={[styles.blurModalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.blurModalConfirm, !blurReasonInput.trim() && { opacity: 0.5 }]} 
                    onPress={handleBlurPost}
                    disabled={!blurReasonInput.trim()}
                  >
                    <Text style={[styles.blurModalConfirmText, { color: isLight ? '#FFF' : '#000' }]}>Blur Post</Text>
                  </TouchableOpacity>
                </View>
                </View>
              </View>
            </Modal>

            <Modal visible={showBlockModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.blurModalContent, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.modMenuTitle, { color: theme.colors.text }]}>Block @{item.user?.username}</Text>
                  <Text style={[styles.blurModalSubtitle, { color: theme.colors.textSecondary }]}>
                    This user and their content will be hidden. This also reports the post.
                  </Text>
                  
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
                    Select a reason
                  </Text>
                  {BLOCK_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setBlockReason(reason)}
                      style={[
                        styles.blockReasonOption,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                        blockReason === reason && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, flex: 1 }}>{reason}</Text>
                      {blockReason === reason && <X size={16} color={theme.colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />}
                    </TouchableOpacity>
                  ))}
                  
                  <View style={styles.blurModalButtons}>
                    <TouchableOpacity style={[styles.blurModalCancel, { backgroundColor: theme.colors.surface }]} onPress={() => { setShowBlockModal(false); setBlockReason(""); }}>
                      <Text style={[styles.blurModalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.blurModalConfirm, { backgroundColor: theme.colors.error }, !blockReason && { opacity: 0.5 }]} 
                      onPress={handleBlockFromPost}
                      disabled={!blockReason}
                    >
                      <Text style={[styles.blurModalConfirmText, { color: '#FFF' }]}>Block & Report</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal visible={showReportModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.blurModalContent, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.modMenuTitle, { color: theme.colors.text }]}>Report Post</Text>
                  <Text style={[styles.blurModalSubtitle, { color: theme.colors.textSecondary }]}>
                    Help us keep the community safe by reporting inappropriate content.
                  </Text>
                  
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
                    Select a reason
                  </Text>
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setReportReason(reason)}
                      style={[
                        styles.blockReasonOption,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                        reportReason === reason && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, flex: 1 }}>{reason}</Text>
                      {reportReason === reason && <X size={16} color={theme.colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />}
                    </TouchableOpacity>
                  ))}
                  
                  <View style={styles.blurModalButtons}>
                    <TouchableOpacity style={[styles.blurModalCancel, { backgroundColor: theme.colors.surface }]} onPress={() => { setShowReportModal(false); setReportReason(""); }}>
                      <Text style={[styles.blurModalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.blurModalConfirm, { backgroundColor: '#F59E0B' }, !reportReason && { opacity: 0.5 }]} 
                      onPress={handleReportPost}
                      disabled={!reportReason}
                    >
                      <Text style={[styles.blurModalConfirmText, { color: '#FFF' }]}>Submit Report</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal visible={showCommentReportModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.blurModalContent, { backgroundColor: theme.colors.background }]}>
                  <Text style={[styles.modMenuTitle, { color: theme.colors.text }]}>Report Comment</Text>
                  <Text style={[styles.blurModalSubtitle, { color: theme.colors.textSecondary }]}>
                    Help us keep the community safe by reporting inappropriate comments.
                  </Text>
                  
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
                    Select a reason
                  </Text>
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setCommentReportReason(reason)}
                      style={[
                        styles.blockReasonOption,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                        commentReportReason === reason && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, flex: 1 }}>{reason}</Text>
                      {commentReportReason === reason && <X size={16} color={theme.colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />}
                    </TouchableOpacity>
                  ))}
                  
                  <View style={styles.blurModalButtons}>
                    <TouchableOpacity style={[styles.blurModalCancel, { backgroundColor: theme.colors.surface }]} onPress={() => { setShowCommentReportModal(false); setCommentToReport(null); setCommentReportReason(""); }}>
                      <Text style={[styles.blurModalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.blurModalConfirm, { backgroundColor: '#F59E0B' }, !commentReportReason && { opacity: 0.5 }]} 
                      onPress={handleReportComment}
                      disabled={!commentReportReason}
                    >
                      <Text style={[styles.blurModalConfirmText, { color: '#FFF' }]}>Submit Report</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal visible={showModMenu} transparent animationType="slide">
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModMenu(false)}>
              <View style={styles.modMenuContent}>
                <Text style={styles.modMenuTitle}>{isModOrAdmin ? "Moderator Actions" : "Post Options"}</Text>
                
                <TouchableOpacity style={styles.modMenuItem} onPress={() => { handleModAction('delete'); }}>
                  <Trash2 size={20} color={theme.colors.error} />
                  <Text style={[styles.modMenuText, { color: theme.colors.error }]}>Delete Post</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modMenuItem} onPress={() => { handleModAction('toggle_comments'); }}>
                  <MessageSquareOff size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.modMenuText}>{item.comments_disabled ? 'Enable Comments' : 'Disable Comments'}</Text>
                </TouchableOpacity>
                
                {isModOrAdmin && (
                  <TouchableOpacity style={styles.modMenuItem} onPress={() => { setShowModMenu(false); setShowBlurModal(true); }}>
                    <EyeOff size={20} color="#FBBF24" />
                    <Text style={[styles.modMenuText, { color: '#FBBF24' }]}>Blur Post</Text>
                  </TouchableOpacity>
                )}

                {isModOrAdmin && item.is_blurred && (
                  <TouchableOpacity style={styles.modMenuItem} onPress={() => { handleModAction('unblur'); }}>
                    <EyeOff size={20} color="#10B981" />
                    <Text style={[styles.modMenuText, { color: '#10B981' }]}>Remove Blur</Text>
                  </TouchableOpacity>
                )}
              
              <TouchableOpacity style={[styles.modMenuItem, styles.modMenuCancel]} onPress={() => setShowModMenu(false)}>
                <Text style={styles.modMenuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showBlurModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.blurModalContent}>
              <Text style={styles.modMenuTitle}>Blur Post</Text>
              <Text style={styles.blurModalSubtitle}>Enter a reason that will be shown to users</Text>
              
              <TextInput
                style={styles.blurReasonInput}
                placeholder="Reason for blurring..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={blurReasonInput}
                onChangeText={setBlurReasonInput}
                multiline
              />
              
              <View style={styles.blurModalButtons}>
                <TouchableOpacity style={styles.blurModalCancel} onPress={() => { setShowBlurModal(false); setBlurReasonInput(""); }}>
                  <Text style={styles.blurModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.blurModalConfirm, !blurReasonInput.trim() && { opacity: 0.5 }]} 
                  onPress={handleBlurPost}
                  disabled={!blurReasonInput.trim()}
                >
                  <Text style={styles.blurModalConfirmText}>Blur Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: defaultTheme.colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      paddingBottom: 8,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    headerInfo: { flex: 1 },
    username: { fontSize: 15, fontWeight: '700', color: defaultTheme.colors.text },
    meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    metaText: { fontSize: 12, color: defaultTheme.colors.textSecondary, marginTop: 2 },
    metaLink: { fontSize: 12, color: defaultTheme.colors.textSecondary, fontWeight: '600' },
    roleBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 4,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFF',
      textTransform: 'uppercase',
    },
    adminBadge: {
      backgroundColor: '#DC2626',
    },
    modBadge: {
      backgroundColor: '#7C3AED',
    },
    councillorBadge: {
      backgroundColor: '#0891B2',
    },
    roleBadgeSmall: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      marginLeft: 4,
    },
    roleBadgeTextSmall: {
      fontSize: 8,
      fontWeight: '700',
      color: '#FFF',
      textTransform: 'uppercase',
    },
    commentUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 2,
    },
    body: { marginBottom: 12, paddingHorizontal: 12 },
    title: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: defaultTheme.colors.text },
    bodyText: { fontSize: 15, color: defaultTheme.colors.text, lineHeight: 22 },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      marginBottom: 16,
      gap: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginHorizontal: 15,
    },
    ctaButtonText: {
      fontSize: 15,
      fontWeight: '800',
    },
    mainContent: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    sideMediaContainer: {
      width: 80,
      height: 80,
      borderRadius: 8,
      overflow: 'hidden',
      marginLeft: 12,
    },
    sideMedia: {
      width: '100%',
      height: '100%',
    },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 },
    actions: { flexDirection: 'row', gap: 24 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { fontSize: 14, color: defaultTheme.colors.textSecondary },
    blurBanner: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 20, borderRadius: 12, alignItems: 'center', flexDirection: 'row', gap: 10 },
    blurText: { fontWeight: 'bold' },
    fullImageOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullMedia: { width: '100%', height: '80%' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: defaultTheme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: defaultTheme.colors.text },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    userAvatar: { width: 36, height: 36, borderRadius: 18 },
    userEmoji: { fontSize: 28 },
    userName: { fontSize: 15, color: defaultTheme.colors.text, fontWeight: '600' },
    emptyText: { color: defaultTheme.colors.textSecondary, textAlign: 'center', marginTop: 20 },
    anonToggleBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: defaultTheme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: defaultTheme.colors.border,
    },
    anonToggleBtnActive: {
      backgroundColor: defaultTheme.colors.primary,
      borderColor: defaultTheme.colors.primary,
    },
    anonLabel: {
      fontSize: 12,
      color: defaultTheme.colors.primary,
      fontWeight: '600',
    },
    commentsSection: { 
      marginTop: 15, 
      borderTopWidth: 1, 
      borderTopColor: defaultTheme.colors.border, 
      paddingTop: 15 
    },
    commentList: {
      marginBottom: 15,
    },
    commentRow: {
      flexDirection: 'row',
      marginBottom: 12,
      gap: 10,
    },
    commentAvatarContainer: {
      paddingTop: 4,
    },
    miniAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    miniEmojiAvatar: {
      fontSize: 18,
    },
    commentContent: {
      flex: 1,
    },
    commentBubble: {
      backgroundColor: defaultTheme.colors.surface,
      padding: 10,
      borderRadius: 15,
      borderTopLeftRadius: 2,
    },
    commentUser: {
      fontSize: 12,
      fontWeight: '700',
      color: defaultTheme.colors.primary,
      marginBottom: 2,
    },
    commentText: {
      fontSize: 14,
      color: defaultTheme.colors.text,
      lineHeight: 18,
    },
    commentGif: {
      width: '100%',
      height: 150,
      borderRadius: 8,
      marginTop: 8,
    },
    commentTime: {
      fontSize: 10,
      color: defaultTheme.colors.textSecondary,
      marginTop: 4,
      marginLeft: 4,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-end',
    },
    inputWrapper: {
      flex: 1,
      backgroundColor: defaultTheme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: defaultTheme.colors.border,
    },
    input: {
      fontSize: 14,
      maxHeight: 100,
      paddingTop: Platform.OS === 'ios' ? 4 : 0,
    },
    inputActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: defaultTheme.colors.border,
      paddingTop: 6,
    },
    sendBtn: {
      backgroundColor: defaultTheme.colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
    },
    gifToggleBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: defaultTheme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: defaultTheme.colors.border,
    },
    gifPreviewContainer: {
      marginBottom: 8,
      position: 'relative',
    },
    gifPreview: {
      width: '100%',
      height: 120,
      borderRadius: 12,
    },
    gifRemoveBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modBlurBanner: {
      backgroundColor: '#DC2626',
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 15,
    },
      modBlurText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
        flex: 1,
      },
      blurTextContent: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
      },
    commentsDisabledBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      marginHorizontal: 15,
      marginTop: 10,
      backgroundColor: defaultTheme.colors.surface,
      borderRadius: 8,
    },
      commentsDisabledText: {
        color: defaultTheme.colors.textSecondary,
        fontSize: 13,
      },
      redactedAvatar: {
        backgroundColor: defaultTheme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
      },
      redactedHeaderContainer: {
        flex: 1,
      },
      redactedBar: {
        backgroundColor: defaultTheme.colors.border,
        borderRadius: 2,
      },
        blurredContentWrapper: {
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 12,
          padding: 15,
        },
      modBlurOverlay: {
        alignItems: 'center',
        gap: 8,
      },
      communityBlurOverlay: {
        alignItems: 'center',
        gap: 8,
      },
        tapToRevealText: {
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 4,
          fontWeight: '600',
        },
        greyedOutText: {
          color: defaultTheme.colors.textSecondary,
        },
        modMenuContent: {
      backgroundColor: defaultTheme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    modMenuTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: defaultTheme.colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    modMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: defaultTheme.colors.border,
    },
    modMenuText: {
      fontSize: 16,
      color: defaultTheme.colors.text,
      fontWeight: '500',
    },
    modMenuCancel: {
      marginTop: 10,
      borderBottomWidth: 0,
      justifyContent: 'center',
    },
    modMenuCancelText: {
      fontSize: 16,
      color: defaultTheme.colors.textSecondary,
      textAlign: 'center',
      width: '100%',
    },
    blurModalContent: {
      backgroundColor: defaultTheme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    blurModalSubtitle: {
      fontSize: 14,
      color: defaultTheme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    blurReasonInput: {
      backgroundColor: defaultTheme.colors.surface,
      borderRadius: 12,
      padding: 15,
      color: defaultTheme.colors.text,
      fontSize: 15,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    blurModalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    blurModalCancel: {
      flex: 1,
      padding: 15,
      borderRadius: 12,
      backgroundColor: defaultTheme.colors.surface,
      alignItems: 'center',
    },
    blurModalCancelText: {
      color: defaultTheme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    blurModalConfirm: {
      flex: 1,
      padding: 15,
      borderRadius: 12,
      backgroundColor: '#DC2626',
      alignItems: 'center',
    },
    blurModalConfirmText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    highlightedContainer: {
      borderWidth: 2,
      borderColor: defaultTheme.colors.primary,
      borderRadius: 16,
      backgroundColor: 'rgba(168, 216, 78, 0.08)',
    },
    blockReasonOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    },
    commentActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentActionText: {
      fontSize: 12,
      fontWeight: '500',
    },
    replyRow: {
      marginLeft: 32,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: 'rgba(255,255,255,0.1)',
    },
    replyingToBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderRadius: 4,
    },
    replyingToText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 84600) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 84600)}d ago`;
}
