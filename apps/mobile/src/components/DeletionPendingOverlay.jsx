import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { AlertTriangle, X } from "lucide-react-native";
import { useTheme } from "@/utils/ThemeContext";
import { cancelAccountDeletion } from "@/utils/user";
import { useAuthStore } from "@/utils/auth";
import * as Haptics from "expo-haptics";

export default function DeletionPendingOverlay({ scheduledDate }) {
  const { theme } = useTheme();
  const { auth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const deletionDate = new Date(scheduledDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24)));

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      await cancelAccountDeletion(auth.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useAuthStore.getState().setAuth({ ...auth, scheduled_for_deletion_at: null });
    } catch (error) {
      console.error("Error canceling deletion:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <BlurView intensity={90} tint="dark" style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TouchableOpacity 
            style={styles.dismissBtn} 
            onPress={() => setDismissed(true)}
          >
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <AlertTriangle size={48} color="#f59e0b" />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            Account Deletion Scheduled
          </Text>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Your account is scheduled to be permanently deleted in{" "}
            <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>{daysLeft} days</Text>
          </Text>

          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
            Deletion date: {deletionDate.toLocaleDateString()}
          </Text>

          <Text style={[styles.info, { color: theme.colors.textSecondary }]}>
            All your posts, comments, messages, and profile data will be permanently removed. This action cannot be undone after the deletion date.
          </Text>

          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleCancelDeletion}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Deletion & Keep Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => setDismissed(true)}
          >
            <Text style={[styles.continueBtnText, { color: theme.colors.textSecondary }]}>
              Continue to app
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  dismissBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  iconContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  date: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  info: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.8,
  },
  cancelBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  cancelBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  continueBtn: {
    paddingVertical: 12,
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
