import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

/* =========================
   TYPES
========================= */

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/* =========================
   COMPONENT
========================= */

export function ConfirmActionModal({
  visible,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityViewIsModal
    >
      {/* OVERLAY */}
      <Pressable
        style={styles.overlay}
        onPress={onCancel}
        accessibilityRole="button"
      >
        {/* MODAL */}
        <Pressable
          onPress={() => {}}
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          accessibilityRole="alert"
        >
          {/* TITLE */}
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 17,
              fontWeight: "700",
            }}
          >
            {title}
          </Text>

          {/* DESCRIPTION */}
          {description && (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 14,
                marginTop: 6,
              }}
            >
              {description}
            </Text>
          )}

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.button,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{ color: theme.colors.textMuted }}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityHint={description}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: danger
                    ? theme.colors.danger
                    : theme.colors.primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.primaryContrast,
                  fontWeight: "600",
                }}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
