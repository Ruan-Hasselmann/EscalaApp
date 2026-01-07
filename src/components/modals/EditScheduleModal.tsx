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

function firstName(name: string) {
  return name?.trim().split(" ")[0] ?? "Membro";
}

function formatDatePtBr(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
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

  const orderedMembers = [...members].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* OVERLAY */}
      <Pressable style={styles.overlay} onPress={onCancel}>
        {/* MODAL */}
        <Pressable
          style={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => {}}
        >
          {/* HEADER */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Trocar pessoa — {ministryName}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textMuted },
            ]}
          >
            {serviceLabel} • {formatDatePtBr(serviceDate)}
          </Text>

          {/* LIST */}
          {orderedMembers.length === 0 ? (
            <Text
              style={[
                styles.empty,
                { color: theme.colors.textMuted },
              ]}
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
                        {firstName(m.name)}
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
                  opacity: selectedPersonId ? 1 : 0.6,
                }}
              >
                Salvar alteração
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
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    textTransform: "capitalize",
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
  empty: {
    textAlign: "center",
    marginVertical: 20,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
