import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "expo-router";

/* =========================
   HELPERS
========================= */

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function toE164(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return `+55${digits}`;
}

/* =========================
   SCREEN
========================= */

export default function RegisterScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);

    const phone = toE164(whatsapp);
    if (!phone) {
      setError("WhatsApp inválido. Use DDD + número.");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = cred.user.uid;

      try {
        // 2️⃣ users
        await setDoc(doc(db, "users", uid), {
          uid,
          name,
          email,
          roles: ["member"],
          activeRole: "member",
          active: true,
          createdAt: serverTimestamp(),
        });

        // 3️⃣ people
        await setDoc(doc(db, "people", uid), {
          uid,
          name,
          email,
          whatsapp: phone,
          active: true,
          createdAt: serverTimestamp(),
        });
      } catch (firestoreError) {
        // 🔥 rollback se falhar
        await deleteDoc(doc(db, "users", uid)).catch(() => { });
        throw firestoreError;
      }

      // 4️⃣ Redireciona (AuthContext assume depois)
      router.replace("/(protected)/(member)/dashboard");
    } catch (e) {
      console.error(e);
      setError("Erro ao criar conta. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.wrapper}>
        {/* HEADER */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          📝 Criar conta
        </Text>

        <Text
          style={[styles.subtitle, { color: theme.colors.textMuted }]}
        >
          Crie sua conta para ter acessoa o sistema
        </Text>
        <TextInput
          placeholder="Nome completo"
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            { borderColor: theme.colors.border, color: theme.colors.text },
          ]}
          placeholderTextColor={theme.colors.textMuted}
        />

        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={[
            styles.input,
            { borderColor: theme.colors.border, color: theme.colors.text },
          ]}
          placeholderTextColor={theme.colors.textMuted}
        />

        <TextInput
          placeholder="WhatsApp (DDD + número)"
          keyboardType="phone-pad"
          value={whatsapp}
          onChangeText={(v) => setWhatsapp(formatWhatsapp(v))}
          style={[
            styles.input,
            { borderColor: theme.colors.border, color: theme.colors.text },
          ]}
          placeholderTextColor={theme.colors.textMuted}
        />

        <TextInput
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={[
            styles.input,
            { borderColor: theme.colors.border, color: theme.colors.text },
          ]}
          placeholderTextColor={theme.colors.textMuted}
        />

        {error && (
          <Text style={{ color: theme.colors.danger, marginBottom: 8 }}>
            {error}
          </Text>
        )}

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.colors.primaryContrast }}>
            {loading ? "Criando..." : "Criar conta"}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingTop: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
});
