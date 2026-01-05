import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { ActionList } from "@/components/ui/ActionList";
import { ActionListItem } from "@/components/ui/ActionListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function LeaderDashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const iconColor = theme.colors.primary;
  const iconSize = 22;

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
          icon={
            <Ionicons
              name="documents-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Escala geral"
          description="Abrir tela de escalas publicadas"
          onPress={() => router.push("/schedule/consolidate")}
        />
        <ActionListItem
          icon={
            <Ionicons
              name="construct-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Gerar escala"
          description="Gerenciar escalas"
          onPress={() => router.push("/schedule/generate")}
        />

        <ActionListItem
          icon={
            <Ionicons
              name="documents-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Escalas ministério"
          description="Escalas publicadas do ministério"
          onPress={() => router.push("/schedule/published")}
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
