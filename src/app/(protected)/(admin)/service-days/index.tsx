import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";
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
const MAX_MONTH_OFFSET = 12;

/* =========================
   HELPERS
========================= */

function getDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =========================
   SCREEN
========================= */

export default function AdminServiceDays() {
  const { theme } = useTheme();

  const today = new Date();

  // 🔥 PADRÃO: month sempre JS (0–11)
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [days, setDays] = useState<ServiceDay[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [confirmCopy, setConfirmCopy] = useState(false);
  const [copying, setCopying] = useState(false);

  /* =========================
     LISTENER
  ========================= */

  useEffect(() => {
    setLoading(true);

    // 🔥 service recebe month 1–12
    const unsub = listenServiceDaysByMonth(
      year,
      month + 1,
      (items) => {
        setDays(items);
        setLoading(false);
      }
    );

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

    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      cells.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }

    return cells;
  }, [year, month]);

  /* =========================
     CONTROLES
  ========================= */

  function changeMonth(delta: number) {
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    const target = new Date(year, month + delta, 1);

    const diff =
      (target.getFullYear() - base.getFullYear()) * 12 +
      (target.getMonth() - base.getMonth());

    if (Math.abs(diff) > MAX_MONTH_OFFSET) return;

    setYear(target.getFullYear());
    setMonth(target.getMonth());
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="📅 Dias de Culto" back />

      <View style={styles.calendarWrapper}>
        {/* MÊS */}
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => changeMonth(-1)}
            style={[styles.monthBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: 20 }}>◀</Text>
          </Pressable>

          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
              fontSize: 20,
              textTransform: "capitalize",
            }}
          >
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

        {/* GRID */}
        {loading ? (
          <Text
            style={{
              textAlign: "center",
              marginTop: 20,
              color: theme.colors.textMuted,
            }}
          >
            ⏳ Carregando dias de culto...
          </Text>
        ) : (
          <View style={styles.grid}>
            {calendar.map((date, index) => {
              if (!date) {
                return <View key={`empty-${index}`} style={styles.cell} />;
              }

              const dateKey = getDateKey(date);
              const dayData = daysMap[dateKey];
              const count = dayData?.services?.length ?? 0;

              const isSelected =
                selectedDate &&
                getDateKey(selectedDate) === dateKey;

              let bg = theme.colors.surface;
              if (count === 1) bg = theme.colors.primary;
              if (count > 1)
                bg = theme.colors.secondary ?? theme.colors.primary;

              return (
                <Pressable
                  key={dateKey}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles.cell,
                    {
                      backgroundColor:
                        count > 0 ? bg : theme.colors.surface,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        count > 0
                          ? theme.colors.primaryContrast
                          : theme.colors.text,
                      fontWeight: "600",
                    }}
                  >
                    {date.getDate()}
                  </Text>

                  {count > 0 && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.colors.primaryContrast,
                        marginTop: 4,
                      }}
                    >
                      {count} culto(s)
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* COPIAR */}
        <Pressable
          onPress={() => setConfirmCopy(true)}
          disabled={copying}
          style={[styles.copyBtn, { borderColor: theme.colors.border }]}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "500" }}>
            {copying
              ? "Copiando..."
              : "📋 Copiar cultos do mês anterior"}
          </Text>
        </Pressable>
      </View>

      {/* MODAL DIA */}
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

      {/* CONFIRMAR CÓPIA */}
      <ConfirmActionModal
        visible={confirmCopy}
        title="Copiar cultos"
        description="Os cultos do mês anterior serão copiados para este mês. Deseja continuar?"
        confirmLabel="Copiar"
        onCancel={() => setConfirmCopy(false)}
        onConfirm={async () => {
          setConfirmCopy(false);
          setCopying(true);
          try {
            // 🔥 service recebe month 1–12
            await copyServiceDaysFromPreviousMonthByOrder(
              year,
              month + 1
            );
          } finally {
            setCopying(false);
          }
        }}
      />
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  calendarWrapper: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
  },
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
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtn: {
    alignSelf: "flex-end",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
