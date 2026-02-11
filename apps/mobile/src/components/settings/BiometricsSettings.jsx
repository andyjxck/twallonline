import React, { useState, useEffect } from "react";
import { View, Text, Switch, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as LocalAuthentication from "expo-local-authentication";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BIOMETRICS_KEY = "biometrics_enabled";

export function BiometricsSettings() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometrics");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricSetting();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(compatible && enrolled);

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("Face ID");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("Touch ID");
        }
      }
    } catch (error) {
      console.error("Error checking biometrics:", error);
    }
  };

  const loadBiometricSetting = async () => {
    try {
      const value = await AsyncStorage.getItem(BIOMETRICS_KEY);
      setEnabled(value === "true");
    } catch (error) {
      console.error("Error loading biometric setting:", error);
    }
  };

  const handleToggle = async (value) => {
    try {
      if (value) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType} to unlock Zen Void`,
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await AsyncStorage.setItem(BIOMETRICS_KEY, "true");
          setEnabled(true);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Enabled", `${biometricType} lock is now active.`);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        await AsyncStorage.setItem(BIOMETRICS_KEY, "false");
        setEnabled(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error toggling biometrics:", error);
    }
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <LinearGradient
      colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.02)"]}
      style={{
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(96, 165, 250, 0.3)",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Ionicons
            name={biometricType === "Face ID" ? "scan" : "finger-print"}
            size={20}
            color="#60a5fa"
          />
        </View>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 18,
            color: "#ffffff",
          }}
        >
          Security
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: "#ffffff",
              marginBottom: 4,
            }}
          >
            {biometricType} Lock
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#94a3b8",
              lineHeight: 18,
            }}
          >
            Require {biometricType} to open Zen Void
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: "#374151", true: "#60a5fa" }}
          thumbColor="#ffffff"
        />
      </View>
    </LinearGradient>
  );
}
