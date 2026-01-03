import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

/* =========================
   TYPES
========================= */

export type EditableMember = {
  id: string;
  name: string;
  status: "confirmed" | "pending";
};

type Props = {
  visible: boolean;
  ministryName: string;
  serviceLabel: string;
  serviceDate: string;

  members: EditableMember[];
  selectedPersonId: string | null;

  onSelect: (personId: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

/* =========================
   COMPONENT
========================= */

export function EditScheduleModal({
  visible,
  ministryName,
  serviceLabel,
  serviceDate,
  members,
  selectedPersonId,
  onSelect,
  onCancel,
  onSave,
}: Props) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* HEADER */}
          <Text
            style={[
              styles.title,
              { color: theme.colors.text },
            ]}
          >
            Trocar pessoa — {ministryName}
          </Text>

          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {serviceLabel} • {serviceDate}
          </Text>

          {/* MEMBERS */}
          <View style={styles.chipRow}>
            {members.map((m) => {
              const active = m.id === selectedPersonId;

              return (
                <Pressable
                  key={m.id}
                  onPress={() => onSelect(m.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: active
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active
                        ? theme.colors.primaryContrast
                        : theme.colors.text,
                      fontWeight: "600",
                    }}
                  >
                    {m.name.split(" ")[0]}
                    {m.status === "pending" ? " ⚠️" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable onPress={onCancel}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontWeight: "600",
                }}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              disabled={!selectedPersonId}
            >
              <Text
                style={{
                  color: selectedPersonId
                    ? theme.colors.primary
                    : theme.colors.textMuted,
                  fontWeight: "700",
                }}
              >
                Salvar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
