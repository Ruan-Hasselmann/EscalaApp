import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile?.roles.includes("admin")) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
