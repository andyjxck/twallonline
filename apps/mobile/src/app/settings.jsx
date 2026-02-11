import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, TextInput, Modal, ActivityIndicator, Switch, Platform, Image, FlatList, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, LogOut, Shield, Info, Bell, Key, BarChart2, ChevronRight, Trash2, UserX, X, Mail, HelpCircle, FileText } from "lucide-react-native";
import { scheduleAccountDeletion } from "../utils/user";
import { theme } from "../utils/theme";
import { useTheme } from "@/utils/ThemeContext";
import { goBack } from "@/utils/navigation";
import { useAuth } from "../utils/auth/useAuth";
import { useAuthStore } from "../utils/auth";
import * as Haptics from "expo-haptics";
import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';
import { supabase } from "../utils/supabase";
import { generateRecoveryCodes, storeRecoveryCodes, getRecoveryCodesStatus } from "../utils/recoveryCode";
import RecoveryCodesDisplay from "../components/RecoveryCodesDisplay";
import { useLocationStore } from "../utils/locationStore";
import { MapPin } from "lucide-react-native";
import { getBlockedUsers, unblockUser } from "../utils/blocking";

// Polyfill for bcryptjs in React Native/Expo
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = (array) => {
    const randomBytes = Crypto.getRandomBytes(array.length);
    for (let i = 0; i < array.length; i++) {
      array[i] = randomBytes[i];
    }
    return array;
  };
}

  export default function SettingsScreen() {
    const { isHippie, theme: themeCtx } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { auth } = useAuthStore();
  const { city_name, zone_name } = useLocationStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRecoveryCodes, setNewRecoveryCodes] = useState([]);
  const [recoveryStatus, setRecoveryStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasPasswordLocal, setHasPasswordLocal] = useState(!!auth?.password);
  const [passwordError, setPasswordError] = useState("");
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);

  const loadingMessages = [
    "Generating your secure recovery codes...",
    "I know this can take a while.. I promise it's working!",
    "Almost there... securing your account...",
    "Encryption in progress...",
    "Hashing codes for maximum safety...",
    "One-time use, lifetime security...",
    "Double checking the locks...",
    "Your account's safety is our priority...",
    "Wrapping things up for you...",
    "Finalizing your vault...",
  ];
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    setHasPasswordLocal(!!auth?.password);
    setDoNotDisturb(auth?.do_not_disturb || false);
  }, [auth?.password, auth?.do_not_disturb]);

  useEffect(() => {
    const checkPassword = async () => {
      if (!auth?.password && auth?.id) {
        const { data } = await supabase.from('rusers').select('password, do_not_disturb').eq('id', auth.id).single();
        if (data) {
          if (data.password) {
            setHasPasswordLocal(true);
          }
          setDoNotDisturb(data.do_not_disturb || false);
          useAuthStore.getState().setAuth({ ...auth, ...data });
        }
      }
    };
    checkPassword();
  }, []);

  const toggleDND = async (value) => {
    setDoNotDisturb(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { data, error } = await supabase.from('rusers').update({ do_not_disturb: value }).eq('id', auth.id).select().single();
      if (data) {
        useAuthStore.getState().setAuth(data);
      }
    } catch (error) {
      console.error("Error toggling DND:", error);
    }
  };

  const fetchRecoveryStatus = async () => {
    if (!auth?.id) return;
    try {
      const data = await getRecoveryCodesStatus(auth.id);
      setRecoveryStatus(data);
    } catch (error) {
      console.error("Error fetching recovery status:", error);
    }
  };

    const handleOpenRecoveryStatus = async () => {
      let hasPassword = !!auth?.password;
      
      // If password not in store, double check DB to be absolutely sure
      if (!hasPassword && auth?.id) {
        setLoading(true);
        const { data } = await supabase.from('rusers').select('password').eq('id', auth.id).single();
        if (data?.password) {
          hasPassword = true;
          // Sync store if we found it
          useAuthStore.getState().setAuth({ ...auth, password: data.password });
        }
        setLoading(false);
      }

      if (!hasPassword) {
      Alert.alert(
        "Password Required", 
        "To use recovery codes, you first need to set a password for your account. This helps keep your account secure!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Set Password", onPress: () => { setShowChangePassword(true); setPasswordError(""); } }
        ]
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchRecoveryStatus();
    setShowStatusModal(true);
  };

  const handleRegenerateRecoveryCodes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowStatusModal(false);
    setShowPasswordModal(true);
    setCurrentPassword("");
    setPasswordError("");
  };

  const handlePasswordConfirm = async () => {
    if (!currentPassword) {
      setPasswordError("Please enter your password");
      return;
    }
    setLoading(true);
    setPasswordError("");
    try {
      const { data: user, error: userError } = await supabase.from('rusers').select('password').eq('id', auth.id).single();
      if (userError || !user) {
        setPasswordError("Incorrect password or user not found");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!bcrypt.compareSync(currentPassword, user.password)) {
        setPasswordError("Incorrect password");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const codes = generateRecoveryCodes();
      // Delete old codes before storing new ones
      await supabase.from('recovery_codes').delete().eq('user_id', auth.id);
      await storeRecoveryCodes(auth.id, codes);
      
      setNewRecoveryCodes(codes);
      setShowPasswordModal(false);
      setShowRecoveryCodes(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) { 
      console.error("Recovery generation error:", error);
      setPasswordError(error.message || "Something went wrong."); 
    }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setPasswordError("Min 6 characters."); return; }
    setLoading(true);
    setPasswordError("");
    try {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);
      const { data, error } = await supabase.from('rusers').update({ password: hashedPassword }).eq('id', auth.id).select().single();
      if (error) throw error;
      
      // Update global store so UI re-renders correctly
      useAuthStore.getState().setAuth(data);
      
      Alert.alert("Success", "Password updated successfully.");
      setShowChangePassword(false);
      setNewPassword("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) { setPasswordError("Failed to update password."); }
    finally { setLoading(false); }
  };

  const loadBlockedUsers = async () => {
    if (!auth?.id) return;
    try {
      const data = await getBlockedUsers(auth.id);
      setBlockedUsers(data);
    } catch (error) {
      console.error("Error loading blocked users:", error);
    }
  };

  const handleOpenBlockedUsers = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadBlockedUsers();
    setShowBlockedUsersModal(true);
  };

  const handleUnblock = async (blockedId, username) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock @${username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              await unblockUser(auth.id, blockedId);
              setBlockedUsers(prev => prev.filter(b => b.blocked_user_id !== blockedId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert("Error", "Failed to unblock user.");
            }
          }
        }
      ]
    );
  };

