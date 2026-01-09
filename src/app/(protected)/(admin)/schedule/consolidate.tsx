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

import {
  listenSchedulesByMonth,
  Schedule,
} from "@/services/schedule/schedules";
import {
  publishGeneralSchedule,
  listenGeneralScheduleByMonth,
} from "@/services/schedule/generalSchedules";
import { getPeopleNamesByIds } from "@/services/people";
import { listenMinistriesSchedule } from "@/services/ministries";

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

function monthLabel(year: number, jsMonth: number) {
  return new Date(year, jsMonth, 1).toLocaleDateString("pt-BR", {
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

function groupAssignmentsByMinistry(items: Schedule[]) {
  const map: Record<
    string,
    {
      ministryId: string;
      status: Schedule["status"];
      userIds: string[];
    }
  > = {};

  items.forEach((s) => {
    if (!map[s.ministryId]) {
      map[s.ministryId] = {
        ministryId: s.ministryId,
        status: s.status,
        userIds: [],
      };
    }

    s.assignments.forEach((a) => {
      map[s.ministryId].userIds.push(a.userId);
    });
  });

  return Object.values(map);
}

/* =========================
   SCREEN
========================= */

export default function AdminPublishedSchedulesScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // JS 0–11

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [peopleNames, setPeopleNames] = useState<Record<string, string>>({});
  const [ministries, setMinistries] = useState<Record<string, string>>({});
  const [generalPublished, setGeneralPublished] = useState(false);

  /* =========================
     REALTIME LOAD
  ========================= */

  useEffect(() => {
    if (!profile) return;

    setLoading(true);

    const unsubSchedules = listenSchedulesByMonth(
      year,
      month + 1,
      async (allSchedules: Schedule[]) => {
        setSchedules(allSchedules);

        const personIds = Array.from(
          new Set(
            allSchedules.flatMap((s) =>
              s.assignments.map((a) => a.userId)
            )
          )
        );

        const names = await getPeopleNamesByIds(personIds);
        setPeopleNames(names);

        setLoading(false);
      }
    );

    const unsubMinistries = listenMinistriesSchedule(setMinistries);

    const unsubGeneral = listenGeneralScheduleByMonth(
      year,
      month + 1,
      (general) => setGeneralPublished(!!general)
    );

    return () => {
      unsubSchedules();
      unsubMinistries();
      unsubGeneral();
    };
  }, [profile, year, month]);

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
     VALIDATION
  ========================= */

  const validation = useMemo(() => {
    if (generalPublished) {
      return { canPublish: false, reason: "published" };
    }

    if (Object.keys(ministries).length === 0) {
      return { canPublish: false, reason: "no_ministries" };
    }

    const schedulesByMinistry: Record<string, Schedule[]> = {};
    schedules.forEach((s) => {
      schedulesByMinistry[s.ministryId] ??= [];
      schedulesByMinistry[s.ministryId].push(s);
    });

    for (const ministryId of Object.keys(ministries)) {
      const ministrySchedules = schedulesByMinistry[ministryId];

      if (!ministrySchedules || ministrySchedules.length === 0) {
        return { canPublish: false, reason: "missing_schedule" };
      }

      if (ministrySchedules.some((s) => s.status === "draft")) {
        return { canPublish: false, reason: "draft_exists" };
      }
    }

    return { canPublish: true, reason: "ok" };
  }, [schedules, ministries, generalPublished]);

  const publishLabel = useMemo(() => {
    switch (validation.reason) {
      case "published":
        return "✅ Escala geral já publicada";
      case "missing_schedule":
        return "⚠️ Existem ministérios sem escala criada";
      case "draft_exists":
        return "⚠️ Ainda existem escalas em rascunho";
      default:
        return "📢 Publicar escala geral";
    }
  }, [validation]);

  /* =========================
     ACTION
  ========================= */

  async function handlePublishGeneral() {
    if (!validation.canPublish) return;
    await publishGeneralSchedule(year, month + 1);
  }

  /* =========================
     NAVIGATION
  ========================= */

  function goTo(offset: number) {
    const d = new Date(year, month + offset, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  /* =========================
     STYLES
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
        publishBtn: {
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          backgroundColor: validation.canPublish
            ? theme.colors.primary
            : theme.colors.border,
        },
        publishText: {
          fontWeight: "700",
          color: validation.canPublish
            ? theme.colors.background
            : theme.colors.textMuted,
        },
        card: {
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          gap: 10,
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
          color: theme.colors.warning ?? theme.colors.textMuted,
        },
        empty: {
          marginTop: 32,
          textAlign: "center",
          color: theme.colors.textMuted,
        },
      }),
    [theme, validation]
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="Escalas (Admin)" back />

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

      <Pressable
        disabled={!validation.canPublish}
        onPress={handlePublishGeneral}
        style={styles.publishBtn}
      >
        <Text style={styles.publishText}>{publishLabel}</Text>
      </Pressable>

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
              <Text style={styles.cultTitle}>
                {ref.serviceLabel} • {formatDatePtBr(ref.serviceDate)}
              </Text>

              {groupAssignmentsByMinistry(items)
                .sort((a, b) =>
                  (ministries[a.ministryId] ?? "").localeCompare(
                    ministries[b.ministryId] ?? "",
                    "pt-BR"
                  )
                )
                .map((group) => {
                  const ministryName = ministries[group.ministryId];

                  return (
                    <View key={group.ministryId} style={styles.block}>
                      <Text style={styles.ministry}>{ministryName}</Text>

                      {group.status === "draft" ? (
                        <Text style={styles.draft}>
                          🟡 Escala em rascunho
                        </Text>
                      ) : (
                        group.userIds.map((userId) => (
                          <Text key={userId} style={styles.person}>
                            • {firstName(peopleNames[userId])}
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
