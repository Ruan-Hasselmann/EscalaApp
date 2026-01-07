import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, profile, loading } = useAuth();

  // 🔄 Loading explícito (evita tela branca)
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 🔐 Não autenticado
  if (!user) {
    return <Redirect href="/login" />;
  }

  // ⚠️ Autenticado mas perfil ainda não carregado
  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="small" />
      </View>
    );
  }

  // 🎯 Redirecionamento por papel ativo
  switch (profile.activeRole) {
    case "admin":
      return <Redirect href="/(protected)/(admin)/dashboard" />;

    case "leader":
      return <Redirect href="/(protected)/(leader)/dashboard" />;

    case "member":
      return <Redirect href="/(protected)/(member)/dashboard" />;

    default:
      // 🚨 Fallback de segurança
      return <Redirect href="/login" />;
  }
}
