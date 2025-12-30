import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
