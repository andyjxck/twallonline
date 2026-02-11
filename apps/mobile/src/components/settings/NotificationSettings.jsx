import React from "react";
import { View, Text, Switch, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

function TimeSelector({ value, onIncrement, onDecrement, label }) {
    return (
        <View style={{ flex: 1 }}>
            <Text
                style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: "#94a3b8",
                    marginBottom: 8,
                    textAlign: "center",
                }}
            >
                {label}
            </Text>
            <View
                style={{
                    flexDirection: "row",
                    padding: 4,
                }}
            >
                <TouchableOpacity
                    onPress={onDecrement}
                    style={{
                        width: 32,
                        height: 32,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Ionicons name="remove" size={16} color="#ffffff" />
                </TouchableOpacity>

                <Text
                    style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 18,
                        color: "#ffffff",
                        flex: 1,
                        textAlign: "center",
                        paddingVertical: 6,
                    }}
                >
                    {String(value).padStart(2, "0")}
                </Text>

                <TouchableOpacity
                    onPress={onIncrement}
                    style={{
                        width: 32,
                        height: 32,
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Ionicons name="add" size={16} color="#ffffff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export function NotificationSettings({
    enabled,
    onToggle,
    time,
    hour,
    setHour,
    minute,
    setMinute,
    onTimeUpdate,
}) {
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
                    marginBottom: 20,
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
                    <Ionicons name="notifications" size={20} color="#a78bfa" />
                </View>
                <Text
                    style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 18,
                        color: "#ffffff",
                    }}
                >
                    Daily Reminders
                </Text>
            </View>

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
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
                        Enable Notifications
                    </Text>
                    <Text
                        style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 13,
                            color: "#94a3b8",
                            lineHeight: 18,
                        }}
                    >
                        Gentle daily reminders to check in with yourself
                    </Text>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={onToggle}
                    trackColor={{ false: "#374151", true: "#a78bfa" }}
                    thumbColor="#ffffff"
                />
            </View>

            {enabled && (
                <View
                    style={{
                        padding: 20,
                    }}
                >
                    <Text
                        style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 16,
                            color: "#ffffff",
                            marginBottom: 16,
                            textAlign: "center",
                        }}
                    >
                        Reminder Time: {time}
                    </Text>

                    <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                        <TimeSelector
                            value={hour}
                            label="Hour"
                            onIncrement={() => setHour(h => (h < 23 ? h + 1 : 0))}
                            onDecrement={() => setHour(h => (h > 0 ? h - 1 : 23))}
                        />
                        <TimeSelector
                            value={minute}
                            label="Minute"
                            onIncrement={() => setMinute(m => (m < 45 ? m + 15 : 0))}
                            onDecrement={() => setMinute(m => (m > 0 ? m - 15 : 45))}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={onTimeUpdate}
                        style={{ alignItems: "center" }}
                    >
                        <View
                            style={{
                                paddingVertical: 12,
                                paddingHorizontal: 24,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: "Inter_700Bold",
                                    fontSize: 14,
                                    color: "#a78bfa",
                                }}
                            >
                                Update Time
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}