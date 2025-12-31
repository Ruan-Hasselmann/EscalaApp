import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!profile) return null;

  if (profile.activeRole.includes("admin")) {
    return <Redirect href="/(protected)/(admin)/dashboard" />;
  }

  if (profile.activeRole.includes("leader")) {
    return <Redirect href="/(protected)/(leader)/dashboard" />;
  }

  if (profile.activeRole.includes("member")) {
    return <Redirect href="/(protected)/(member)/dashboard" />;
  }
}
