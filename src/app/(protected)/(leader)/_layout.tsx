import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/contexts/ThemeContext";

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
      {/* INDEX (rota técnica) */}
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />

      {/* ESCALA GERAL */}
      <Tabs.Screen
        name="schedule/consolidate"
        options={{
          title: "Escala geral",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="documents-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* GERADOR */}
      <Tabs.Screen
        name="schedule/generate"
        options={{
          title: "Gerar escala",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="construct-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ESCALAS DO MINISTÉRIO */}
      <Tabs.Screen
        name="schedule/published"
        options={{
          title: "Ministérios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* DASHBOARD (rota técnica / acesso via redirect) */}
      <Tabs.Screen
        name="dashboard"
        options={{ href: null }}
      />
    </Tabs>
  );
}
