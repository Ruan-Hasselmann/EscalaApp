import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { profile, loading } = useAuth();

  console.log("INDEX", { loading, profile });

  if (loading) return null;

  if (!profile) {
    return <Redirect href="/login" />;
  }

  switch (profile.activeRole) {
    case "admin":
      return <Redirect href="/(admin)/" />;
    case "leader":
      return <Redirect href="/(leader)/" />;
    default:
      return <Redirect href="/(member)/" />;
  }
}
