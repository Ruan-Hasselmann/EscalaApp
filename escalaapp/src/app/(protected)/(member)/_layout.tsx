import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function MemberLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile?.roles.includes("member")) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
