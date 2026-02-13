import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform, Modal, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Shield, 
  AlertCircle, 
  UserMinus,
  AlertTriangle,
  CheckCircle, 
  XCircle,
  Trash2, 
  Star, 
  Briefcase, 
  MessageSquare, 
  Bot, 
  Flag,
  Send,
  ChevronDown,
  ChevronUp,
    RefreshCw,
    BarChart2,
    Edit2,
      Undo,

    UserCheck,
    Users,
    TrendingUp,
    PieChart,
    Activity,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    VolumeX,
    ExternalLink,
    Music,
    Youtube,
    Instagram,
    Globe,
    ShoppingBag,
    Truck,
    Ban,
    X
  } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { getStoredUser } from '@/utils/user';
import { goBack } from '@/utils/navigation';
import { crossAlert } from '@/utils/alert';
import { toast } from 'sonner-native';
import { sendNotification, notifyStaffOfAdminAction } from '@/utils/notifications';
import { useTheme } from "@/utils/ThemeContext";
import { getBlockLogs } from '@/utils/blocking';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { useChatStore, useFeedHighlightStore } from '@/utils/auth';

const stripMarkdown = (text) => {
  if (!text) return '';
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/~~(.+?)~~/g, '$1');
};

const DELIVERY_PLATFORMS = [
  { id: 'amazon', name: 'Amazon', icon: ShoppingBag },
  { id: 'justeat', name: 'Just Eat', icon: Truck },
  { id: 'deliveroo', name: 'Deliveroo', icon: Truck },
  { id: 'ubereats', name: 'Uber Eats', icon: Truck },
];

