import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { setActiveRole } from "@/services/roles";
import type { UserRole } from "@/services/users";
import { useState } from "react";

const LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  leader: "Líder",
  member: "Membro",
};

export function RoleSwitcher() {
  const auth = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  // 🔒 Guard claro para TS + runtime
  if (!auth.user || !auth.profile) {
    return null;
  }

  // ✅ A partir daqui TS sabe que não é null
  const user = auth.user;
  const profile = auth.profile;

  async function handleSelect(role: UserRole) {
    if (role === profile.activeRole) return;

    try {
      setLoading(true);
      await setActiveRole(user.uid, role);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {profile.roles.map((role) => {
        const active = role === profile.activeRole;

        return (
          <Pressable
            key={role}
            disabled={loading}
            onPress={() => handleSelect(role)}
            style={[
              styles.item,
              {
                backgroundColor: active
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: active
                  ? theme.colors.primaryContrast
                  : theme.colors.text,
                fontWeight: active
                  ? theme.typography.weights.semibold
                  : theme.typography.weights.regular,
              }}
            >
              {LABELS[role]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
