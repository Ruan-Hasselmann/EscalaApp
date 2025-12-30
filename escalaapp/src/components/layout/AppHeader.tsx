import { useTheme } from "@/contexts/ThemeContext";
import { ReactNode } from "react";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";

type Props = {
    title: string;
    left?: ReactNode;
    right?: ReactNode;
};

export function AppHeader({ title, left, right }: Props) {
    const { theme } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.border,
                },
            ]}
        >
            <View style={styles.side}>{left}</View>

            <Text
                style={[
                    styles.title,
                    {
                        color: theme.colors.text,
                        fontSize: theme.typography.sizes.lg,
                        fontWeight: theme.typography.weights.semibold,
                    },
                ]}
                numberOfLines={1}
            >
                {title}
            </Text>

            <View style={styles.side}>{right}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop:
            Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
        height: Platform.OS === "ios" ? 56 : 52 + (StatusBar.currentHeight ?? 0),
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    title: {
        flex: 1,
        textAlign: "center",
    },
    side: {
        width: 48,
        alignItems: "center",
        justifyContent: "center",
    },
});
