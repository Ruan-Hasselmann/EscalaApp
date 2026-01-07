import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // 🔒 Usuário logado não acessa rotas públicas
  if (user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
