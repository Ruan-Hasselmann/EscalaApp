import { useAuth } from "@/contexts/AuthContext";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function ProtectedLayout() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // 🔑 Só redireciona se estiver na raiz de (protected)
    if (pathname === "/(protected)") {
      if (profile?.activeRole === "admin") {
        router.replace("/(protected)/(admin)/dashboard");
        return;
      }

      if (profile?.activeRole === "leader") {
        router.replace("/(protected)/(leader)/dashboard");
        return;
      }

      router.replace("/(protected)/(member)/dashboard");
    }
  }, [loading, user, profile?.activeRole, pathname]);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
