import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SystemRole } from "@/types/user";

type Props = {
  title: string;
  back?: boolean;
};

export function AppHeader({ title, back }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { profile, logout, setActiveRole } = useAuth();

  const [open, setOpen] = useState(false);

  /* =========================
     FECHA MENU EM MUDANÇA DE ROTA
  ========================= */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!profile) return null;

  const allowedRoles = useMemo(() => {
    if (profile.roles.includes("admin")) {
      return ["admin", "leader", "member"] as const;
    }

    if (profile.roles.includes("leader")) {
      return ["leader", "member"] as const;
    }

    return ["member"] as const;
  }, [profile.roles]);

  async function handleChangeRole(role: SystemRole) {
    setOpen(false);
    await setActiveRole(role);
  }

  return (
    <>
      {/* OVERLAY PARA FECHAR MENU */}
      {open && (
        <Pressable
          style={styles.overlay}
          onPress={() => setOpen(false)}
        />
      )}

      <View
        accessibilityRole="header"
        style={[
          styles.container,
          {
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {/* BACK */}
        {back ? (
          <Pressable
            onPress={() => router.replace("/")}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.colors.text, fontSize: 18 }}>
              ◀
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}

        {/* TITLE */}
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>

        {/* USER MENU */}
        <View style={{ position: "relative" }}>
          <Pressable
            onPress={() => setOpen((v) => !v)}
            accessibilityRole="button"
            style={[
              styles.avatar,
              { borderColor: theme.colors.border },
            ]}
          >
            <Text style={{ color: theme.colors.text }}>👤</Text>
          </Pressable>

          {open && (
            <View
              accessibilityRole="menu"
              style={[
                styles.menu,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {allowedRoles.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => handleChangeRole(role)}
                  accessibilityRole="menuitem"
                  style={styles.menuItem}
                >
                  <Text
                    style={{
                      color:
                        profile.activeRole === role
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontWeight:
                        profile.activeRole === role
                          ? "700"
                          : "400",
                    }}
                  >
                    {role === "admin"
                      ? "Admin"
                      : role === "leader"
                        ? "Líder"
                        : "Membro"}
                  </Text>
                </Pressable>
              ))}

              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.border,
                  marginVertical: 6,
                }}
              />

              <Pressable
                onPress={() => {
                  setOpen(false);
                  logout();
                }}
                accessibilityRole="menuitem"
                style={styles.menuItem}
              >
                <Text style={{ color: theme.colors.danger }}>
                  Sair
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },

  avatar: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  menu: {
    position: "absolute",
    top: 44,
    right: 0,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 12,

    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },

  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
