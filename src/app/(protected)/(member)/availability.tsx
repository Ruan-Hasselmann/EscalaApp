import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

import {
  listActiveServiceDaysByMonth,
  ServiceDay,
} from "@/services/serviceDays";

import {
  listenAvailabilityWindow,
  AvailabilityWindow,
} from "@/services/availabilityWindow";

import {
  listenMemberAvailabilityForTargetMonth,
  MemberAvailability,
  MemberAvailabilityStatus,
  toggleMemberAvailability,
} from "@/services/memberAvailability";

import { TurnSelectModal } from "./modal/TurnSelectModal";

/* =========================
   HELPERS
========================= */

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const cells: (Date | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }

  return cells;
}

function getTargetMonth() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    year: target.getFullYear(),
    month: target.getMonth(), // 0–11
  };
}

function parseDateKeyStart(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseDateKeyEnd(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/* =========================
   SCREEN
========================= */

export default function MemberAvailabilityScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const target = getTargetMonth();
  const year = target.year;
  const month = target.month; // 0–11

  const monthLabel = new Date(year, month).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const [windowData, setWindowData] =
    useState<AvailabilityWindow | null>(null);

  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [statusMap, setStatusMap] = useState<
    Record<string, MemberAvailabilityStatus>
  >({});

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [turnModalOpen, setTurnModalOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] =
    useState<string | null>(null);

  /* =========================
     WINDOW
  ========================= */

  useEffect(() => {
    return listenAvailabilityWindow(setWindowData);
  }, []);

  // 🔄 força reavaliação da janela (ex: quando abre enquanto a tela está aberta)
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const windowParsed = useMemo(() => {
    if (!windowData) return null;
    return {
      open: windowData.open,
      start: parseDateKeyStart(windowData.startDate),
      end: parseDateKeyEnd(windowData.endDate),
    };
  }, [windowData]);

  function isWindowOpenToday() {
    if (!windowParsed?.open) return false;
    const now = new Date();
    return now >= windowParsed.start && now <= windowParsed.end;
  }

  /* =========================
     SERVICE DAYS
  ========================= */

  useEffect(() => {
    // 🔥 month + 1 → domínio 1–12
    listActiveServiceDaysByMonth(year, month + 1).then(setServiceDays);
  }, [year, month]);

  const serviceDayMap = useMemo(() => {
    const map: Record<string, ServiceDay> = {};
    serviceDays.forEach((d) => (map[d.dateKey] = d));
    return map;
  }, [serviceDays]);

  /* =========================
     AVAILABILITY
  ========================= */

  useEffect(() => {
    if (!user?.uid) return;

    return listenMemberAvailabilityForTargetMonth(
      user.uid,
      (items: MemberAvailability[]) => {
        const next: Record<string, MemberAvailabilityStatus> = {};
        items.forEach((i) => {
          next[`${i.dateKey}__${i.serviceId}`] = i.status;
        });
        setStatusMap(next);
      }
    );
  }, [user?.uid]);

  const calendar = useMemo(
    () => getMonthDays(year, month),
    [year, month]
  );

  /* =========================
     ACTIONS
  ========================= */

  async function toggleTurn(dateKey: string, serviceId: string) {
    if (!user?.uid) return;

    const key = `${dateKey}__${serviceId}`;
    if (busyKey === key) return;

    try {
      setBusyKey(key);
      const current = statusMap[key] ?? null;
      await toggleMemberAvailability(
        user.uid,
        dateKey,
        serviceId,
        current
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function onDayPress(date: Date) {
    if (!isWindowOpenToday()) return;

    const dateKey = toDateKey(date);
    const sd = serviceDayMap[dateKey];
    if (!sd) return;

    if (sd.services.length === 1) {
      await toggleTurn(dateKey, sd.services[0].id);
      return;
    }

    setSelectedDateKey(dateKey);
    setTurnModalOpen(true);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="🗓️ Minha disponibilidade" back />

      <View style={styles.wrapper}>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          Disponibilidade para {monthLabel}
        </Text>

        <Text
          style={{
            color: isWindowOpenToday()
              ? theme.colors.success
              : theme.colors.danger,
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          {isWindowOpenToday()
            ? "🪟 Janela aberta — você pode marcar sua disponibilidade"
            : "🔒 Janela fechada — aguarde a liberação"}
        </Text>

        {/* LEGENDA */}
        <View style={styles.legend}>
          <LegendDot
            color={theme.colors.success}
            label="Disponível"
            textColor={theme.colors.textMuted}
          />
          <LegendDot
            color={theme.colors.danger}
            label="Indisponível"
            textColor={theme.colors.textMuted}
          />
          <LegendDot
            color={theme.colors.textMuted}
            label="Não marcado"
            textColor={theme.colors.textMuted}
          />
        </View>

        {/* SEMANA */}
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d) => (
            <Text
              key={d}
              style={[styles.weekDay, { color: theme.colors.textMuted }]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* CALENDÁRIO */}
        <View style={styles.grid}>
          {calendar.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.cell} />;
            }

            const dateKey = toDateKey(date);
            const sd = serviceDayMap[dateKey];
            const hasService = !!sd;
            const disabled = !hasService || !isWindowOpenToday();

            return (
              <Pressable
                key={dateKey}
                onPress={() => onDayPress(date)}
                disabled={disabled}
                style={[
                  styles.cell,
                  {
                    backgroundColor: hasService
                      ? theme.colors.surface
                      : "transparent",
                    borderColor: theme.colors.border,
                    opacity: disabled ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.text }}>
                  {date.getDate()}
                </Text>

                {hasService && (
                  <View style={styles.dots}>
                    {sd.services.map((s) => {
                      const status =
                        statusMap[`${dateKey}__${s.id}`];

                      let color = theme.colors.textMuted;
                      if (status === "available")
                        color = theme.colors.success;
                      if (status === "unavailable")
                        color = theme.colors.danger;

                      return (
                        <View
                          key={s.id}
                          style={[
                            styles.dot,
                            { backgroundColor: color },
                          ]}
                        />
                      );
                    })}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <TurnSelectModal
        visible={turnModalOpen}
        dateKey={selectedDateKey}
        serviceDay={
          selectedDateKey ? serviceDayMap[selectedDateKey] : null
        }
        statusMap={statusMap}
        busyKey={busyKey}
        onToggle={async (serviceId) => {
          if (!selectedDateKey) return;
          await toggleTurn(selectedDateKey, serviceId);
        }}
        onClose={() => {
          setTurnModalOpen(false);
          setSelectedDateKey(null);
        }}
      />
    </AppScreen>
  );
}

/* =========================
   SMALL COMPONENT
========================= */

function LegendDot({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: 12, color: textColor }}>{label}</Text>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  legend: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.2857%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
});
