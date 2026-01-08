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
import {
  Schedule,
  listenPublishedSchedulesByMonth,
  listenPublishedSchedulesByMinistryIds,
} from "@/services/schedule/schedules";
import { listenGeneralScheduleByMonth } from "@/services/schedule/generalSchedules";
import { getPeopleNamesByIds } from "@/services/people";
import { getMinistryMap } from "@/services/ministries";

/* =========================
   HELPERS
========================= */

function firstName(name?: string) {
  return name?.split(" ")[0] ?? "—";
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
  // month = 1–12
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function groupByService(schedules: Schedule[]) {
  const map: Record<string, Schedule[]> = {};

  schedules.forEach((s) => {
    const key = `${s.serviceDate}__${s.serviceId}`;
    map[key] ??= [];
    map[key].push(s);
  });

  return Object.entries(map)
    .map(([key, items]) => ({ key, items, ref: items[0] }))
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
  const [month, setMonth] = useState(today.getMonth() + 1); // ✅ 1–12

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ministryIds, setMinistryIds] = useState<string[]>([]);
  const [peopleNames, setPeopleNames] = useState<Record<string, string>>({});
  const [ministries, setMinistries] = useState<Record<string, string>>({});
  const [generalPublished, setGeneralPublished] = useState(false);

  /* =========================
     MEMBERSHIPS (ACTIVE ONLY)
  ========================= */

  useEffect(() => {
    if (!profile?.uid) return;

    return listenMembershipsByUser(profile.uid, (items) => {
      setMinistryIds(
        items.filter((m) => m.active).map((m) => m.ministryId)
      );
    });
  }, [profile?.uid]);

  /* =========================
     GENERAL SCHEDULE GATE
  ========================= */

  useEffect(() => {
    setGeneralPublished(false);
    setSchedules([]);
    setLoading(true);

    return listenGeneralScheduleByMonth(year, month, (general) => {
      setGeneralPublished(!!general);
    });
  }, [year, month]);

  /* =========================
     LOAD SCHEDULES
  ========================= */

  useEffect(() => {
    if (!profile || ministryIds.length === 0) {
      setLoading(false);
      return;
    }

    let unsubscribe: () => void;

    if (generalPublished) {
      unsubscribe = listenPublishedSchedulesByMonth(
        year,
        month,
        setSchedules
      );
    } else {
      unsubscribe = listenPublishedSchedulesByMinistryIds(
        ministryIds,
        year,
        month,
        setSchedules
      );
    }

    return () => unsubscribe?.();
  }, [profile, ministryIds, year, month, generalPublished]);

  /* =========================
     LOAD NAMES & MINISTRIES
  ========================= */

  useEffect(() => {
    async function loadMaps() {
      const personIds = Array.from(
        new Set(
          schedules.flatMap((s) =>
            s.assignments.map((a) => a.userId)
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

    if (schedules.length > 0) {
      loadMaps();
    } else {
      setLoading(false);
    }
  }, [schedules]);

  const grouped = useMemo(() => groupByService(schedules), [schedules]);

  function goTo(offset: number) {
    const d = new Date(year, month - 1 + offset, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
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
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        cultTitle: {
          fontSize: 15,
          fontWeight: "700",
          color: theme.colors.text,
          textTransform: "capitalize",
        },
        ministry: {
          marginTop: 6,
          fontSize: 13,
          fontWeight: "600",
          color: theme.colors.textMuted,
        },
        person: {
          fontSize: 14,
          color: theme.colors.text,
        },
        empty: {
          marginTop: 32,
          textAlign: "center",
          color: theme.colors.textMuted,
        },
      }),
    [theme]
  );

  return (
    <AppScreen>
      <AppHeader title="Escalas Publicadas" back />

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
          {generalPublished
            ? "Nenhuma escala encontrada para este mês."
            : "A escala geral ainda não foi publicada."}
        </Text>
      ) : (
        <ScrollView style={styles.wrapper}>
          {grouped.map(({ key, ref, items }) => (
            <View key={key} style={styles.card}>
              <Text style={styles.cultTitle}>
                {ref.serviceLabel} • {formatDatePtBr(ref.serviceDate)}
              </Text>

              {items.map((s) => (
                <View key={s.id}>
                  <Text style={styles.ministry}>
                    {ministries[s.ministryId]}
                  </Text>

                  {s.assignments.map((a) => (
                    <Text key={a.userId} style={styles.person}>
                      • {firstName(peopleNames[a.userId])}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </AppScreen>
  );
}
