import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";

import { listenUsers, AppUser, toggleUserActive } from "@/services/users";
import { listenMemberships, Membership } from "@/services/memberships";
import { listMinistries, Ministry } from "@/services/ministries";

import { ManagePersonModal } from "./ManagePersonModal";

/* =========================
   TYPES
========================= */

type PersonMinistry = {
  name: string;
  role: "leader" | "member";
};

type PersonRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  ministries: PersonMinistry[];
};

/* =========================
   SCREEN
========================= */

export default function AdminPeople() {
  const { theme } = useTheme();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  /* =========================
     SNAPSHOTS
  ========================= */

  useEffect(() => {
    const unsubUsers = listenUsers(setUsers);
    const unsubMemberships = listenMemberships(setMemberships);

    listMinistries().then((m) =>
      setMinistries(m.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")))
    );

    return () => {
      unsubUsers();
      unsubMemberships();
    };
  }, []);

  /* =========================
     JOIN USERS + MEMBERSHIPS
  ========================= */

  const rows = useMemo<PersonRow[]>(() => {
    return users
      .map((u) => {
        const userMemberships = memberships.filter(
          (m) => m.userId === u.id
        );

        const ministryData: PersonMinistry[] = userMemberships
          .map((m) => {
            const ministry = ministries.find(
              (min) => min.id === m.ministryId
            );

            if (!ministry) return null;

            return {
              name: ministry.name,
              role: m.role,
            };
          })
          .filter(Boolean) as PersonMinistry[];

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          active: u.active,
          ministries: ministryData,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [users, memberships, ministries]);

  /* =========================
     ACTIONS
  ========================= */

  async function handleToggleActive(user: AppUser) {
    await toggleUserActive(user.id, !user.active);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="👥 Pessoas" />

      <View style={styles.wrapper}>
        {rows.map((p) => {
          const user = users.find((u) => u.id === p.id)!;

          return (
            <View
              key={p.id}
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
                  }}
                >
                  {p.name}
                </Text>

                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  {p.email}
                </Text>

                {/* MINISTÉRIOS */}
                {p.ministries.length === 0 ? (
                  <Text
                    style={{
                      color: theme.colors.danger,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    ⚠️ Sem ministério
                  </Text>
                ) : (
                  p.ministries.map((m) => (
                    <Text
                      key={m.name}
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {m.name} —{" "}
                      <Text
                        style={{
                          color:
                            m.role === "leader"
                              ? theme.colors.primary
                              : theme.colors.textMuted,
                          fontWeight: m.role === "leader" ? "700" : "400",
                        }}
                      >
                        {m.role === "leader" ? "Líder ⭐" : "Membro"}
                      </Text>
                    </Text>
                  ))
                )}
              </View>

              {/* ACTIONS */}
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                {/* ATIVO / INATIVO */}
                <Pressable
                  onPress={() => handleToggleActive(user)}
                  style={[
                    styles.badge,
                    {
                      backgroundColor: p.active
                        ? theme.colors.success
                        : theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: p.active
                        ? theme.colors.primaryContrast
                        : theme.colors.textMuted,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </Text>
                </Pressable>

                {/* GERENCIAR */}
                <Pressable
                  onPress={() => setSelectedUser(user)}
                  style={[
                    styles.badge,
                    {
                      paddingHorizontal: 14,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Gerenciar
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* MODAL */}
      <ManagePersonModal
        visible={!!selectedUser}
        user={selectedUser}
        ministries={ministries}
        memberships={memberships}
        onClose={() => setSelectedUser(null)}
      />
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
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
