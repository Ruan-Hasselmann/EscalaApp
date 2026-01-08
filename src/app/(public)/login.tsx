import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) return;

    const safeEmail = email.trim().toLowerCase();

    if (!safeEmail || !password) {
      setError("Informe email e senha.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(safeEmail, password);
      // redirect automático pelo guard
    } catch {
      setError("Email ou senha inválidos.");
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
            🔐 Entrar
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textMuted },
            ]}
          >
            Acesse sua conta para continuar
          </Text>

          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError(null);
            }}
            placeholder="Email"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!loading}
            returnKeyType="next"
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
          />

          <TextInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            placeholder="Senha"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            textContentType="password"
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
          />

          {error && (
            <Text
              style={[
                styles.error,
                { color: theme.colors.danger },
              ]}
            >
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Entrar"
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
                  fontWeight:
                    theme.typography.weights.semibold,
                }}
              >
                Entrar
              </Text>
            )}
          </Pressable>

          <View style={styles.links}>
            <Pressable
              disabled={loading}
              onPress={() => router.push("/register")}
            >
              <Text
                style={[
                  styles.link,
                  { color: theme.colors.primary },
                ]}
              >
                Criar conta
              </Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={() =>
                router.push("/forgot-password")
              }
            >
              <Text
                style={[
                  styles.link,
                  { color: theme.colors.textMuted },
                ]}
              >
                Esqueci minha senha
              </Text>
            </Pressable>
          </View>
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  error: {
    fontSize: 14,
    textAlign: "center",
  },
  links: {
    marginTop: 16,
    gap: 12,
    alignItems: "center",
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
  },
});
