import { useTheme } from "@/contexts/ThemeContext";
import { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  padded?: boolean;
  scrollable?: boolean;
};

export function AppScreen({
  children,
  padded = true,
  scrollable = true,
}: Props) {
  const { theme } = useTheme();

  const contentStyle = [
    styles.content,
    padded && { padding: theme.spacing.md },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
