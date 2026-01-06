import { Tabs } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export default function LeaderLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="schedule/consolidate"
        options={{
          title: "Escala geral",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="documents-outline" size={size} color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps" size={size} color={color} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="schedule/generate"
        options={{
          title: "Gerador",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule/published"
        options={{
          title: "Escalas ministérios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}
