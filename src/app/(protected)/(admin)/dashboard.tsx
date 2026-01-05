import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

  const iconColor = theme.colors.primary;
  const iconSize = 22;

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
          title="Escalas Publicadas (teste)"
          description="Abrir tela de escalas publicadas"
          onPress={() => router.push("/schedule/consolidate")}
        />
        <ActionListItem
          icon={
            <Ionicons
              name="school-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Ministérios"
          description="Criar e editar ministérios"
          onPress={() =>
            router.push("/ministries/ministries")
          }
        />
        <ActionListItem
          icon={
            <Ionicons
              name="people-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Pessoas"
          description="Gerenciar membros, líderes e admins"
          onPress={() =>
            router.push("/people")
          }
        />
        <ActionListItem
          icon={
            <Ionicons
              name="calendar-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Cultos"
          description="Cadastrar cultos"
          onPress={() => router.push("/service-days")}
        />
        <ActionListItem
          icon={
            <Ionicons
              name="time-outline"
              size={iconSize}
              color={iconColor}
            />
          }
          title="Disponibilidade"
          description="Janela de Disponibilidade"
          onPress={() => router.push("/availability")}
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
