import { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/contexts/ThemeContext";

import { AppUser, toggleUserActive } from "@/services/users";
import {
  Membership,
  upsertMembership,
  removeMembership,
  updateMembershipRole,
} from "@/services/memberships";
import { Ministry } from "@/services/ministries";

/* =========================
   TYPES
========================= */

type Props = {
  visible: boolean;
  user: AppUser | null;
  ministries: Ministry[];
  memberships: Membership[];
  onClose: () => void;
};

/* =========================
   COMPONENT
========================= */

export function ManagePersonModal({
  visible,
  user,
  ministries,
  memberships,
  onClose,
}: Props) {
  const { theme } = useTheme();

  /* =========================
     DERIVED DATA (HOOKS SEMPRE NO TOPO)
  ========================= */

  const userMemberships = useMemo(() => {
    if (!user) return [];
    return memberships.filter((m) => m.userId === user.id);
  }, [user, memberships]);

  const membershipByMinistry = useMemo(() => {
    const map: Record<string, Membership> = {};
    userMemberships.forEach((m) => {
      map[m.ministryId] = m;
    });
    return map;
  }, [userMemberships]);

  /* =========================
     GUARD (SÓ DEPOIS DOS HOOKS)
  ========================= */

  if (!visible || !user) {
    return null;
  }

  /* =========================
     ACTIONS
  ========================= */
  const currentUser = user;

  async function handleToggleActive() {
    await toggleUserActive(currentUser.id, !currentUser.active);
  }

  async function handleAdd(ministryId: string) {
    await upsertMembership(currentUser.id, ministryId, "member");
  }

  async function handleRemove(ministryId: string) {
    const m = membershipByMinistry[ministryId];
    if (!m) return;
    await removeMembership(m.id);
  }

  async function handleChangeRole(
    ministryId: string,
    role: "member" | "leader"
  ) {
    const m = membershipByMinistry[ministryId];
    if (!m) return;
    await updateMembershipRole(m.id, role);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* HEADER */}
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {user.name}
          </Text>

          <Text style={[styles.email, { color: theme.colors.textMuted }]}>
            {user.email}
          </Text>

          {/* ACTIVE */}
          <Pressable
            onPress={handleToggleActive}
            style={[
              styles.activeBtn,
              {
                backgroundColor: user.active
                  ? theme.colors.success
                  : theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: user.active
                  ? theme.colors.primaryContrast
                  : theme.colors.textMuted,
                fontWeight: "600",
              }}
            >
              {user.active ? "Ativo" : "Inativo"}
            </Text>
          </Pressable>

          {/* MINISTRIES */}
          <Text style={[styles.section, { color: theme.colors.textMuted }]}>
            Ministérios
          </Text>

          {ministries.map((min) => {
            const m = membershipByMinistry[min.id];

            return (
              <View
                key={min.id}
                style={[
                  styles.row,
                  { borderColor: theme.colors.border },
                ]}
              >
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                  {min.name}
                </Text>

                {!m ? (
                  <Pressable onPress={() => handleAdd(min.id)}>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "600",
                      }}
                    >
                      Adicionar
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() =>
                        handleChangeRole(
                          min.id,
                          m.role === "leader"
                            ? "member"
                            : "leader"
                        )
                      }
                      style={[
                        styles.roleBtn,
                        {
                          backgroundColor:
                            m.role === "leader"
                              ? theme.colors.primary
                              : theme.colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            m.role === "leader"
                              ? theme.colors.primaryContrast
                              : theme.colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {m.role === "leader"
                          ? "Líder ⭐"
                          : "Membro"}
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => handleRemove(min.id)}>
                      <Text
                        style={{
                          color: theme.colors.danger,
                          fontWeight: "600",
                        }}
                      >
                        Remover
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* FOOTER */}
          <Pressable
            onPress={onClose}
            style={[
              styles.closeBtn,
              { borderColor: theme.colors.border },
            ]}
          >
            <Text style={{ color: theme.colors.textMuted }}>
              Fechar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    fontSize: 13,
  },
  activeBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
