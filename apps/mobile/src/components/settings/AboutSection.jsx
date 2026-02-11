import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export function AboutSection() {
    return (
        <View style={{ padding: 24, alignItems: "center" }}>
            <View
                style={{
                    width: 60,
                    height: 60,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 16,
                }}
            >
                <Ionicons name="heart" size={30} color="#a78bfa" />
            </View>
            <Text
                style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 20,
                    color: "#ffffff",
                    marginBottom: 8,
                }}
            >
                Zen Void
            </Text>
            <Text
                style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    color: "#94a3b8",
                    textAlign: "center",
                    marginBottom: 16,
                    lineHeight: 22,
                }}
            >
                Your personal space for emotional awareness and growth
            </Text>
            <Text
                style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: "#a78bfa",
                    fontStyle: "italic",
                    textAlign: "center",
                    marginBottom: 24,
                }}
            >
                "You're here. That's enough."
            </Text>

            {/* Credits Section */}
            <View style={{ marginTop: 16, alignItems: "center", width: "100%" }}>
                <Text
                    style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: "#ffffff",
                        marginBottom: 16,
                    }}
                >
                    Made by andysocial apps
                </Text>

                  <TouchableOpacity
                      onPress={() => Linking.openURL("mailto:andyblewett991@gmail.com")}

                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        marginBottom: 12,
                    }}
                >
                    <Ionicons name="mail" size={20} color="#34d399" style={{ marginRight: 10 }} />
                    <Text
                        style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 15,
                            color: "#34d399",
                        }}
                    >
                        Support & Contact
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => Linking.openURL("https://discord.com/invite/PmWMEH8RWJ")}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                    }}
                >
                    <Ionicons name="logo-discord" size={20} color="#5865f2" style={{ marginRight: 10 }} />
                    <Text
                        style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 15,
                            color: "#5865f2",
                        }}
                    >
                        Join Discord Community
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}