import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { MemberAvailabilityStatus } from "@/services/memberAvailability";
import { ServiceDay } from "@/services/serviceDays";

type Props = {
  visible: boolean;
  dateKey: string | null;
  serviceDay: ServiceDay | null;
  statusMap: Record<string, MemberAvailabilityStatus>;
  busyKey: string | null;
  onToggle: (serviceId: string) => Promise<void>;
  onClose: () => void;
};

/* =========================
   HELPERS
========================= */

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

export function TurnSelectModal({
  visible,
  dateKey,
  serviceDay,
  statusMap,
  busyKey,
  onToggle,
  onClose,
}: Props) {
  const { theme } = useTheme();

  if (!visible || !serviceDay || !dateKey) return null;

  return (
    <Modal visible transparent animationType="slide">
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
              textTransform: "capitalize",
            }}
          >
            📅 {formatDatePtBr(dateKey)}
          </Text>

          <Text
            style={{
              color: theme.colors.textMuted,
              marginBottom: 6,
            }}
          >
            Cultos do dia
          </Text>

          {/* LISTA */}
          <View style={{ gap: 8 }}>
            {serviceDay.services.map((service) => {
              const key = `${dateKey}__${service.id}`;
              const status = statusMap[key] ?? null;
              const busy = busyKey === key;

              const isAvailable = status === "available";
              const isUnavailable = status === "unavailable";

              const backgroundColor = isAvailable
                ? theme.colors.success
                : isUnavailable
                ? theme.colors.danger
                : theme.colors.background;

              const textColor =
                isAvailable || isUnavailable
                  ? theme.colors.primaryContrast
                  : theme.colors.text;

              const subtitleColor =
                isAvailable || isUnavailable
                  ? theme.colors.primaryContrast
                  : theme.colors.textMuted;

              return (
                <Pressable
                  key={key}
                  onPress={() => onToggle(service.id)}
                  disabled={busy}
                  style={[
                    styles.serviceRow,
                    {
                      backgroundColor,
                      borderColor: theme.colors.border,
                      opacity: busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: textColor,
                      fontWeight: "600",
                    }}
                  >
                    {service.label}
                  </Text>

                  <Text
                    style={{
                      color: subtitleColor,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {status === "available"
                      ? "Disponível"
                      : status === "unavailable"
                      ? "Indisponível"
                      : "Não marcado"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modal: {
    padding: 16,
    borderRadius: 20,
  },
  serviceRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