const handleSignOut = async () => {
      Alert.alert("Sign Out", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: async () => {
          await signOut();
          router.replace("/");
        }}
      ]);
    };

    const handleDeleteAccount = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? Your account will be scheduled for permanent deletion in 30 days. You can cancel this anytime by logging back in.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete Account",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Confirm Deletion",
                "This will permanently delete all your posts, comments, messages, and profile data after 30 days. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Yes, Delete My Account",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        const updatedUser = await scheduleAccountDeletion(auth.id);
                        useAuthStore.getState().setAuth(updatedUser);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert(
                          "Account Scheduled for Deletion",
                          "Your account will be permanently deleted in 30 days. You can cancel this anytime from settings."
                        );
                      } catch (error) {
                        console.error("Error scheduling deletion:", error);
                        Alert.alert("Error", "Failed to schedule account deletion. Please try again.");
                      }
                    }
                  }
                ]
              );
            }
          }
        ]
        );
      };

      const handleSupportEmail = async () => {
        const email = 'andyblewett991@gmail.com';
        const url = `mailto:${email}`;

      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            "Contact Support",
            `We couldn't open your mail app automatically. Please email us at:\n\n${email}`,
            [{ text: "OK" }]
          );
        }
      } catch (error) {
        Alert.alert("Error", "Could not open mail app.");
      }
    };

    return (

    <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => goBack(router)} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>PREFERENCES</Text>
                <View style={[styles.item, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.itemLeft}>
                    <Bell size={20} color={theme.colors.textSecondary} />
                    <View>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>Do Not Disturb</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Silence all push notifications</Text>
                    </View>
                  </View>
                  <Switch
                    value={doNotDisturb}
                    onValueChange={toggleDND}
                    trackColor={{ false: '#334155', true: theme.colors.primary }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (doNotDisturb ? theme.colors.primary : '#f4f3f4')}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>LOCATION</Text>
                <TouchableOpacity onPress={() => router.push("/onboarding/city")} style={[styles.item, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.itemLeft}>
                    <MapPin size={20} color={theme.colors.textSecondary} />
                    <View>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>Your Town</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                        {city_name || "Not set"}{zone_name ? ` • ${zone_name}` : ""}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>SECURITY</Text>
                <SettingsItem icon={<Key size={20} color={theme.colors.textSecondary} />} title={hasPasswordLocal ? "Change Password" : "Set Account Password"} onPress={() => { setShowChangePassword(true); setPasswordError(""); }} />
                <SettingsItem icon={<Shield size={20} color={theme.colors.textSecondary} />} title="Recovery Codes" onPress={handleOpenRecoveryStatus} />
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>PRIVACY</Text>
                <SettingsItem icon={<UserX size={20} color={theme.colors.textSecondary} />} title="Blocked Users" onPress={handleOpenBlockedUsers} />
              </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>SUPPORT</Text>
                    <SettingsItem 
                      icon={<HelpCircle size={20} color={theme.colors.textSecondary} />} 
                      title="How to Use Town Wall" 
                      onPress={() => router.push("/guide")} 
                    />
                    <SettingsItem 
                      icon={<Mail size={20} color={theme.colors.textSecondary} />} 
                      title="Send us an email!" 
                      onPress={handleSupportEmail} 
                    />

                </View>

                <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>LEGAL</Text>
              <SettingsItem icon={<Shield size={20} color={theme.colors.textSecondary} />} title="Privacy Policy" onPress={() => router.push("/privacy")} />
              <SettingsItem icon={<FileText size={20} color={theme.colors.textSecondary} />} title="Terms of Service" onPress={() => router.push("/terms")} />
              <SettingsItem icon={<Info size={20} color={theme.colors.textSecondary} />} title="Community Guidelines" onPress={() => router.push("/guidelines")} />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.error }]}>DANGER ZONE</Text>
              <TouchableOpacity onPress={handleDeleteAccount} style={[styles.item, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.itemLeft}>
                  <Trash2 size={20} color={theme.colors.error} />
                  <Text style={[styles.itemTitle, { color: theme.colors.error }]}>Delete Account</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <LogOut size={20} color={theme.colors.error} />
          <Text style={[styles.signOutText, { color: theme.colors.error }]}>SIGN OUT</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>TOWN WALL v1.0.5</Text>
      </ScrollView>

      <Modal visible={showPasswordModal || showChangePassword} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{showChangePassword ? "New Password" : "Confirm Identity"}</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              placeholder={showChangePassword ? "Enter new password" : "Enter current password"}
              value={showChangePassword ? newPassword : currentPassword}
              onChangeText={showChangePassword ? setNewPassword : setCurrentPassword}
              secureTextEntry
              autoFocus
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={showChangePassword ? handleChangePassword : handlePasswordConfirm}
                    disabled={loading}
                  >
                    {loading ? (
                      <View style={{ alignItems: 'center', gap: 10 }}>
                        <ActivityIndicator color="#000000" />
                        <Text style={{ color: '#000000', fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8 }}>
                          {loadingMessages[loadingMessageIndex]}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.modalBtnText, { color: "#000000" }]}>
                        {showChangePassword ? "UPDATE" : "CONFIRM"}
                      </Text>
                    )}
                  </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowPasswordModal(false); setShowChangePassword(false); }} style={styles.closeBtn}>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showStatusModal} animationType="slide">
        <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.backBtn}>
              <ChevronLeft size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text, flex: 1, textAlign: 'center', marginRight: 44 }]}>Recovery Status</Text>
          </View>
          <RecoveryCodesDisplay 
            statuses={recoveryStatus} 
            onConfirm={() => setShowStatusModal(false)} 
            onRegenerate={handleRegenerateRecoveryCodes}
          />
        </View>
      </Modal>

      <Modal visible={showRecoveryCodes} animationType="fade">
        <View style={[styles.container, { backgroundColor: isHippie ? 'transparent' : theme.colors.background }]}>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text, flex: 1, textAlign: 'center' }]}>New Recovery Codes</Text>
          </View>
          <RecoveryCodesDisplay codes={newRecoveryCodes} onConfirm={() => setShowRecoveryCodes(false)} isRegeneration />
        </View>
      </Modal>

