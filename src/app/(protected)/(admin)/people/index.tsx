import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, Linking } from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";

import { listenUsers, AppUser, toggleUserActive } from "@/services/users";
import { listenMemberships, Membership } from "@/services/memberships";
import { listMinistries, Ministry } from "@/services/ministries";
import { getPersonById, Person } from "@/services/people";

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
  whatsapp?: string;
  active: boolean;
  isAdmin: boolean;
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
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) ?? null;
  }, [selectedUserId, users]);

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
     LOAD PEOPLE (SAFE)
  ========================= */

  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      const missing = users.filter((u) => !peopleMap[u.id]);
      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (u) => {
          const person = await getPersonById(u.id);
          return person ? [u.id, person] as const : null;
        })
      );

      if (cancelled) return;

      setPeopleMap((prev) => {
        const next = { ...prev };
        entries.forEach((e) => {
          if (e) next[e[0]] = e[1];
        });
        return next;
      });
    }

    if (users.length > 0) loadPeople();

    return () => {
      cancelled = true;
    };
  }, [users, peopleMap]);

  /* =========================
     JOIN USERS + MEMBERSHIPS
  ========================= */

  const rows = useMemo<PersonRow[]>(() => {
    return users
      .map((u) => {
        const userMemberships = memberships.filter(
          (m) => m.userId === u.id && m.active
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
          whatsapp: peopleMap[u.id]?.whatsapp,
          active: u.active,
          isAdmin: u.roles.includes("admin"),
          ministries: ministryData,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [users, memberships, ministries, peopleMap]);

  /* =========================
     ACTIONS
  ========================= */

  async function handleToggleActive(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    // 🔒 Segurança: admin não pode se desativar
    if (user.roles.includes("admin")) return;

    try {
      setTogglingId(userId);
      await toggleUserActive(userId, !user.active);
    } finally {
      setTogglingId(null);
    }
  }

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
      <AppHeader title="👥 Pessoas" back />

      <View style={styles.wrapper}>
        {rows.map((p) => (
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
              <View style={styles.nameRow}>
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                  {p.name}
                </Text>

                {p.isAdmin && (
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 12,
                      color: theme.colors.primary,
                      fontWeight: "700",
                    }}
                  >
                    ⭐ Admin
                  </Text>
                )}
              </View>

              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {p.email}
              </Text>

              {p.whatsapp && (
                <Pressable onPress={() => openWhatsApp(p.whatsapp)}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    📱 {p.whatsapp}
                  </Text>
                </Pressable>
              )}

              {p.ministries.map((m) => (
                <Text
                  key={`${p.id}-${m.name}`}
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
              ))}
            </View>

            {/* ACTIONS */}
            <View style={styles.actions}>
              <Pressable
                onPress={() => handleToggleActive(p.id)}
                disabled={p.isAdmin || togglingId === p.id}
                style={[
                  styles.badge,
                  {
                    backgroundColor: p.active
                      ? theme.colors.success
                      : theme.colors.background,
                    borderColor: theme.colors.border,
                    opacity:
                      p.isAdmin || togglingId === p.id ? 0.5 : 1,
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
                  {togglingId === p.id
                    ? "Salvando..."
                    : p.active
                      ? "Ativo"
                      : "Inativo"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedUserId(p.id)}
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
        ))}
      </View>

      <ManagePersonModal
        visible={!!selectedUser}
        user={selectedUser}
        ministries={ministries}
        memberships={memberships}
        onClose={() => setSelectedUserId(null)}
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
  actions: {
    alignItems: "flex-end",
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
