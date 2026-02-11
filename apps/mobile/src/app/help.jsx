import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Share, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Send, Sparkles, X, Maximize2, Image as ImageIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { supabase } from '@/utils/supabase';
import { getStoredUser } from '@/utils/user';
import { getAIAssistantResponse, generateImage, expandImage, moderateChatMessage } from '@/utils/ai';
import { encryptMessage, decryptMessage, isEncrypted } from '@/utils/chatEncryption';
import { sendNotification } from '@/utils/notifications';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';

import { useTheme } from "@/utils/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useLocationStore } from '@/utils/locationStore';

export default function HelpContact() {
  const { theme, isHippie, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const markdownStyles = useMemo(() => ({
    body: {
      color: theme.colors.text,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
    },
    strong: {
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    em: {
      fontStyle: 'italic',
      color: theme.colors.text,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 0,
    }
  }), [theme]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 2,
    },
    headerAction: {
      padding: 5,
    },
    headerActionText: {
      color: theme.colors.accent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },
    backButton: {
      padding: 5,
    },
    chatContent: {
      padding: 20,
      gap: 20,
    },
    messageWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginVertical: 4,
    },
    myMessageWrapper: {
      justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
      justifyContent: 'flex-start',
    },
    assistantAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(251,191,36,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.3)',
    },
    messageBubble: {
      maxWidth: '85%',
      padding: 18,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    myMessage: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    theirMessage: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
    },
    messageFooter: {
      marginTop: 8,
      alignItems: 'flex-end',
    },
    messageTime: {
      fontSize: 9,
      fontWeight: '700',
    },
    adminLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: '#FBBF24',
      letterSpacing: 1.5,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    generatedImage: {
      width: '100%',
      height: 250,
      borderRadius: 16,
      marginTop: 12,
    },
    inChatRatingContainer: {
      padding: 20,
      marginTop: 20,
    },
    ratingCard: {
      backgroundColor: theme.colors.surface,
      width: '100%',
      borderRadius: 30,
      padding: 30,
      alignItems: 'center',
    },
    ratingTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 2,
      textAlign: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 15,
      marginVertical: 30,
    },
    starButton: {
      padding: 5,
    },
    starText: {
      fontSize: 44,
      color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
    },
    starActive: {
      color: '#FBBF24',
    },
    ratingInput: {
      width: '100%',
      backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
      borderRadius: 15,
      padding: 20,
      color: theme.colors.text,
      fontSize: 15,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    ratingButtons: {
      width: '100%',
      marginTop: 30,
    },
    submitButton: {
      backgroundColor: theme.colors.text,
      paddingVertical: 18,
      borderRadius: 15,
      alignItems: 'center',
    },
    submitButtonText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 2,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 15,
      gap: 15,
      backgroundColor: 'transparent',
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 12,
      color: theme.colors.text,
      fontSize: 15,
      maxHeight: 120,
    },
    sendButton: {
      backgroundColor: '#FBBF24',
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: 100,
      alignItems: 'center',
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      marginTop: 20,
      marginBottom: 10,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 40,
      fontSize: 15,
      lineHeight: 22,
    },
    modalCloseOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalContent: {
      width: '90%',
      height: '80%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    modalImage: {
      width: '100%',
      height: '70%',
      borderRadius: 20,
    },
    modalActions: {
      marginTop: 30,
      width: '100%',
      alignItems: 'center',
    },
    expandButton: {
      backgroundColor: '#FBBF24',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 25,
      paddingVertical: 15,
      borderRadius: 30,
      gap: 10,
    },
    expandButtonDisabled: {
      opacity: 0.7,
    },
    expandButtonText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 2,
    },
  }), [theme, isLight]);

  const sanitizeMsg = (m) => {
    if (!m) return m;
    try {
      let content = typeof m.content === 'string' ? m.content : String(m.content || '');
      const wasEncrypted = isEncrypted(content);
      if (wasEncrypted && currentUser?.id) {
        content = decryptMessage(content, currentUser.id);
      }
      return JSON.parse(JSON.stringify({
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        content,
        is_from_admin: !!m.is_from_admin,
        created_at: m.created_at || new Date().toISOString(),
        status: m.status || null,
        resolved_at: m.resolved_at || null,
        _encrypted: wasEncrypted,
      }));
    } catch (e) {
      console.error('sanitizeMsg failed:', e);
      return {
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        content: String(m.content || ''),
        is_from_admin: !!m.is_from_admin,
        created_at: new Date().toISOString(),
        status: null,
        resolved_at: null,
        _encrypted: false,
      };
    }
  };

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);
  const subRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [townyMode, setTownyMode] = useState('chat');

  const handleMessageAction = async (message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const content = message.content;
    const cleanText = content.replace(/\[TOWNY_IMAGE:.+?\]/g, '').trim();

    Alert.alert(
      "Message Actions",
      null,
      [
        {
          text: "Copy Text",
          onPress: async () => {
            if (cleanText) {
              await Clipboard.setStringAsync(cleanText);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        },
        {
          text: "Share",
          onPress: async () => {
            try {
              await Share.share({
                message: cleanText || "Shared from Towny",
              });
            } catch (e) {
              console.error("Share error:", e);
            }
          }
        },
        {
          text: "Report Message",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from('feedback').insert({
                userid: currentUser.id,
                feedback: `[REPORT] Message ID: ${message.id} Content: ${content}`
              });
              Alert.alert("Reported", "Thank you for reporting. Our team will review this message.");
            } catch (e) {
              console.error("Report error:", e);
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const { city_name, zone_name, feedView } = useLocationStore();

  useEffect(() => {
    const setup = async () => {
      let user = await getStoredUser();
      
      if (!user) {
        Alert.alert(
          "Account Required",
          "Please sign in to chat with Towny.",
          [
            { text: "Cancel", style: "cancel", onPress: () => router.back() },
            { text: "Sign In", onPress: () => router.replace("/auth?mode=login") },
          ]
        );
        setLoading(false);
        return;
      }
      
      setCurrentUser(user);
    };
    setup();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    initChat();
    
    if (subRef.current) supabase.removeChannel(subRef.current);
    
    const subscription = supabase
      .channel(`help_chat_${currentUser.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          table: 'rhelp_messages'
        }, 
        payload => {
          const newMsg = sanitizeMsg(payload.new);
          if (Number(newMsg.sender_id) === Number(currentUser.id) || Number(newMsg.receiver_id) === Number(currentUser.id)) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              
              const optimisticIdx = prev.findIndex(m => 
                m.sender_id === newMsg.sender_id && 
                m.content === newMsg.content && 
                m.id > 1000000000000
              );

              if (optimisticIdx !== -1) {
                const newMessages = [...prev];
                newMessages[optimisticIdx] = newMsg;
                return newMessages;
              } else {
                return [...prev, newMsg];
              }
            });

            if (Number(newMsg.receiver_id) === Number(currentUser.id)) {
              if (newMsg.status === 'resolved' || newMsg.content.includes("Please rate 1-5")) {
                setShowRating(true);
              }
            }
          }
        }
      )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            table: 'rhelp_messages'
          },
          payload => {
            const newMsg = sanitizeMsg(payload.new);
            if (Number(newMsg.sender_id) === Number(currentUser.id) || Number(newMsg.receiver_id) === Number(currentUser.id)) {
              setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
              
              if (Number(newMsg.receiver_id) === Number(currentUser.id) && newMsg.status === 'resolved') {
                setShowRating(true);
                initChat();
              }
            }
          }
        )
      .subscribe();

    subRef.current = subscription;

    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
    };
  }, [currentUser?.id]);

  const initChat = async () => {
    if (!currentUser) return;
    try {
      // Only show messages that haven't been resolved (resolved_at is null)
      const { data, error } = await supabase
        .from('rhelp_messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .is('resolved_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(sanitizeMsg));
      
      if (data?.some(m => m.status === 'resolved' || (typeof m.content === 'string' && m.content.includes("Please rate 1-5")))) {
        setShowRating(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const purgeMessages = async () => {
    if (!currentUser) return;
    try {
      await supabase
        .from('rhelp_messages')
        .delete()
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
      setMessages([]);
      setShowRating(false);
    } catch (error) {
      console.error("Error purging messages:", error);
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating from 1 to 5 stars.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('rhelp_reviews')
        .insert({
          user_id: currentUser.id,
          rating,
          comment
        });
      if (error) throw error;
      
      await purgeMessages();
      Alert.alert("Thank You", "Your feedback has been submitted and the chat has been cleared.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async (overrideText = null) => {
    if (!currentUser) return;
    const text = (typeof overrideText === 'string' ? overrideText : (inputText || '')).trim();
    if (!text || isSendingRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tempId = Date.now();
    const isChatMode = townyMode === 'chat';

    const tempMsg = {
      id: tempId,
      sender_id: currentUser.id,
      content: text,
      is_from_admin: false,
      created_at: new Date().toISOString(),
      status: 'open'
    };

    const chatRestarted = messages.some(m => m.status === 'resolved');
    if (chatRestarted) {
      setMessages([tempMsg]);
    } else {
      setMessages(prev => [...prev, tempMsg]);
    }

    // Clear input immediately (Enter + send button)
    setInputText('');
    if (inputRef.current) inputRef.current.clear();

    isSendingRef.current = true;

    try {
      setIsTyping(true);

      // In chat mode: encrypt the message content before storing
      const storedContent = isChatMode ? encryptMessage(text, currentUser.id) : text;
      // Tag chat-mode messages with status 'chat' so admin can filter them out
      const msgStatus = isChatMode ? 'chat' : undefined;

      const { data: realMsg, error } = await supabase
        .from('rhelp_messages')
        .insert({
          sender_id: currentUser.id,
          content: storedContent,
          is_from_admin: false,
          ...(msgStatus ? { status: msgStatus } : {})
        })
        .select()
        .single();

      if (error) throw error;

      if (realMsg) {
        const cleanReal = sanitizeMsg(realMsg);
        setMessages(prev => prev.map(m => m.id === tempId ? cleanReal : m));
      }

      // AI self-moderation for chat mode — run in background, don't block the response
      if (isChatMode) {
        moderateChatMessage(text).then(async (modResult) => {
          if (modResult.risk === 'high' || modResult.risk === 'medium') {
            // Store a plaintext report for moderators
            try {
              await supabase.from('rmoderation_logs').insert({
                moderator_id: null,
                target_id: currentUser.id,
                target_type: 'towny_chat',
                action: `ai_flag_${modResult.risk}`,
                reason: `[AI Auto-Flag] Category: ${modResult.category}. Reason: ${modResult.reason}. Decrypted message: ${text}`,
              });
            } catch (logErr) {
              console.warn('Failed to log moderation report:', logErr);
            }

            // Notify the user via Towny
            const warningLevel = modResult.risk === 'high' ? 'high-risk' : 'flagged';
            const warningMsg = modResult.risk === 'high'
              ? `⚠️ **Safety Notice** — Your last message has been flagged as ${warningLevel} and reported to our moderation team. Because this was flagged, your message was decrypted and is now visible to moderators. Category: ${modResult.category}. Please review our community guidelines.`
              : `⚠️ **Notice** — Your last message has been flagged for review. It has been decrypted for our moderation team. Category: ${modResult.category}. If this was a mistake, no action will be taken.`;

            await supabase.from('rhelp_messages').insert({
              receiver_id: currentUser.id,
              content: warningMsg,
              is_from_admin: true,
              status: isChatMode ? 'chat' : undefined,
            });

            // Send push notification
            try {
              await sendNotification({
                userId: currentUser.id,
                title: 'Towny Safety Alert',
                body: `Your message was flagged as ${warningLevel}. It has been decrypted for moderator review.`,
              });
            } catch (notifErr) {
              console.warn('Failed to send moderation notification:', notifErr);
            }
          }
        }).catch(err => console.warn('Chat moderation error (non-blocking):', err));
      }

      const humanRequestPatterns = [/human/i, /real person/i, /person/i, /talk to someone/i, /agent/i, /staff/i, /admin/i];
      const needsHuman = humanRequestPatterns.some(pattern => pattern.test(text));

      if (needsHuman) {
        await supabase.from('rhelp_messages').insert({
          receiver_id: currentUser.id,
          content: "I've notified our team! A real agent will be with you shortly. I'm stepping back now so a human can take over.",
          is_from_admin: true,
          status: 'overtaken'
        });

        // Also update the original message to show it triggered an overtake in admin
        await supabase.from('rhelp_messages').update({ status: 'overtaken' }).eq('id', realMsg?.id || tempId);

        setIsTyping(false);
        isSendingRef.current = false;
        return;
      }

      const isOvertaken = !chatRestarted && messages.some(m => m.status === 'overtaken');
      if (isOvertaken) {
        setIsTyping(false);
        isSendingRef.current = false;
        return;
      }

      const history = chatRestarted ? [] : messages.slice(-10).map(m => {
        // Extract only primitive values to avoid circular references
        const content = m?.content;
        let cleanContent = typeof content === 'string' ? content : '';
        
        try {
          if (cleanContent && cleanContent.trim().startsWith('{') && cleanContent.trim().endsWith('}')) {
            const parsed = JSON.parse(cleanContent);
            if (parsed.text) cleanContent = parsed.text;
          }
        } catch (e) {}
        
        return {
          role: m?.is_from_admin ? 'assistant' : 'user',
          content: cleanContent
        };
      }).filter(h => h.content); // Filter out empty messages

      const aiResponse = await getAIAssistantResponse(text, history, {
        city_name: city_name || '',
        zone_name: zone_name || '',
        feedView: feedView || 'local',
        username: currentUser?.username || '',
        townyMode: townyMode || 'help'
      });

      let messageContent = aiResponse.text;
      const imagePrompt = aiResponse.imagePrompt;

      // In chat mode: encrypt AI responses too
      const storedAiContent = isChatMode ? encryptMessage(messageContent, currentUser.id) : messageContent;

      // Insert text response immediately
      const { data: aiMsg, error: aiError } = await supabase
        .from('rhelp_messages')
        .insert({
          receiver_id: currentUser.id,
          content: storedAiContent,
          is_from_admin: true,
          ...(isChatMode ? { status: 'chat' } : {})
        })
        .select()
        .single();

      if (aiError) throw aiError;

      setIsTyping(false);
      isSendingRef.current = false;

      // Background image generation if requested
      if (imagePrompt && aiMsg) {
        generateImage(imagePrompt).then(async (imageUrl) => {
          if (imageUrl) {
            const updatedPlain = `${messageContent}\n[TOWNY_IMAGE:${imageUrl}]`;
            const updatedStored = isChatMode ? encryptMessage(updatedPlain, currentUser.id) : updatedPlain;
            const { error: updateError } = await supabase
              .from('rhelp_messages')
              .update({ content: updatedStored })
              .eq('id', aiMsg.id);
            
            if (!updateError) {
              setMessages(prev => prev.map(m => m.id === aiMsg.id ? sanitizeMsg({ ...m, content: updatedStored }) : m));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }).catch(err => console.error("BG Image gen error:", err));
      }
    } catch (error) {
      console.error("Error in handleSend:", error);
      setInputText(text);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert("Error", "Message could not be sent.");
      isSendingRef.current = false;
      setIsTyping(false);
    }
  };

  const handleExpandImage = async () => {
    if (!selectedImage || isExpanding) return;
    
    setIsExpanding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const expandedUrl = await expandImage(selectedImage);
      if (expandedUrl) {
        setSelectedImage(null);
        const messageContent = `I've expanded that image for you!\n[TOWNY_IMAGE:${expandedUrl}]`;
        
        await supabase
          .from('rhelp_messages')
          .insert({
            receiver_id: currentUser.id,
            content: messageContent,
            is_from_admin: true
          });
          
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Expansion Failed", "Towny couldn't expand this image right now.");
      }
    } catch (error) {
      console.error("Expansion error:", error);
      Alert.alert("Error", "Something went wrong while expanding the image.");
    } finally {
      setIsExpanding(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      if (Platform.OS === 'web') {
        e.preventDefault();
      }
      handleSend();
    }
  };

  const renderMessageContent = (content, isMine) => {
    // Ensure content is a string
    if (!content || typeof content !== 'string') {
      return <Text style={{ color: isMine ? (isLight ? '#FFFFFF' : '#000000') : theme.colors.text }}>...</Text>;
    }
    
    let displayContent = content;
    let displayImageUrl = null;

    try {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        const parsed = JSON.parse(content);
        if (parsed.text) displayContent = parsed.text;
        if (parsed.imageUrl) displayImageUrl = parsed.imageUrl;
      }
    } catch (e) {}

    const imageMatch = displayContent.match(/\[TOWNY_IMAGE:(.+?)\]/);
    const textContent = imageMatch 
      ? displayContent.replace(/\[TOWNY_IMAGE:.+?\]/, '').trim()
      : displayContent;

    const currentMarkdownStyles = {
      ...markdownStyles,
      body: {
        ...markdownStyles.body,
        color: isMine ? (isLight ? '#FFFFFF' : '#000000') : theme.colors.text,
      }
    };
    
    if (imageMatch || displayImageUrl) {
      const imageUrl = displayImageUrl || imageMatch[1];
      
      return (
        <View>
          {textContent ? (
            <Markdown style={currentMarkdownStyles}>
              {textContent}
            </Markdown>
          ) : null}
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => {
              setSelectedImage(imageUrl);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{ marginTop: textContent ? 12 : 0 }}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.generatedImage}
              contentFit="cover"
            />
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <Markdown style={currentMarkdownStyles}>
        {displayContent}
      </Markdown>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
      <StatusBar style={isLight ? "dark" : "light"} />
      {!isHippie && !isLight && (
        <LinearGradient
          colors={['#0F172A', '#000000', '#000000']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={theme.colors.text} size={28} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Sparkles size={18} color="#FBBF24" />
            <Text style={styles.headerTitle}>TOWNY</Text>
          </View>
          <TouchableOpacity 
            onPress={async () => {
              if (!currentUser) return;

              if (townyMode === 'chat') {
                setTownyMode('help');
                try {
                  await supabase.from('rhelp_messages').insert({
                    receiver_id: currentUser.id,
                    content: "Help Mode enabled. How can I help you with Town Wall?",
                    is_from_admin: true,
                  });
                } catch (e) {
                  console.error('Failed to insert help mode prompt:', e);
                }
                return;
              }

              // Help Mode -> Resolve: mark all messages resolved + schedule 7-day delete
              try {
                const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                await supabase
                  .from('rhelp_messages')
                  .update({ 
                    resolved_at: new Date().toISOString(),
                    delete_after: deleteAfter
                  })
                  .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

                await supabase.from('rhelp_messages').insert({
                  receiver_id: currentUser.id,
                  content: "Resolved. Please rate 1-5 / Leave a comment",
                  is_from_admin: true,
                  status: 'resolved'
                });

                setShowRating(true);
              } catch (e) {
                console.error('Failed to resolve help chat:', e);
              }

              setTownyMode('chat');
            }}
            style={styles.headerAction}
          >
            <Text style={styles.headerActionText}>{townyMode === 'chat' ? 'HELP MODE' : 'RESOLVE'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMine = !item.is_from_admin;
            const isResolved = item.status === 'resolved';

            return (
              <View style={[
                styles.messageWrapper,
                isMine ? styles.myMessageWrapper : styles.theirMessageWrapper
              ]}>
                  {!isMine && (
                    <View style={[styles.assistantAvatar, { backgroundColor: isLight ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.2)' }]}>
                      <Sparkles size={12} color="#FBBF24" />
                    </View>
                  )}
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onLongPress={() => handleMessageAction(item)}
                    delayLongPress={500}
                    style={[
                      styles.messageBubble, 
                      isMine ? styles.myMessage : styles.theirMessage,
                      isResolved && { borderLeftWidth: 4, borderLeftColor: '#10B981' }
                    ]}
                  >
                      {!isMine && <Text style={styles.adminLabel}>TOWNY</Text>}
                    {renderMessageContent(item.content, isMine)}
                    <View style={styles.messageFooter}>
                      <Text style={[styles.messageTime, { color: isMine ? 'rgba(0,0,0,0.3)' : theme.colors.textSecondary, opacity: 0.5 }]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            <View>
              {isTyping && (
                <View style={[styles.messageWrapper, styles.theirMessageWrapper]}>
                  <View style={[styles.assistantAvatar, { backgroundColor: isLight ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.2)' }]}>
                    <Sparkles size={12} color="#FBBF24" />
                  </View>
                  <View style={[styles.messageBubble, styles.theirMessage, { width: 60, alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#FBBF24" />
                  </View>
                </View>
              )}
              {showRating && (
                <View style={styles.inChatRatingContainer}>
                  <View style={styles.ratingCard}>
                    <Text style={styles.ratingTitle}>HOW WAS TOWNY?</Text>
                    
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity 
                          key={star} 
                          onPress={() => {
                            setRating(star);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }}
                          style={styles.starButton}
                        >
                          <Text style={[styles.starText, rating >= star && styles.starActive]}>
                            {rating >= star ? '★' : '☆'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      style={styles.ratingInput}
                      placeholder="Leave a comment (optional)..."
                      placeholderTextColor={theme.colors.textSecondary}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                    />

                    <View style={styles.ratingButtons}>
                      <TouchableOpacity 
                        style={[styles.submitButton, rating === 0 && { opacity: 0.5 }]} 
                        onPress={submitReview}
                        disabled={rating === 0 || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color={theme.colors.background} />
                        ) : (
                          <Text style={styles.submitButtonText}>SUBMIT REVIEW</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Sparkles size={48} color={theme.colors.textSecondary} style={{ opacity: 0.2 }} />
              <Text style={styles.emptyTitle}>Hey! I'm Towny</Text>
              <Text style={styles.emptyText}>Chat with me about anything - ask questions, roleplay, get creative, or just hang out. I can even generate images for you!</Text>
            </View>
          }
        />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Talk to Towny..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={inputText}
                  onChangeText={(t) => {
                    if (t.endsWith('\n')) {
                      const textToSend = t.replace(/\n+$/g, '').trim();
                      setInputText('');
                      if (inputRef.current) {
                        inputRef.current.clear();
                        if (Platform.OS !== 'web') {
                          inputRef.current.setNativeProps({ text: '' });
                        }
                      }
                      if (textToSend) handleSend(textToSend);
                      return;
                    }
                    setInputText(t);
                  }}
                  onKeyPress={handleKeyPress}
                  onSubmitEditing={() => {
                    const textToSend = inputText.trim();
                    if (!textToSend) return;

                    setInputText('');
                    if (inputRef.current) {
                      inputRef.current.clear();
                      if (Platform.OS !== 'web') {
                        inputRef.current.setNativeProps({ text: '' });
                      }
                    }

                    handleSend(textToSend);
                  }}
                  multiline
                  blurOnSubmit={false}
                />
            <TouchableOpacity 
              style={[styles.sendButton, !(inputText || '').trim() && { opacity: 0.5 }]} 
              onPress={() => handleSend()}
              disabled={!(inputText || '').trim()}
            >
              <Send size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill}>
          <TouchableOpacity 
            style={styles.modalCloseOverlay}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setSelectedImage(null)}
              >
                <X color="#FFFFFF" size={24} />
              </TouchableOpacity>
              
              <Image 
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                contentFit="contain"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.expandButton, isExpanding && styles.expandButtonDisabled]}
                  onPress={handleExpandImage}
                  disabled={isExpanding}
                >
                  {isExpanding ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <>
                      <Maximize2 size={20} color="#000000" />
                      <Text style={styles.expandButtonText}>AI EXPAND</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Modal>
    </View>
  );
}
