import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (profile) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
