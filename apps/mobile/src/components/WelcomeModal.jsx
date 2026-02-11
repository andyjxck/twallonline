import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { 
  X, Home, MessageCircle, User, Star, Briefcase, Vote, HelpCircle, 
  Heart, Share, Flag, Plus, Menu, Bell, Send, Users, ChevronRight,
  Info, Sparkles, MapPin, Globe, Check, MessageSquare
} from 'lucide-react-native';
import { useTheme } from '../utils/ThemeContext';
import { MotiView, AnimatePresence } from 'moti';

const { width, height } = Dimensions.get('window');

// Mock components that look like the real app
const MockPost = ({ theme, isLight }) => {
  const [liked, setLiked] = useState(false);
  
  return (
    <View style={[mockStyles.post, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
      <View style={mockStyles.postHeader}>
        <View style={[mockStyles.avatar, { backgroundColor: theme.colors.primary + '30' }]}>
          <Text style={{ fontSize: 14 }}>🏠</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[mockStyles.username, { color: theme.colors.text }]}>Community Leader</Text>
          <Text style={[mockStyles.meta, { color: theme.colors.textSecondary }]}>High Street • 2m ago</Text>
        </View>
        <TouchableOpacity style={mockStyles.moreBtn}>
          <Menu size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <Text style={[mockStyles.postText, { color: theme.colors.text }]}>
        Join us this Saturday for the big community clean-up! Meeting at the park gate at 10am. 🧤🧹
      </Text>
      
      <View style={mockStyles.postFooter}>
        <View style={mockStyles.leftActions}>
          <TouchableOpacity 
            onPress={() => setLiked(!liked)}
            style={mockStyles.action}
          >
            <Heart size={18} color={liked ? theme.colors.error : theme.colors.textSecondary} fill={liked ? theme.colors.error : 'transparent'} />
            <Text style={[mockStyles.actionLabel, { color: liked ? theme.colors.error : theme.colors.textSecondary }]}>{liked ? 25 : 24}</Text>
          </TouchableOpacity>
          <View style={mockStyles.action}>
            <Star size={18} color="#FBBF24" />
            <Text style={[mockStyles.actionLabel, { color: theme.colors.textSecondary }]}>3</Text>
          </View>
          <View style={mockStyles.action}>
            <MessageSquare size={18} color={theme.colors.textSecondary} />
            <Text style={[mockStyles.actionLabel, { color: theme.colors.textSecondary }]}>8</Text>
          </View>
        </View>
        <TouchableOpacity style={[mockStyles.chatToMe, { backgroundColor: theme.colors.primary + '20' }]}>
          <MessageCircle size={14} color={theme.colors.primary} />
          <Text style={[mockStyles.chatToMeText, { color: theme.colors.primary }]}>Chat to me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MockChat = ({ theme, isLight }) => (
  <View style={[mockStyles.chatContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
    <View style={[mockStyles.chatHeader, { borderBottomColor: theme.colors.border }]}>
      <Users size={16} color={theme.colors.primary} />
      <Text style={[mockStyles.chatTitle, { color: theme.colors.text }]}>Gardeners United 🌿</Text>
    </View>
    <View style={mockStyles.chatContent}>
      <View style={mockStyles.msgReceived}>
        <View style={[mockStyles.bubble, { backgroundColor: theme.colors.surface }]}>
          <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '800' }}>@green_thumb</Text>
          <Text style={{ color: theme.colors.text, fontSize: 13 }}>What's the best time to plant tulips?</Text>
        </View>
      </View>
      <View style={mockStyles.msgSent}>
        <View style={[mockStyles.bubble, { backgroundColor: theme.colors.primary }]}>
          <Text style={{ color: isLight ? '#FFF' : '#000', fontSize: 13 }}>October or November! 🌷</Text>
        </View>
      </View>
      <View style={mockStyles.msgReceived}>
        <View style={[mockStyles.bubble, { backgroundColor: theme.colors.surface }]}>
          <Text style={{ color: theme.colors.text, fontSize: 13 }}>Perfect, thanks!</Text>
        </View>
      </View>
    </View>
    <View style={[mockStyles.chatInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Message group...</Text>
      <Send size={16} color={theme.colors.primary} />
    </View>
  </View>
);

export default function WelcomeModal({ visible, onClose }) {
  const { theme, isLight } = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: 'wall',
      label: 'Town Wall',
      icon: <Home size={18} color={activeTab === 0 ? (isLight ? '#FFF' : '#000') : theme.colors.primary} />,
      content: (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>The Town Wall</Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Share news, ask for advice, or just connect with folks in your neighborhood.
          </Text>
          <MockPost theme={theme} isLight={isLight} />
          <View style={styles.tipBox}>
            <Sparkles size={16} color={theme.colors.primary} />
            <Text style={[styles.tipText, { color: theme.colors.text }]}>
              Tap <Plus size={14} color={theme.colors.primary} /> to post. Tap "Chat to me" to connect privately.
            </Text>
          </View>
        </View>
      )
    },
    {
      id: 'chat',
      label: 'Messaging',
      icon: <MessageCircle size={18} color={activeTab === 1 ? (isLight ? '#FFF' : '#000') : theme.colors.primary} />,
      content: (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Messaging & Groups</Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Not just for groups! Chat <Text style={{fontWeight:'700', color: theme.colors.primary}}>1-on-1</Text> with any neighbor or join <Text style={{fontWeight:'700', color: theme.colors.primary}}>Vibrant Groups</Text> for shared interests.
          </Text>
          <MockChat theme={theme} isLight={isLight} />
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Check size={14} color={theme.colors.primary} />
              <Text style={[styles.bulletText, { color: theme.colors.text }]}>Private DMs for anyone</Text>
            </View>
            <View style={styles.bulletItem}>
              <Check size={14} color={theme.colors.primary} />
              <Text style={[styles.bulletText, { color: theme.colors.text }]}>Group chats for your street or hobbies</Text>
            </View>
          </View>
        </View>
      )
    },
    {
      id: 'local',
      label: 'Local',
      icon: <Star size={18} color={activeTab === 2 ? (isLight ? '#FFF' : '#000') : theme.colors.primary} />,
      content: (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Local Talent & Biz</Text>
          <Text style={[styles.sectionDesc, { color: theme.colors.textSecondary }]}>
            Find the best hidden gems in your town. From local artists to the best plumbers.
          </Text>
          <View style={styles.promoGrid}>
            <View style={[styles.promoCard, { backgroundColor: theme.colors.surface }]}>
              <Briefcase size={24} color={theme.colors.primary} />
              <Text style={[styles.promoTitle, { color: theme.colors.text }]}>Businesses</Text>
              <Text style={[styles.promoSub, { color: theme.colors.textSecondary }]}>Support Local</Text>
            </View>
            <View style={[styles.promoCard, { backgroundColor: theme.colors.surface }]}>
              <User size={24} color="#FBBF24" />
              <Text style={[styles.promoTitle, { color: theme.colors.text }]}>Talent</Text>
              <Text style={[styles.promoSub, { color: theme.colors.textSecondary }]}>Find Experts</Text>
            </View>
          </View>
          <View style={[styles.tipBox, { borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border }]}>
            <Info size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              These appear right in your feed as you scroll!
            </Text>
          </View>
        </View>
      )
    },
    {
      id: 'nav',
      label: 'Navigation',
      icon: <Menu size={18} color={activeTab === 3 ? (isLight ? '#FFF' : '#000') : theme.colors.primary} />,
      content: (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Getting Around</Text>
          <View style={styles.navRow}>
            <View style={[styles.navIcon, { backgroundColor: theme.colors.surface }]}>
              <MapPin size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navLabel, { color: theme.colors.text }]}>Switch Feed</Text>
              <Text style={[styles.navDesc, { color: theme.colors.textSecondary }]}>Top left - Move between Global & Local walls</Text>
            </View>
          </View>
          <View style={styles.navRow}>
            <View style={[styles.navIcon, { backgroundColor: theme.colors.surface }]}>
              <Bell size={20} color={theme.colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navLabel, { color: theme.colors.text }]}>Notifications</Text>
              <Text style={[styles.navDesc, { color: theme.colors.textSecondary }]}>Top right - See likes, comments & messages</Text>
            </View>
          </View>
          <View style={styles.navRow}>
            <View style={[styles.navIcon, { backgroundColor: theme.colors.surface }]}>
              <Plus size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navLabel, { color: theme.colors.text }]}>Create Post</Text>
              <Text style={[styles.navDesc, { color: theme.colors.textSecondary }]}>Big button at bottom - Share with the town</Text>
            </View>
          </View>
        </View>
      )
    }
  ];

  const handleNext = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={StyleSheet.absoluteFill} />
        
        <View style={[styles.contentContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Welcome to Town Wall</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Your community, simplified.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {tabs.map((tab, index) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(index)}
                  style={[
                    styles.tab,
                    { backgroundColor: theme.colors.surface },
                    activeTab === index && { backgroundColor: theme.colors.primary }
                  ]}
                >
                  {tab.icon}
                  <Text style={[
                    styles.tabText,
                    { color: theme.colors.textSecondary },
                    activeTab === index && { color: isLight ? '#FFF' : '#000' }
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.body}>
            <AnimatePresence mode="wait">
              <MotiView
                key={activeTab}
                from={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'timing', duration: 200 }}
                style={styles.contentBody}
              >
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollInner}
                >
                  {tabs[activeTab].content}
                </ScrollView>
              </MotiView>
            </AnimatePresence>
          </View>

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <View style={styles.dots}>
              {tabs.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    { backgroundColor: theme.colors.border },
                    i === activeTab && { backgroundColor: theme.colors.primary, width: 20 }
                  ]} 
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.nextBtnText, { color: isLight ? '#FFF' : '#000' }]}>
                {activeTab === tabs.length - 1 ? 'Got it!' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    width: '100%',
    height: height * 0.7, // Fixed height for consistency
    maxHeight: 650,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    marginBottom: 10,
  },
  tabsScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  contentBody: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  tipBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  bulletList: {
    marginTop: 10,
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontSize: 14,
    fontWeight: '600',
  },
  promoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  promoCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  promoSub: {
    fontSize: 11,
    opacity: 0.6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  navDesc: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});

const mockStyles = StyleSheet.create({
  post: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 13,
    fontWeight: '800',
  },
  meta: {
    fontSize: 10,
  },
  postText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatToMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chatToMeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
  },
  chatTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatContent: {
    padding: 12,
    gap: 8,
  },
  msgReceived: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  msgSent: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  bubble: {
    padding: 8,
    borderRadius: 12,
  },
  chatInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
  },
});
