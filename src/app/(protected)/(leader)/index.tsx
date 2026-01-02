import { Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";

export default function LeaderHome() {
  const { theme } = useTheme();

  return (
    <AppScreen>
      <AppHeader title="Index" />
      <View style={styles.container}>
        <Text style={[styles.text, { color: theme.colors.text }]}>
          Leader Home funcionando ✅
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: "500",
  },
});