export default function ModerationAdmin() {
  const { theme, isHippie, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('talent');
  const [data, setData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [expandedChatId, setExpandedChatId] = useState(null);
  const [transcripts, setTranscripts] = useState({});
  const [replyText, setReplyText] = useState('');
    const [aiFilter, setAiFilter] = useState('held');
    const [overrideItem, setOverrideItem] = useState(null);
    const [overrideReason, setOverrideReason] = useState('');
    const [pollModalItem, setPollModalItem] = useState(null);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['Yes', 'No', 'Maybe later']);
    const [overrideMode, setOverrideMode] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cities, setCities] = useState([]);
    const [userRoleModal, setUserRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedCityId, setSelectedCityId] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [requestEditItem, setRequestEditItem] = useState(null);
    const [requestEditReason, setRequestEditReason] = useState('');
    const [expandedImage, setExpandedImage] = useState(null);
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState('7d');
    const [analyticsDetailModal, setAnalyticsDetailModal] = useState(null);
    const [analyticsDetailData, setAnalyticsDetailData] = useState([]);
    const [displayLimit, setDisplayLimit] = useState(25);
    const [analyticsDetailLoading, setAnalyticsDetailLoading] = useState(false);
    const [previewPost, setPreviewPost] = useState(null);

    const getLevel = (u) => {
      if (!u) return 0;
      if (u.is_admin) return 4;
      if (u.is_moderator) return 3;
      if (u.is_councillor) return 2;
      return 1; // Standard user
    };

  const dynamicStyles = useMemo(() => StyleSheet.create({
    headerTitle: { ...styles.headerTitle, color: theme.colors.text },
    username: { ...styles.username, color: theme.colors.text },
    date: { ...styles.date, color: theme.colors.textSecondary },
    title: { ...styles.title, color: theme.colors.text },
    description: { ...styles.description, color: theme.colors.textSecondary },
    actionText: { ...styles.actionText, color: isLight ? '#FFF' : '#000' },
    tabText: { ...styles.tabText, color: theme.colors.textSecondary },
    activeTabText: { ...styles.activeTabText, color: isLight ? '#FFF' : '#000' },
    statValue: { ...styles.statValue, color: theme.colors.text },
    statLabel: { ...styles.statLabel, color: theme.colors.textSecondary },
    modalTitle: { ...styles.modalTitle, color: theme.colors.text },
    modalSubtitle: { ...styles.modalSubtitle, color: theme.colors.textSecondary },
    reportTarget: { ...styles.reportTarget, color: theme.colors.text },
    logAction: { ...styles.logAction, color: theme.colors.primary },
    logDetail: { ...styles.logDetail, color: theme.colors.text },
    logReason: { ...styles.logReason, color: theme.colors.textSecondary },
  }), [theme, isLight]);

      const TABS = useMemo(() => {
        const tabs = [
          { id: 'talent', label: 'TALENT', icon: Star },
          { id: 'business', label: 'BUSINESS', icon: Briefcase },
          { id: 'help', label: 'HELP CHATS', icon: MessageSquare },
          { id: 'votes', label: 'VOTES', icon: CheckCircle },
          { id: 'edits', label: 'EDITS', icon: Edit2 },
          { id: 'ai', label: 'AI LOGS', icon: Bot },
          { id: 'reports', label: 'REPORTS', icon: AlertCircle },
          { id: 'blocks', label: 'BLOCK LOGS', icon: Ban },
        ];
        if (isSuperAdmin) {
          tabs.push({ id: 'analytics', label: 'ANALYTICS', icon: BarChart2 });
          tabs.push({ id: 'users', label: 'USERS', icon: Users });
          tabs.push({ id: 'logs', label: 'ADMIN LOGS', icon: Shield });
        }
        return tabs;
      }, [isSuperAdmin]);


  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [activeTab, isAdmin, aiFilter, analyticsTimeRange]);

  const checkAdminStatus = async () => {
    try {
      const user = await getStoredUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      const { data: userData, error } = await supabase
        .from('rusers')
        .select('is_admin, is_moderator, username')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setCurrentUserData(userData);
      
      if (!userData?.is_admin && !userData?.is_moderator) {
        router.replace('/');
        return;
      }
      
        setIsAdmin(true); 
        if (userData.is_admin) {
          setIsSuperAdmin(true);
          // Fetch cities for councillor assignment
          const { data: citiesData } = await supabase.from('rcities').select('id, name').order('name');
          setCities(citiesData || []);
        }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let result = [];
        if (activeTab === 'talent') {
          const { data: talent, error } = await supabase
            .from('rtalent')
            .select(`*, rusers(username)`)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          if (error) throw error;
          result = talent;
        } else if (activeTab === 'edits') {
          const { data: edits, error } = await supabase
            .from('showcase_pending_edits')
            .select(`*, rusers(username)`)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          if (error) throw error;
          result = edits;
        } else if (activeTab === 'business') {

        const { data: business, error } = await supabase
          .from('rbusinesses')
          .select(`*, rusers(username)`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = business;
      } else if (activeTab === 'votes') {
        const { data: votes, error } = await supabase
          .from('rfeature_suggestions')
          .select(`*, rusers(username)`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = votes;
      } else if (activeTab === 'help') {
        const { data: help, error } = await supabase
          .from('rhelp_messages')
          .select(`*, rusers!rhelp_messages_sender_id_fkey(username)`)
          .neq('status', 'chat')
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        const uniqueChats = [];
        const seenUsers = new Set();
        help.forEach(msg => {
          const userId = msg.is_from_admin ? msg.receiver_id : msg.sender_id;
          if (!seenUsers.has(userId)) {
            // Find if this specific chat is overtaken
            const isOvertaken = help.some(m => 
              (m.sender_id === userId || m.receiver_id === userId) && 
              m.status === 'overtaken'
            );
            uniqueChats.push({ ...msg, display_user_id: userId, is_overtaken: isOvertaken });
            seenUsers.add(userId);
          }
        });
        result = uniqueChats;
      } else if (activeTab === 'ai') {
        let query = supabase
          .from('rposts')
          .select(`*, rusers(username), rzones(name)`)
          .order('created_at', { ascending: false });
        
        if (aiFilter === 'approved') query = query.eq('moderation_status', 'approved');
        else if (aiFilter === 'rejected') query = query.eq('moderation_status', 'rejected');
        else query = query.eq('moderation_status', 'held');

        const { data: ai, error } = await query;
        if (error) throw error;
        result = ai;
      } else if (activeTab === 'reports') {
        const [postsRes, fakeReactionsRes, logsRes, reportsRes] = await Promise.all([
          supabase
            .from('rposts')
            .select(`*, rusers(username), rzones(name)`)
            .eq('moderation_status', 'flagged')
            .eq('is_deleted', false),
          supabase
            .from('rreactions')
            .select(`post_id, post:rposts(*, rusers(username), rzones(name))`)
            .eq('reaction_type', 'fake'),
          supabase
            .from('rmoderation_logs')
            .select(`*`)
            .or('action.eq.report,action.eq.demote_request')
            .order('created_at', { ascending: false }),
            supabase
              .from('rreports')
              .select(`*, reporter:rusers!rreports_reporter_id_fkey(username), target_user:rusers!rreports_target_id_fkey(id, username, warning_count, is_muted, is_banned)`)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
        ]);

        if (postsRes.error) throw postsRes.error;
        if (logsRes.error) throw logsRes.error;
        if (reportsRes.error) throw reportsRes.error;

        // Combine flagged posts and posts with any fake reaction
        const directFlagged = postsRes.data || [];
        const fakeReactionPosts = (fakeReactionsRes.data || [])
          .map(r => r.post)
          .filter(p => p && !p.is_deleted);
        
        // Deduplicate posts
        const postMap = new Map();
        [...directFlagged, ...fakeReactionPosts].forEach(p => {
          if (p && !postMap.has(p.id)) {
            postMap.set(p.id, p);
          }
        });

        const flaggedPosts = Array.from(postMap.values()).map(p => ({
          ...p,
          type: 'flagged_post',
          id: `post_${p.id}`,
          original_id: p.id,
          target_id: p.id,
          target_type: 'post',
          reason: p.moderation_status === 'flagged' ? 'High report count' : 'Community flag'
        }));

        const reportedLogs = (logsRes.data || []).map(l => ({
          ...l,
          type: 'report_log',
          original_id: l.id
        }));

        const reports = (reportsRes.data || []).map(r => ({
          ...r,
          type: 'direct_report',
          original_id: r.id,
          target_type: r.report_type === 'chat' ? 'chat' : 'post',
          target_id: r.report_type === 'chat' ? r.chat_id : r.post_id
        }));

        result = [...flaggedPosts, ...reportedLogs, ...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (activeTab === 'users' && isSuperAdmin) {
        const currentLevel = getLevel(currentUserData);
        // Fetch promoted users OR muted users
        let query = supabase.from('rusers')
          .select('*')
          .or('is_admin.eq.true,is_moderator.eq.true,is_councillor.eq.true,is_muted.eq.true');
        
        const { data: users, error } = await query.order('username', { ascending: true });
        if (error) throw error;
        
        // Visibility Rule: targetLevel <= currentLevel + Sorting (Admins > Mods > Councillors)
        result = (users || [])
          .filter(u => getLevel(u) <= currentLevel)
          .sort((a, b) => {
            const levelA = getLevel(a);
            const levelB = getLevel(b);
            if (levelA !== levelB) return levelB - levelA;
            return a.username.localeCompare(b.username);
          });
              } else if (activeTab === 'logs' && isSuperAdmin) {
        const { data: logsData, error } = await supabase
          .from('rmoderation_logs')
          .select(`*, moderator:rusers!rmoderation_logs_moderator_id_fkey(username)`)
          .order('created_at', { ascending: false });
        if (error) throw error;
          result = logsData;
          } else if (activeTab === 'blocks') {
          const blockLogs = await getBlockLogs();
          result = blockLogs;
        } else if (activeTab === 'analytics' && isSuperAdmin) {
              const timeRangeDays = analyticsTimeRange === '7d' ? 7 : analyticsTimeRange === '30d' ? 30 : analyticsTimeRange === '90d' ? 90 : 365;
              const timeRangeDate = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();

              const [
                usersCount, 
                postsCount, 
                reactionsCount, 
                commentsCount,
                bannedUsers,
                activeUsers,
                mutedUsers,
                approvedPosts,
                heldPosts,
                rejectedPosts,
                flaggedPosts,
                reactionBreakdown,
                userGrowth,
                postGrowth,
                businesses,
                talent,
                topPosts,
                topUsers,
                recentComments,
                messageCount,
                reportCount,
                zoneBreakdown,
                hourlyPosts,
                hourlyComments,
                hourlyReactions,
                dailyActiveUsers,
                newUsersInRange,
                postsInRange,
                reactionsInRange,
                commentsInRange
              ] = await Promise.all([
                supabase.from('rusers').select('id, username').not('username', 'is', null),
                supabase.from('rposts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'approved').eq('is_deleted', false),
                supabase.from('rreactions').select('id', { count: 'exact', head: true }),
                supabase.from('rcomments').select('id', { count: 'exact', head: true }),
                supabase.from('rusers').select('id', { count: 'exact', head: true }).eq('is_banned', true),
                supabase.from('rusers').select('id, username').eq('is_banned', false).not('username', 'is', null),
                supabase.from('rusers').select('id', { count: 'exact', head: true }).eq('is_muted', true),
                supabase.from('rposts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
                supabase.from('rposts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'held'),
                supabase.from('rposts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
                supabase.from('rposts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'flagged'),
                supabase.rpc('get_reaction_breakdown').then(res => res.data || []),
                supabase.rpc('get_daily_user_growth').then(res => res.data || []),
                supabase.rpc('get_daily_post_growth').then(res => res.data || []),
                supabase.from('rbusinesses').select('status, id'),
                supabase.from('rtalent').select('status, id'),
                supabase.from('rposts').select('id, text, user_id, created_at, rusers(username, emoji_icon)').eq('moderation_status', 'approved').eq('is_deleted', false).order('created_at', { ascending: false }).limit(10),
                supabase.from('rusers').select('id, username, emoji_icon, created_at, is_verified').not('username', 'is', null).order('created_at', { ascending: false }).limit(50),
                supabase.from('rcomments').select('id, text, gif_url, user_id, post_id, created_at, rusers(username)').order('created_at', { ascending: false }).limit(10),
                supabase.from('rhelp_messages').select('id', { count: 'exact', head: true }).neq('status', 'chat'),
                supabase.from('rreports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('rposts').select('zone_id, user_id, city_id, rzones(name)').eq('moderation_status', 'approved').gt('created_at', timeRangeDate),
                supabase.from('rposts').select('created_at').eq('moderation_status', 'approved').gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('rcomments').select('created_at').gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('rreactions').select('created_at').gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('rposts').select('user_id').eq('moderation_status', 'approved').gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('rusers').select('id, username').not('username', 'is', null).gt('created_at', timeRangeDate),
                supabase.from('rposts').select('id', { count: 'exact', head: true }).gt('created_at', timeRangeDate),
                supabase.from('rreactions').select('id', { count: 'exact', head: true }).gt('created_at', timeRangeDate),
                supabase.from('rcomments').select('id', { count: 'exact', head: true }).gt('created_at', timeRangeDate)
              ]);

              // Filter out anon users (username like "anon" + digits) in JS
              const isAnon = (u) => u && u.username && /^anon\d+$/i.test(u.username);
              const registeredUsersCount = (usersCount.data || []).filter(u => !isAnon(u)).length;
              const activeUsersCount = (activeUsers.data || []).filter(u => !isAnon(u)).length;
              const newUsersInRangeCount = (newUsersInRange.data || []).filter(u => !isAnon(u)).length;
              const filteredTopUsers = (topUsers.data || []).filter(u => !isAnon(u)).slice(0, 10);

              let processedUserGrowth = userGrowth;
              let processedPostGrowth = postGrowth;
              let processedReactions = reactionBreakdown;

              if (!processedUserGrowth || processedUserGrowth.length === 0) {
                const { data: rawUsers } = await supabase.from('rusers').select('created_at').gt('created_at', timeRangeDate);
                const growth = {};
                rawUsers?.forEach(u => {
                  const date = new Date(u.created_at).toISOString().split('T')[0];
                  growth[date] = (growth[date] || 0) + 1;
                });
                processedUserGrowth = Object.entries(growth).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-timeRangeDays);
              }

              if (!processedPostGrowth || processedPostGrowth.length === 0) {
                const { data: rawPosts } = await supabase.from('rposts').select('created_at').gt('created_at', timeRangeDate);
                const growth = {};
                rawPosts?.forEach(p => {
                  const date = new Date(p.created_at).toISOString().split('T')[0];
                  growth[date] = (growth[date] || 0) + 1;
                });
                processedPostGrowth = Object.entries(growth).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-timeRangeDays);
              }

              if (!processedReactions || processedReactions.length === 0) {
                const { data: rawReactions } = await supabase.from('rreactions').select('reaction_type');
                const counts = {};
                rawReactions?.forEach(r => {
                  counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
                });
                processedReactions = Object.entries(counts).map(([type, count]) => ({ reaction_type: type, count })).sort((a, b) => b.count - a.count);
              }

              const zoneUserSets = {};
              zoneBreakdown.data?.forEach(p => {
                const zoneName = (p.city_id === 349 || !p.zone_id) ? 'Global' : (p.rzones?.name || 'Unknown');
                if (!zoneUserSets[zoneName]) zoneUserSets[zoneName] = new Set();
                if (p.user_id) zoneUserSets[zoneName].add(p.user_id);
              });
              const processedZones = Object.entries(zoneUserSets).map(([zone, users]) => ({ zone, count: users.size })).sort((a, b) => b.count - a.count).slice(0, 8);

              const hourlyStats = Array(24).fill(0);
              hourlyPosts.data?.forEach(p => {
                const hour = new Date(p.created_at).getHours();
                hourlyStats[hour]++;
              });
              hourlyComments.data?.forEach(c => {
                const hour = new Date(c.created_at).getHours();
                hourlyStats[hour]++;
              });
              hourlyReactions.data?.forEach(r => {
                const hour = new Date(r.created_at).getHours();
                hourlyStats[hour]++;
              });

              const uniqueActiveUsers = new Set(dailyActiveUsers.data?.map(p => p.user_id) || []).size;

              const { data: topPostsWithReactions } = await supabase.from('rposts')
                .select('id, text, user_id, created_at, rusers(username, emoji_icon)')
                .eq('moderation_status', 'approved')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(20);

              const postIds = topPostsWithReactions?.map(p => p.id) || [];
              const { data: reactionCounts } = await supabase.from('rreactions')
                .select('post_id')
                .in('post_id', postIds);
              const { data: commentCounts } = await supabase.from('rcomments')
                .select('post_id')
                .in('post_id', postIds);

              const reactionMap = {};
              reactionCounts?.forEach(r => {
                reactionMap[r.post_id] = (reactionMap[r.post_id] || 0) + 1;
              });
              const commentMap = {};
              commentCounts?.forEach(c => {
                commentMap[c.post_id] = (commentMap[c.post_id] || 0) + 1;
              });

              const enrichedTopPosts = topPostsWithReactions?.map(p => ({
                ...p,
                reaction_count: reactionMap[p.id] || 0,
                comment_count: commentMap[p.id] || 0,
                engagement_score: (reactionMap[p.id] || 0) + (commentMap[p.id] || 0) * 2
              })).sort((a, b) => b.engagement_score - a.engagement_score).slice(0, 5);

              const { data: topEngagedUsers } = await supabase.from('rusers')
                .select('id, username, emoji_icon')
                .limit(50);
              const userPostCounts = {};
              const { data: userPosts } = await supabase.from('rposts')
                .select('user_id')
                .eq('moderation_status', 'approved')
                .gt('created_at', timeRangeDate);
              userPosts?.forEach(p => {
                userPostCounts[p.user_id] = (userPostCounts[p.user_id] || 0) + 1;
              });
              const enrichedUsers = topEngagedUsers?.map(u => ({
                ...u,
                post_count: userPostCounts[u.id] || 0
              })).filter(u => u.post_count > 0 && !isAnon(u)).sort((a, b) => b.post_count - a.post_count).slice(0, 5);

              setAnalytics({
                summary: {
                  users: registeredUsersCount,
                  posts: postsCount.count,
                  reactions: reactionsCount.count,
                  comments: commentsCount.count,
                },
                rangeStats: {
                  newUsers: newUsersInRangeCount,
                  newPosts: postsInRange.count || 0,
                  newReactions: reactionsInRange.count || 0,
                  newComments: commentsInRange.count || 0,
                },
                users: {
                  active: activeUsersCount,
                  banned: bannedUsers.count,
                  muted: mutedUsers.count || 0,
                  growth: processedUserGrowth,
                  dailyActive: uniqueActiveUsers
                },
                posts: {
                  approved: approvedPosts.count,
                  held: heldPosts.count,
                  rejected: rejectedPosts.count,
                  flagged: flaggedPosts.count,
                  growth: processedPostGrowth
                },
                engagement: {
                  reactions: processedReactions,
                  topPosts: enrichedTopPosts || [],
                  topUsers: enrichedUsers || [],
                  recentComments: recentComments.data || []
                },
                zones: processedZones,
                hourlyActivity: hourlyStats,
                business: {
                  approved: businesses.data?.filter(b => b.status === 'approved').length || 0,
                  pending: businesses.data?.filter(b => b.status === 'pending').length || 0,
                  rejected: businesses.data?.filter(b => b.status === 'rejected').length || 0,
                },
                talent: {
                  approved: talent.data?.filter(t => t.status === 'approved').length || 0,
                  pending: talent.data?.filter(t => t.status === 'pending').length || 0,
                  rejected: talent.data?.filter(t => t.status === 'rejected').length || 0,
                },
                support: {
                  messages: messageCount.count || 0,
                  pendingReports: reportCount.count || 0
                }
              });
              result = [];
          }
          setData(result || []);
        } catch (error) {
          console.error(error);
          toast.error("Failed to fetch data.");
        } finally {
          setLoading(false);
        }

      };
  
    const handleLiveSearch = async (text) => {
      setUserSearch(text);
      if (!text || text.length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        const currentLevel = getLevel(currentUserData);
        const { data: results, error } = await supabase
          .from('rusers')
          .select('*')
          .ilike('username', `%${text}%`)
          .limit(10);
        
        if (error) throw error;
        
        setSearchResults((results || []).filter(u => getLevel(u) <= currentLevel));
      } catch (err) {
        console.error("Live search failed:", err);
      }
    };


  const handleRestorePost = async (log) => {
    if (log.target_type !== 'post') return;
    
    crossAlert(
      "Restore Post",
      "Are you sure you want to restore this post?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Restore", 
          onPress: async () => {
    try {
      const admin = await getStoredUser();
      const { error } = await supabase
        .from('rposts')
        .update({ is_deleted: false, deletion_reason: null, deleted_by: null })
        .eq('id', log.target_id);
      
      if (error) throw error;
      
      try {
        await supabase.from('rmoderation_logs').insert({
          moderator_id: admin.id,
          target_id: log.target_id,
          target_type: 'post',
          action: 'restore_post',
          reason: 'Restored by super admin'
        });
      } catch (logError) {
        console.warn("Moderation log failed:", logError);
      }

      toast.success("Post has been restored.");
              fetchData();
            } catch (error) {
              console.error(error);
              toast.error("Failed to restore post.");
            }
          }
        }
      ]
    );
  };

  const handleUndoAction = async (log) => {
    if (!log.target_type || !log.target_id) return;
    
    crossAlert(
      "Undo Action",
      `Are you sure you want to undo this ${log.action?.replace(/_/g, ' ')} action?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Undo", 
          onPress: async () => {
            try {
              const admin = await getStoredUser();
              
              if (log.target_type === 'post') {
                const previousState = log.previous_state || {};
                const updateData = {};
                
                if (log.action === 'delete' || log.action === 'delete_post') {
                  updateData.is_deleted = previousState.is_deleted ?? false;
                  updateData.deletion_reason = null;
                } else if (log.action === 'blur') {
                  updateData.is_blurred = previousState.is_blurred ?? false;
                  updateData.blur_reason = previousState.blur_reason ?? null;
                } else if (log.action === 'unblur') {
                  updateData.is_blurred = previousState.is_blurred ?? true;
                  updateData.blur_reason = previousState.blur_reason ?? 'Restored blur';
                } else if (log.action === 'toggle_comments') {
                  updateData.comments_disabled = previousState.comments_disabled ?? false;
                }
                
                const { error } = await supabase
                  .from('rposts')
                  .update(updateData)
                  .eq('id', log.target_id);
                
                if (error) throw error;
              } else if (log.target_type === 'user') {
                if (log.action === 'delete_post') {
                  let restored = false;
                  const reportMatch = log.reason?.match(/report\s+(\d+)/i);
                  if (reportMatch) {
                    const { data: report } = await supabase.from('rreports').select('target_id, target_type, post_id').eq('id', reportMatch[1]).maybeSingle();
                    const postId = report?.target_type === 'post' ? report.target_id : report?.post_id;
                    if (postId) {
                      const { error } = await supabase.from('rposts').update({ is_deleted: false, deletion_reason: null, deleted_by: null }).eq('id', postId);
                      if (!error) restored = true;
                    }
                  }
                  if (!restored) {
                    const { data: deletedPosts } = await supabase.from('rposts').select('id').eq('user_id', log.target_id).eq('is_deleted', true).order('created_at', { ascending: false }).limit(1);
                    if (deletedPosts && deletedPosts.length > 0) {
                      await supabase.from('rposts').update({ is_deleted: false, deletion_reason: null, deleted_by: null }).eq('id', deletedPosts[0].id);
                    }
                  }
                } else {
                  const updateData = {};
                  if (log.action === 'mute') updateData.is_muted = false;
                  else if (log.action === 'ban') updateData.is_banned = false;
                  else if (log.action === 'warn') {
                    const { data: targetUser } = await supabase.from('rusers').select('warning_count').eq('id', log.target_id).single();
                    updateData.warning_count = Math.max(0, (targetUser?.warning_count || 1) - 1);
                  }
                  const { error } = await supabase.from('rusers').update(updateData).eq('id', log.target_id);
                  if (error) throw error;
                }
              }
              
              // Mark the original log as undone
              await supabase.from('rmoderation_logs').update({
                is_undone: true,
                undone_by: admin.id,
                undone_at: new Date().toISOString()
              }).eq('id', log.id);

              // Reset associated report back to pending
              const reportMatch2 = log.reason?.match(/report\s+(\d+)/i);
              if (reportMatch2) {
                await supabase.from('rreports').update({ status: 'pending' }).eq('id', reportMatch2[1]);
              }
              
              // Log the undo action
              await supabase.from('rmoderation_logs').insert({
                moderator_id: admin.id,
                target_id: log.target_id,
                target_type: log.target_type,
                action: `undo_${log.action}`,
                reason: `Undid action: ${log.action} (original log ID: ${log.id})`
              });

              toast.success("Action has been undone.");
              fetchData();
            } catch (error) {
              console.error(error);
              toast.error("Failed to undo action.");
            }
          }
        }
      ]
    );
  };

      const handleUpdateRole = async (userId, role, cityId = null) => {
        try {
          const currentLevel = getLevel(currentUserData);
          const { data: targetUser } = await supabase.from('rusers').select('*').eq('id', userId).single();
          const targetLevel = getLevel(targetUser);

          if (role.startsWith('demote') && targetLevel >= currentLevel) {
            toast.error("You cannot demote someone at your level or higher.");
            return;
          }

          // Special rule: Mod (3) demoting Councillor (2) needs review
          if (currentLevel === 3 && targetLevel === 2 && role === 'demote_councillor') {
            const admin = await getStoredUser();
            const { error: logError } = await supabase.from('rmoderation_logs').insert({
              moderator_id: admin.id,
              target_id: userId,
              target_type: 'user',
              action: 'demote_request',
              reason: 'Moderator requested demotion of Councillor',
              metadata: { username: targetUser.username, requested_role: 'demote_councillor' }
            });
            if (logError) throw logError;
            toast.success("Demotion request sent to Admins for review.");
            return;
          }

            let updateData = {};
            if (role === 'mod') {
              updateData = { is_moderator: true, is_councillor: false, councillor_city_id: null };
            } else if (role === 'councillor') {
              updateData = { is_councillor: true, is_moderator: false, councillor_city_id: cityId };
            } else if (role === 'demote') {
              updateData = { is_moderator: false, is_councillor: false, councillor_city_id: null };
            } else if (role === 'demote_mod') {
              updateData = { is_moderator: false };
            } else if (role === 'demote_councillor') {
              updateData = { is_councillor: false, councillor_city_id: null };
            }
  
          const { data: updatedUsers, error } = await supabase.from('rusers').update(updateData).eq('id', userId).select();
          if (error) throw error;

          if (!updatedUsers || updatedUsers.length === 0) {
            throw new Error("Permission denied or user not found. Please check your admin status.");
          }

        // Log the change
        const admin = await getStoredUser();
        await supabase.from('rmoderation_logs').insert({
          moderator_id: admin.id,
          target_id: userId,
          target_type: 'user',
          action: role,
          reason: `Role updated to ${role} by ${currentUserData.username}`
        });

        await notifyStaffOfAdminAction({
          actorId: admin.id,
          title: 'Staff action: Role updated',
          message: `@${currentUserData.username} set role '${role}'`,
          metadata: { targetUserId: userId, action: role }
        });

          toast.success("User role updated.");
          setUserRoleModal(false);
          setSelectedUser(null);
          setSelectedCityId(null);
          setUserSearch('');
          setSearchResults([]);
          fetchData();
        } catch (error) {
        console.error(error);
        toast.error("Failed to update user role.");
      }
    };

    const handleMute = async (user) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const isMuting = !user.is_muted;
      
      crossAlert(
        isMuting ? "Mute User" : "Unmute User",
        `Are you sure you want to ${isMuting ? 'mute' : 'unmute'} @${user.username}? ${isMuting ? 'They will be restricted from commenting, flagging, and messaging.' : ''}`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: isMuting ? "Mute" : "Unmute", 
            onPress: async () => {
              try {
                const admin = await getStoredUser();
                const { error } = await supabase
                  .from('rusers')
                  .update({ 
                    is_muted: isMuting,
                    mute_reason: isMuting ? 'Suspended by moderator' : null,
                    muted_at: isMuting ? new Date().toISOString() : null,
                    muted_by: isMuting ? admin.id : null
                  })
                  .eq('id', user.id);
                
                if (error) throw error;

                await supabase.from('rmoderation_logs').insert({
                  moderator_id: admin.id,
                  target_id: user.id,
                  target_type: 'user',
                  action: isMuting ? 'mute' : 'unmute',
                  reason: isMuting ? 'Suspended for community guidelines violation' : 'Restored by admin'
                });

                await notifyStaffOfAdminAction({
                  actorId: admin.id,
                  title: `Staff action: ${isMuting ? 'Muted user' : 'Unmuted user'}`,
                  message: `@${admin.username || 'staff'} ${isMuting ? 'muted' : 'unmuted'} @${user.username}`,
                  metadata: { targetUserId: user.id, action: isMuting ? 'mute' : 'unmute' }
                });

                await sendNotification({
                  userId: user.id,
                  title: isMuting ? 'Account Restricted' : 'Account Restored',
                  message: isMuting 
                    ? 'Your account has been temporarily muted due to a community guidelines violation. You cannot post or comment until this is lifted.'
                    : 'Your account restrictions have been lifted. You can now post and comment again.',
                  type: 'moderation_action',
                  link: '/guidelines'
                });

                toast.success(`User @${user.username} has been ${isMuting ? 'muted' : 'unmuted'}.`);
                fetchData();
              } catch (err) {
                console.error(err);
                toast.error("Failed to update mute status.");
              }
            }
          }
        ]
      );
    };

      const handleRequestEdit = async () => {
        if (!requestEditReason.trim()) {
          toast.error("Please provide a reason for the edit request.");
          return;
        }
  
        try {
          const admin = await getStoredUser();
          let table = '';
          let itemId = requestEditItem.id;
          let targetUserId = requestEditItem.user_id;

          if (activeTab === 'edits') {
            table = 'showcase_pending_edits';
          } else if (activeTab === 'talent') {
            table = 'rtalent';
          } else if (activeTab === 'business') {
            table = 'rbusinesses';
          } else if (activeTab === 'votes') {
            table = 'rfeature_suggestions';
          } else {
            table = 'rbusinesses'; // Fallback
          }
          
          const { error } = await supabase
            .from(table)
            .update({ 
              status: 'rejected', 
              moderation_reason: `EDIT REQUESTED: ${requestEditReason.trim()}`,
              reviewed_at: activeTab === 'edits' ? new Date().toISOString() : undefined
            })
            .eq('id', itemId);
          
          if (error) throw error;
  
          await supabase.from('rmoderation_logs').insert({
            moderator_id: admin.id,
            target_id: itemId,
            target_type: activeTab === 'edits' ? 'showcase_edit' : (activeTab === 'talent' ? 'talent' : 'business'),
            action: 'request_edit',
            reason: requestEditReason.trim()
          });

          await notifyStaffOfAdminAction({
            actorId: admin.id,
            title: 'Staff action: Edit requested',
            message: `Edit requested for ${activeTab} (${itemId})`,
            metadata: { targetId: itemId, targetType: activeTab, action: 'request_edit' }
          });
  
            // Notify the user
            try {
              await sendNotification({
                userId: targetUserId,
                title: 'Action Required',
                message: `Moderator requested changes to your ${activeTab === 'edits' ? requestEditItem.showcase_type : activeTab} showcase: ${requestEditReason.trim()}`,
                type: 'moderation_action',
                link: '/(tabs)/showcase' // Assuming there is a showcase tab
              });
            } catch (notifErr) {
            console.warn("Notification failed:", notifErr);
          }

        toast.success("User has been notified to edit their submission.");
        setData(prev => prev.filter(p => p.id !== requestEditItem.id));
        setRequestEditItem(null);
        setRequestEditReason('');
      } catch (err) {
        console.error(err);
        toast.error("Failed to send request.");
      }
    };

    const handleAction = async (itemId, action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      let table = '';
      let updateData = {};
      
        if (activeTab === 'talent') {
          table = 'rtalent';
          updateData = { status: action === 'approve' ? 'approved' : 'rejected' };
          const item = data.find(i => i.id === itemId);
          const admin = await getStoredUser();
          await supabase.from('rmoderation_logs').insert({
            moderator_id: admin.id,
            target_id: itemId,
            target_type: 'talent',
            action: action,
            reason: action === 'approve' ? 'Approved by moderator' : 'Rejected by moderator'
          });

          await notifyStaffOfAdminAction({
            actorId: admin.id,
            title: `Staff action: Talent ${action}`,
            message: `Talent ${itemId} ${action}d`,
            metadata: { targetId: itemId, targetType: 'talent', action }
          });
            if (item?.user_id) {
              if (action === 'approve') {
                await sendNotification({
                  userId: item.user_id,
                  title: 'Showcase Approved!',
                  message: 'Your talent showcase is now live!',
                  type: 'moderation_action',
                  link: '/(tabs)/showcase'
                });
              } else {
                await sendNotification({
                  userId: item.user_id,
                  title: 'Showcase Not Approved',
                  message: 'Your talent showcase submission was not approved. Please review our guidelines and try again.',
                  type: 'moderation_action',
                  link: '/guidelines'
                });
              }
            }
        } else if (activeTab === 'edits') {
          const edit = data.find(i => i.id === itemId);
          const admin = await getStoredUser();
          if (action === 'approve') {
            const targetTable = edit.showcase_type === 'talent' ? 'rtalent' : 'rbusinesses';
            const { error: updateError } = await supabase
              .from(targetTable)
              .update({ [edit.field_name]: edit.new_value })
              .eq('id', edit.showcase_id);
            if (updateError) throw updateError;
          }
          table = 'showcase_pending_edits';
          updateData = { status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() };
          await supabase.from('rmoderation_logs').insert({
            moderator_id: admin.id,
            target_id: itemId,
            target_type: 'showcase_edit',
            action: action,
            reason: `Edit to ${edit.field_name} ${action}d`
          });

          await notifyStaffOfAdminAction({
            actorId: admin.id,
            title: `Staff action: Showcase edit ${action}`,
            message: `Edit ${itemId} (${edit.field_name}) ${action}d`,
            metadata: { targetId: itemId, targetType: 'showcase_edit', action }
          });
          if (edit?.user_id) {
            if (action === 'approve') {
              await sendNotification({
                userId: edit.user_id,
                title: 'Edit Approved',
                message: `Your edit to ${edit.field_name} has been approved and is now live.`,
                type: 'moderation_action',
                link: '/(tabs)/showcase'
              });
            } else {
              await sendNotification({
                userId: edit.user_id,
                title: 'Edit Not Approved',
                message: `Your edit to ${edit.field_name} was not approved. Please review our guidelines.`,
                type: 'moderation_action',
                link: '/guidelines'
              });
            }
          }
        } else if (activeTab === 'business') {
          table = 'rbusinesses';
          updateData = { status: action === 'approve' ? 'approved' : 'rejected' };
          const item = data.find(i => i.id === itemId);
          const admin = await getStoredUser();
          await supabase.from('rmoderation_logs').insert({
            moderator_id: admin.id,
            target_id: itemId,
            target_type: 'business',
            action: action,
            reason: action === 'approve' ? 'Approved by moderator' : 'Rejected by moderator'
          });

          await notifyStaffOfAdminAction({
            actorId: admin.id,
            title: `Staff action: Business ${action}`,
            message: `Business ${itemId} ${action}d`,
            metadata: { targetId: itemId, targetType: 'business', action }
          });
            if (item?.user_id) {
              if (action === 'approve') {
                await sendNotification({
                  userId: item.user_id,
                  title: 'Business Approved!',
                  message: 'Your business showcase is now live!',
                  type: 'moderation_action',
                  link: '/(tabs)/showcase'
                });
              } else {
                await sendNotification({
                  userId: item.user_id,
                  title: 'Business Not Approved',
                  message: 'Your business submission was not approved. Please review our guidelines and try again.',
                  type: 'moderation_action',
                  link: '/guidelines'
                });
              }
            }
        } else if (activeTab === 'votes') {
        if (action === 'approve') {
          setPollModalItem(itemId);
          const suggestion = data.find(i => i.id === itemId);
          setPollQuestion(suggestion?.suggestion_text || '');
          return; // Modal will handle the rest
        }
        table = 'rfeature_suggestions';
        updateData = { status: 'rejected' };
      } else if (activeTab === 'ai' || activeTab === 'news') {
        table = 'rposts';
        updateData = { 
          moderation_status: action === 'approve' ? 'approved' : 'rejected',
          is_blurred: action === 'reject',
          is_deleted: action === 'reject'
        };
        const post = data.find(i => i.id === itemId);
        if (post?.user_id) {
          if (action === 'approve') {
            await sendNotification({
              userId: post.user_id,
              title: 'Post Approved',
              message: 'Your post has been reviewed and approved. It is now visible to the community.',
              type: 'moderation_action',
              link: '/'
            });
          } else {
            await sendNotification({
              userId: post.user_id,
              title: 'Post Not Approved',
              message: `Your post was not approved: ${post.moderation_reason || 'It did not meet our community guidelines.'}`,
              type: 'moderation_action',
              link: '/guidelines'
            });
          }
        }
        } else if (activeTab === 'reports') {
          const report = data.find(i => i.id === itemId);
          if (!report) throw new Error("Report not found");
          
          const targetUserId = report.target_type === 'user' ? report.target_id : (report.target_type === 'post' ? report.user_id : report.target_id);

          if (action === 'approve' || action === 'mute' || action === 'ban' || action === 'warn' || action === 'delete_post') {
            const admin = await getStoredUser();
            
            if (action === 'mute') {
              await supabase.from('rusers').update({ is_muted: true }).eq('id', targetUserId);
              await sendNotification({
                userId: targetUserId,
                title: 'Account Restricted',
                message: 'Your account has been temporarily muted due to a community guidelines violation. You cannot post or comment until this is lifted.',
                type: 'moderation_action',
                link: '/guidelines'
              });
            } else if (action === 'ban') {
              await supabase.from('rusers').update({ is_banned: true }).eq('id', targetUserId);
              await sendNotification({
                userId: targetUserId,
                title: 'Account Suspended',
                message: 'Your account has been suspended due to repeated or serious community guidelines violations.',
                type: 'moderation_action',
                link: '/guidelines'
              });
            } else if (action === 'warn') {
              await supabase.from('rusers').update({ warning_count: (report.target_user?.warning_count || 0) + 1 }).eq('id', targetUserId);
              await sendNotification({
                userId: targetUserId,
                title: 'Warning Issued',
                message: 'You have received a warning for violating community guidelines. Further violations may result in account restrictions.',
                type: 'moderation_action',
                link: '/guidelines'
              });
            } else if (action === 'delete_post') {
              const postId = report.target_type === 'post' ? report.target_id : report.post_id;
              if (postId) {
                await supabase.from('rposts').update({ is_deleted: true, deletion_reason: 'Removed by moderator' }).eq('id', postId);
                await sendNotification({
                  userId: targetUserId,
                  title: 'Post Removed',
                  message: 'Your post was removed by a moderator for violating community guidelines.',
                  type: 'moderation_action',
                  link: '/guidelines'
                });
              }
            }

            // Record action in logs
            await supabase.from('rmoderation_logs').insert({
              moderator_id: admin.id,
              target_id: targetUserId,
              target_type: 'user',
              action: action,
              reason: `Action ${action} taken via report ${report.id}`
            });

            await notifyStaffOfAdminAction({
              actorId: admin.id,
              title: `Staff action: Report handled (${action})`,
              message: `Report ${report.id}: action ${action}`,
              metadata: { reportId: report.id, targetUserId, action }
            });

            // Notify the reporter that action was taken
            if (report.reporter_id && report.reporter_id !== targetUserId) {
              await sendNotification({
                userId: report.reporter_id,
                title: 'Report Update',
                message: 'Thank you for your report. Our team has reviewed it and taken appropriate action.',
                type: 'moderation_action',
                link: '/notifications'
              });
            }

            // Update the report or log
            if (report.type === 'direct_report') {
              table = 'rreports';
              updateData = { status: 'resolved' };
            } else if (report.type === 'report_log') {
              table = 'rmoderation_logs';
              updateData = { action: `${action}_handled` };
            } else if (report.type === 'flagged_post') {
              table = 'rposts';
              updateData = { moderation_status: 'resolved' };
            }
          } else if (action === 'reject') {
            // Notify reporter that their report was dismissed
            if (report.reporter_id) {
              await sendNotification({
                userId: report.reporter_id,
                title: 'Report Reviewed',
                message: 'Your report has been reviewed. After investigation, no action was required at this time. Thank you for helping keep our community safe.',
                type: 'moderation_action',
                link: '/notifications'
              });
            }
            
            if (report.type === 'direct_report') {
              table = 'rreports';
              updateData = { status: 'dismissed' };
            } else if (report.type === 'report_log') {
              table = 'rmoderation_logs';
              updateData = { action: 'rejected' };
            } else if (report.type === 'flagged_post') {
              table = 'rposts';
              updateData = { moderation_status: 'approved' };
            }
          }
        }

      const { error } = await supabase.from(table).update(updateData).eq('id', itemId.toString().startsWith?.('post_') ? itemId.replace('post_', '') : itemId);
      if (error) throw error;
      
      setData(prev => prev.filter(p => p.id !== itemId));
      toast.success(`Item has been ${action}d.`);
    } catch (error) {
      console.error(error);
      toast.error("Action failed.");
    }
  };

  const handleOvertake = async (userId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const admin = await getStoredUser();
      const { error } = await supabase.from('rhelp_messages').insert({
        sender_id: admin.id,
        receiver_id: userId,
        content: "A real agent has joined the chat.",
        is_from_admin: true,
        status: 'overtaken'
      });
      if (error) throw error;
      
      toast.success("You have overtaken this chat. AI responses are now disabled.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Overtake failed.");
    }
  };

  const handleReply = async (userId) => {
    if (!replyText.trim()) return;
    try {
      const admin = await getStoredUser();
      const { error } = await supabase.from('rhelp_messages').insert({
        sender_id: admin.id,
        receiver_id: userId,
        content: replyText.trim(),
        is_from_admin: true
      });
      if (error) throw error;
      
      try {
        // Notify the user
        const { sendHelpMessageNotification } = require('@/utils/notifications');
        await sendHelpMessageNotification({
          senderId: admin.id,
          senderUsername: 'Admin',
          receiverId: userId,
          isFromAdmin: true,
          messageContent: replyText.trim()
        });
      } catch (notifError) {
        console.warn("Notification failed:", notifError);
      }
      
      setReplyText('');
      setExpandedChatId(null);
      toast.success("Reply sent.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Reply failed.");
    }
  };

  const handleResolve = async (userId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const admin = await getStoredUser();
      const { error } = await supabase.from('rhelp_messages').insert({
        sender_id: admin.id,
        receiver_id: userId,
        content: "This chat has been resolved. Please rate your experience 1-5 / Leave a comment.",
        is_from_admin: true,
        status: 'resolved'
      });
      if (error) throw error;
      
      try {
        const { sendHelpMessageNotification } = require('@/utils/notifications');
        await sendHelpMessageNotification({
          senderId: admin.id,
          senderUsername: 'Admin',
          receiverId: userId,
          isFromAdmin: true,
          messageContent: "Your support chat has been resolved."
        });
      } catch (notifError) {
        console.warn("Notification failed:", notifError);
      }

      setExpandedChatId(null);
      toast.success("Chat marked as resolved.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to resolve chat.");
    }
  };

  const handleOverridePost = async () => {
      if (!overrideReason.trim()) {
        toast.error("Please provide a reason for overriding.");
        return;
      }

      try {
        const user = await getStoredUser();
        const { error } = await supabase
          .from('rposts')
          .update({ 
            moderation_status: 'approved',
            is_blurred: false,
            is_deleted: false
          })
          .eq('id', overrideItem.id);
        
        if (error) throw error;

        try {
          await supabase.from('rmoderation_logs').insert({
            moderator_id: user.id,
            target_id: overrideItem.id,
            target_type: 'post',
            action: 'override_approve',
            reason: `Override: ${overrideReason.trim()}`
          });

          await notifyStaffOfAdminAction({
            actorId: user.id,
            title: 'Staff action: Override approve',
            message: `Post ${overrideItem.id} override approved`,
            metadata: { targetId: overrideItem.id, targetType: 'post', action: 'override_approve' }
          });
        } catch (logError) {
          console.warn("Moderation log failed:", logError);
        }

        setData(prev => prev.filter(p => p.id !== overrideItem.id));
        setOverrideItem(null);
        setOverrideReason('');
        setOverrideMode(null);
        toast.success("Post has been approved and posted.");
        } catch (error) {
          console.error(error);
          toast.error("Failed to approve post.");
        }
      };

    const handleOverrideDelete = async () => {
    if (!overrideReason.trim()) {
      toast.error("Please provide a reason for overriding.");
      return;
    }

    try {
      const user = await getStoredUser();
      const { error } = await supabase
        .from('rposts')
        .update({ 
          is_deleted: true, 
          deletion_reason: overrideReason.trim(), 
          moderation_status: 'rejected' 
        })
        .eq('id', overrideItem.id);
      
      if (error) throw error;

      try {
        await supabase.from('rmoderation_logs').insert({
          moderator_id: user.id,
          target_id: overrideItem.id,
          target_type: 'post',
          action: 'delete_post',
          reason: `Override: ${overrideReason.trim()}`
        });

        await notifyStaffOfAdminAction({
          actorId: user.id,
          title: 'Staff action: Override delete',
          message: `Post ${overrideItem.id} override deleted`,
          metadata: { targetId: overrideItem.id, targetType: 'post', action: 'delete_post' }
        });
      } catch (logError) {
        console.warn("Moderation log failed:", logError);
      }

        setData(prev => prev.filter(p => p.id !== overrideItem.id));
        setOverrideItem(null);
        setOverrideReason('');
        setOverrideMode(null);
          toast.success("Post has been deleted.");
        } catch (error) {
          console.error(error);
          toast.error("Failed to delete post.");
        }
      };


  const handleCreatePollFromSuggestion = async () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) {
      toast.error("Please provide a question and all options.");
      return;
    }

    try {
      const user = await getStoredUser();
      
      // 1. Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('rpolls')
        .insert({
          question: pollQuestion.trim(),
          is_active: true
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // 2. Create options
      const optionsToInsert = pollOptions.map(o => ({
        poll_id: poll.id,
        option_text: o.trim()
      }));

      const { error: optionsError } = await supabase
        .from('rpoll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      // 3. Mark suggestion as approved
      const { error: suggestionError } = await supabase
        .from('rfeature_suggestions')
        .update({ status: 'approved' })
        .eq('id', pollModalItem);

      if (suggestionError) throw suggestionError;

      toast.success("Poll created and suggestion approved!");
      setData(prev => prev.filter(p => p.id !== pollModalItem));
      setPollModalItem(null);
      setPollQuestion('');
      setPollOptions(['Yes', 'No', 'Maybe later']);
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete operation.");
    }
  };

  const updatePollOption = (text, index) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  const fetchTranscript = async (userId) => {
    try {
      const { data: messages, error } = await supabase
        .from('rhelp_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .neq('status', 'chat')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setTranscripts(prev => ({ ...prev, [userId]: messages }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (table, id, newStatus) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      setAnalyticsDetailData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const fetchAnalyticsDetail = async (type, filter = null) => {
    setAnalyticsDetailLoading(true);
    setAnalyticsDetailModal(type);
    try {
      let result = [];
      const timeRangeDays = analyticsTimeRange === '7d' ? 7 : analyticsTimeRange === '30d' ? 30 : analyticsTimeRange === '90d' ? 90 : 365;
      const timeRangeDate = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();

      if (type === 'users') {
        const { data } = await supabase.from('rusers')
          .select('id, username, emoji_icon, created_at, is_verified, is_banned')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'new_users') {
        const { data } = await supabase.from('rusers')
          .select('id, username, emoji_icon, created_at, is_verified')
          .gt('created_at', timeRangeDate)
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'posts') {
        const { data } = await supabase.from('rposts')
          .select('id, text, user_id, created_at, moderation_status, rusers(username, emoji_icon)')
          .eq('moderation_status', 'approved')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'approved_posts') {
        const { data } = await supabase.from('rposts')
          .select('id, text, user_id, created_at, rusers(username, emoji_icon)')
          .eq('moderation_status', 'approved')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'held_posts') {
        const { data } = await supabase.from('rposts')
          .select('id, text, user_id, created_at, moderation_reason, rusers(username, emoji_icon)')
          .eq('moderation_status', 'held')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'rejected_posts') {
        const { data } = await supabase.from('rposts')
          .select('id, text, user_id, created_at, moderation_reason, rusers(username, emoji_icon)')
          .eq('moderation_status', 'rejected')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'flagged_posts') {
        const { data } = await supabase.from('rposts')
          .select('id, text, user_id, created_at, moderation_reason, rusers(username, emoji_icon)')
          .eq('moderation_status', 'flagged')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'reactions') {
        const { data } = await supabase.from('rreactions')
          .select('id, reaction_type, post_id, user_id, created_at, rusers(username), rposts(text)')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'comments') {
        const { data } = await supabase.from('rcomments')
          .select('id, text, gif_url, post_id, user_id, created_at, rusers(username), rposts(text)')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'banned_users') {
        const { data } = await supabase.from('rusers')
          .select('id, username, emoji_icon, created_at')
          .eq('is_banned', true)
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'zone' && filter) {
        const { data } = await supabase.from('rposts')
          .select('id, text, user_id, created_at, rzones(name), rusers(username, emoji_icon)')
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);
        result = (data || []).filter(p => p.rzones?.name === filter);
      } else if (type === 'businesses') {
        const { data } = await supabase.from('rbusinesses')
          .select('id, name, category, status, created_at, rusers(username)')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      } else if (type === 'talent') {
        const { data } = await supabase.from('rtalent')
          .select('id, name, category, status, created_at, rusers(username)')
          .order('created_at', { ascending: false })
          .limit(50);
        result = data || [];
      }
      
      setAnalyticsDetailData(result);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch details.");
    } finally {
      setAnalyticsDetailLoading(false);
    }
  };

        const renderItem = ({ item }) => {
          if (activeTab === 'users') {
            const currentLevel = getLevel(currentUserData);
            const targetLevel = getLevel(item);

            return (
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.userRow}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.background }]}>
                      <Users size={14} color={theme.colors.text} />
                    </View>
                    <View>
                      <Text style={dynamicStyles.username}>@{item.username}</Text>
                      <View style={styles.roleBadgesRow}>
                        {item.is_admin && <View style={[styles.roleBadge, { backgroundColor: '#EF4444' }]}><Text style={styles.roleBadgeText}>ADMIN</Text></View>}
                        {item.is_moderator && <View style={[styles.roleBadge, { backgroundColor: '#A855F7' }]}><Text style={styles.roleBadgeText}>MOD</Text></View>}
                        {item.is_councillor && <View style={[styles.roleBadge, { backgroundColor: '#06B6D4' }]}><Text style={styles.roleBadgeText}>COUNCILLOR</Text></View>}
                        {item.is_muted && <View style={[styles.roleBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.roleBadgeText}>MUTED</Text></View>}
                      </View>
                    </View>
                  </View>
                  <Text style={dynamicStyles.date}>Joined {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>

                <View style={[styles.actionRow, { backgroundColor: theme.colors.background + '40' }]}>
                    {userSearch && targetLevel < currentLevel && (
                      <>
                        {!item.is_moderator && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]} 
                            onPress={() => handleUpdateRole(item.id, 'mod')}
                          >
                            <Shield size={18} color={theme.colors.primary} />
                            <Text style={[styles.actionText, { color: theme.colors.primary }]}>PROMOTE MOD</Text>
                          </TouchableOpacity>
                        )}
                        {!item.is_councillor && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#06B6D420' }]} 
                            onPress={() => {
                              setSelectedUser(item);
                              setUserRoleModal(true);
                            }}
                          >
                            <UserCheck size={18} color="#06B6D4" />
                            <Text style={[styles.actionText, { color: '#06B6D4' }]}>PROMOTE COUNCILLOR</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {targetLevel < currentLevel && (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: item.is_muted ? '#10B98120' : '#F59E0B20' }]} 
                        onPress={() => handleMute(item)}
                      >
                        <VolumeX size={18} color={item.is_muted ? '#10B981' : '#F59E0B'} />
                        <Text style={[styles.actionText, { color: item.is_muted ? '#10B981' : '#F59E0B' }]}>
                          {item.is_muted ? 'UNMUTE' : 'MUTE USER'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {targetLevel < currentLevel && (
                      <>
                        {item.is_moderator && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]} 
                            onPress={() => handleUpdateRole(item.id, 'demote_mod')}
                          >
                            <XCircle size={18} color={theme.colors.error} />
                            <Text style={[styles.actionText, { color: theme.colors.error }]}>DEMOTE MOD</Text>
                          </TouchableOpacity>
                        )}
                        {item.is_councillor && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]} 
                            onPress={() => handleUpdateRole(item.id, 'demote_councillor')}
                          >
                            <XCircle size={18} color={theme.colors.error} />
                            <Text style={[styles.actionText, { color: theme.colors.error }]}>DEMOTE COUNCILLOR</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}

                    {item.is_councillor && targetLevel < currentLevel && (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#06B6D420' }]} 
                        onPress={() => {
                          setSelectedUser(item);
                          setUserRoleModal(true);
                        }}
                      >
                        <RefreshCw size={18} color="#06B6D4" />
                        <Text style={[styles.actionText, { color: '#06B6D4' }]}>CHANGE CITY</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                  </View>
              );
            }

            if (activeTab === 'blocks') {
              return (
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userRow}>
                      <View style={[styles.iconContainer, { backgroundColor: '#EF4444' }]}>
                        <Ban size={14} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={dynamicStyles.username}>@{item.blocker?.username || 'unknown'}</Text>
                        <Text style={[styles.blockArrowText, { color: theme.colors.textSecondary }]}>blocked @{item.blocked?.username || 'unknown'}</Text>
                      </View>
                    </View>
                    <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.contentPadding}>
                    <View style={[styles.blockReasonContainer, { backgroundColor: theme.colors.background + '40', borderColor: theme.colors.border }]}>
                      <Text style={[styles.blockReasonLabel, { color: theme.colors.textSecondary }]}>REASON</Text>
                      <Text style={[styles.blockReasonText, { color: theme.colors.text }]}>{item.reason}</Text>
                    </View>
                    <View style={styles.blockMetaRow}>
                      <View style={[styles.blockMetaBadge, { backgroundColor: item.source === 'post' ? '#3B82F620' : '#A855F720' }]}>
                        <Text style={[styles.blockMetaText, { color: item.source === 'post' ? '#3B82F6' : '#A855F7' }]}>
                          {item.source?.toUpperCase() || 'PROFILE'}
                        </Text>
                      </View>
                        {item.post_id && (
                          <TouchableOpacity onPress={() => {
                            useFeedHighlightStore.getState().setHighlightedPost(item.post_id);
                            router.push('/');
                          }}>
                            <Text style={[styles.viewPostLink, { color: theme.colors.primary }]}>View Post</Text>
                          </TouchableOpacity>
                        )}
                    </View>
                  </View>
                </View>
              );
            }

            if (activeTab === 'talent' || activeTab === 'business') {
            const isTalent = activeTab === 'talent';
            const getPlatformIcon = (platform) => {
              const p = platform?.toLowerCase() || '';
              if (p.includes('youtube')) return <Youtube size={16} color="rgba(255,255,255,0.5)" />;
              if (p.includes('spotify') || p.includes('music') || p.includes('tiktok')) return <Music size={16} color="rgba(255,255,255,0.5)" />;
              if (p.includes('instagram')) return <Instagram size={16} color="rgba(255,255,255,0.5)" />;
              return <Globe size={16} color="rgba(255,255,255,0.5)" />;
            };

            return (
              <View style={[styles.card, { backgroundColor: theme.colors.surface, paddingBottom: 0 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.userRow}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.background }]}>
                      {isTalent ? <Star size={14} color={theme.colors.primary} /> : <Briefcase size={14} color="#3B82F6" />}
                    </View>
                    <Text style={dynamicStyles.username}>@{item.rusers?.username || 'unknown'}</Text>
                  </View>
                  <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>

                <View style={styles.contentPadding}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.primary, letterSpacing: 1, marginBottom: 10 }}>PREVIEW</Text>
                    <View style={[styles.previewCardContainer, { borderColor: theme.colors.border }]}>
                      <TouchableOpacity 
                        style={styles.previewImageContainer}
                        onPress={() => setExpandedImage(item.avatar_url || item.logo_url || `https://avatar.vercel.sh/${item.name}.png`)}
                      >
                        <Image 
                          source={{ uri: item.avatar_url || item.logo_url || `https://avatar.vercel.sh/${item.name}.png` }} 
                          style={styles.previewImage} 
                          resizeMode="cover"
                        />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.previewGradient} />
                        <View style={styles.previewPlatformBadge}>
                          {getPlatformIcon(item.platform || 'website')}
                        </View>
                      </TouchableOpacity>
                        <View style={[styles.previewInfo, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.previewName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.previewTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.category || (isTalent ? 'Talent' : 'Business')}</Text>
                          {item.delivery_links && (
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              {Object.entries(item.delivery_links).map(([platformId, url]) => {
                                if (!url) return null;
                                const platform = DELIVERY_PLATFORMS.find(p => p.id === platformId);
                                if (!platform) return null;
                                const Icon = platform.icon;
                                return <Icon key={platformId} size={10} color={theme.colors.textSecondary} />;
                              })}
                            </View>
                          )}
                        </View>
                      </View>
                  </View>
                  <Text style={[styles.previewDescription, { color: theme.colors.textSecondary, marginTop: 15 }]}>
                    {item.description || 'No description provided.'}
                  </Text>
                  <TouchableOpacity onPress={() => Linking.openURL(item.link || item.website_url)}>
                    <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: 5 }}>Link: {item.link || item.website_url}</Text>
                  </TouchableOpacity>
                </View>

                  <View style={[styles.actionRow, { backgroundColor: theme.colors.background + '40' }]}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={() => handleAction(item.id, 'approve')}>
                      <CheckCircle size={18} color={isLight ? "#FFF" : "#000"} />
                      <Text style={dynamicStyles.actionText}>APPROVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F59E0B20' }]} onPress={() => setRequestEditItem(item)}>
                      <Edit2 size={18} color="#F59E0B" />
                      <Text style={[styles.actionText, { color: '#F59E0B' }]}>REQUEST EDIT</Text>
                    </TouchableOpacity>
                  </View>
              </View>
            );
          }

          if (activeTab === 'logs') {
            const canUndo = !item.is_undone && (
                  (item.target_type === 'post' && ['delete', 'delete_post', 'blur', 'unblur', 'toggle_comments'].includes(item.action)) ||
                  (item.target_type === 'user' && ['mute', 'ban', 'warn', 'delete_post'].includes(item.action))
                );
            return (
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.colors.surface }, item.is_undone && { opacity: 0.5 }]}
                onPress={async () => {
                  if (item.target_type === 'post') {
                    const { data: post } = await supabase.from('rposts').select('*, rusers(*)').eq('id', item.target_id).maybeSingle();
                    if (post) { setPreviewPost(post); }
                    else { useFeedHighlightStore.getState().setHighlightedPost(item.target_id); router.push('/'); }
                  } else if (item.target_type === 'user' && item.action === 'delete_post') {
                    const rm = item.reason?.match(/report\s+(\d+)/i);
                    if (rm) {
                      const { data: rpt } = await supabase.from('rreports').select('target_id, target_type, post_id').eq('id', rm[1]).maybeSingle();
                      const pid = rpt?.target_type === 'post' ? rpt.target_id : rpt?.post_id;
                      if (pid) { const { data: p } = await supabase.from('rposts').select('*, rusers(*)').eq('id', pid).maybeSingle(); if (p) { setPreviewPost(p); return; } }
                    }
                    router.push(`/profile?userId=${item.target_id}`);
                  } else if (item.target_type === 'user') {
                    router.push(`/profile?userId=${item.target_id}`);
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={dynamicStyles.logAction}>{item.action?.toUpperCase().replace(/_/g, ' ') || 'ACTION'}</Text>
                    {item.is_undone && (
                      <View style={[styles.roleBadge, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.roleBadgeText}>UNDONE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
                <View style={styles.contentPadding}>
                  <Text style={dynamicStyles.logDetail}>Moderator: @{item.moderator?.username || 'unknown'}</Text>
                  <Text style={dynamicStyles.logDetail}>Target: {item.target_type} (ID: {item.target_id})</Text>
                  {item.post_title && <Text style={dynamicStyles.logDetail}>Post: "{item.post_title}"</Text>}
                  <Text style={dynamicStyles.logReason}>Reason: {item.reason}</Text>
                  {item.previous_state && (
                    <Text style={[dynamicStyles.logDetail, { fontSize: 10, marginTop: 4 }]}>
                      Previous state saved for undo
                    </Text>
                  )}
                  {item.is_undone && item.undone_at && (
                    <Text style={[dynamicStyles.logDetail, { color: '#F59E0B', marginTop: 4 }]}>
                      Undone at {new Date(item.undone_at).toLocaleString()}
                    </Text>
                  )}
                  <Text style={[styles.tapToView, { color: theme.colors.primary, marginTop: 8 }]}>Tap to view target</Text>
                  {canUndo && (
                    <TouchableOpacity 
                      style={[styles.restoreButton, { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success, marginTop: 12 }]}
                      onPress={() => handleUndoAction(item)}
                    >
                      <Undo size={16} color={theme.colors.success} />
                      <Text style={[styles.restoreText, { color: theme.colors.success }]}>UNDO ACTION</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }

            if (activeTab === 'edits') {
              return (
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userRow}>
                      <View style={[styles.iconContainer, { backgroundColor: theme.colors.background }]}>
                        <Edit2 size={14} color={theme.colors.text} />
                      </View>
                      <Text style={dynamicStyles.username}>@{item.rusers?.username || 'unknown'}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: item.showcase_type === 'talent' ? theme.colors.primary : '#3B82F6' }]}>
                        <Text style={styles.roleBadgeText}>{item.showcase_type?.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.contentPadding}>
                    <Text style={[styles.label, { marginBottom: 4 }]}>FIELD: {item.field_name?.toUpperCase()}</Text>
                    <View style={styles.editValuesRow}>
                      <View style={styles.editValueHalf}>
                        <Text style={[styles.editLabel, { color: theme.colors.textSecondary }]}>OLD</Text>
                          {item.field_name === 'avatar_url' ? (
                            <TouchableOpacity onPress={() => setExpandedImage(item.old_value)}>
                              <Image source={{ uri: item.old_value }} style={styles.editImage} />
                            </TouchableOpacity>
                          ) : (
                            <Text style={[styles.editValueText, { color: theme.colors.text }]}>{item.old_value || '(empty)'}</Text>
                          )}
                        </View>
                        <View style={styles.editValueArrow}>
                          <ChevronLeft size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                        </View>
                        <View style={styles.editValueHalf}>
                          <Text style={[styles.editLabel, { color: theme.colors.primary }]}>NEW</Text>
                          {item.field_name === 'avatar_url' ? (
                            <TouchableOpacity onPress={() => setExpandedImage(item.new_value)}>
                              <Image source={{ uri: item.new_value }} style={styles.editImage} />
                            </TouchableOpacity>
                          ) : (
                          <Text style={[styles.editValueText, { color: theme.colors.text, fontWeight: '700' }]}>{item.new_value || '(empty)'}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                    <View style={[styles.actionRow, { backgroundColor: theme.colors.background + '40' }]}>
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={() => handleAction(item.id, 'approve')}>
                        <CheckCircle size={18} color={isLight ? "#FFF" : "#000"} />
                        <Text style={dynamicStyles.actionText}>APPROVE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]} onPress={() => handleAction(item.id, 'reject')}>
                        <XCircle size={18} color={theme.colors.error} />
                        <Text style={[styles.actionText, { color: theme.colors.error }]}>DENY</Text>
                      </TouchableOpacity>
                    </View>
                </View>
              );
            }

          if (activeTab === 'reports') {
            const isFlaggedPost = item.type === 'flagged_post';
            const isDirectReport = item.type === 'direct_report';
            const isDemoteRequest = item.action === 'demote_request';
            const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;

            return (
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    if (isFlaggedPost) {
                      useFeedHighlightStore.getState().setHighlightedPost(item.original_id);
                      router.push('/');
                    } else if (isDirectReport) {
                      if (item.target_type === 'post') {
                        useFeedHighlightStore.getState().setHighlightedPost(item.target_id);
                        router.push('/');
                      } else if (item.target_type === 'chat') {
                        useChatStore.getState().setActiveChatId(item.target_id);
                        useChatStore.getState().open();
                      }
                    } else {
                      if (item.target_type === 'user') {
                        router.push(`/profile?userId=${item.target_id}`);
                      } else if (item.target_type === 'post') {
                        useFeedHighlightStore.getState().setHighlightedPost(item.target_id);
                        router.push('/');
                      }
                    }
                  }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.userRow}>
                    <View style={[styles.iconContainer, { backgroundColor: isDemoteRequest ? '#A855F7' : theme.colors.error }]}>
                      {isDemoteRequest ? <Shield size={14} color="#FFFFFF" /> : <AlertCircle size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={dynamicStyles.username}>
                      {isFlaggedPost ? 'Flagged Post' : (isDirectReport ? `${item.target_type?.toUpperCase()} Report` : (isDemoteRequest ? 'Demote Request' : 'System Report'))}
                    </Text>
                  </View>
                  <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.contentPadding}>
                  {isFlaggedPost ? (
                    <>
                      <Text style={dynamicStyles.reportTarget}>@{item.rusers?.username}</Text>
                      <Text style={dynamicStyles.description} numberOfLines={3}>{item.text}</Text>
                    </>
                  ) : isDirectReport ? (
                    <>
                      <Text style={dynamicStyles.reportTarget}>Reported by @{item.reporter?.username}</Text>
                      <Text style={dynamicStyles.description}>Reason: {item.reason}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={dynamicStyles.reportTarget}>
                        {item.target_type === 'user' ? `@${metadata?.username || 'Unknown'}` : `Target ID: ${item.target_id}`}
                      </Text>
                      <Text style={dynamicStyles.description}>{item.reason}</Text>
                    </>
                  )}
                  <Text style={[styles.tapToView, { color: theme.colors.success }]}>Tap to view content</Text>
                </View>
                    <View style={[styles.reportActionGrid, { backgroundColor: theme.colors.background + '40' }]}>
                      {/* Row 1: Interaction Controls */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity 
                          style={[styles.compactActionButton, { backgroundColor: theme.colors.primary + '15' }]} 
                          onPress={(e) => { e.stopPropagation(); handleAction(item.id, 'mute'); }}
                        >
                          <VolumeX size={16} color={theme.colors.primary} />
                          <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>MUTE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.compactActionButton, { backgroundColor: theme.colors.error + '15' }]} 
                          onPress={(e) => { e.stopPropagation(); handleAction(item.id, 'ban'); }}
                        >
                          <UserMinus size={16} color={theme.colors.error} />
                          <Text style={[styles.actionLabel, { color: theme.colors.error }]}>BAN</Text>
                        </TouchableOpacity>

                        {(!item.target_user?.warning_count || item.target_user.warning_count === 0) && (
                          <TouchableOpacity 
                            style={[styles.compactActionButton, { backgroundColor: '#A855F715' }]} 
                            onPress={(e) => { e.stopPropagation(); handleAction(item.id, 'warn'); }}
                          >
                            <AlertTriangle size={16} color="#A855F7" />
                            <Text style={[styles.actionLabel, { color: '#A855F7' }]}>WARN</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Row 2: Content Controls */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(item.target_type === 'post' || item.post_id) && (
                          <TouchableOpacity 
                            style={[styles.compactActionButton, { backgroundColor: '#F59E0B15' }]} 
                            onPress={(e) => { e.stopPropagation(); handleAction(item.id, 'delete_post'); }}
                          >
                            <Trash2 size={16} color="#F59E0B" />
                            <Text style={[styles.actionLabel, { color: '#F59E0B' }]}>DELETE POST</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                          style={[styles.compactActionButton, { backgroundColor: theme.colors.textSecondary + '15' }]} 
                          onPress={(e) => { e.stopPropagation(); handleAction(item.id, 'reject'); }}
                        >
                          <XCircle size={16} color={theme.colors.textSecondary} />
                          <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>DISMISS</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
              </TouchableOpacity>
            );
          }

          if (activeTab === 'help') {
            const isExpanded = expandedChatId === item.display_user_id;
            const transcript = transcripts[item.display_user_id] || [];
            return (
              <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => { if (!isExpanded) fetchTranscript(item.display_user_id); setExpandedChatId(isExpanded ? null : item.display_user_id); }}>
                  <View style={styles.userRow}>
                    <View style={[styles.iconContainer, item.is_overtaken ? { backgroundColor: theme.colors.success } : { backgroundColor: theme.colors.background }]}>
                      {item.is_overtaken ? <UserCheck size={14} color="#000" /> : <MessageSquare size={14} color={theme.colors.text} />}
                    </View>
                    <Text style={dynamicStyles.username}>@{item.rusers?.username || 'user_' + item.display_user_id}</Text>
                    {item.is_overtaken && <View style={[styles.overtakenBadge, { backgroundColor: theme.colors.success }]}><Text style={styles.overtakenBadgeText}>AGENT JOINED</Text></View>}
                  </View>
                  <View style={styles.headerRight}>
                    <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    {isExpanded ? <ChevronUp size={20} color={theme.colors.textSecondary} /> : <ChevronDown size={20} color={theme.colors.textSecondary} />}
                  </View>
                </TouchableOpacity>
                <View style={styles.contentPadding}>
                  <Text style={dynamicStyles.description} numberOfLines={isExpanded ? undefined : 2}>{item.content}</Text>
                  {isExpanded && (
                      <View style={[styles.transcriptContainer, { borderTopColor: theme.colors.border }]}>
                        <View style={[styles.transcriptLine, { backgroundColor: theme.colors.border }]} />
                        {(() => {
                          const lastUserMsg = [...transcript].reverse().find(m => !m.is_from_admin);
                          const lastAdminMsg = [...transcript].reverse().find(m => m.is_from_admin);
                          const displayMsgs = [lastUserMsg, lastAdminMsg].filter(Boolean).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                          return displayMsgs.map((msg) => (
                            <View key={msg.id} style={[styles.transcriptMsg, msg.is_from_admin ? [styles.adminMsg, { backgroundColor: theme.colors.success + '20' }] : [styles.userMsg, { backgroundColor: theme.colors.background + '40' }]]}>
                              <Text style={[styles.transcriptText, { color: theme.colors.text }]}>{msg.content}</Text>
                              <Text style={[styles.transcriptTime, { color: theme.colors.textSecondary }]}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                          ));
                        })()}
                        {item.is_overtaken ? (
                        <View>
                          <TouchableOpacity style={[styles.overtakeButton, { backgroundColor: theme.colors.success, marginBottom: 10 }]} onPress={() => handleResolve(item.display_user_id)}>
                            <CheckCircle size={18} color="#000" /><Text style={styles.overtakeButtonText}>RESOLVE CHAT</Text>
                          </TouchableOpacity>
                          <View style={styles.replyContainer}>
                            <TextInput style={[styles.replyInput, { backgroundColor: theme.colors.background + '40', color: theme.colors.text }]} placeholder="Type response..." placeholderTextColor={theme.colors.textSecondary} value={replyText} onChangeText={setReplyText} multiline />
                            <TouchableOpacity style={[styles.sendButtonSmall, { backgroundColor: theme.colors.primary }]} onPress={() => handleReply(item.display_user_id)}>
                              <Send size={18} color={isLight ? "#FFF" : "#000"} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={[styles.overtakeButton, { backgroundColor: theme.colors.primary }]} onPress={() => handleOvertake(item.display_user_id)}>
                          <UserCheck size={18} color={isLight ? "#FFF" : "#000"} /><Text style={[styles.overtakeButtonText, { color: isLight ? "#FFF" : "#000" }]}>OVERTAKE CHAT</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          }

          const Icon = TABS.find(t => t.id === activeTab)?.icon || Shield;
          return (
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.cardHeader}>
                <View style={styles.userRow}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.colors.background }]}>
                    <Icon size={14} color={theme.colors.text} />
                  </View>
                  <Text style={dynamicStyles.username}>@{item.metadata?.username || item.rusers?.username || 'unknown'}</Text>
                </View>
                <Text style={dynamicStyles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.contentPadding}>
                {item.title && <Text style={dynamicStyles.title}>{item.title}</Text>}
                {item.name && <Text style={dynamicStyles.title}>{item.name}</Text>}
                <Text style={dynamicStyles.description}>{item.reason || item.suggestion_text || item.text || item.description || item.content}</Text>
                {activeTab === 'ai' && item.moderation_reason && (
                  <View style={[styles.aiReasonContainer, { backgroundColor: theme.colors.success + '10', borderColor: theme.colors.success + '20' }]}>
                    <Bot size={12} color={theme.colors.success} />
                    <Text style={[styles.aiReasonText, { color: theme.colors.success }]}>AI REASON: {item.moderation_reason}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.actionRow, { backgroundColor: theme.colors.background + '40' }]}>
                  {activeTab === 'ai' && aiFilter === 'held' && (
                    <>
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]} onPress={() => handleAction(item.id, 'reject')}>
                        <XCircle size={18} color={theme.colors.error} /><Text style={[styles.actionText, { color: theme.colors.error }]}>REJECT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={() => handleAction(item.id, 'approve')}>
                        <CheckCircle size={18} color={isLight ? "#FFF" : "#000"} /><Text style={dynamicStyles.actionText}>APPROVE</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {activeTab === 'ai' && aiFilter === 'approved' && (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F59E0B', flex: 1 }]} onPress={() => { setOverrideItem(item); setOverrideReason(''); setOverrideMode('delete'); }}>
                      <Trash2 size={18} color="#000" /><Text style={[styles.actionText, { color: '#000' }]}>OVERRIDE - DELETE</Text>
                    </TouchableOpacity>
                  )}
                  {activeTab === 'ai' && aiFilter === 'rejected' && (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4ADE80', flex: 1 }]} onPress={() => { setOverrideItem(item); setOverrideReason(''); setOverrideMode('post'); }}>
                      <CheckCircle size={18} color="#000" /><Text style={[styles.actionText, { color: '#000' }]}>OVERRIDE - POST</Text>
                    </TouchableOpacity>
                  )}
                      {activeTab !== 'ai' && (
                        <>
                          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={() => handleAction(item.id, 'approve')}>
                            <CheckCircle size={18} color={isLight ? "#FFF" : "#000"} /><Text style={dynamicStyles.actionText}>APPROVE</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]} onPress={() => handleAction(item.id, 'reject')}>
                            <XCircle size={18} color={theme.colors.error} /><Text style={[styles.actionText, { color: theme.colors.error }]}>DENY</Text>
                          </TouchableOpacity>
                        </>
                      )}
              </View>
            </View>
          );
  };

  if (!isAdmin) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ paddingTop: insets.top, flex: 1 }}
      >
<View style={styles.header}>
            <TouchableOpacity onPress={() => goBack(router)} style={styles.backButton}>
              <ChevronLeft color={theme.colors.text} size={28} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>{isSuperAdmin ? 'SUPER ADMIN' : 'MODERATION'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {isSuperAdmin && (
                  <TouchableOpacity onPress={() => setActiveTab('analytics')} style={styles.backButton}>
                    <BarChart2 color={theme.colors.primary} size={22} />
                  </TouchableOpacity>
                )}
              <TouchableOpacity onPress={fetchData} style={styles.backButton}>
                <RefreshCw color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>
          </View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity 
                  key={tab.id}
                  style={[styles.tab, { backgroundColor: theme.colors.surface }, isActive && { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab.id);
                    setDisplayLimit(25);
                  }}
                >
                  <Icon size={14} color={isActive ? (isLight ? '#FFF' : '#000') : theme.colors.textSecondary} />
                  <Text style={[dynamicStyles.tabText, isActive && dynamicStyles.activeTabText]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {activeTab === 'ai' && (
          <View style={styles.aiFilterContainer}>
            {['held', 'approved', 'rejected'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.aiFilterButton, aiFilter === filter && styles.aiFilterButtonActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAiFilter(filter);
                }}
              >
                <Text style={[styles.aiFilterText, aiFilter === filter && styles.aiFilterTextActive]}>
                  {filter.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

          {activeTab === 'users' && isSuperAdmin && (
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, zIndex: 10 }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search users..."
                placeholderTextColor={theme.colors.textSecondary}
                value={userSearch}
                onChangeText={handleLiveSearch}
                returnKeyType="search"
              />
              {userSearch.length > 0 && (
                <TouchableOpacity 
                  style={{ padding: 10 }}
                  onPress={() => {
                    setUserSearch('');
                    setSearchResults([]);
                  }}
                >
                  <XCircle size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'users' && searchResults.length > 0 && (
            <View style={[styles.dropdownContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.background + '80' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.primary, letterSpacing: 1 }}>SEARCH RESULTS</Text>
                <TouchableOpacity onPress={() => setSearchResults([])}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.textSecondary }}>CLOSE</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => `search-${item.id}`}
                renderItem={renderItem}
                style={{ maxHeight: 450 }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

        {activeTab === 'analytics' && analytics ? (
            <ScrollView 
              style={styles.analyticsScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Time Range Selector */}
              <View style={styles.timeRangeContainer}>
                {['7d', '30d', '90d', 'all'].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.timeRangeButton,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      analyticsTimeRange === range && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAnalyticsTimeRange(range);
                    }}
                  >
                    <Text style={[
                      styles.timeRangeText,
                      { color: theme.colors.textSecondary },
                      analyticsTimeRange === range && { color: isLight ? '#FFF' : '#000' }
                    ]}>
                      {range === 'all' ? 'ALL TIME' : range.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Summary - Clickable */}
              <View style={styles.sectionHeader}>
                <Activity size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>PLATFORM SUMMARY</Text>
              </View>
              
              <View style={styles.analyticsGrid}>
                <View 
                  style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Users size={20} color="#3B82F6" />
                  <Text style={dynamicStyles.statValue}>{analytics.summary.users}</Text>
                  <Text style={dynamicStyles.statLabel}>REGISTERED USERS</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => fetchAnalyticsDetail('posts')}
                >
                  <MessageSquare size={20} color="#10B981" />
                  <Text style={dynamicStyles.statValue}>{analytics.summary.posts}</Text>
                  <Text style={dynamicStyles.statLabel}>ACTIVE POSTS</Text>
                  <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>tap to view</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => fetchAnalyticsDetail('reactions')}
                >
                  <Star size={20} color="#F59E0B" />
                  <Text style={dynamicStyles.statValue}>{analytics.summary.reactions}</Text>
                  <Text style={dynamicStyles.statLabel}>REACTIONS</Text>
                  <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>tap to view</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => fetchAnalyticsDetail('comments')}
                >
                  <CheckCircle size={20} color="#A855F7" />
                  <Text style={dynamicStyles.statValue}>{analytics.summary.comments}</Text>
                  <Text style={dynamicStyles.statLabel}>COMMENTS</Text>
                  <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>tap to view</Text>
                </TouchableOpacity>
              </View>

              {/* Period Stats */}
              <View style={styles.sectionHeader}>
                <Calendar size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {analyticsTimeRange === '7d' ? 'LAST 7 DAYS' : analyticsTimeRange === '30d' ? 'LAST 30 DAYS' : analyticsTimeRange === '90d' ? 'LAST 90 DAYS' : 'ALL TIME'} ACTIVITY
                </Text>
              </View>

              <View style={[styles.periodStatsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.periodStatRow}>
                  <View style={styles.periodStatItem}>
                    <ArrowUpRight size={16} color="#10B981" />
                    <Text style={[styles.periodStatValue, { color: theme.colors.text }]}>+{analytics.rangeStats?.newUsers || 0}</Text>
                    <Text style={[styles.periodStatLabel, { color: theme.colors.textSecondary }]}>New Users</Text>
                  </View>
                  <View style={styles.periodStatItem}>
                    <ArrowUpRight size={16} color="#3B82F6" />
                    <Text style={[styles.periodStatValue, { color: theme.colors.text }]}>+{analytics.rangeStats?.newPosts || 0}</Text>
                    <Text style={[styles.periodStatLabel, { color: theme.colors.textSecondary }]}>New Posts</Text>
                  </View>
                  <View style={styles.periodStatItem}>
                    <ArrowUpRight size={16} color="#F59E0B" />
                    <Text style={[styles.periodStatValue, { color: theme.colors.text }]}>+{analytics.rangeStats?.newReactions || 0}</Text>
                    <Text style={[styles.periodStatLabel, { color: theme.colors.textSecondary }]}>Reactions</Text>
                  </View>
                  <View style={styles.periodStatItem}>
                    <ArrowUpRight size={16} color="#A855F7" />
                    <Text style={[styles.periodStatValue, { color: theme.colors.text }]}>+{analytics.rangeStats?.newComments || 0}</Text>
                    <Text style={[styles.periodStatLabel, { color: theme.colors.textSecondary }]}>Comments</Text>
                  </View>
                </View>
              </View>

              {/* Daily Active Users */}
              <View style={[styles.highlightCard, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                <View style={styles.highlightRow}>
                  <View>
                    <Text style={[styles.highlightLabel, { color: theme.colors.primary }]}>TODAY'S ACTIVE USERS</Text>
                    <Text style={[styles.highlightValue, { color: theme.colors.text }]}>{analytics.users.dailyActive || 0}</Text>
                  </View>
                  <Activity size={32} color={theme.colors.primary} />
                </View>
              </View>

              {/* Growth Trends - Line Chart Style */}
              <View style={styles.sectionHeader}>
                <TrendingUp size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>GROWTH TRENDS</Text>
              </View>

              <View 
                style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartTitle, { color: theme.colors.text }]}>User Onboarding</Text>
                  <View style={styles.trendBadge}>
                    <ArrowUpRight size={14} color="#10B981" />
                    <Text style={styles.trendText}>NEW REGISTRATIONS</Text>
                  </View>
                </View>
                <View style={styles.barChartContainer}>
                  {analytics.users.growth.slice(-7).map((day, idx) => {
                    const max = Math.max(...analytics.users.growth.map(d => d.count), 1);
                    const height = (day.count / max) * 100;
                    return (
                      <View key={idx} style={styles.barWrapper}>
                        <Text style={[styles.barValue, { color: theme.colors.primary }]}>{day.count}</Text>
                        <View style={[styles.bar, { height: `${height}%`, backgroundColor: theme.colors.primary }]} />
                        <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>{day.date.split('-').pop()}</Text>
                      </View>
                    );
                  })}
                  {analytics.users.growth.length === 0 && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>No recent growth data</Text>}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => fetchAnalyticsDetail('approved_posts')}
              >
                <View style={styles.chartHeader}>
                  <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Content Volume</Text>
                  <View style={styles.trendBadge}>
                    <Activity size={14} color="#3B82F6" />
                    <Text style={styles.trendText}>TAP FOR DETAILS</Text>
                  </View>
                </View>
                <View style={styles.barChartContainer}>
                  {analytics.posts.growth.slice(-7).map((day, idx) => {
                    const max = Math.max(...analytics.posts.growth.map(d => d.count), 1);
                    const height = (day.count / max) * 100;
                    return (
                      <View key={idx} style={styles.barWrapper}>
                        <Text style={[styles.barValue, { color: '#3B82F6' }]}>{day.count}</Text>
                        <View style={[styles.bar, { height: `${height}%`, backgroundColor: '#3B82F6' }]} />
                        <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>{day.date.split('-').pop()}</Text>
                      </View>
                    );
                  })}
                  {analytics.posts.growth.length === 0 && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>No recent post data</Text>}
                </View>
              </TouchableOpacity>

              {/* Hourly Activity Heatmap */}
              <View style={styles.sectionHeader}>
                <Activity size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>HOURLY ACTIVITY (TODAY)</Text>
              </View>

              <View style={[styles.heatmapCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.heatmapGrid}>
                  {analytics.hourlyActivity?.map((count, hour) => {
                    const max = Math.max(...(analytics.hourlyActivity || []), 1);
                    const intensity = count / max;
                    return (
                      <View 
                        key={hour} 
                        style={[
                          styles.heatmapCell,
                          { backgroundColor: `rgba(74, 222, 128, ${Math.max(intensity, 0.1)})` }
                        ]}
                      >
                        <Text style={[styles.heatmapHour, { color: intensity > 0.5 ? '#000' : theme.colors.textSecondary }]}>
                          {hour}
                        </Text>
                        {count > 0 && (
                          <Text style={[styles.heatmapCount, { color: intensity > 0.5 ? '#000' : theme.colors.text }]}>
                            {count}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                <Text style={[styles.heatmapLegend, { color: theme.colors.textSecondary }]}>Hours (0-23) • Darker = More activity (posts, comments, reactions)</Text>
              </View>

              {/* Zone Distribution - Pie Chart Style */}
              {analytics.zones && analytics.zones.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <PieChart size={18} color={theme.colors.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>ACTIVE USERS BY ZONE</Text>
                  </View>

                  <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {analytics.zones.map((z, i) => {
                      const total = analytics.zones.reduce((sum, zone) => sum + zone.count, 0);
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#A855F7', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={styles.zoneRow}
                          onPress={() => fetchAnalyticsDetail('zone', z.zone)}
                        >
                          <View style={[styles.zoneDot, { backgroundColor: colors[i % colors.length] }]} />
                          <Text style={[styles.zoneName, { color: theme.colors.text }]}>{z.zone}</Text>
                          <View style={{ flex: 1, marginHorizontal: 10 }}>
                            <View style={styles.progressBarBg}>
                              <View style={[styles.progressBarFill, { width: `${(z.count / total) * 100}%`, backgroundColor: colors[i % colors.length] }]} />
                            </View>
                          </View>
                          <Text style={[styles.zoneCount, { color: theme.colors.text }]}>{z.count}</Text>
                          <Text style={[styles.zonePercent, { color: theme.colors.textSecondary }]}>({Math.round((z.count / total) * 100)}%)</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Top Engaging Posts */}
              {analytics.engagement?.topPosts && analytics.engagement.topPosts.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <TrendingUp size={18} color={theme.colors.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>TOP ENGAGING POSTS</Text>
                  </View>

                  <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {analytics.engagement.topPosts.map((post, i) => (
                      <TouchableOpacity 
                        key={post.id} 
                        style={[styles.topPostItem, { backgroundColor: theme.colors.background + '40', borderColor: theme.colors.border }]}
                        onPress={() => {
                          useFeedHighlightStore.getState().setHighlightedPost(post.id);
                          router.push('/');
                        }}
                      >
                        <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : theme.colors.background }]}>
                          <Text style={styles.rankText}>#{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.topPostHeader}>
                            <Text style={[styles.topPostUser, { color: theme.colors.primary }]}>
                              {post.rusers?.emoji_icon || '👤'} @{post.rusers?.username || 'unknown'}
                            </Text>
                          </View>
                          <Text style={[styles.topPostText, { color: theme.colors.text }]} numberOfLines={2}>{stripMarkdown(post.text)}</Text>
                          <View style={styles.topPostStats}>
                            <Text style={[styles.topPostStat, { color: '#F59E0B' }]}>
                              {post.reaction_count} reactions
                            </Text>
                            <Text style={[styles.topPostStat, { color: '#A855F7' }]}>
                              {post.comment_count} comments
                            </Text>
                          </View>
                        </View>
                        <ExternalLink size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Top Active Users */}
              {analytics.engagement?.topUsers && analytics.engagement.topUsers.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Users size={18} color={theme.colors.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>MOST ACTIVE USERS</Text>
                  </View>

                  <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {analytics.engagement.topUsers.map((user, i) => (
                      <TouchableOpacity 
                        key={user.id} 
                        style={[styles.topUserRow, i < analytics.engagement.topUsers.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                        onPress={() => router.push(`/profile?userId=${user.id}`)}
                      >
                        <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : theme.colors.background }]}>
                          <Text style={styles.rankText}>#{i + 1}</Text>
                        </View>
                        <Text style={styles.topUserEmoji}>{user.emoji_icon || '👤'}</Text>
                        <Text style={[styles.topUserName, { color: theme.colors.text }]}>@{user.username}</Text>
                        <View style={{ flex: 1 }} />
                        <View style={[styles.postCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Text style={[styles.postCountText, { color: theme.colors.primary }]}>{user.post_count} posts</Text>
                        </View>
                        <ExternalLink size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Moderation Health */}
              <View style={styles.sectionHeader}>
                <Shield size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>MODERATION STATUS</Text>
              </View>

              <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.detailTitle, { color: theme.colors.textSecondary }]}>USER SAFETY</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: theme.colors.text }]}>Active Users</Text>
                    <Text style={[styles.progressValue, { color: theme.colors.text }]}>{analytics.users.active}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(analytics.users.active / (analytics.summary.users || 1)) * 100}%`, backgroundColor: '#10B981' }]} />
                  </View>
                </View>
                <TouchableOpacity style={styles.progressRow} onPress={() => fetchAnalyticsDetail('banned_users')}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: theme.colors.text }]}>Banned Users</Text>
                    <Text style={[styles.progressValue, { color: theme.colors.text }]}>{analytics.users.banned}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(analytics.users.banned / (analytics.summary.users || 1)) * 100}%`, backgroundColor: '#EF4444' }]} />
                  </View>
                </TouchableOpacity>
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: theme.colors.text }]}>Muted Users</Text>
                    <Text style={[styles.progressValue, { color: theme.colors.text }]}>{analytics.users.muted || 0}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${((analytics.users.muted || 0) / (analytics.summary.users || 1)) * 100}%`, backgroundColor: '#F59E0B' }]} />
                  </View>
                </View>
              </View>

              <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.detailTitle, { color: theme.colors.textSecondary }]}>POST MODERATION</Text>
                <View style={styles.miniStatsRow}>
                  <TouchableOpacity style={styles.miniStat} onPress={() => fetchAnalyticsDetail('approved_posts')}>
                    <Text style={[styles.miniStatValue, { color: '#10B981' }]}>{analytics.posts.approved}</Text>
                    <Text style={[styles.miniStatLabel, { color: theme.colors.textSecondary }]}>APPROVED</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniStat} onPress={() => fetchAnalyticsDetail('held_posts')}>
                    <Text style={[styles.miniStatValue, { color: '#F59E0B' }]}>{analytics.posts.held}</Text>
                    <Text style={[styles.miniStatLabel, { color: theme.colors.textSecondary }]}>HELD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniStat} onPress={() => fetchAnalyticsDetail('rejected_posts')}>
                    <Text style={[styles.miniStatValue, { color: '#EF4444' }]}>{analytics.posts.rejected}</Text>
                    <Text style={[styles.miniStatLabel, { color: theme.colors.textSecondary }]}>REJECTED</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniStat} onPress={() => fetchAnalyticsDetail('flagged_posts')}>
                    <Text style={[styles.miniStatValue, { color: '#A855F7' }]}>{analytics.posts.flagged}</Text>
                    <Text style={[styles.miniStatLabel, { color: theme.colors.textSecondary }]}>FLAGGED</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Support Stats */}
              <View style={styles.sectionHeader}>
                <MessageSquare size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>SUPPORT & REPORTS</Text>
              </View>

              <View style={styles.analyticsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <MessageSquare size={20} color="#06B6D4" />
                  <Text style={dynamicStyles.statValue}>{analytics.support?.messages || 0}</Text>
                  <Text style={dynamicStyles.statLabel}>HELP MSGS</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <AlertCircle size={20} color="#EF4444" />
                  <Text style={dynamicStyles.statValue}>{analytics.support?.pendingReports || 0}</Text>
                  <Text style={dynamicStyles.statLabel}>PENDING</Text>
                </View>
              </View>

              {/* Engagement */}
              <View style={styles.sectionHeader}>
                <PieChart size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>REACTION BREAKDOWN</Text>
              </View>

              <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {analytics.engagement.reactions.slice(0, 10).map((r, i) => (
                  <View key={i} style={styles.reactionRow}>
                    <Text style={styles.reactionEmoji}>{r.reaction_type}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${(r.count / (analytics.summary.reactions || 1)) * 100}%`, backgroundColor: theme.colors.primary }]} />
                      </View>
                    </View>
                    <Text style={[styles.reactionCount, { color: theme.colors.text }]}>{r.count}</Text>
                    <Text style={[styles.reactionPercent, { color: theme.colors.textSecondary }]}>
                      ({Math.round((r.count / (analytics.summary.reactions || 1)) * 100)}%)
                    </Text>
                  </View>
                ))}
                {analytics.engagement.reactions.length === 0 && <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: 20 }}>No reactions yet</Text>}
              </View>

              {/* Recent Comments */}
              {analytics.engagement?.recentComments && analytics.engagement.recentComments.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <MessageSquare size={18} color={theme.colors.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>RECENT COMMENTS</Text>
                  </View>

                  <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {analytics.engagement.recentComments.slice(0, 5).map((comment, i) => (
                      <TouchableOpacity 
                        key={comment.id} 
                        style={[styles.topPostItem, { backgroundColor: theme.colors.background + '40', borderColor: theme.colors.border }]}
                        onPress={() => {
                          useFeedHighlightStore.getState().setHighlightedPost(comment.post_id);
                          router.push('/');
                        }}
                      >
                        <Text style={[styles.commentUser, { color: theme.colors.primary }]}>@{comment.rusers?.username || 'unknown'}</Text>
                        {comment.text ? <Text style={[styles.commentText, { color: theme.colors.text }]} numberOfLines={2}>{stripMarkdown(comment.text)}</Text> : null}
                        {comment.gif_url ? (
                          <Image source={{ uri: comment.gif_url }} style={{ width: '100%', height: 80, borderRadius: 8, marginTop: 4 }} resizeMode="contain" />
                        ) : null}
                        <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Business & Talent */}
              <View style={styles.sectionHeader}>
                <Briefcase size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>VERIFICATIONS</Text>
              </View>

              <View style={styles.analyticsGrid}>
                <TouchableOpacity 
                  style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => fetchAnalyticsDetail('businesses')}
                >
                  <Briefcase size={20} color="#3B82F6" />
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={dynamicStyles.statValue}>{analytics.business.approved}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>/ {analytics.business.approved + analytics.business.pending + (analytics.business.rejected || 0)}</Text>
                  </View>
                  <Text style={dynamicStyles.statLabel}>BUSINESSES</Text>
                  <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>tap to view</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => fetchAnalyticsDetail('talent')}
                >
                  <Star size={20} color="#F59E0B" />
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={dynamicStyles.statValue}>{analytics.talent.approved}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>/ {analytics.talent.approved + analytics.talent.pending + (analytics.talent.rejected || 0)}</Text>
                  </View>
                  <Text style={dynamicStyles.statLabel}>TALENT</Text>
                  <Text style={[styles.tapHint, { color: theme.colors.textSecondary }]}>tap to view</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>
        ) : loading ? (
          <View style={styles.centered}><ActivityIndicator color="#FFFFFF" /></View>
        ) : (
          <FlatList
            data={data.slice(0, displayLimit)}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <CheckCircle size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>QUEUE IS CLEAR</Text>
              </View>
            }
            ListFooterComponent={data.length > displayLimit ? (
              <TouchableOpacity 
                onPress={() => setDisplayLimit(prev => prev + 25)} 
                style={{ padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 14 }}>
                  Load More ({data.length - displayLimit} remaining)
                </Text>
              </TouchableOpacity>
            ) : null}
          />
        )}

          <Modal
              visible={!!overrideItem}
              transparent={true}
              animationType="fade"
              onRequestClose={() => { setOverrideItem(null); setOverrideMode(null); }}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {overrideMode === 'delete' ? 'OVERRIDE & DELETE' : 'OVERRIDE & POST'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {overrideMode === 'delete' 
                      ? 'Please provide a reason for deleting this approved post.' 
                      : 'Please provide a reason for posting this rejected content.'}
                  </Text>
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder={overrideMode === 'delete' ? "Reason for deletion..." : "Reason for approving..."}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={overrideReason}
                    onChangeText={setOverrideReason}
                    multiline
                    numberOfLines={4}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={() => { setOverrideItem(null); setOverrideMode(null); }}
                    >
                      <Text style={styles.cancelButtonText}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, overrideMode === 'delete' ? styles.confirmButton : { backgroundColor: '#4ADE80' }]} 
                      onPress={overrideMode === 'delete' ? handleOverrideDelete : handleOverridePost}
                    >
                      <Text style={[styles.confirmButtonText, overrideMode === 'post' && { color: '#000' }]}>
                        {overrideMode === 'delete' ? 'DELETE POST' : 'POST IT'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Analytics Detail Modal */}
            <Modal
              visible={!!analyticsDetailModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => { setAnalyticsDetailModal(null); setAnalyticsDetailData([]); }}
            >
              <View style={[styles.detailModalOverlay, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.detailModalHeader, { borderBottomColor: theme.colors.border }]}>
                  <TouchableOpacity onPress={() => { setAnalyticsDetailModal(null); setAnalyticsDetailData([]); }}>
                    <ChevronLeft color={theme.colors.text} size={28} />
                  </TouchableOpacity>
                  <Text style={[styles.detailModalTitle, { color: theme.colors.text }]}>
                    {analyticsDetailModal?.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <View style={{ width: 28 }} />
                </View>

                {analyticsDetailLoading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                ) : (
                  <FlatList
                    data={analyticsDetailData}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={{ padding: 15 }}
                    renderItem={({ item }) => {
                      if (analyticsDetailModal?.includes('user') || analyticsDetailModal === 'users' || analyticsDetailModal === 'new_users' || analyticsDetailModal === 'banned_users') {
                        return (
                          <TouchableOpacity 
                            style={[styles.detailListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                            onPress={() => {
                              setAnalyticsDetailModal(null);
                              router.push(`/profile?userId=${item.id}`);
                            }}
                          >
                            <Text style={styles.detailItemEmoji}>{item.emoji_icon || '👤'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.detailItemTitle, { color: theme.colors.text }]}>@{item.username}</Text>
                              <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]}>
                                Joined {new Date(item.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            {item.is_verified && <CheckCircle size={16} color="#3B82F6" />}
                            {item.is_banned && <Ban size={16} color="#EF4444" />}
                            <ExternalLink size={16} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        );
                      } else if (analyticsDetailModal?.includes('post') || analyticsDetailModal === 'posts') {
                        return (
                            <TouchableOpacity 
                              style={[styles.detailListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                              onPress={() => {
                                setAnalyticsDetailModal(null);
                                useFeedHighlightStore.getState().setHighlightedPost(item.id);
                                router.push('/');
                              }}
                            >
                            <Text style={styles.detailItemEmoji}>{item.rusers?.emoji_icon || '📝'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.detailItemTitle, { color: theme.colors.primary }]}>@{item.rusers?.username || 'unknown'}</Text>
                              <Text style={[styles.detailItemText, { color: theme.colors.text }]} numberOfLines={2}>{stripMarkdown(item.text)}</Text>
                              {item.moderation_reason && (
                                <Text style={[styles.detailItemReason, { color: theme.colors.textSecondary }]}>Reason: {item.moderation_reason}</Text>
                              )}
                              <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <ExternalLink size={16} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        );
                      } else if (analyticsDetailModal === 'reactions') {
                        return (
                            <TouchableOpacity 
                              style={[styles.detailListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                              onPress={() => {
                                setAnalyticsDetailModal(null);
                                useFeedHighlightStore.getState().setHighlightedPost(item.post_id);
                                router.push('/');
                              }}
                            >
                            <Text style={styles.detailItemEmoji}>{item.reaction_type}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.detailItemTitle, { color: theme.colors.primary }]}>@{item.rusers?.username || 'unknown'}</Text>
                              {item.rposts?.text ? <Text style={[styles.detailItemText, { color: theme.colors.text }]} numberOfLines={1}>{item.rposts.text}</Text> : null}
                              <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <ExternalLink size={16} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        );
                      } else if (analyticsDetailModal === 'comments') {
                        return (
                            <TouchableOpacity 
                              style={[styles.detailListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                              onPress={() => {
                                setAnalyticsDetailModal(null);
                                useFeedHighlightStore.getState().setHighlightedPost(item.post_id);
                                router.push('/');
                              }}
                            >
                            <Text style={styles.detailItemEmoji}>💬</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.detailItemTitle, { color: theme.colors.primary }]}>@{item.rusers?.username || 'unknown'}</Text>
                              {item.text ? <Text style={[styles.detailItemText, { color: theme.colors.text }]} numberOfLines={2}>{stripMarkdown(item.text)}</Text> : null}
                              {item.gif_url ? (
                                <Image source={{ uri: item.gif_url }} style={{ width: '100%', height: 60, borderRadius: 6, marginTop: 4 }} resizeMode="contain" />
                              ) : null}
                              {item.rposts?.text ? <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>on: {item.rposts.text}</Text> : null}
                              <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <ExternalLink size={16} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        );
                      } else if (analyticsDetailModal === 'businesses' || analyticsDetailModal === 'talent') {
                        const table = analyticsDetailModal === 'businesses' ? 'rbusinesses' : 'rtalent';
                        const statuses = ['pending', 'approved', 'rejected', 'held'];
                        const nextStatus = statuses[(statuses.indexOf(item.status) + 1) % statuses.length];
                        const statusColors = { approved: '#10B981', pending: '#F59E0B', rejected: '#EF4444', held: '#A855F7' };
                        return (
                          <View style={[styles.detailListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <Text style={styles.detailItemEmoji}>{analyticsDetailModal === 'businesses' ? '🏢' : '⭐'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.detailItemTitle, { color: theme.colors.text }]}>{item.name}</Text>
                              <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]}>
                                {item.category} • by @{item.rusers?.username || 'unknown'}
                              </Text>
                            </View>
                            <TouchableOpacity 
                              onPress={() => handleStatusChange(table, item.id, nextStatus)}
                              style={[styles.statusBadge, { 
                                backgroundColor: (statusColors[item.status] || '#888') + '20'
                              }]}
                            >
                              <Text style={[styles.statusBadgeText, { 
                                color: statusColors[item.status] || '#888'
                              }]}>
                                {item.status?.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      } else if (analyticsDetailModal === 'zone') {
                        return (
                            <TouchableOpacity 
                              style={[styles.detailListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                              onPress={() => {
                                setAnalyticsDetailModal(null);
                                useFeedHighlightStore.getState().setHighlightedPost(item.id);
                                router.push('/');
                              }}
                            >
                            <Text style={styles.detailItemEmoji}>{item.rusers?.emoji_icon || '📍'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.detailItemTitle, { color: theme.colors.primary }]}>@{item.rusers?.username || 'unknown'}</Text>
                              <Text style={[styles.detailItemText, { color: theme.colors.text }]} numberOfLines={2}>{stripMarkdown(item.text)}</Text>
                              <Text style={[styles.detailItemSubtitle, { color: theme.colors.textSecondary }]}>
                                {item.rzones?.name} • {new Date(item.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <ExternalLink size={16} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        );
                      }
                      return null;
                    }}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No data available</Text>
                      </View>
                    }
                  />
                )}
              </View>
            </Modal>
          
          <Modal
            visible={userRoleModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => { setUserRoleModal(false); setSelectedUser(null); }}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={dynamicStyles.modalTitle}>PROMOTE TO COUNCILLOR</Text>
                <Text style={dynamicStyles.modalSubtitle}>Assign @{selectedUser?.username} to a specific city.</Text>
                
                <View style={styles.cityListContainer}>
                  <FlatList
                    data={cities}
                    keyExtractor={(item) => item.id.toString()}
                    style={{ maxHeight: 300 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[
                          styles.cityItem, 
                          { borderBottomColor: theme.colors.border },
                          selectedCityId === item.id && { backgroundColor: theme.colors.primary + '20' }
                        ]}
                        onPress={() => setSelectedCityId(item.id)}
                      >
                        <Text style={{ color: selectedCityId === item.id ? theme.colors.primary : theme.colors.text }}>{item.name}</Text>
                        {selectedCityId === item.id && <CheckCircle size={16} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    )}
                  />
                </View>

                <View style={[styles.modalButtons, { marginTop: 20 }]}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.background }]} 
                    onPress={() => { setUserRoleModal(false); setSelectedUser(null); }}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: '#06B6D4' }, !selectedCityId && { opacity: 0.5 }]} 
                    onPress={() => handleUpdateRole(selectedUser.id, 'councillor', selectedCityId)}
                    disabled={!selectedCityId}
                  >
                    <Text style={[styles.confirmButtonText, { color: '#000' }]}>ASSIGN AS COUNCILLOR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

            <Modal
              visible={!!pollModalItem}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setPollModalItem(null)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={dynamicStyles.modalTitle}>POLL TEMPLATE</Text>
                  <Text style={dynamicStyles.modalSubtitle}>Create a structured vote for this feature suggestion.</Text>
                  
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>QUESTION</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.colors.background + '40', color: theme.colors.text, minHeight: 60, marginBottom: 15, borderColor: theme.colors.border }]}
                    placeholder="Poll Question..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                    multiline
                  />
  
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>OPTIONS</Text>
                  {pollOptions.map((opt, idx) => (
                    <TextInput
                      key={idx}
                      style={[styles.modalInput, { backgroundColor: theme.colors.background + '40', color: theme.colors.text, minHeight: 45, marginBottom: 10, paddingVertical: 10, borderColor: theme.colors.border }]}
                      placeholder={`Option ${idx + 1}`}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={opt}
                      onChangeText={(text) => updatePollOption(text, idx)}
                    />
                  ))}
  
                  <View style={[styles.modalButtons, { marginTop: 10 }]}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.background }]} 
                      onPress={() => setPollModalItem(null)}
                    >
                      <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: '#4ADE80' }]} 
                      onPress={handleCreatePollFromSuggestion}
                    >
                      <Text style={[styles.confirmButtonText, { color: '#000' }]}>APPROVE & CREATE POLL</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal
              visible={!!requestEditItem}
              transparent={true}
              animationType="fade"
              onRequestClose={() => { setRequestEditItem(null); setRequestEditReason(''); }}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={dynamicStyles.modalTitle}>REQUEST EDIT</Text>
                  <Text style={dynamicStyles.modalSubtitle}>Tell @{requestEditItem?.rusers?.username} what they need to fix.</Text>
                  
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.colors.background + '40', color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="Reason for requesting changes..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={requestEditReason}
                    onChangeText={setRequestEditReason}
                    multiline
                    numberOfLines={4}
                  />
  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.background }]} 
                      onPress={() => { setRequestEditItem(null); setRequestEditReason(''); }}
                    >
                      <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, { backgroundColor: '#F59E0B' }]} 
                      onPress={handleRequestEdit}
                    >
                      <Text style={[styles.confirmButtonText, { color: '#000' }]}>SEND REQUEST</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              </Modal>
    
              <Modal
                visible={!!expandedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setExpandedImage(null)}
              >
                <TouchableOpacity 
                  style={styles.expandedImageOverlay} 
                  activeOpacity={1} 
                  onPress={() => setExpandedImage(null)}
                >
                  <View style={styles.expandedImageContainer}>
                    <Image 
                      source={{ uri: expandedImage }} 
                      style={styles.expandedImage} 
                      resizeMode="contain" 
                    />
                    <TouchableOpacity 
                      style={styles.closeExpandedButton}
                      onPress={() => setExpandedImage(null)}
                    >
                      <XCircle size={32} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Deleted Post Preview Modal */}
              <Modal visible={!!previewPost} transparent animationType="slide" onRequestClose={() => setPreviewPost(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
                  <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Post Preview</Text>
                      <TouchableOpacity onPress={() => setPreviewPost(null)} style={{ padding: 4 }}>
                        <X size={22} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {previewPost?.is_deleted && (
                      <View style={{ backgroundColor: '#EF444420', borderRadius: 10, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={16} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>This post is deleted{previewPost?.deletion_reason ? ` — ${previewPost.deletion_reason}` : ''}</Text>
                      </View>
                    )}
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                          {previewPost?.rusers?.avatar_url ? (
                            <Image source={{ uri: previewPost.rusers.avatar_url }} style={{ width: 36, height: 36 }} />
                          ) : (
                            <Text style={{ fontSize: 18 }}>{previewPost?.rusers?.emoji_icon || '👤'}</Text>
                          )}
                        </View>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>@{previewPost?.rusers?.username || 'unknown'}</Text>
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>{previewPost?.created_at ? new Date(previewPost.created_at).toLocaleString() : ''}</Text>
                        </View>
                      </View>
                      {previewPost?.title ? <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text, marginBottom: 8 }}>{previewPost.title}</Text> : null}
                      {previewPost?.text ? <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 22, marginBottom: 12 }}>{previewPost.text}</Text> : null}
                      {previewPost?.image_url ? (
                        <TouchableOpacity onPress={() => setExpandedImage(previewPost.image_url)}>
                          <Image source={{ uri: previewPost.image_url }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Post ID: {previewPost?.id}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>User ID: {previewPost?.user_id}</Text>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </Modal>
  
          </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  backButton: { padding: 5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabContainer: { paddingVertical: 10 },
  tabScroll: { paddingHorizontal: 20, gap: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', gap: 8 },
  activeTab: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  activeTabText: { color: '#000000' },
  listContent: { paddingBottom: 40 },
  card: { marginBottom: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconContainer: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 13, fontWeight: '800' },
  date: { fontSize: 11, fontWeight: '700' },
  contentPadding: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  description: { fontSize: 15, lineHeight: 22 },
  actionRow: { flexDirection: 'row' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  approveButton: { },
  rejectButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  actionText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  emptyContainer: { paddingVertical: 150, alignItems: 'center', gap: 20 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  logAction: { color: '#F59E0B', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  logDetail: { fontSize: 13, marginBottom: 4 },
  logReason: { fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  restoreButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  restoreText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  analyticsScroll: { flex: 1, padding: 20 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  statCard: { width: (Dimensions.get('window').width - 55) / 2, padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 32, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  aiReasonContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  aiReasonText: { fontSize: 11, fontWeight: '700', flex: 1 },
  aiFilterContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 15, gap: 10 },
  aiFilterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1 },
  aiFilterButtonActive: { backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  aiFilterText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  aiFilterTextActive: { color: '#000000' },
  overtakeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, borderRadius: 12, marginTop: 15 },
  overtakeButtonText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  overtakenBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  overtakenBadgeText: { color: '#000', fontSize: 8, fontWeight: '900' },
  transcriptContainer: { marginTop: 15, borderTopWidth: 1, paddingTop: 15 },
  transcriptMsg: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '90%' },
  userMsg: { alignSelf: 'flex-start' },
  adminMsg: { alignSelf: 'flex-end' },
  transcriptText: { fontSize: 13 },
  transcriptTime: { fontSize: 9, alignSelf: 'flex-end', marginTop: 4 },
  replyContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
    replyInput: { flex: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
    sendButtonSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', borderRadius: 24, padding: 24, borderWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    modalSubtitle: { fontSize: 14, marginBottom: 20 },
    modalInput: { borderRadius: 12, padding: 15, fontSize: 15, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cancelButton: { },
    confirmButton: { backgroundColor: '#EF4444' },
    cancelButtonText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    confirmButtonText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    reportTarget: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 25, marginBottom: 15 },
    sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    chartCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 15 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    chartTitle: { fontSize: 16, fontWeight: '800' },
    trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
    trendText: { fontSize: 10, fontWeight: '900' },
    barChartContainer: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 5 },
    barWrapper: { alignItems: 'center', width: '12%' },
    bar: { width: '100%', borderRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 8, fontWeight: '700', marginTop: 8 },
    detailCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 15 },
    detailTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 15 },
    progressRow: { marginBottom: 15 },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 13, fontWeight: '700' },
    progressValue: { fontSize: 13, fontWeight: '900' },
    progressBarBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    miniStat: { alignItems: 'center' },
    miniStatValue: { fontSize: 18, fontWeight: '900' },
    miniStatLabel: { fontSize: 8, fontWeight: '800', marginTop: 4 },
    reactionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    reactionEmoji: { fontSize: 18 },
    reactionCount: { fontSize: 13, fontWeight: '900', marginLeft: 10, minWidth: 20, textAlign: 'right' },
    reportedBy: { fontSize: 12, marginTop: 8 },
    tapToView: { fontSize: 11, fontWeight: '700', marginTop: 12, letterSpacing: 1 },
    label: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
    searchContainer: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, gap: 10 },
    searchInput: { flex: 1, height: 45, borderRadius: 10, paddingHorizontal: 15, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchButton: { paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    searchButtonText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    roleBadgesRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
      roleBadgeText: { color: '#000', fontSize: 8, fontWeight: '900' },
      cityListContainer: { marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
      cityItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
        dropdownContainer: { 
          position: 'absolute', 
          top: 195, 
          left: 15, 
          right: 15, 
          zIndex: 1000, 
          elevation: 10, 
          borderRadius: 20, 
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          overflow: 'hidden'
        },
        editValuesRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          gap: 12,
        },
        editValueHalf: {
          flex: 1,
          padding: 12,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.03)',
          minHeight: 80,
          justifyContent: 'center',
        },
        editLabel: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1,
          marginBottom: 8,
          position: 'absolute',
          top: 8,
          left: 12,
        },
        editValueText: {
          fontSize: 14,
          lineHeight: 20,
        },
        editImage: {
          width: 50,
          height: 50,
          borderRadius: 25,
          marginTop: 10,
        },
          editValueArrow: {
            width: 24,
            alignItems: 'center',
          },
          previewCardContainer: {
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            height: 200,
            width: '100%',
          },
          previewImageContainer: {
            flex: 1,
            width: '100%',
          },
          previewImage: {
            width: '100%',
            height: '100%',
          },
          previewGradient: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
          },
          previewPlatformBadge: {
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          },
          previewInfo: {
            padding: 12,
          },
          previewName: {
            fontSize: 14,
            fontWeight: '800',
          },
          previewTitle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
            previewDescription: {
              fontSize: 13,
              lineHeight: 18,
            },
            expandedImageOverlay: {
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.95)',
              justifyContent: 'center',
              alignItems: 'center',
            },
            expandedImageContainer: {
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
            expandedImage: {
              width: Dimensions.get('window').width,
              height: Dimensions.get('window').height * 0.8,
            },
            closeExpandedButton: {
              position: 'absolute',
              top: 60,
              right: 20,
              padding: 10,
              zIndex: 10,
            },
            blockArrowText: {
              fontSize: 11,
              fontWeight: '600',
              marginTop: 2,
            },
            blockReasonContainer: {
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              marginBottom: 12,
            },
            blockReasonLabel: {
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1,
              marginBottom: 6,
            },
            blockReasonText: {
              fontSize: 14,
              lineHeight: 20,
            },
            blockMetaRow: {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            },
            blockMetaBadge: {
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            },
            blockMetaText: {
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1,
            },
            viewPostLink: {
              fontSize: 12,
              fontWeight: '700',
            },
            timeRangeContainer: {
              flexDirection: 'row',
              gap: 10,
              marginBottom: 20,
            },
            timeRangeButton: {
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
            },
            timeRangeText: {
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1,
            },
            tapHint: {
              fontSize: 8,
              fontWeight: '700',
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: 1,
            },
            periodStatsCard: {
              padding: 20,
              borderRadius: 24,
              borderWidth: 1,
              marginBottom: 15,
            },
            periodStatRow: {
              flexDirection: 'row',
              justifyContent: 'space-between',
            },
            periodStatItem: {
              alignItems: 'center',
              flex: 1,
            },
            periodStatValue: {
              fontSize: 18,
              fontWeight: '900',
              marginTop: 4,
            },
            periodStatLabel: {
              fontSize: 9,
              fontWeight: '700',
              marginTop: 2,
            },
            highlightCard: {
              padding: 20,
              borderRadius: 24,
              borderWidth: 1,
              marginBottom: 15,
            },
            highlightRow: {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
            highlightLabel: {
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1,
            },
            highlightValue: {
              fontSize: 42,
              fontWeight: '900',
            },
            barValue: {
              fontSize: 10,
              fontWeight: '800',
              marginBottom: 4,
            },
            heatmapCard: {
              padding: 20,
              borderRadius: 24,
              borderWidth: 1,
              marginBottom: 15,
            },
            heatmapGrid: {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
            },
            heatmapCell: {
              width: (Dimensions.get('window').width - 80) / 8,
              height: 40,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
            },
            heatmapHour: {
              fontSize: 8,
              fontWeight: '700',
            },
            heatmapCount: {
              fontSize: 10,
              fontWeight: '900',
            },
            heatmapLegend: {
              fontSize: 10,
              textAlign: 'center',
              marginTop: 12,
            },
            zoneRow: {
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
            },
            zoneDot: {
              width: 10,
              height: 10,
              borderRadius: 5,
              marginRight: 10,
            },
            zoneName: {
              fontSize: 13,
              fontWeight: '700',
              minWidth: 80,
            },
            zoneCount: {
              fontSize: 13,
              fontWeight: '900',
              minWidth: 30,
              textAlign: 'right',
            },
            zonePercent: {
              fontSize: 11,
              marginLeft: 6,
              minWidth: 40,
            },
            topPostRow: {
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingVertical: 15,
              gap: 12,
            },
            rankBadge: {
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            },
            rankText: {
              fontSize: 10,
              fontWeight: '900',
              color: '#000',
            },
            topPostHeader: {
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            },
            topPostUser: {
              fontSize: 12,
              fontWeight: '800',
            },
            topPostText: {
              fontSize: 14,
              lineHeight: 20,
            },
            topPostStats: {
              flexDirection: 'row',
              gap: 12,
              marginTop: 8,
            },
            topPostStat: {
              fontSize: 11,
              fontWeight: '700',
            },
            topUserRow: {
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              gap: 10,
            },
            topUserEmoji: {
              fontSize: 20,
            },
            topUserName: {
              fontSize: 14,
              fontWeight: '700',
            },
            postCountBadge: {
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              marginRight: 8,
            },
            postCountText: {
              fontSize: 11,
              fontWeight: '800',
            },
            commentRow: {
              paddingVertical: 12,
            },
            commentUser: {
              fontSize: 12,
              fontWeight: '800',
              marginBottom: 4,
            },
            commentText: {
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 4,
            },
            commentTime: {
              fontSize: 11,
            },
            reactionPercent: {
              fontSize: 11,
              marginLeft: 6,
              minWidth: 40,
            },
            detailModalOverlay: {
              flex: 1,
            },
            detailModalHeader: {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 15,
              borderBottomWidth: 1,
            },
            detailModalTitle: {
              fontSize: 14,
              fontWeight: '900',
              letterSpacing: 1,
            },
            detailListItem: {
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
              borderRadius: 16,
              marginBottom: 10,
              borderWidth: 1,
              gap: 12,
            },
            detailItemEmoji: {
              fontSize: 24,
            },
            detailItemTitle: {
              fontSize: 14,
              fontWeight: '800',
            },
            detailItemSubtitle: {
              fontSize: 11,
              marginTop: 2,
            },
            detailItemText: {
              fontSize: 13,
              lineHeight: 18,
              marginTop: 4,
            },
            detailItemReason: {
              fontSize: 11,
              fontStyle: 'italic',
              marginTop: 4,
            },
            statusBadge: {
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
            },
              statusBadgeText: {
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 1,
              },
              reportActionGrid: {
                flexDirection: 'column',
                padding: 12,
                gap: 8,
              },
              compactActionButton: {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                gap: 8,
              },
              actionLabel: {
                fontSize: 11,
                fontWeight: '900',
                letterSpacing: 0.5,
              },
        });


