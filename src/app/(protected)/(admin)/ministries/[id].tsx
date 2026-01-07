import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";

import {
  listenMembershipsByMinistry,
  Membership,
} from "@/services/memberships";
import { getPersonById, Person } from "@/services/people";

/* =========================
   TYPES
========================= */

type MinistryMember = {
  membershipId: string;
  personId: string;
  name: string;
  email: string;
  whatsapp?: string;
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

    let cancelled = false;
    setLoading(true);

    const unsub = listenMembershipsByMinistry(
      id,
      async (list: Membership[]) => {
        try {
          const people = await Promise.all(
            list.map((m) => getPersonById(m.userId))
          );

          if (cancelled) return;

          const resolved: MinistryMember[] = list
            .map((m, index) => {
              const person = people[index];
              if (!person) return null;

              return {
                membershipId: m.id,
                personId: person.id,
                name: person.name,
                email: person.email,
                whatsapp: person.whatsapp,
                role: m.role,
              };
            })
            .filter(Boolean) as MinistryMember[];

          resolved.sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR")
          );

          setMembers(resolved);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  /* =========================
     HELPERS
  ========================= */

  function openWhatsApp(phone?: string) {
    if (!phone) return;

    const clean = phone.replace(/\D/g, "");
    if (!clean) return;

    Linking.openURL(`https://wa.me/${clean}`);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="👥 Pessoas do ministério" back />

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
            {/* INFO */}
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

              {m.whatsapp && (
                <Pressable onPress={() => openWhatsApp(m.whatsapp)}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    📱 {m.whatsapp}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* ROLE */}
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
                  fontWeight: "700",
                }}
              >
                {m.role === "leader" ? "Líder ⭐" : "Membro"}
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
