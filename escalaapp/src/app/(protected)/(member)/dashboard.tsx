import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { ActionList } from "@/components/ui/ActionList";
import { ActionListItem } from "@/components/ui/ActionListItem";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function MemberDashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader title="🙋‍♂️ Área do Membro" />

      <Text
        style={[
          styles.welcome,
          { color: theme.colors.text },
        ]}
      >
        👋 Olá, {profile?.name ?? "Membro"}
      </Text>

      <ActionList>
        <ActionListItem
          icon="📅"
          title="Minhas escalas"
          description="Veja quando você está escalado"
          onPress={() =>
            router.push("/(protected)/(member)/schedules")
          }
        />

        <ActionListItem
          icon="✅"
          title="Confirmar presença"
          description="Confirme ou recuse escalas futuras"
          onPress={() =>
            router.push("/(protected)/(member)/confirmations")
          }
        />

        <ActionListItem
          icon="⛪"
          title="Próximos cultos"
          description="Agenda dos próximos cultos"
          onPress={() =>
            router.push("/(protected)/(member)/calendar")
          }
        />

        <ActionListItem
          icon="👤"
          title="Meu perfil"
          description="Dados pessoais e preferências"
          onPress={() =>
            router.push("/(protected)/(member)/profile")
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
