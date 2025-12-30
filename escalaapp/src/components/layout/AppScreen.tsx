import { useTheme } from "@/contexts/ThemeContext";
import { ReactNode } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";


type Props = {
  children: ReactNode;
  padded?: boolean;
};

export function AppScreen({ children, padded = true }: Props) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[
          styles.container,
          padded && { padding: theme.spacing.md },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
