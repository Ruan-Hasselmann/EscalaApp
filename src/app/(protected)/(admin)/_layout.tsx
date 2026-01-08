import { Tabs } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
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
      {/* =========================
         TABS VISÍVEIS
      ========================= */}

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

      <Tabs.Screen
        name="ministries/ministries"
        options={{
          title: "Ministérios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="school-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="people/index"
        options={{
          title: "Pessoas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="service-days/index"
        options={{
          title: "Cultos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="availability"
        options={{
          title: "Disponibilidade",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="time-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =========================
         ROTAS OCULTAS / MODAIS
      ========================= */}

      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen name="dashboard" options={{ href: null }} />

      <Tabs.Screen name="ministries/[id]" options={{ href: null }} />

      <Tabs.Screen
        name="ministries/MinistryModal"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="people/ManagePersonModal"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="service-days/ServiceDayModal"
        options={{ href: null }}
      />
    </Tabs>
  );
}
