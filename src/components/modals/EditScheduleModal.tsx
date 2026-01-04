import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
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
  serviceDate: string; // YYYY-MM-DD

  members: EditableMember[];
  selectedPersonId: string | null;

  onSelect: (personId: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

/* =========================
   HELPERS
========================= */

function firstNameSafe(name: string) {
  if (!name) return "Membro";
  return name.trim().split(" ")[0];
}

function formatDatePtBr(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

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

  if (!visible) return null;

  const orderedMembers = [...members].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  );

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
              textTransform: "capitalize",
            }}
          >
            {serviceLabel} • {formatDatePtBr(serviceDate)}
          </Text>

          {/* LIST */}
          {orderedMembers.length === 0 ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                textAlign: "center",
                marginVertical: 20,
              }}
            >
              ⚠️ Nenhum membro disponível para este culto.
            </Text>
          ) : (
            <ScrollView
              style={{ maxHeight: 260 }}
              showsVerticalScrollIndicator={false}
            >
              {orderedMembers.map((m) => {
                const active = m.id === selectedPersonId;

                return (
                  <Pressable
                    key={m.id}
                    onPress={() => onSelect(m.id)}
                    style={[
                      styles.row,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.background,
                        borderColor: active
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: active
                            ? theme.colors.primaryContrast
                            : theme.colors.text,
                          fontWeight: "600",
                        }}
                      >
                        {firstNameSafe(m.name)}
                      </Text>

                      <Text
                        style={{
                          color: active
                            ? theme.colors.primaryContrast
                            : theme.colors.textMuted,
                          fontSize: 12,
                        }}
                      >
                        {m.status === "confirmed"
                          ? "Disponível"
                          : "Disponibilidade pendente"}
                      </Text>
                    </View>

                    {active && (
                      <Text
                        style={{
                          color: theme.colors.primaryContrast,
                          fontWeight: "700",
                        }}
                      >
                        ✔
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

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
                Salvar alteração
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
