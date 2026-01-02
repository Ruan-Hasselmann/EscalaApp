import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import {
  listenAvailabilityWindow,
  setAvailabilityWindow,
  toggleAvailability,
} from "@/services/availabilityWindow";

/* =========================
   HELPERS
========================= */

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function sameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

function isBetween(d: Date, start: Date, end: Date) {
  return d >= start && d <= end;
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const cells: (Date | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) {
    cells.push(null);
  }

  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }

  return cells;
}

/* =========================
   SCREEN
========================= */

export default function AdminAvailability() {
  const { theme } = useTheme();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const [window, setWindow] = useState<{
    start: Date;
    end: Date;
    open: boolean;
  } | null>(null);

  const [selecting, setSelecting] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  /* =========================
     LISTENER
  ========================= */

  useEffect(() => {
    return listenAvailabilityWindow((data) => {
      if (!data) {
        setWindow(null);
        return;
      }

      setWindow({
        start: new Date(data.startDate),
        end: new Date(data.endDate),
        open: data.open,
      });
    });
  }, []);

  /* =========================
     DATA
  ========================= */

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const monthLabel = useMemo(() => {
    return new Date(year, month).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [year, month]);

  /* =========================
     ACTIONS
  ========================= */

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function handleDayPress(day: Date) {
    if (!selecting.start || selecting.end) {
      setSelecting({ start: day, end: null });
      return;
    }

    if (day < selecting.start) {
      setSelecting({ start: day, end: selecting.start });
    } else {
      setSelecting({ start: selecting.start, end: day });
    }
  }

  async function saveWindow() {
    if (!selecting.start || !selecting.end) return;

    await setAvailabilityWindow({
      startDate: toDateKey(selecting.start),
      endDate: toDateKey(selecting.end),
      open: true,
    });

    setSelecting({ start: null, end: null });
  }

  function isSelected(day: Date) {
    if (!selecting.start) return false;
    if (!selecting.end) return sameDay(day, selecting.start);
    return isBetween(day, selecting.start, selecting.end);
  }

  function isActive(day: Date) {
    if (!window || !window.open) return false;
    return isBetween(day, window.start, window.end);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="🪟 Janela de Disponibilidade" />

      <View style={styles.calendarWrapper}>
        {/* MÊS */}
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => changeMonth(-1)}
            style={[styles.monthBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: 30 }}>◀</Text>
          </Pressable>

          <Text style={{ color: theme.colors.text, fontWeight: "600", fontSize: 20 }}>
            {monthLabel}
          </Text>

          <Pressable
            onPress={() => changeMonth(1)}
            style={[styles.monthBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: 30 }}>▶</Text>
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
        <View style={styles.grid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.day} />;
            }

            const active = isActive(day);
            const selected = isSelected(day);

            return (
              <Pressable
                key={toDateKey(day)}
                onPress={() => handleDayPress(day)}
                style={[
                  styles.day,
                  { borderColor: theme.colors.border },
                  active && { backgroundColor: theme.colors.success },
                  selected && { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={{
                    color:
                      active || selected
                        ? theme.colors.primaryContrast
                        : theme.colors.text,
                    fontWeight: "600",
                  }}
                >
                  {day.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* AÇÕES */}
        {selecting.start && selecting.end && (
          <Pressable
            onPress={saveWindow}
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
              💾 Salvar janela
            </Text>
          </Pressable>
        )}

        {window && (
          <Pressable
            onPress={() => toggleAvailability(!window.open)}
            style={[
              styles.button,
              {
                backgroundColor: window.open
                  ? theme.colors.danger
                  : theme.colors.success,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.primaryContrast,
                fontWeight: "600",
              }}
            >
              {window.open ? "🔒 Fechar janela" : "🔓 Reabrir janela"}
            </Text>
          </Pressable>
        )}
      </View>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  calendarWrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  day: {
    width: "14.2857%",
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
});
