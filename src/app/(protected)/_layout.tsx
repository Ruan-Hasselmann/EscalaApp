import { useAuth } from "@/contexts/AuthContext";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

export default function ProtectedLayout() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 🔑 Guarda o role anterior
  const lastRoleRef = useRef(profile?.activeRole);

  useEffect(() => {
    if (loading) return;

    // 🔒 Não logado
    if (!user) {
      router.replace("/login");
      return;
    }

    const role = profile?.activeRole;
    if (!role) return;

    const roleChanged = lastRoleRef.current !== role;
    lastRoleRef.current = role;

    // 1️⃣ Entrou na raiz do protected
    if (pathname === "/(protected)") {
      redirectByRole(role);
      return;
    }

    // 2️⃣ Trocou role → redireciona UMA VEZ
    if (roleChanged) {
      redirectByRole(role);
    }
  }, [loading, user, profile?.activeRole, pathname]);

  function redirectByRole(role: "admin" | "leader" | "member") {
    switch (role) {
      case "admin":
        router.replace("/(protected)/(admin)/dashboard");
        break;
      case "leader":
        router.replace("/(protected)/(leader)/dashboard");
        break;
      case "member":
      default:
        router.replace("/(protected)/(member)/dashboard");
        break;
    }
  }

  if (loading || !user) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
