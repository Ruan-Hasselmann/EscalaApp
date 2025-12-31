import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  title: string;
  description?: string;
  icon?: string;     // emoji por enquanto
  right?: string;    // seta, badge, etc
  onPress?: () => void;
};

export function ActionListItem({
  title,
  description,
  icon,
  right = "›",
  onPress,
}: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.left}>
        {icon && (
          <Text style={[styles.icon, { color: theme.colors.primary }]}>
            {icon}
          </Text>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.text },
            ]}
          >
            {title}
          </Text>

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
      </View>

      <Text
        style={[
          styles.right,
          { color: theme.colors.textMuted },
        ]}
      >
        {right}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    fontSize: 20,
    marginLeft: 12,
  },
});
