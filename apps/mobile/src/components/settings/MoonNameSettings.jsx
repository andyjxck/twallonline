import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";
import { crossAlert } from "@/utils/alert";

export function MoonNameSettings({
  moonName,
  moonNameEdit,
  tempMoonName,
  setTempMoonName,
  onEditToggle,
  onSave,
}) {
  const [saving, setSaving] = useState(false);

  const handleSaveToDatabase = async () => {
    try {
      setSaving(true);
      const storedUser = await AsyncStorage.getItem("currentUser");
      if (!storedUser) throw new Error("User not found in storage");

      const user = JSON.parse(storedUser);
      const newName = tempMoonName.trim();

      if (!newName) {
        crossAlert("Name Required", "Please enter a name for your moon.");
        return;
      }

      const { error } = await supabase
        .from("m_settings")
        .update({ moon_name: newName })
        .eq("user_id", user.user_id);

      if (error) throw error;

      onSave(); // updates state in useSettings
      crossAlert("Success", "Your moon's name has been updated.");
    } catch (err) {
      console.error("Error saving moon name:", err);
      crossAlert("Save Failed", "Could not update moon name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        padding: 24,
        marginBottom: 24,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="moon" size={20} color="#a78bfa" />
        </View>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 18,
            color: "#ffffff",
            flex: 1,
          }}
        >
          Your Moon's Name
        </Text>
        {!moonNameEdit && (
          <TouchableOpacity
            onPress={onEditToggle}
            style={{
              width: 32,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="pencil" size={16} color="#a78bfa" />
          </TouchableOpacity>
        )}
      </View>

      {moonNameEdit ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: "#ffffff",
              padding: 16,
              marginRight: 12,
            }}
            value={tempMoonName}
            onChangeText={setTempMoonName}
            placeholder="Name your moon..."
            placeholderTextColor="#64748b"
            maxLength={20}
          />

          <TouchableOpacity
            onPress={handleSaveToDatabase}
            disabled={saving}
            style={{
              width: 48,
              height: 48,
              justifyContent: "center",
              alignItems: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#a78bfa" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#a78bfa" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 24,
            color: "#ffffff",
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          {moonName}
        </Text>
      )}
    </View>
  );
}