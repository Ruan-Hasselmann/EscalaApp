import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  AppNotification,
  listenUserNotifications,
  markNotificationAsRead,
} from "@/services/notifications/notifications";
import { useTheme } from "@/contexts/ThemeContext";

/* =========================
   SCREEN
========================= */

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    return listenUserNotifications(user.uid, setItems);
  }, [user]);

  function handlePress(item: AppNotification) {
    if (!item.read) {
      markNotificationAsRead(item.id);
    }

    // 🔮 Futuro: navegação por relatedEntity
  }

  return (
    <AppScreen>
      <AppHeader title="Notificações" back />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {items.length === 0 && (
          <Text style={[styles.empty, { color: theme.colors.text }]}>
            Nenhuma notificação ainda.
          </Text>
        )}

        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => handlePress(item)}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              !item.read && {
                borderLeftColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: theme.colors.text },
              ]}
            >
              {item.title}
            </Text>

            <Text
              style={[
                styles.body,
                { color: theme.colors.text, opacity: 0.8 },
              ]}
            >
              {item.body}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    opacity: 0.6,
  },
  card: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },

  body: {
    fontSize: 13,
    opacity: 0.75,
    marginTop: 2,
  },

});
