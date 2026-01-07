import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme } from "@/contexts/ThemeContext";
import {
  ServiceDay,
  ServiceTurn,
  ServiceTurnType,
  upsertServiceDay,
  removeServiceFromDay,
  deleteServiceDay,
} from "@/services/serviceDays";

/* =========================
   TYPES
========================= */

type Props = {
  visible: boolean;
  date: Date | null;
  dayData: ServiceDay | null;
  onClose: () => void;
};

const TURN_OPTIONS = ["Manhã", "Tarde", "Noite"] as const;

/* =========================
   HELPERS
========================= */

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDatePtBr(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/* =========================
   COMPONENT
========================= */

export function ServiceDayModal({
  visible,
  date,
  dayData,
  onClose,
}: Props) {
  const { theme } = useTheme();

  const [turn, setTurn] =
    useState<(typeof TURN_OPTIONS)[number]>("Manhã");
  const [type, setType] =
    useState<ServiceTurnType>("regular");
  const [label, setLabel] = useState("");

  const [busy, setBusy] = useState(false);
  const [confirmRemoveDay, setConfirmRemoveDay] =
    useState(false);
  const [confirmRemoveService, setConfirmRemoveService] =
    useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTurn("Manhã");
      setType("regular");
      setLabel("");
      setBusy(false);
      setConfirmRemoveDay(false);
      setConfirmRemoveService(null);
    }
  }, [visible]);

  if (!date) return null;

  const dateKey = toDateKey(date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // ✅ CORREÇÃO: 1–12
  const day = date.getDate();

  /* =========================
     ACTIONS
  ========================= */

  async function addService() {
    if (busy) return;
    if (type === "special" && !label.trim()) return;

    try {
      setBusy(true);

      const service: ServiceTurn = {
        id: crypto.randomUUID(), // ✅ ID seguro
        label:
          type === "special"
            ? label.trim()
            : `Culto ${turn}`,
        type,
      };

      await upsertServiceDay({
        dateKey,
        year,
        month,
        day,
        service,
      });

      setLabel("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveService(serviceId: string) {
    if (busy) return;

    try {
      setBusy(true);
      await removeServiceFromDay(dateKey, serviceId);
      setConfirmRemoveService(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveDay() {
    if (busy) return;

    try {
      setBusy(true);
      await deleteServiceDay(dateKey);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <Modal visible={visible} transparent animationType="slide">
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
            📅 {formatDatePtBr(date)}
          </Text>

          {/* TURNO */}
          <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>
            Turno
          </Text>

          <View style={styles.row}>
            {TURN_OPTIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTurn(t)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      turn === t
                        ? theme.colors.primary
                        : theme.colors.background,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      turn === t
                        ? theme.colors.primaryContrast
                        : theme.colors.text,
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* TIPO */}
          <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>
            Tipo de culto
          </Text>

          <View style={styles.row}>
            {(["regular", "special"] as ServiceTurnType[]).map(
              (t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        type === t
                          ? theme.colors.primary
                          : theme.colors.background,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        type === t
                          ? theme.colors.primaryContrast
                          : theme.colors.text,
                    }}
                  >
                    {t === "regular"
                      ? "Regular"
                      : "Especial"}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* LABEL ESPECIAL */}
          {type === "special" && (
            <TextInput
              placeholder="Nome do culto especial"
              placeholderTextColor={theme.colors.textMuted}
              value={label}
              onChangeText={setLabel}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
            />
          )}

          {/* ADD */}
          <Pressable
            onPress={addService}
            disabled={
              busy ||
              (type === "special" && !label.trim())
            }
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                opacity:
                  busy ||
                  (type === "special" && !label.trim())
                    ? 0.6
                    : 1,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.primaryContrast,
                fontWeight: "600",
              }}
            >
              ➕ Adicionar culto
            </Text>
          </Pressable>

          {/* LISTA */}
          {dayData?.services?.length ? (
            <View style={styles.list}>
              {dayData.services.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.serviceRow,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <View>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: "600",
                      }}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.colors.textMuted,
                      }}
                    >
                      {s.type === "special"
                        ? "Culto especial"
                        : "Culto regular"}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      setConfirmRemoveService(s.id)
                    }
                  >
                    <Text
                      style={{
                        color: theme.colors.danger,
                        fontSize: 16,
                      }}
                    >
                      🗑
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text
              style={{
                color: theme.colors.textMuted,
                marginTop: 12,
              }}
            >
              Nenhum culto neste dia
            </Text>
          )}

          {/* REMOVER DIA */}
          {dayData && (
            <Pressable
              onPress={() => setConfirmRemoveDay(true)}
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.danger,
                  marginTop: 16,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.primaryContrast,
                  fontWeight: "600",
                }}
              >
                🗑 Remover dia inteiro
              </Text>
            </Pressable>
          )}

          {/* FECHAR */}
          <Pressable
            onPress={onClose}
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.background,
                marginTop: 12,
              },
            ]}
          >
            <Text style={{ color: theme.colors.textMuted }}>
              Fechar
            </Text>
          </Pressable>

          {/* CONFIRMAÇÕES */}
          {confirmRemoveService && (
            <Pressable
              onPress={() =>
                handleRemoveService(confirmRemoveService)
              }
              style={[
                styles.confirm,
                { backgroundColor: theme.colors.danger },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.primaryContrast,
                  fontWeight: "600",
                }}
              >
                Confirmar remoção do culto
              </Text>
            </Pressable>
          )}

          {confirmRemoveDay && (
            <Pressable
              onPress={handleRemoveDay}
              style={[
                styles.confirm,
                { backgroundColor: theme.colors.danger },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.primaryContrast,
                  fontWeight: "600",
                }}
              >
                Confirmar remoção do dia inteiro
              </Text>
            </Pressable>
          )}
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    borderRadius: 20,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  list: {
    marginTop: 16,
    gap: 8,
  },
  serviceRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirm: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
});
