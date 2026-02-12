import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScanFace, Download, Trash2, Lock, ChevronRight, FileText, X } from "lucide-react-native";
import * as LocalAuthentication from "expo-local-authentication";
let FileSystem, Sharing;
if (Platform.OS !== 'web') {
  FileSystem = require("expo-file-system/legacy");
  Sharing = require("expo-sharing");
}
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";
import { decryptText } from "@/utils/encryption";
import * as Haptics from "expo-haptics";
import { crossAlert } from "@/utils/alert";
import { toast } from 'sonner-native';

function DataAction({ icon: Icon, color, title, subtitle, onPress, destructive = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        <Icon size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: destructive ? color : "#f8fafc", fontWeight: "500", marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: destructive ? "#fca5a5" : "#64748b" }}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={18} color={destructive ? color : "#64748b"} />
    </TouchableOpacity>
  );
}

export function DataSettings({ onDelete }) {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricSetting();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
      
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("Face ID");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("Touch ID");
        }
      }
    } catch (err) {
      setBiometricAvailable(false);
    }
  };

  const loadBiometricSetting = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("currentUser");
      if (!storedUser) return;

      const user = JSON.parse(storedUser);
      const userId = user.user_id || user.id;

      const { data } = await supabase
        .from("m_settings")
        .select("biometric_enabled")
        .eq("user_id", userId)
        .single();

      setBiometricEnabled(data?.biometric_enabled ?? false);
    } catch (err) {
      console.error("Error loading biometric setting:", err);
    }
  };

  const handleBiometricToggle = async (value) => {
    Haptics.selectionAsync();

    if (!biometricAvailable) {
      toast.error(`${biometricType} is not set up on this device. Enable it in your device settings first.`);
      return;
    }

    const storedUser = await AsyncStorage.getItem("currentUser");
    if (!storedUser) return;
    const user = JSON.parse(storedUser);
    const userId = user.user_id || user.id;

    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate to enable ${biometricType}`,
        fallbackLabel: "Use passcode",
      });

      if (result.success) {
        await supabase
          .from("m_settings")
          .update({ biometric_enabled: true, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        setBiometricEnabled(true);
      } else {
        toast.error(`Unable to enable ${biometricType} lock.`);
      }
    } else {
      await supabase
        .from("m_settings")
        .update({ biometric_enabled: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      setBiometricEnabled(false);
    }
  };

  const exportData = async (encrypted) => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const storedUser = await AsyncStorage.getItem("currentUser");
      if (!storedUser) {
        toast.error("Please sign in to export your data.");
        return;
      }

      const userData = JSON.parse(storedUser);
      const userId = userData.user_id || userData.id;

      const { data: entries, error } = await supabase
        .from("m_entries")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw error;

      let exportEntries = entries || [];

      if (!encrypted) {
        exportEntries = await Promise.all(
          entries.map(async (entry) => {
            const note = entry.note ? await decryptText(userId, entry.note).catch(() => entry.note) : "";
            const gratitude = entry.gratitude ? await decryptText(userId, entry.gratitude).catch(() => entry.gratitude) : "";
            return { ...entry, note, gratitude };
          })
        );
      }

      const exportDataObj = {
        exportDate: new Date().toISOString(),
        encrypted: encrypted,
        totalEntries: exportEntries.length,
        entries: exportEntries,
      };

      const fileName = `zen_void_export_${encrypted ? "encrypted_" : ""}${new Date().toISOString().split("T")[0]}.json`;
      const jsonString = JSON.stringify(exportDataObj, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, jsonString);
        await Sharing.shareAsync(filePath, { mimeType: "application/json" });
      }

      setShowExportModal(false);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Unable to export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View>
      <View
        style={{
          padding: 16,
          marginBottom: 16,
          opacity: biometricAvailable ? 1 : 0.7,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <ScanFace size={20} color={biometricAvailable ? "#a78bfa" : "#64748b"} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 16, color: "#f8fafc", fontWeight: "500", flex: 1 }}>
            {biometricType} Lock
          </Text>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(167, 139, 250, 0.4)" }}
            thumbColor={biometricEnabled ? "#a78bfa" : "#64748b"}
            disabled={!biometricAvailable}
          />
        </View>
        <Text style={{ fontSize: 13, color: "#94a3b8", lineHeight: 18 }}>
          {biometricAvailable 
            ? `Require ${biometricType} to access Journal, Insights, Calendar & Settings.\nToday & Wellness remain accessible.`
            : `${biometricType} not available. Set up biometrics in your device settings.`
          }
        </Text>
      </View>

      <DataAction
        icon={Download}
        color="#34d399"
        title="Export Your Data"
        subtitle="Download all entries as a file"
        onPress={() => setShowExportModal(true)}
      />

      <DataAction
        icon={Trash2}
        color="#ef4444"
        title="Fade Everything Away"
        subtitle="Permanently delete all your data"
        onPress={onDelete}
        destructive
      />

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.98)",
              padding: 24,
              width: "100%",
              maxWidth: 340,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FileText size={22} color="#34d399" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 18, color: "#f8fafc", fontWeight: "600" }}>Export Data</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
              Choose how you'd like to export your journal entries:
            </Text>

            {exporting ? (
              <View style={{ alignItems: "center", padding: 30 }}>
                <ActivityIndicator color="#34d399" size="large" />
                <Text style={{ color: "#94a3b8", marginTop: 12 }}>Preparing your data...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => exportData(false)}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Ionicons name="document-text" size={18} color="#34d399" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 15, color: "#34d399", fontWeight: "600" }}>
                      Export Decrypted
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: "#6ee7b7", lineHeight: 16 }}>
                    All entries readable in plain text. Best for personal backup or moving to another app.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => exportData(true)}
                  style={{
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Lock size={18} color="#a78bfa" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 15, color: "#a78bfa", fontWeight: "600" }}>
                      Export Encrypted
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: "#c4b5fd", lineHeight: 16 }}>
                    Notes & gratitudes stay encrypted. Best for secure archival.
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}