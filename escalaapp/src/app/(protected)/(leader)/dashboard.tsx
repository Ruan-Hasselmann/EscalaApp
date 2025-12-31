import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { ActionList } from "@/components/ui/ActionList";
import { ActionListItem } from "@/components/ui/ActionListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function LeaderDashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader title="🎯 Painel do Líder" />

      <Text
        style={[
          styles.welcome,
          { color: theme.colors.text },
        ]}
      >
        👋 Olá, {profile?.name ?? "Líder"}
      </Text>

      <ActionList>
        <ActionListItem
          icon="📋"
          title="Escalas"
          description="Gerar e gerenciar escalas"
          onPress={() =>
            router.push("/(protected)/(leader)/schedule")
          }
        />

        <ActionListItem
          icon="👥"
          title="Pessoas"
          description="Gerenciar membros do ministério"
          onPress={() =>
            router.push("/(protected)/(leader)/people")
          }
        />

        <ActionListItem
          icon="📆"
          title="Calendário"
          description="Cultos e escalas do mês"
          onPress={() =>
            router.push("/(protected)/(leader)/calendar")
          }
        />
      </ActionList>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
});
