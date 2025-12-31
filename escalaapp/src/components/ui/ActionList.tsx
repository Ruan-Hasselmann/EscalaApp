import { StyleSheet, View } from "react-native";

export function ActionList({ children }: { children: React.ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
});
