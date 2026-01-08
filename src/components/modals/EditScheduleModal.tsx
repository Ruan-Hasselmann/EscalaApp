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

  // 🔒 controle de regra
  disabled?: boolean;

  // ⚠️ flags explicativas (não soberanas)
  flags?: {
    message: string;
  }[];
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
   HELPERS
========================= */

function sortMembers(members: EditableMember[]) {
  return [...members].sort((a, b) => {
    const aDisabled = a.disabled === true;
    const bDisabled = b.disabled === true;

    // 1️⃣ Disponíveis primeiro
    if (aDisabled !== bDisabled) {
      return aDisabled ? 1 : -1;
    }

    // 2️⃣ Ordem alfabética (primeiro nome)
    const nameA = a.name.trim().split(" ")[0].toLowerCase();
    const nameB = b.name.trim().split(" ")[0].toLowerCase();

    return nameA.localeCompare(nameB);
  });
}

function firstName(name: string) {
  return name.trim().split(" ")[0];
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
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* HEADER */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Trocar pessoa — {ministryName}
          </Text>

          <Text style={styles.subtitle}>
            {serviceLabel} • {formatDatePtBr(serviceDate)}
          </Text>

          {/* LISTA */}
          <ScrollView style={{ maxHeight: 280 }}>
            {sortMembers(members).map((m) => {
              const active = m.id === selectedPersonId;

              return (
                <Pressable
                  key={m.id}
                  disabled={m.disabled}
                  onPress={() => !m.disabled && onSelect(m.id)}
                  style={[
                    styles.row,
                    {
                      opacity: m.disabled ? 0.45 : 1,
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

                    {/* FLAGS VISÍVEIS */}
                    {m.flags?.map((f, i) => (
                      <Text
                        key={i}
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          color: theme.colors.warning,
                        }}
                      >
                        ⚠ {f.message}
                      </Text>
                    ))}
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

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable onPress={onCancel}>
              <Text style={{ color: theme.colors.textMuted }}>
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
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: "#888",
    textTransform: "capitalize",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
