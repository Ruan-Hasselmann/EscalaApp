import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (loading) return;

    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Email inválido.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

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
        await deleteDoc(doc(db, "users", uid)).catch(() => {});
        throw firestoreError;
      }

      // 4️⃣ Redireciona
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* HEADER */}
            <Text style={[styles.title, { color: theme.colors.text }]}>
              📝 Criar conta
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: theme.colors.textMuted },
              ]}
            >
              Crie sua conta para acessar o sistema
            </Text>

            <TextInput
              placeholder="Nome completo"
              value={name}
              onChangeText={setName}
              editable={!loading}
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
              editable={!loading}
              returnKeyType="next"
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
              editable={!loading}
              returnKeyType="next"
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
              editable={!loading}
              returnKeyType="next"
              style={[
                styles.input,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />

            <TextInput
              placeholder="Repetir senha"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              style={[
                styles.input,
                { borderColor: theme.colors.border, color: theme.colors.text },
              ]}
              placeholderTextColor={theme.colors.textMuted}
            />

            {error && (
              <Text
                style={[styles.error, { color: theme.colors.danger }]}
              >
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
              {loading ? (
                <ActivityIndicator
                  color={theme.colors.primaryContrast}
                />
              ) : (
                <Text
                  style={{
                    color: theme.colors.primaryContrast,
                    fontWeight: "600",
                  }}
                >
                  Criar conta
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  error: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
});
