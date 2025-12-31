import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { ActionList } from "@/components/ui/ActionList";
import { ActionListItem } from "@/components/ui/ActionListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader title="🧑‍💼 Administração" />

      <Text
        style={[
          styles.welcome,
          { color: theme.colors.text },
        ]}
      >
        👋 Olá, {profile?.name ?? "Administrador"}
      </Text>

      <ActionList>
        <ActionListItem
          icon="👥"
          title="Usuários"
          description="Gerenciar membros, líderes e admins"
          onPress={() =>
            router.push("/(protected)/(admin)/users")
          }
        />

        <ActionListItem
          icon="🛠️"
          title="Ministérios"
          description="Criar e editar ministérios"
          onPress={() =>
            router.push("/(protected)/(admin)/ministries")
          }
        />

        <ActionListItem
          icon="📅"
          title="Escalas"
          description="Visualizar e supervisionar escalas"
          onPress={() =>
            router.push("/(protected)/(admin)/schedules")
          }
        />

        <ActionListItem
          icon="📊"
          title="Visão geral"
          description="Indicadores e histórico"
          onPress={() =>
            router.push("/(protected)/(admin)/overview")
          }
        />

        <ActionListItem
          icon="⚙️"
          title="Configurações"
          description="Configurações globais do sistema"
          onPress={() =>
            router.push("/(protected)/(admin)/settings")
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
