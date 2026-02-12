import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable,
  FlatList, 
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { X, Bell, CheckCircle, MessageSquare, Shield, Info, UserPlus, Check, X as XIcon, Trash2, Heart, Star, AlertTriangle, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNotifications, markAsRead, markAllAsRead } from '@/utils/notifications';
import { getStoredUser } from '@/utils/user';
import { supabase } from '@/utils/supabase';
import { useTheme } from "@/utils/ThemeContext";
import { acceptFriendRequest, rejectFriendRequest } from '@/utils/friends';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { MotiView, AnimatePresence } from 'moti';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/utils/auth';

const alertSound = require('../../assets/sounds/alert.mp3');

const playAlertSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(alertSound);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing alert sound:', error);
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NotificationPanel({ visible, onClose }) {
  const { isHippie, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const wasVisible = useRef(visible);
  const [reportDetailModal, setReportDetailModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const handleClick = () => onClose();
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick);
    };
  }, [visible, onClose]);

  useEffect(() => {
    let sub;
    if (visible) {
      handleMarkAllAsRead();
      loadNotifications();
      
      const setupSubscription = async () => {
        const user = await getStoredUser();
        if (!user) return;
        
        sub = supabase
          .channel(`notification_list_${user.id}`)
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'rnotifications',
              filter: `user_id=eq.${user.id}`
            }, 
            payload => {
                setNotifications(prev => [payload.new, ...prev]);
                playAlertSound();
                handleMarkAsRead(payload.new.id);
              }
          )
          .subscribe();
      };
      
      setupSubscription();
    } else if (wasVisible.current && !visible) {
      handleMarkAllAsRead();
    }
    
    wasVisible.current = visible;

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [visible]);

  const loadNotifications = async () => {
    setLoading(true);
    const user = await getStoredUser();
    if (user) {
      await markAllAsRead(user.id);
      const data = await fetchNotifications(user.id);
      
      // Check which friend requests have already been accepted/rejected
      const friendRequestNotifs = data.filter(n => n.type === 'friend_request' && n.metadata?.requestId);
      if (friendRequestNotifs.length > 0) {
        const requestIds = friendRequestNotifs.map(n => n.metadata.requestId);
        const { data: friendRows } = await supabase
          .from('friends')
          .select('id, status')
          .in('id', requestIds);
        
        const handledIds = new Set(
          (friendRows || []).filter(f => f.status === 'accepted' || f.status === 'rejected').map(f => f.id)
        );
        
        const enriched = data.map(n => {
          if (n.type === 'friend_request' && n.metadata?.requestId && handledIds.has(n.metadata.requestId)) {
            return { ...n, _handled: true, is_read: true };
          }
          return n;
        });
        setNotifications(enriched);
      } else {
        setNotifications(data);
      }
    }
    setLoading(false);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => 
      n.type === 'friend_request' ? n : { ...n, is_read: true }
    ));
    
    const user = await getStoredUser();
    if (user) {
      await markAllAsRead(user.id);
    }
  };

  const handleMarkAsRead = async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { success } = await markAsRead(id);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const onAcceptFriend = async (notification) => {
    if (!notification.metadata?.requestId) return;
    const user = await getStoredUser();
    if (!user) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { success } = await acceptFriendRequest(
      notification.metadata.requestId,
      user.id,
      notification.metadata.senderId,
      user.username
    );
    
    if (success) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true, _handled: true } : n
      ));
      handleMarkAsRead(notification.id);
    }
  };

  const onRejectFriend = async (notification) => {
    if (!notification.metadata?.requestId) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { success } = await rejectFriendRequest(notification.metadata.requestId);
    
    if (success) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true, _handled: true } : n
      ));
      handleMarkAsRead(notification.id);
    }
  };

  const handleNotificationPress = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleMarkAsRead(item.id);
    
    const type = item.type;
    const metadata = item.metadata || {};
    const link = item.link;

    // Moderation action notifications - show detail modal
    if (type === 'moderation_action' || item.title?.includes('Report')) {
      setSelectedNotification(item);
      setReportDetailModal(true);
      return;
    }

    // Call notifications - open chat and show call
    if (type === 'call') {
      onClose();
      setTimeout(() => {
        if (metadata.chatId) {
          useChatStore.getState().setActiveChatId(metadata.chatId);
        }
        useChatStore.getState().open();
        if (metadata.callId) {
          useChatStore.getState().setPendingCallAction('show', metadata.callId);
        }
      }, 100);
      return;
    }

    // Help/support notifications - go to Help screen
    if (type === 'help_chat' || type === 'help_message') {
      onClose();
      setTimeout(() => router.push('/help'), 100);
      return;
    }

    // Staff/admin action notifications
    if (type === 'staff_admin_action') {
      onClose();
      setTimeout(() => router.push('/admin-page-gYI'), 100);
      return;
    }

    // Chat/message notifications - open chat
    if (type === 'chat' || type === 'message') {
      onClose();
      setTimeout(() => {
        if (metadata.chatId) {
          useChatStore.getState().setActiveChatId(metadata.chatId);
        }
        useChatStore.getState().open();
      }, 100);
      return;
    }

    // Reaction notifications (likes, superlikes) - go to post
    if (type === 'reaction' || type === 'like' || type === 'superlike' || item.title?.includes('liked') || item.title?.includes('reaction')) {
      onClose();
      if (metadata.postId) {
        setTimeout(() => router.push(`/?highlightPost=${metadata.postId}`), 100);
      }
      return;
    }

    // Comment notifications - go to post
    if (type === 'comment' || item.title?.includes('commented')) {
      onClose();
      if (metadata.postId) {
        setTimeout(() => router.push(`/?highlightPost=${metadata.postId}`), 100);
      }
      return;
    }

    // Friend request accepted - go to their profile
    if (type === 'friend_accepted' || item.title?.includes('accepted')) {
      onClose();
      if (metadata.friendId) {
        setTimeout(() => router.push(`/profile?userId=${metadata.friendId}`), 100);
      }
      return;
    }

    // Showcase notifications - go to showcase
    if (type === 'showcase' || item.title?.includes('Showcase') || item.title?.includes('Business') || item.title?.includes('Talent')) {
      onClose();
      setTimeout(() => router.push('/(tabs)/showcase'), 100);
      return;
    }

    // Post approved/rejected - go to feed or guidelines
    if (item.title?.includes('Post Approved')) {
      onClose();
      setTimeout(() => router.push('/'), 100);
      return;
    }

    // Generic link handling
    if (link) {
      onClose();
      setTimeout(() => router.push(link), 100);
      return;
    }
  };

  const renderItem = ({ item }) => {
    let Icon = Info;
    let iconColor = isHippie ? "#93C5FD" : "#60A5FA";

    if (item.type === 'help_chat' || item.type === 'help_message') {
      Icon = MessageSquare;
      iconColor = isHippie ? "#FDE047" : "#FBBF24";
    } else if (item.type === 'staff_admin_action') {
      Icon = Shield;
      iconColor = isHippie ? "#A7F3D0" : "#4ADE80";
    } else if (item.type === 'moderation') {
      Icon = Shield;
      iconColor = item.title.includes('Approved') ? (isHippie ? "#86EFAC" : "#4ADE80") : (isHippie ? "#FCA5A5" : "#EF4444");
    } else if (item.type === 'friend_request') {
      Icon = UserPlus;
      iconColor = isHippie ? "#C4B5FD" : "#A78BFA";
    }

    const isFriendRequest = item.type === 'friend_request' && !item._handled;

    return (
      <View style={[styles.notificationItem, !item.is_read && styles.unreadItem, isHippie && styles.hippieItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: isHippie ? 'rgba(255,255,255,0.1)' : `${iconColor}20` }]}>
            <Icon size={16} color={iconColor} />
          </View>
          <View style={styles.contentBox}>
            <Text style={[styles.title, isHippie && styles.hippieTitle, { color: theme.colors.text }]}>{item.title}</Text>
            <Text style={[styles.message, isHippie && styles.hippieMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
            <Text style={[styles.time, isHippie && styles.hippieTime, { color: theme.colors.textSecondary + '80' }]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          {!item.is_read && <View style={[styles.unreadDot, isHippie && { backgroundColor: '#FDE047' }]} />}
        </TouchableOpacity>
        
        {isFriendRequest && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.acceptBtn, isHippie && { backgroundColor: '#FDE047' }]} 
              onPress={() => onAcceptFriend(item)}
            >
              <Check size={14} color="#000" />
              <Text style={[styles.actionBtnText, isHippie && { color: '#000' }]}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.declineBtn, isHippie && { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)' }]} 
              onPress={() => onRejectFriend(item)}
            >
              <XIcon size={14} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  const renderReportDetailModal = () => (
    <Modal visible={reportDetailModal} transparent animationType="fade" onRequestClose={() => setReportDetailModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.reportModalContent, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={styles.reportModalHeader}>
            <Shield size={24} color={selectedNotification?.title?.includes('Approved') || selectedNotification?.title?.includes('Restored') ? '#4ADE80' : '#F59E0B'} />
            <Text style={[styles.reportModalTitle, { color: theme.colors.text }]}>{selectedNotification?.title}</Text>
            <TouchableOpacity onPress={() => setReportDetailModal(false)} style={styles.reportModalClose}>
              <XIcon size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={[styles.reportModalMessage, { color: theme.colors.textSecondary }]}>
              {selectedNotification?.message}
            </Text>
            
            {selectedNotification?.metadata?.reason && (
              <View style={[styles.reportDetailBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.reportDetailLabel, { color: theme.colors.textSecondary }]}>Reason</Text>
                <Text style={[styles.reportDetailValue, { color: theme.colors.text }]}>{selectedNotification.metadata.reason}</Text>
              </View>
            )}
            
            {selectedNotification?.metadata?.action && (
              <View style={[styles.reportDetailBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.reportDetailLabel, { color: theme.colors.textSecondary }]}>Action Taken</Text>
                <Text style={[styles.reportDetailValue, { color: theme.colors.text }]}>{selectedNotification.metadata.action}</Text>
              </View>
            )}

            <Text style={[styles.reportTimestamp, { color: theme.colors.textSecondary }]}>
              {selectedNotification?.created_at && new Date(selectedNotification.created_at).toLocaleString()}
            </Text>
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.reportModalButton, { backgroundColor: theme.colors.primary }]} 
            onPress={() => setReportDetailModal(false)}
          >
            <Text style={styles.reportModalButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.dropdownWrapper}>
      {renderReportDetailModal()}
      <Pressable 
        style={StyleSheet.absoluteFill} 
        onPress={onClose} 
      />
      <AnimatePresence>
        {visible && (
          <MotiView
            onPress={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            from={{ translateY: -50, opacity: 0, scale: 0.95 }}
            animate={{ translateY: 0, opacity: 1, scale: 1 }}
            exit={{ translateY: -50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'timing', duration: 250 }}
            style={[
              styles.dropdownWindow, 
              { 
                top: insets.top + 60,
                right: 20,
                backgroundColor: isHippie ? '#1a1a1a' : theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 8,
                zIndex: 2001,
                overflow: 'hidden',
              }
            ]}
          >
            <BlurView intensity={80} tint={isHippie || theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>NOTIFICATIONS</Text>
              <TouchableOpacity onPress={handleMarkAllAsRead}>
                <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all as read</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>All caught up!</Text>
                  </View>
                }
                style={{ maxHeight: 400 }}
              />
            )}
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: 'transparent',
  },
  dropdownWindow: {
    position: 'absolute',
    right: 20,
    width: 320,
    maxWidth: SCREEN_WIDTH - 40,
    maxHeight: 500,
    borderRadius: 16,
    padding: 15,
    zIndex: 2001,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { pointerEvents: 'auto' } : {})
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  centered: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 10,
    gap: 10,
  },
  notificationItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  hippieItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0,
  },
  unreadItem: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contentBox: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  hippieTitle: {
    fontWeight: '800',
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  hippieMessage: {
    color: 'rgba(255,255,255,0.8)',
  },
  time: {
    fontSize: 10,
    fontWeight: '600',
  },
  hippieTime: {
    color: 'rgba(255,255,255,0.5)',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    paddingLeft: 46,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBtn: {
    backgroundColor: '#4ADE80',
  },
  declineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  reportModalClose: {
    padding: 4,
  },
  reportModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  reportDetailBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  reportDetailLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reportDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportTimestamp: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  reportModalButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  reportModalButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
