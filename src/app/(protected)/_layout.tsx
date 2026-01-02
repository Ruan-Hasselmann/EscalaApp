
import { useAuth } from "@/contexts/AuthContext";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function ProtectedLayout() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (profile?.activeRole === "admin") {
      router.replace("/(protected)/(admin)/dashboard");
      return;
    }

    if (profile?.activeRole === "leader") {
      router.replace("/(protected)/(leader)/dashboard");
      return;
    }

    router.replace("/(protected)/(member)/dashboard");
  }, [loading, profile?.activeRole]);

  // 🔒 Enquanto decide rota, não renderiza nada
  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}