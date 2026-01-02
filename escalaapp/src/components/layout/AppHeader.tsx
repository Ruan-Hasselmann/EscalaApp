import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
    title: string;
    back?: boolean;
};

export function AppHeader({ title, back }: Props) {
    const { theme } = useTheme();
    const router = useRouter();
    const { logout } = useAuth();

    return (
        <View
            style={[
                styles.container,
                { borderBottomColor: theme.colors.border },
            ]}
        >
            {back ? (
                <Pressable onPress={() => router.back()}>
                    <Text style={{ color: theme.colors.text, fontSize: 18 }}>
                        ◀
                    </Text>
                </Pressable>
            ) : (
                <View style={{ width: 24 }} />
            )}

            <Text
                style={{
                    color: theme.colors.text,
                    fontSize: 18,
                    fontWeight: "600",
                }}
            >
                {title}
            </Text>
            <Pressable
                onPress={() => logout}
                style={[styles.monthBtn, { borderColor: theme.colors.border }]}
            >
                <Text style={{ color: theme.colors.text }}>Sair</Text>
            </Pressable>
            <View style={{ width: 24 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    monthBtn: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
});
