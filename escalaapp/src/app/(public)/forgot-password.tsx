import { useState } from "react";
import {
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    View,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { auth } from "@/services/firebase";

export default function ForgotPasswordScreen() {
    const { theme } = useTheme();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleReset() {
        if (!email) {
            setError("Informe seu email.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await sendPasswordResetEmail(auth, email.trim());

            setSuccess(true);
        } catch (e: any) {
            setError("Não foi possível enviar o email. Verifique o endereço.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AppScreen>
            <View style={styles.container}>
                {/* HEADER */}
                <Text style={[styles.title, { color: theme.colors.text }]}>
                    🔑 Recuperar senha
                </Text>

                <Text
                    style={[styles.subtitle, { color: theme.colors.textMuted }]}
                >
                    Informe o email cadastrado para receber o link de redefinição.
                </Text>
                {!success ? (
                    <>
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
                            onPress={handleReset}
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
                                    Enviar link
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => router.replace("/login")}
                            style={{ marginTop: 16 }}
                        >
                            <Text
                                style={{
                                    color: theme.colors.textMuted,
                                    textAlign: "center",
                                }}
                            >
                                Voltar para o login
                            </Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Text
                            style={[
                                styles.text,
                                {
                                    color: theme.colors.text,
                                    fontWeight: "600",
                                    textAlign: "center",
                                },
                            ]}
                        >
                            📧 Email enviado!
                        </Text>

                        <Text
                            style={[
                                styles.text,
                                {
                                    color: theme.colors.textMuted,
                                    textAlign: "center",
                                    marginTop: 8,
                                },
                            ]}
                        >
                            Verifique sua caixa de entrada (ou spam) para redefinir sua senha.
                        </Text>

                        <Pressable
                            onPress={() => router.replace("/login")}
                            style={[
                                styles.button,
                                {
                                    backgroundColor: theme.colors.primary,
                                    marginTop: 24,
                                },
                            ]}
                        >
                            <Text
                                style={{
                                    color: theme.colors.primaryContrast,
                                    fontWeight: "600",
                                }}
                            >
                                Voltar para o login
                            </Text>
                        </Pressable>
                    </>
                )}
            </View>
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
    text: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 16,
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
