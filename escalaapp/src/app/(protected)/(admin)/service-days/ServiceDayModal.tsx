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

type Props = {
  visible: boolean;
  date: Date | null;
  dayData: ServiceDay | null;
  onClose: () => void;
};

const TURN_OPTIONS = ["Manhã", "Tarde", "Noite"] as const;

export function ServiceDayModal({
  visible,
  date,
  dayData,
  onClose,
}: Props) {
  const { theme } = useTheme();

  const [turn, setTurn] = useState<(typeof TURN_OPTIONS)[number]>("Manhã");
  const [type, setType] = useState<ServiceTurnType>("regular");
  const [label, setLabel] = useState("");

  useEffect(() => {
    setTurn("Manhã");
    setType("regular");
    setLabel("");
  }, [visible]);

  if (!date) return null;

  const dateKey = date.toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  async function addService() {
    const service: ServiceTurn = {
      id: `${turn}-${type}-${Date.now()}`,
      label: type === "special" ? label || "Culto especial" : `Culto ${turn}`,
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
  }

  async function removeService(serviceId: string) {
    await removeServiceFromDay(dateKey, serviceId);
  }

  async function removeDay() {
    await deleteServiceDay(dateKey);
    onClose();
  }

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
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 12,
            }}
          >
            📅 {date.toLocaleDateString("pt-BR")}
          </Text>

          {/* TURNOS */}
          <Text style={{ color: theme.colors.textMuted, marginBottom: 6 }}>
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
            {(["regular", "special"] as ServiceTurnType[]).map((t) => (
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
                  {t === "regular" ? "Regular" : "Especial"}
                </Text>
              </Pressable>
            ))}
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
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary },
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
            <View style={{ marginTop: 16, gap: 8 }}>
              {dayData.services.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.serviceRow,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={{ color: theme.colors.text }}>
                    {s.label}
                  </Text>

                  <Pressable onPress={() => removeService(s.id)}>
                    <Text style={{ color: theme.colors.danger }}>✖</Text>
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
              onPress={removeDay}
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
                  marginTop: 16,
                },
              ]}
          >
            <Text style={{ color: theme.colors.textMuted }}>
              Fechar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  modal: {
    padding: 16,
    borderRadius: 20,
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
  serviceRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
