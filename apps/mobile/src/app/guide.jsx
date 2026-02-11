import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/utils/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp,
  MessageSquare, 
  Users, 
  Flag, 
  UserX, 
  Bell, 
  Settings, 
  Shield,
  MapPin,
  Briefcase,
  Sparkles,
  Vote,
  Heart,
  Star,
  Share2,
  Eye,
  EyeOff,
  Trash2,
  HelpCircle
} from "lucide-react-native";

const GuideSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const { theme, isLight } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View style={[styles.section, { borderColor: theme.colors.border }]}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <Icon size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        </View>
        {isOpen ? (
          <ChevronUp size={20} color={theme.colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={theme.colors.textSecondary} />
        )}
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

const Step = ({ number, text }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
};

const Tip = ({ text }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.tip, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.3)' }]}>
      <Sparkles size={14} color="#FBBF24" />
      <Text style={[styles.tipText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
};

export default function GuideScreen() {
  const { theme, isHippie, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
      {!isHippie && !isLight && (
        <LinearGradient
          colors={['#0F172A', '#000000']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <StatusBar style={isLight ? "dark" : "light"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>How to Use Town Wall</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>
          Welcome to Town Wall! Here's everything you need to know to get started.
        </Text>

        <GuideSection title="Navigating the Feed" icon={MessageSquare} defaultOpen={true}>
          <Step number="1" text="The main feed shows posts from your community" />
          <Step number="2" text="Tap the dropdown in the header to switch between Global, City, and Zone views" />
          <Step number="3" text="Tap a post to expand it and see comments" />
          <Step number="4" text="Swipe down to refresh the feed" />
          <Tip text="Use the filter icon to sort by newest, oldest, or most popular" />
        </GuideSection>

        <GuideSection title="Creating Posts" icon={MessageSquare}>
          <Step number="1" text="Tap the 'What's happening in your neighborhood?' bar at the top of the feed" />
          <Step number="2" text="Write your post title and content" />
          <Step number="3" text="Add images or GIFs if you want" />
          <Step number="4" text="Toggle 'Anonymous' if you want to post without your name" />
          <Step number="5" text="Tap 'Post' to share with your community" />
          <Tip text="Posts are automatically moderated to keep the community safe" />
        </GuideSection>

        <GuideSection title="Reacting to Posts" icon={Heart}>
          <Step number="1" text="Tap the ❤️ heart to like a post" />
          <Step number="2" text="Tap the ⭐ star to superlike (shows extra appreciation)" />
          <Step number="3" text="Tap the share icon to share the post" />
          <Step number="4" text="Tap the flag icon to report inappropriate content" />
          <Tip text="Tap the like/superlike count to see who reacted" />
        </GuideSection>

        <GuideSection title="Commenting" icon={MessageSquare}>
          <Step number="1" text="Tap any post to expand it" />
          <Step number="2" text="Scroll down to see existing comments" />
          <Step number="3" text="Type your comment in the text box" />
          <Step number="4" text="Tap the user icon to comment anonymously" />
          <Step number="5" text="Tap 'GIF' to add a GIF to your comment" />
          <Step number="6" text="Tap the send button to post your comment" />
        </GuideSection>

        <GuideSection title="Reporting Content" icon={Flag}>
          <Text style={[styles.subheading, { color: theme.colors.text }]}>Report a Post:</Text>
          <Step number="1" text="Tap the 3-dot menu (⋮) on any post" />
          <Step number="2" text="Tap 'Report Post'" />
          <Step number="3" text="Select a reason and confirm" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Report a Comment:</Text>
          <Step number="1" text="Long-press (hold) on any comment" />
          <Step number="2" text="Select a reason from the menu" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Report a User:</Text>
          <Step number="1" text="Visit their profile (tap their username)" />
          <Step number="2" text="Tap the 'Report' button below their bio" />
          <Step number="3" text="Select a reason and confirm" />
          
          <Tip text="All reports are reviewed within 24 hours" />
        </GuideSection>

        <GuideSection title="Blocking Users" icon={UserX}>
          <Text style={[styles.subheading, { color: theme.colors.text }]}>Block from a Post:</Text>
          <Step number="1" text="Tap the 3-dot menu (⋮) on their post" />
          <Step number="2" text="Tap 'Block User'" />
          <Step number="3" text="Select a reason and confirm" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Block from Profile:</Text>
          <Step number="1" text="Visit their profile" />
          <Step number="2" text="Tap the 'Block' button" />
          <Step number="3" text="Select a reason and confirm" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Manage Blocked Users:</Text>
          <Step number="1" text="Go to Settings" />
          <Step number="2" text="Tap 'Blocked Users'" />
          <Step number="3" text="Tap 'Unblock' next to any user to unblock them" />
        </GuideSection>

        <GuideSection title="Chat & Messaging" icon={Users}>
          <Step number="1" text="Tap the chat bubble in the bottom-right corner, or open the menu and tap 'Chat'" />
          <Step number="2" text="To start a DM, visit a user's profile and tap the message button" />
          <Step number="3" text="To create a group chat, tap the group icon in the chat header" />
          <Step number="4" text="Send text, images, GIFs, or voice messages" />
          <Step number="5" text="Start a call with the phone icon — toggle video during the call" />
          <Tip text="All messages are end-to-end encrypted" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Report in Chat:</Text>
          <Step number="1" text="Long-press a message or tap the settings gear in the chat" />
          <Step number="2" text="Select 'Report User' or 'Block User'" />
        </GuideSection>

        <GuideSection title="Local Businesses" icon={Briefcase}>
          <Step number="1" text="Open the menu (hamburger icon)" />
          <Step number="2" text="Tap 'Local Business'" />
          <Step number="3" text="Browse businesses on the map or list view" />
          <Step number="4" text="Tap a business to see details" />
          <Step number="5" text="Call, visit website, or get directions" />
        </GuideSection>

        <GuideSection title="Local Talent" icon={Sparkles}>
          <Step number="1" text="Open the menu" />
          <Step number="2" text="Tap 'Local Talent'" />
          <Step number="3" text="Browse local creators, artists, and freelancers" />
          <Step number="4" text="Tap to view their profile and work" />
        </GuideSection>

        <GuideSection title="Polls & Voting" icon={Vote}>
          <Step number="1" text="Open the menu" />
          <Step number="2" text="Tap 'Polls & Features'" />
          <Step number="3" text="Vote on community suggestions" />
          <Step number="4" text="Submit your own ideas for the community" />
        </GuideSection>

        <GuideSection title="Towny AI Assistant" icon={HelpCircle}>
          <Step number="1" text="Open the menu and tap 'Towny'" />
          <Step number="2" text="Switch between Help mode (app support) and Chat mode (casual conversation)" />
          <Step number="3" text="Ask questions, get help navigating the app, or just have a chat" />
          <Step number="4" text="Ask Towny to generate images for you" />
          <Tip text="Towny has two modes — Help mode for app support and Chat mode for casual conversation!" />
        </GuideSection>

        <GuideSection title="Notifications" icon={Bell}>
          <Step number="1" text="Tap the bell icon in the header" />
          <Step number="2" text="View all your notifications" />
          <Step number="3" text="Tap a notification to go to the relevant content" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Do Not Disturb:</Text>
          <Step number="1" text="Go to Settings" />
          <Step number="2" text="Toggle 'Do Not Disturb' to silence notifications" />
        </GuideSection>

        <GuideSection title="Settings & Privacy" icon={Settings}>
          <Step number="1" text="Open the menu and tap 'Profile'" />
          <Step number="2" text="Tap the gear icon to open Settings" />
          
          <Text style={[styles.subheading, { color: theme.colors.text, marginTop: 16 }]}>Available Options:</Text>
          <Step number="•" text="Do Not Disturb - silence notifications" />
          <Step number="•" text="Location - update your city/zone" />
          <Step number="•" text="Password - change your password" />
          <Step number="•" text="Recovery Codes - backup codes for account access" />
          <Step number="•" text="Blocked Users - manage blocked users" />
          <Step number="•" text="How to Use Town Wall - this guide" />
          <Step number="•" text="Send us an email - contact support" />
          <Step number="•" text="Privacy Policy - view our privacy policy" />
          <Step number="•" text="Terms of Service - view terms of service" />
          <Step number="•" text="Guidelines - view community guidelines" />
          <Step number="•" text="Delete Account - permanently delete your account" />
        </GuideSection>

        <GuideSection title="Account Deletion" icon={Trash2}>
          <Step number="1" text="Go to Settings" />
          <Step number="2" text="Scroll down and tap 'Delete Account'" />
          <Step number="3" text="Confirm your decision" />
          <Tip text="You have 30 days to cancel by logging back in" />
        </GuideSection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Need more help? Chat with Towny or email us at andyblewett991@gmail.com
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
