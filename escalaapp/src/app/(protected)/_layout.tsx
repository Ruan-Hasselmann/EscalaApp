import { Stack, Redirect, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedLayout() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();

  // Enquanto carrega auth + profile
  if (loading) return null;

  // Não logado → login
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Ainda sem profile
  if (!profile) return null;

  // segments exemplo:
  // ['(protected)', '(admin)', 'index']
  const [, area] = segments as string[];

  const roles = profile.roles;

  // ADMIN
  if (area === "(admin)" && !roles.includes("admin")) {
    return <Redirect href="/home" />;
  }

  // LEADER
  if (area === "(leader)" && !roles.includes("leader")) {
    return <Redirect href="/home" />;
  }

  // MEMBER
  if (area === "(member)" && !roles.includes("member")) {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
