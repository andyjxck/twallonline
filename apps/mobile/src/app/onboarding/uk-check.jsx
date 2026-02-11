import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Globe, MapPin } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/utils/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useChatStore, useAuthStore } from "@/utils/auth";
import { useLocationStore } from "@/utils/locationStore";
import { findCityByName } from "@/utils/location";
import { setOnboardingComplete } from "@/utils/onboarding";

export default function UkCheckScreen() {
  const { isHippie, isLight, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const auth = useAuthStore((state) => state.auth);
  const { setCity } = useLocationStore();

  const handleYes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/onboarding/city");
  };

  const handleNo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const globalCity = await findCityByName('Global');
    if (globalCity) {
      setCity({
        id: globalCity.id,
        name: globalCity.name,
        source: "manual",
      });
      await setOnboardingComplete(true);
      router.replace("/");
      return;
    }
    router.push("/onboarding/city?global=true");
  };

  return (
    <View style={{ flex: 1, backgroundColor: isHippie ? 'transparent' : theme.colors.background }}>
      {!isHippie && !isLight && (
        <LinearGradient
          colors={['#0F172A', '#000000']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <StatusBar style={isLight ? "dark" : "light"} />

      <View
        style={{ flex: 1, paddingTop: insets.top + 80, paddingHorizontal: 24 }}
      >
        <View style={{ alignItems: "center", marginBottom: 60 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 32,
              borderWidth: isLight ? 1 : 0,
              borderColor: "rgba(0,0,0,0.05)",
            }}
          >
            <Text style={{ fontSize: 56 }}>🇬🇧</Text>
          </View>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 32,
              fontWeight: "900",
              letterSpacing: -1,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Are you from the UK?
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 16,
              fontWeight: "500",
              lineHeight: 24,
              textAlign: "center",
              maxWidth: 280,
            }}
          >
            Town Wall is currently focused on UK communities
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={handleYes}
            style={{
              backgroundColor: isLight ? "#000000" : "#FFFFFF",
              paddingVertical: 20,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <MapPin size={22} color={isLight ? "#FFFFFF" : "#000000"} />
            <Text
              style={{
                color: isLight ? "#FFFFFF" : "#000000",
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Yes, I'm in the UK
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNo}
            style={{
              backgroundColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
              paddingVertical: 20,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Globe size={22} color={theme.colors.text} />
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              No, join Global Chat
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ paddingBottom: insets.bottom + 24, alignItems: "center" }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 13,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Non-UK users can still connect with{"\n"}the global community
          </Text>
        </View>
      </View>
    </View>
  );
}
