import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import {
  copyServiceDaysFromPreviousMonthByOrder,
  listenServiceDaysByMonth,
  ServiceDay,
} from "@/services/serviceDays";
import { ServiceDayModal } from "./ServiceDayModal";

/* =========================
   CONSTANTES
========================= */

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* =========================
   SCREEN
========================= */

export default function AdminServiceDays() {
  const { theme } = useTheme();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [days, setDays] = useState<ServiceDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  /* =========================
     LISTENER FIRESTORE
  ========================= */

  useEffect(() => {
    const unsub = listenServiceDaysByMonth(year, month, setDays);
    return unsub;
  }, [year, month]);

  /* =========================
     MAPA YYYY-MM-DD → ServiceDay
  ========================= */

  const daysMap = useMemo(() => {
    const map: Record<string, ServiceDay> = {};
    days.forEach((d) => {
      map[d.dateKey] = d;
    });
    return map;
  }, [days]);

  /* =========================
     CALENDÁRIO
  ========================= */

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const cells: (Date | null)[] = [];

    // espaços antes
    for (let i = 0; i < startWeekDay; i++) {
      cells.push(null);
    }

    // dias do mês
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(year, month, d));
    }

    return cells;
  }, [year, month]);

  /* =========================
     CONTROLES
  ========================= */

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function getDateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="📅 Dias de Culto" />

      <View style={styles.calendarWrapper}>
        {/* CONTROLE DE MÊS */}
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => changeMonth(-1)}
            style={[styles.monthBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: 20 }}>◀</Text>
          </Pressable>

          <Text style={{ color: theme.colors.text, fontWeight: "600", fontSize: 20 }}>
            {new Date(year, month).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </Text>

          <Pressable
            onPress={() => changeMonth(1)}
            style={[styles.monthBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: 20 }}>▶</Text>
          </Pressable>
        </View>

        {/* DIAS DA SEMANA */}
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

            const dateKey = getDateKey(date);
            const dayData = daysMap[dateKey];
            const hasServices = !!dayData?.services?.length;

            return (
              <Pressable
                key={dateKey}
                onPress={() => setSelectedDate(date)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: hasServices
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: hasServices
                      ? theme.colors.primaryContrast
                      : theme.colors.text,
                    fontWeight: "600",
                  }}
                >
                  {date.getDate()}
                </Text>

                {hasServices && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.colors.primaryContrast,
                      marginTop: 4,
                    }}
                  >
                    {dayData.services.length} culto(s)
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={async () => {
            await copyServiceDaysFromPreviousMonthByOrder(year, month);
          }}
          style={{
            alignSelf: "flex-end",
            marginBottom: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "500" }}>
            📋 Copiar cultos por dia da semana
          </Text>
        </Pressable>
      </View>

      {/* MODAL */}
      <ServiceDayModal
        visible={!!selectedDate}
        date={selectedDate}
        dayData={
          selectedDate
            ? daysMap[getDateKey(selectedDate)] ?? null
            : null
        }
        onClose={() => setSelectedDate(null)}
      />
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  monthBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  calendarWrapper: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420, // 🔑 igual AdminAvailability
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
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});