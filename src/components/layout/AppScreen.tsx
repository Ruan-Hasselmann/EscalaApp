import { useTheme } from "@/contexts/ThemeContext";
import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


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
        <ScrollView
          showsVerticalScrollIndicator={false} // Esconde a barra vertical
          showsHorizontalScrollIndicator={false} // Esconde a barra horizontal (se houver)
          style={{ flex: 1 }}>
          {children}
        </ScrollView>
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
