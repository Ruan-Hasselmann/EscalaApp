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

    const safeName = name.trim();
    const safeEmail = email.trim().toLowerCase();

    if (!safeName || !safeEmail || !password || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    if (!isValidEmail(safeEmail)) {
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

    let uid: string | null = null;

    try {
      setLoading(true);

      // 1️⃣ Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        safeEmail,
        password
      );

      uid = cred.user.uid;

      // 2️⃣ users
      await setDoc(doc(db, "users", uid), {
        name: safeName,
        email: safeEmail,
        roles: ["member"],
        activeRole: "member",
        active: true,
        createdAt: serverTimestamp(),
      });

      // 3️⃣ people
      await setDoc(doc(db, "people", uid), {
        name: safeName,
        email: safeEmail,
        whatsapp: phone,
        active: true,
        createdAt: serverTimestamp(),
      });

      // 4️⃣ Redirect
      router.replace("/(protected)/(member)/dashboard");
    } catch (e: any) {
      console.error(e);

      if (uid) {
        await deleteDoc(doc(db, "users", uid)).catch(() => {});
      }

      if (e?.code === "auth/email-already-in-use") {
        setError("Este email já está em uso.");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
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
            textContentType="name"
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
            textContentType="emailAddress"
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
            textContentType="telephoneNumber"
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
            textContentType="newPassword"
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
            textContentType="newPassword"
            onSubmitEditing={handleRegister}
            style={[
              styles.input,
              { borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            placeholderTextColor={theme.colors.textMuted}
          />

          {error && (
            <Text style={[styles.error, { color: theme.colors.danger }]}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            accessibilityLabel="Criar conta"
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryContrast} />
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
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
