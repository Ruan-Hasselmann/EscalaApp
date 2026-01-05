import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

type Props = {
  title: string;
  back?: boolean;
};

export function AppHeader({ title, back }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { profile, logout, setActiveRole } = useAuth();

  const [open, setOpen] = useState(false);

  /* =========================
     FECHA MENU EM MUDANÇA DE ROTA
  ========================= */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!profile) return null;
  const currentProfile = profile;

  function allowedRoles() {
    if (currentProfile.roles.includes("admin")) {
      return ["admin", "leader", "member"] as const;
    }

    if (currentProfile.roles.includes("leader")) {
      return ["leader", "member"] as const;
    }

    return ["member"] as const;
  }

  async function handleChangeRole(role: typeof currentProfile.activeRole) {
    setOpen(false); // 👈 fecha imediatamente
    await setActiveRole(role);
  }

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: theme.colors.border },
      ]}
    >
      {/* BACK */}
      {back ? (
        <Pressable onPress={() => router.back()}>
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
          style={[
            styles.avatar,
            { borderColor: theme.colors.border },
          ]}
        >
          <Text style={{ color: theme.colors.text }}>👤</Text>
        </Pressable>

        {open && (
          <View
            pointerEvents="auto"
            style={[
              styles.menu,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {allowedRoles().map((role) => (
              <Pressable
                key={role}
                onPress={() => handleChangeRole(role)}
                style={styles.menuItem}
              >
                <Text
                  style={{
                    color:
                      profile.activeRole === role
                        ? theme.colors.primary
                        : theme.colors.text,
                    fontWeight:
                      profile.activeRole === role ? "700" : "400",
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
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10, // 👈 importante
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

    zIndex: 9999, // 👈 web
    elevation: 20, // 👈 android
    shadowColor: "#000", // 👈 ios
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },

  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
