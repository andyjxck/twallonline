import React from "react";
import { View, Text } from "react-native";

export function SettingsHeader() {
  return (
    <View style={{ alignItems: "center", marginBottom: 32 }}>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 32,
          color: "#ffffff",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Settings
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 16,
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        Make this space truly yours
      </Text>
    </View>
  );
}