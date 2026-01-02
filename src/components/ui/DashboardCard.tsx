import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  title: string;
  description?: string;
  icon?: string; // emoji por enquanto
  onPress?: () => void;
};

export function DashboardCard({
  title,
  description,
  icon,
  onPress,
}: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        {icon && (
          <Text style={[styles.icon, { color: theme.colors.primary }]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
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
    marginTop: 6,
  },
});
