import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

import { listenMembershipsByUser } from "@/services/memberships";
import { listenAllSchedulesByMonth, Schedule } from "@/services/schedule/schedules";
import { getPeopleNamesByIds } from "@/services/people";
import { getMinistryMap } from "@/services/ministries";

/* =========================
   HELPERS
========================= */

function firstName(name?: string) {
  if (!name) return "—";
  return name.split(" ")[0];
}

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDatePtBr(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/* =========================
   GROUP BY SERVICE
========================= */

function groupByService(schedules: Schedule[]) {
  const map: Record<string, Schedule[]> = {};

  schedules.forEach((s) => {
    const key = `${s.serviceDate}__${s.serviceId}`;
    map[key] ??= [];
    map[key].push(s);
  });

  return Object.entries(map)
    .map(([key, items]) => ({
      key,
      items,
      ref: items[0],
    }))
    .sort(
      (a, b) =>
        parseDateKey(a.ref.serviceDate).getTime() -
        parseDateKey(b.ref.serviceDate).getTime()
    );
}

/* =========================
   SCREEN
========================= */

export default function PublishedScheduleScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ministryIds, setMinistryIds] = useState<string[]>([]);
  const [peopleNames, setPeopleNames] = useState<Record<string, string>>({});
  const [ministries, setMinistries] = useState<Record<string, string>>({});

  const isAdmin = profile?.roles.includes("admin") ?? false;

  /* =========================
     MEMBERSHIPS
  ========================= */

  useEffect(() => {
    if (!profile?.uid) return;
    return listenMembershipsByUser(profile.uid, (items) =>
      setMinistryIds(items.map((m) => m.ministryId))
    );
  }, [profile?.uid]);

  /* =========================
     LOAD DATA (MONTH)
  ========================= */

  useEffect(() => {
    if (!profile) return;

    const dbMonth = month;

    setLoading(true);

    const unsubscribe = listenAllSchedulesByMonth(
      year,
      dbMonth,
      async (allSchedules) => {
        const visible = isAdmin
          ? allSchedules
          : allSchedules.filter((s) =>
            ministryIds.includes(s.ministryId)
          );

        setSchedules(visible);

        const personIds = Array.from(
          new Set(
            visible.flatMap((s) =>
              s.assignments.map((a) => a.personId)
            )
          )
        );

        const [names, ministryMap] = await Promise.all([
          getPeopleNamesByIds(personIds),
          getMinistryMap(),
        ]);

        setPeopleNames(names);
        setMinistries(ministryMap);

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile, year, month, ministryIds.join(","), isAdmin]);

  /* =========================
     VIEW MODEL
  ========================= */

  const grouped = useMemo(() => groupByService(schedules), [schedules]);

  const ministryList = useMemo(
    () =>
      Object.entries(ministries)
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [ministries]
  );

  /* =========================
     NAVIGATION
  ========================= */

  function goTo(offset: number) {
    const d = new Date(year, month + offset, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  /* =========================
     STYLES (UX COPIADO)
  ========================= */

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
          paddingTop: 12,
        },
        monthHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        navBtn: {
          padding: 8,
          borderRadius: 10,
          backgroundColor: theme.colors.surface,
        },
        navText: {
          fontSize: 18,
          fontWeight: "700",
          color: theme.colors.text,
        },
        monthTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: theme.colors.text,
          textTransform: "capitalize",
        },
        card: {
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          marginBottom: 14,
          gap: 10,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        headerRow: {
          flexDirection: "row",
          justifyContent: "space-between",
        },
        cultTitle: {
          fontSize: 15,
          fontWeight: "700",
          color: theme.colors.text,
          textTransform: "capitalize",
        },
        block: {
          marginTop: 6,
          paddingLeft: 6,
        },
        ministry: {
          fontSize: 13,
          fontWeight: "600",
          color: theme.colors.textMuted,
        },
        person: {
          fontSize: 14,
          color: theme.colors.text,
        },
        draft: {
          fontSize: 13,
          fontStyle: "italic",
          color: theme.colors.textMuted,
          opacity: 0.7,
        },
        empty: {
          marginTop: 32,
          textAlign: "center",
          color: theme.colors.textMuted,
          lineHeight: 20,
        },
      }),
    [theme]
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="Escalas Publicadas" back />

      {/* NAV MÊS */}
      <View style={styles.monthHeader}>
        <Pressable onPress={() => goTo(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>◀</Text>
        </Pressable>

        <Text style={styles.monthTitle}>
          {monthLabel(year, month)}
        </Text>

        <Pressable onPress={() => goTo(1)} style={styles.navBtn}>
          <Text style={styles.navText}>▶</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : grouped.length === 0 ? (
        <Text style={styles.empty}>
          Nenhuma escala para este mês.
        </Text>
      ) : (
        <ScrollView style={styles.wrapper}>
          {grouped.map(({ key, items, ref }) => (
            <View key={key} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.cultTitle}>
                  {ref.serviceLabel} • {formatDatePtBr(ref.serviceDate)}
                </Text>
              </View>

              {ministryList.map((m) => {
                const schedule = items.find(
                  (s) => s.ministryId === m.id
                );

                return (
                  <View key={m.id} style={styles.block}>
                    <Text style={styles.ministry}>{m.name}</Text>

                    {!schedule || schedule.status === "draft" ? (
                      <Text style={styles.draft}>🟡 Escala em rascunho</Text>
                    ) : schedule.assignments.length === 0 ? (
                      <Text style={styles.draft}>— Sem pessoas escaladas</Text>
                    ) : (
                      schedule.assignments.map((a) => (
                        <Text key={a.personId} style={styles.person}>
                          • {firstName(peopleNames[a.personId])}
                        </Text>
                      ))
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </AppScreen>
  );
}
