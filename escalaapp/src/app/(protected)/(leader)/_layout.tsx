import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function LeaderLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile?.roles.includes("leader")) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
