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
    listPublishedSchedulesByMinistryIds,
} from "@/services/schedule/schedules";
import { getPeopleNamesByIds } from "@/services/people";

import {
    collection,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   HELPERS
========================= */

function monthLabel(year: number, month: number) {
    return new Date(year, month).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
    });
}

function toDbMonth(jsMonth: number) {
    return jsMonth + 1;
}

async function existsGeneralSchedule(year: number, jsMonth: number) {
    const dbMonth = toDbMonth(jsMonth);
    console.log("[CHECK GENERAL]", { year, jsMonth, dbMonth });

    const q = query(
        collection(db, "generalSchedules"),
        where("year", "==", year),
        where("month", "==", dbMonth),
        limit(1)
    );

    const snap = await getDocs(q);
    console.log("[CHECK GENERAL RESULT]", snap.size);

    return !snap.empty;
}

async function hasAnyDataInMonth(year: number, jsMonth: number) {
    const dbMonth = toDbMonth(jsMonth);
    console.log("[CHECK MONTH DATA]", { year, jsMonth, dbMonth });

    for (const col of ["schedules", "generalSchedules"]) {
        const q = query(
            collection(db, col),
            where("year", "==", year),
            where("month", "==", dbMonth),
            limit(1)
        );

        const snap = await getDocs(q);
        console.log(`[CHECK ${col}]`, snap.size);

        if (!snap.empty) return true;
    }

    return false;
}

/* =========================
   SCREEN
========================= */

export default function PublishedScheduleScreen() {
    const { profile } = useAuth();
    const { theme } = useTheme();

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());

    const [loading, setLoading] = useState(true);
    const [generalExists, setGeneralExists] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [ministryIds, setMinistryIds] = useState<string[]>([]);
    const [peopleNames, setPeopleNames] =
        useState<Record<string, string>>({});

    const isAdmin = profile?.roles?.includes("admin") ?? false;

    /* =========================
       MEMBERSHIPS
    ========================= */

    useEffect(() => {
        if (!profile?.uid) return;

        console.log("[MEMBERSHIPS] loading for", profile.uid);

        return listenMembershipsByUser(profile.uid, (items) => {
            console.log("[MEMBERSHIPS RESULT]", items);
            setMinistryIds(items.map((m) => m.ministryId));
        });
    }, [profile?.uid]);

    /* =========================
       LOAD DATA
    ========================= */

    useEffect(() => {
        if (!profile?.uid) return;

        async function load() {
            console.log("====== LOAD START ======");
            console.log("[MONTH]", { year, month, dbMonth: toDbMonth(month) });
            console.log("[MINISTRIES]", ministryIds);

            setLoading(true);

            const general = await existsGeneralSchedule(year, month);
            setGeneralExists(general);

            if (!general && ministryIds.length > 0) {
                const result =
                    await listPublishedSchedulesByMinistryIds(
                        ministryIds,
                        year,
                        toDbMonth(month)
                    );

                console.log("[SCHEDULES RESULT]", result);
                setSchedules(result);
            } else {
                console.log("[SCHEDULES SKIPPED]");
                setSchedules([]);
            }

            setLoading(false);
            console.log("====== LOAD END ======");
        }

        load();
    }, [year, month, ministryIds.join(","), isAdmin, profile?.uid]);

    /* =========================
       RESOLVE NAMES
    ========================= */

    useEffect(() => {
        if (!schedules.length) return;

        const userIds = schedules.flatMap((s) =>
            s.assignments.map((a) => a.personId)
        );

        console.log("[RESOLVE NAMES]", userIds);

        getPeopleNamesByIds(userIds).then(setPeopleNames);
    }, [schedules]);

    /* =========================
       NAVIGATION
    ========================= */

    function goTo(offset: number) {
        const date = new Date(year, month + offset);
        setYear(date.getFullYear());
        setMonth(date.getMonth());
    }

    /* =========================
       STYLES
    ========================= */

    const styles = useMemo(
        () =>
            StyleSheet.create({
                monthHeader: {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                },
                navBtn: { padding: 8 },
                navText: { fontSize: 18, color: theme.colors.text },
                monthLabel: {
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.colors.text,
                    textTransform: "capitalize",
                },
                list: { padding: 16, gap: 12 },
                card: {
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: theme.colors.card,
                },
                service: {
                    fontWeight: "600",
                    marginBottom: 8,
                    color: theme.colors.text,
                },
                person: { color: theme.colors.text },
                me: { color: theme.colors.primary, fontWeight: "700" },
                empty: {
                    textAlign: "center",
                    marginTop: 48,
                    opacity: 0.6,
                    color: theme.colors.text,
                },
            }),
        [theme]
    );

    /* =========================
       RENDER
    ========================= */

    if (!profile) {
        return (
            <AppScreen>
                <ActivityIndicator style={{ marginTop: 32 }} />
            </AppScreen>
        );
    }

    return (
        <AppScreen>
            <AppHeader title="Escalas Publicadas" back />

            <View style={styles.monthHeader}>
                <Pressable onPress={() => goTo(-1)} style={styles.navBtn}>
                    <Text style={styles.navText}>◀</Text>
                </Pressable>

                <Text style={styles.monthLabel}>
                    {monthLabel(year, month)}
                </Text>

                <Pressable onPress={() => goTo(1)} style={styles.navBtn}>
                    <Text style={styles.navText}>▶</Text>
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 32 }} />
            ) : schedules.length === 0 ? (
                <Text style={styles.empty}>
                    Nenhuma escala publicada para este mês.
                </Text>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {schedules.map((s) => (
                        <View key={s.id} style={styles.card}>
                            <Text style={styles.service}>
                                {s.serviceLabel} — {s.serviceDate}
                            </Text>

                            {s.assignments.map((a) => {
                                const name =
                                    peopleNames[a.personId] ?? "—";
                                const isMe =
                                    a.personId === profile.uid;

                                return (
                                    <Text
                                        key={a.personId}
                                        style={[
                                            styles.person,
                                            isMe && styles.me,
                                        ]}
                                    >
                                        {isMe ? `✔ Você (${name})` : name}
                                    </Text>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            )}
        </AppScreen>
    );
}
