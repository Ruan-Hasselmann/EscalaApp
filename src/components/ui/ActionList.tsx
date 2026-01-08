import { StyleSheet, View } from "react-native";
import { ReactNode } from "react";

/**
 * Wrapper visual para listas de ações
 * Responsável apenas por espaçamento entre itens
 */
export function ActionList({ children }: { children: ReactNode }) {
  return (
    <View style={styles.list} accessibilityRole="list">
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
});
