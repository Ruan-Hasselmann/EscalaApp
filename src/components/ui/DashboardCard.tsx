import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  title: string;
  description?: string;
  icon?: string; // emoji (placeholder até ícones vetoriais)
  onPress?: () => void;
};

export function DashboardCard({
  title,
  description,
  icon,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const isClickable = typeof onPress === "function";

  return (
    <Pressable
      onPress={onPress}
      disabled={!isClickable}
      accessibilityRole={isClickable ? "button" : undefined}
      accessibilityLabel={title}
      accessibilityHint={description}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed && isClickable ? 0.85 : 1,
          transform:
            pressed && isClickable ? [{ scale: 0.98 }] : undefined,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          {icon && (
            <Text
              style={[
                styles.icon,
                { color: theme.colors.primary },
              ]}
            >
              {icon}
            </Text>
          )}

          <Text
            style={[
              styles.title,
              { color: theme.colors.text },
            ]}
          >
            {title}
          </Text>
        </View>

        {description && (
          <Text
            style={[
              styles.description,
              { color: theme.colors.textMuted },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
  },
  content: {
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
  },
});