<Modal visible={showBlockedUsersModal} animationType="slide" statusBarTranslucent>
          <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowBlockedUsersModal(false)} style={styles.backBtn}>
              <ChevronLeft size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text, flex: 1, textAlign: 'center', marginRight: 44 }]}>Blocked Users</Text>
          </View>
          {blockedUsers.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <UserX size={48} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 16, fontSize: 16, textAlign: 'center' }}>
                You haven't blocked anyone yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={blockedUsers}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => (
                <View style={[styles.blockedUserItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.blockedUserInfo}>
                    {item.blocked_user?.avatar_url ? (
                      <Image source={{ uri: item.blocked_user.avatar_url }} style={styles.blockedUserAvatar} />
                    ) : (
                      <View style={[styles.blockedUserAvatar, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 18 }}>{item.blocked_user?.emoji_icon || '👤'}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>@{item.blocked_user?.username || 'Unknown'}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {item.reason} • {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleUnblock(item.blocked_user_id, item.blocked_user?.username)}
                    style={[styles.unblockBtn, { borderColor: theme.colors.primary }]}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function SettingsItem({ icon, title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.item, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.itemLeft}>
        {icon}
        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  itemTitle: { fontSize: 16 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 20, paddingVertical: 20, marginTop: 20 },
  signOutText: { fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 40, opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 20, padding: 20, borderWidth: 1, gap: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalInput: { borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1 },
  modalBtn: { padding: 15, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#000', fontWeight: 'bold' },
  closeBtn: { alignItems: 'center', padding: 10 },
  errorText: { color: '#ef4444', fontSize: 12, textAlign: 'center' },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  blockedUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});
