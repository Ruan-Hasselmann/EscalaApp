import { Pressable, Text, View } from "react-native";
import { AppScreen } from "@/components/layout/AppScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function GenerateSchedule() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  if (!profile) return null;
  const userProfile = profile; // ✅ seguro

  async function handleGenerate() {
    await addDoc(collection(db, "schedules"), {
      month: 11,
      year: 2025,
      status: "draft",
      createdBy: userProfile.uid,
      createdAt: serverTimestamp(),
    });

    router.replace("/(protected)/(leader)/schedules");
  }

  return (
    <AppScreen>
      <View style={{ gap: 24 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.colors.text,
          }}
        >
          🧠 Gerar escala
        </Text>

        <Text style={{ color: theme.colors.textMuted }}>
          Isso criará uma escala em rascunho para este mês.
        </Text>

        <Pressable
          onPress={handleGenerate}
          style={{
            backgroundColor: theme.colors.primary,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: theme.colors.primaryContrast,
              fontWeight: "600",
            }}
          >
            ⚙️ Gerar agora
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
