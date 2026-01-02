import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";

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

      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = cred.user.uid;

      // users
      await setDoc(doc(db, "users", uid), {
        uid,
        name,
        email,
        roles: ["member"],
        activeRole: "member",
        active: true,
      });

      // people
      await setDoc(doc(db, "people", uid), {
        uid,
        name,
        whatsapp: phone,
        active: true,
        createdAt: Date.now(),
      });
    } catch (e: any) {
      setError("Erro ao criar conta. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <AppHeader title="📝 Criar conta" />

      <View style={styles.wrapper}>
        <TextInput
          placeholder="Nome completo"
          value={name}
          onChangeText={setName}
          style={[styles.input, { borderColor: theme.colors.border }]}
        />

        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { borderColor: theme.colors.border }]}
        />

        <TextInput
          placeholder="WhatsApp (DDD + número)"
          keyboardType="phone-pad"
          value={whatsapp}
          onChangeText={(v) => setWhatsapp(formatWhatsapp(v))}
          style={[styles.input, { borderColor: theme.colors.border }]}
        />

        <TextInput
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { borderColor: theme.colors.border }]}
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
            { backgroundColor: theme.colors.primary },
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
});
