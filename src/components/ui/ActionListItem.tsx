import { Pressable, StyleSheet, Text, View } from "react-native";
import { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;   // aceita ícone, emoji ou componente
  right?: ReactNode;  // seta, badge, ícone, etc.
  onPress?: () => void;
};

export function ActionListItem({
  title,
  description,
  icon,
  right = "›", // indicador padrão de navegação
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
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          opacity: pressed && isClickable ? 0.85 : 1,
          transform:
            pressed && isClickable ? [{ scale: 0.98 }] : [],
        },
      ]}
    >
      <View style={styles.left}>
        {icon && (
          <View style={styles.icon}>
            {typeof icon === "string" ? (
              <Text
                style={[
                  styles.iconText,
                  { color: theme.colors.primary },
                ]}
              >
                {icon}
              </Text>
            ) : (
              icon
            )}
          </View>
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

      {right && (
        <View style={styles.right}>
          {typeof right === "string" ? (
            <Text
              style={[
                styles.rightText,
                { color: theme.colors.textMuted },
              ]}
            >
              {right}
            </Text>
          ) : (
            right
          )}
        </View>
      )}
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
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
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
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rightText: {
    fontSize: 20,
  },
});
