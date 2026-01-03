import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";

import {
  listenMembershipsByMinistry,
  Membership,
} from "@/services/memberships";
import { getUserById, AppUser } from "@/services/users";

/* =========================
   TYPES
========================= */

type MinistryMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: "member" | "leader";
};

/* =========================
   SCREEN
========================= */

export default function AdminMinistryMembers() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [members, setMembers] = useState<MinistryMember[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     LISTENER (REALTIME)
  ========================= */

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    return listenMembershipsByMinistry(
      id,
      async (list: Membership[]) => {
        const resolved: MinistryMember[] = [];

        for (const m of list) {
          const user: AppUser | null = await getUserById(m.userId);
          if (!user) continue;

          resolved.push({
            membershipId: m.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: m.role,
          });
        }

        resolved.sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR")
        );

        setMembers(resolved);
        setLoading(false);
      }
    );
  }, [id]);

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="👥 Pessoas do ministério" />

      <View style={styles.wrapper}>
        {loading && (
          <Text style={{ color: theme.colors.textMuted }}>
            ⏳ Carregando membros...
          </Text>
        )}

        {!loading && members.length === 0 && (
          <Text style={{ color: theme.colors.textMuted }}>
            Nenhuma pessoa vinculada a este ministério.
          </Text>
        )}

        {members.map((m) => (
          <View
            key={m.membershipId}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                {m.name}
              </Text>

              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 13,
                }}
              >
                {m.email}
              </Text>
            </View>

            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor:
                    m.role === "leader"
                      ? theme.colors.primary
                      : theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    m.role === "leader"
                      ? theme.colors.primaryContrast
                      : theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {m.role === "leader" ? "Líder" : "Membro"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
