import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError("Informe email e senha.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email.trim(), password);
      // redirect automático pelo guard (_layout)
    } catch (err: any) {
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text },
          ]}
        >
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
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
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
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
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
                fontWeight: theme.typography.weights.semibold,
              }}
            >
              Entrar
            </Text>
          )}
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
});
