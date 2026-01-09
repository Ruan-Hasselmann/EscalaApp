import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
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
import { listMinistries, Ministry } from "@/services/ministries";

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

function buildServiceId(
  dateKey: string,
  type: ServiceTurnType,
  label: string
) {
  return `${dateKey}__${type}__${label
    .toLowerCase()
    .replace(/\s+/g, "_")}`;
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
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

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

  useEffect(() => {
    async function load() {
      const items = await listMinistries();
      setMinistries(items);
    }

    if (visible) load();
  }, [visible]);

  if (!date) return null;

  const dateKey = toDateKey(date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  /* =========================
     ACTIONS
  ========================= */

  async function updateSlot(
    service: ServiceTurn,
    ministryId: string,
    delta: number
  ) {
    const current = service.ministrySlots?.[ministryId] ?? 1;
    const next = Math.max(0, Math.min(4, current + delta));

    const updated: ServiceTurn = {
      ...service,
      ministrySlots: {
        ...(service.ministrySlots ?? {}),
        [ministryId]: next,
      },
    };

    return upsertServiceDay({
      dateKey,
      year,
      month,
      day,
      service: updated,
    });
  }

  async function addService() {
    if (busy) return;
    if (type === "special" && !label.trim()) return;

    try {
      setBusy(true);

      const finalLabel =
        type === "special"
          ? label.trim()
          : `Culto ${turn}`;

      const service: ServiceTurn = {
        id: buildServiceId(dateKey, type, finalLabel),
        label: finalLabel,
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

  function toggleExpand(serviceId: string) {
    setExpandedServiceId((prev) => (prev === serviceId ? null : serviceId));
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
          <Text
            style={[
              styles.title,
              { color: theme.colors.text },
            ]}
          >
            📅 {formatDatePtBr(date)}
          </Text>

          {/* TURNO */}
          <Text style={{ color: theme.colors.textMuted }}>
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
          <Text
            style={{
              color: theme.colors.textMuted,
              marginTop: 12,
            }}
          >
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
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.list}>
                {dayData.services.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.serviceRow,
                      { borderColor: theme.colors.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      {/* HEADER */}
                      <Pressable
                        onPress={() => toggleExpand(s.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flex: 1 }}>
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
                              marginTop: 2,
                            }}
                          >
                            {s.type === "special" ? "Culto especial" : "Culto regular"}
                          </Text>
                        </View>

                        {/* AÇÕES */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <Text style={{ color: theme.colors.textMuted }}>
                            {expandedServiceId === s.id ? "▲" : "▼"}
                          </Text>

                          <Pressable onPress={() => setConfirmRemoveService(s.id)}>
                            <Text style={{ color: theme.colors.danger, fontSize: 18 }}>🗑</Text>
                          </Pressable>
                        </View>
                      </Pressable>

                      {/* 🔽 EXPANDIDO */}
                      {expandedServiceId === s.id && (
                        <View style={{ marginTop: 12, gap: 8 }}>
                          {ministries.map((m) => {
                            const value = s.ministrySlots?.[m.id] ?? 1;
                            const canDecrease = value > 0;
                            const canIncrease = value < 4;

                            return (
                              <View
                                key={m.id}
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 13,
                                    color: theme.colors.textMuted,
                                  }}
                                >
                                  {m.name}
                                </Text>

                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <Pressable
                                    disabled={!canDecrease || busy}
                                    onPress={() => updateSlot(s, m.id, -1)}
                                    style={[
                                      styles.slotBtn,
                                      {
                                        opacity: !canDecrease || busy ? 0.4 : 1,
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.background,
                                      },
                                    ]}
                                  >
                                    <Text style={{ color: theme.colors.text }}>−</Text>
                                  </Pressable>

                                  <Text style={{ color: theme.colors.text }}>{value}</Text>

                                  <Pressable
                                    disabled={!canIncrease || busy}
                                    onPress={() => updateSlot(s, m.id, +1)}
                                    style={[
                                      styles.slotBtn,
                                      {
                                        opacity: !canIncrease || busy ? 0.4 : 1,
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.background,
                                      },
                                    ]}
                                  >
                                    <Text style={{ color: theme.colors.text }}>+</Text>
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
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
      </View >
    </Modal >
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
  slotBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
