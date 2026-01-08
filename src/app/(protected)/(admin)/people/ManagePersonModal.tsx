import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/contexts/ThemeContext";
import {
  addUserRole,
  AppUser,
  removeUserRole,
  toggleAdminRole,
  toggleUserActive,
} from "@/services/users";
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

  const [isAdminLocal, setIsAdminLocal] = useState(false);
  const [isActiveLocal, setIsActiveLocal] = useState(true);
  const [saving, setSaving] = useState<null | "admin" | "active" | "membership">(null);

  /* =========================
     SYNC LOCAL STATE
  ========================= */

  useEffect(() => {
    if (!visible || !user) return;

    setIsAdminLocal(user.roles?.includes("admin") ?? false);
    setIsActiveLocal(!!user.active);
    setSaving(null);
  }, [visible, user?.id]);

  /* =========================
     DERIVED DATA
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
     GUARD
  ========================= */

  if (!visible || !user) return null;

  const currentUser = user;

  /* =========================
     HELPERS
  ========================= */

  function hasOtherLeaderMembership(exceptMinistryId?: string) {
    return userMemberships.some(
      (m) =>
        m.role === "leader" &&
        m.active &&
        m.ministryId !== exceptMinistryId
    );
  }

  /* =========================
     ACTIONS
  ========================= */

  async function handleToggleActive() {
    if (saving) return;
    if (currentUser.roles.includes("admin")) return; // 🔒 admin não se desativa

    const next = !isActiveLocal;
    setIsActiveLocal(next);
    setSaving("active");

    try {
      await toggleUserActive(currentUser.id, next);
    } catch {
      setIsActiveLocal(!next);
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleAdmin() {
    if (saving) return;

    const next = !isAdminLocal;
    setIsAdminLocal(next);
    setSaving("admin");

    try {
      await toggleAdminRole(currentUser.id, next);
    } catch {
      setIsAdminLocal(!next);
    } finally {
      setSaving(null);
    }
  }

  async function handleAdd(ministryId: string) {
    if (saving) return;

    setSaving("membership");
    try {
      await upsertMembership(currentUser.id, ministryId, "member");
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(ministryId: string) {
    if (saving) return;

    const m = membershipByMinistry[ministryId];
    if (!m) return;

    setSaving("membership");
    try {
      await removeMembership(m.id);

      if (m.role === "leader" && !hasOtherLeaderMembership(ministryId)) {
        await removeUserRole(currentUser.id, "leader");
      }
    } finally {
      setSaving(null);
    }
  }

  async function handleChangeRole(
    ministryId: string,
    role: "member" | "leader"
  ) {
    if (saving) return;

    const m = membershipByMinistry[ministryId];
    if (!m) return;

    setSaving("membership");
    try {
      await updateMembershipRole(m.id, role);

      if (role === "leader") {
        await addUserRole(currentUser.id, "leader");
      } else if (!hasOtherLeaderMembership(ministryId)) {
        await removeUserRole(currentUser.id, "leader");
      }
    } finally {
      setSaving(null);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {currentUser.name}
          </Text>

          <Text style={[styles.email, { color: theme.colors.textMuted }]}>
            {currentUser.email}
          </Text>

          {/* ACTIVE */}
          <Pressable
            onPress={handleToggleActive}
            disabled={saving !== null || currentUser.roles.includes("admin")}
            style={[
              styles.activeBtn,
              {
                backgroundColor: isActiveLocal
                  ? theme.colors.success
                  : theme.colors.background,
                borderColor: theme.colors.border,
                opacity:
                  saving !== null || currentUser.roles.includes("admin")
                    ? 0.5
                    : 1,
              },
            ]}
          >
            <Text
              style={{
                color: isActiveLocal
                  ? theme.colors.primaryContrast
                  : theme.colors.textMuted,
                fontWeight: "600",
              }}
            >
              {isActiveLocal ? "Ativo" : "Inativo"}
            </Text>
          </Pressable>

          {/* ADMIN */}
          <Text style={[styles.section, { color: theme.colors.textMuted }]}>
            Acesso Administrativo
          </Text>

          <Pressable
            onPress={handleToggleAdmin}
            disabled={saving !== null}
            style={[
              styles.adminBtn,
              {
                backgroundColor: isAdminLocal
                  ? theme.colors.primary
                  : theme.colors.background,
                borderColor: theme.colors.border,
                opacity: saving !== null ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: isAdminLocal
                  ? theme.colors.primaryContrast
                  : theme.colors.text,
                fontWeight: "600",
              }}
            >
              {isAdminLocal ? "Administrador ⭐" : "Tornar administrador"}
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
                style={[styles.row, { borderColor: theme.colors.border }]}
              >
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                  {min.name}
                </Text>

                {!m ? (
                  <Pressable
                    disabled={saving !== null}
                    onPress={() => handleAdd(min.id)}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "600",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      Adicionar
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      disabled={saving !== null}
                      onPress={() =>
                        handleChangeRole(
                          min.id,
                          m.role === "leader" ? "member" : "leader"
                        )
                      }
                      style={[
                        styles.roleBtn,
                        {
                          backgroundColor:
                            m.role === "leader"
                              ? theme.colors.primary
                              : theme.colors.background,
                          opacity: saving ? 0.6 : 1,
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
                        {m.role === "leader" ? "Líder ⭐" : "Membro"}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={saving !== null}
                      onPress={() => handleRemove(min.id)}
                    >
                      <Text
                        style={{
                          color: theme.colors.danger,
                          fontWeight: "600",
                          opacity: saving ? 0.6 : 1,
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

          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.textMuted }}>Fechar</Text>
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
  adminBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
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
