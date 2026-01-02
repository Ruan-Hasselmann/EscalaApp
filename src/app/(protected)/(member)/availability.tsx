import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

import { listActiveServiceDaysByMonth, ServiceDay } from "@/services/serviceDays";
import {
    listenAvailabilityWindow,
    AvailabilityWindow,
} from "@/services/availabilityWindow";
import {
    listenMemberAvailabilityByMonth,
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

function isBetween(d: Date, start: Date, end: Date) {
    return d >= start && d <= end;
}

function getMonthDaysGrid(year: number, month: number) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const days: Date[] = [];

    for (let i = 0; i < first.getDay(); i++) {
        days.push(new Date(NaN));
    }

    for (let d = 1; d <= last.getDate(); d++) {
        days.push(new Date(year, month, d));
    }

    while (days.length % 7 !== 0) {
        days.push(new Date(NaN));
    }

    return days;
}

/* =========================
   SCREEN
========================= */

export default function MemberAvailabilityScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();

    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const [windowData, setWindowData] = useState<AvailabilityWindow | null>(null);
    const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
    const [statusMap, setStatusMap] = useState<
        Record<string, MemberAvailabilityStatus>
    >({});
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const [turnModalOpen, setTurnModalOpen] = useState(false);
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

    /* =========================
       LOAD AVAILABILITY WINDOW
    ========================= */

    useEffect(() => {
        return listenAvailabilityWindow(setWindowData);
    }, []);

    function parseDateKeyStart(dateKey: string): Date {
        const [y, m, d] = dateKey.split("-").map(Number);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    function parseDateKeyEnd(dateKey: string): Date {
        const [y, m, d] = dateKey.split("-").map(Number);
        return new Date(y, m - 1, d, 23, 59, 59, 999);
    }

    const windowParsed = useMemo(() => {
        if (!windowData) return null;

        const start = parseDateKeyStart(windowData.startDate);
        const end = parseDateKeyEnd(windowData.endDate);

        function formatPtBr(date: Date) {
            return date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
            });
        }

        return {
            open: windowData.open,
            start,
            end,
            startLabel: formatPtBr(start),
            endLabel: formatPtBr(end),
        };
    }, [windowData]);

    /* =========================
       LOAD SERVICE DAYS
    ========================= */

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            try {
                const days = await listActiveServiceDaysByMonth(year, month);
                if (alive) setServiceDays(days);
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [year, month]);

    const serviceDayMap = useMemo(() => {
        const map: Record<string, ServiceDay> = {};
        for (const d of serviceDays) {
            map[d.dateKey] = d;
        }
        return map;
    }, [serviceDays]);

    /* =========================
       LOAD MEMBER AVAILABILITY
    ========================= */

    useEffect(() => {
        if (!user?.uid) return;

        return listenMemberAvailabilityByMonth(user.uid, year, month, (items) => {
            const next: Record<string, MemberAvailabilityStatus> = {};

            for (const it of items) {
                const key = `${it.dateKey}__${it.serviceId}`;
                next[key] = it.status;
            }

            setStatusMap(next);
        });
    }, [user?.uid, year, month]);

    /* =========================
       CALENDAR DATA
    ========================= */

    const days = useMemo(() => getMonthDaysGrid(year, month), [year, month]);

    const monthLabel = useMemo(() => {
        return new Date(year, month).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
        });
    }, [year, month]);

    /* =========================
       RULES
    ========================= */

    function changeMonth(delta: number) {
        const d = new Date(year, month + delta);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
    }

    function canSelect(day: Date) {
        if (!windowParsed?.open) return false;
        return isBetween(day, windowParsed.start, windowParsed.end);
    }

    /* =========================
       ACTIONS
    ========================= */

    async function onSelectTurn(dateKey: string, serviceId: string) {
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
                year,
                month,
                current
            );
        } finally {
            setBusyKey(null);
        }
    }

    async function onDayPress(day: Date) {
        if (!user?.uid) return;
        if (isNaN(day.getTime())) return;

        const dateKey = toDateKey(day);
        const sd = serviceDayMap[dateKey];
        if (!sd) return;

        if (!windowParsed?.open) return;
        if (!canSelect(day)) return;

        const services = sd.services ?? [];

        if (services.length === 1) {
            await onSelectTurn(dateKey, services[0].id);
            return;
        }

        setSelectedDateKey(dateKey);
        setTurnModalOpen(true);
    }

    /* =========================
       UI HELPERS
    ========================= */

    function legend() {
        if (!windowParsed) return "⚠️ Janela não configurada pelo admin.";
        if (!windowParsed.open) return "🔒 Janela fechada — não é possível marcar.";
        return `🪟 Janela aberta: ${windowParsed.startLabel} → ${windowParsed.endLabel}`;
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader title="🗓️ Minha disponibilidade" />

            <View style={styles.wrapper}>
                <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
                    {legend()}
                </Text>

                {/* MONTH HEADER */}
                <View style={styles.monthRow}>
                    <Pressable
                        onPress={() => changeMonth(-1)}
                        style={[styles.navBtn, { borderColor: theme.colors.border }]}
                    >
                        <Text style={{ color: theme.colors.text, fontSize: 20  }}>◀</Text>
                    </Pressable>

                    <Text
                        style={{
                            color: theme.colors.text,
                            fontWeight: "600",
                            fontSize: 20,
                            textTransform: "capitalize",
                        }}
                    >
                        {monthLabel}
                    </Text>

                    <Pressable
                        onPress={() => changeMonth(1)}
                        style={[styles.navBtn, { borderColor: theme.colors.border }]}
                    >
                        <Text style={{ color: theme.colors.text, fontSize: 20 }}>▶</Text>
                    </Pressable>
                </View>

                {/* WEEKDAYS */}
                <View style={styles.weekRow}>
                    {weekDays.map((w) => (
                        <Text
                            key={w}
                            style={[styles.weekDay, { color: theme.colors.textMuted }]}
                        >
                            {w}
                        </Text>
                    ))}
                </View>

                {/* GRID */}
                <View style={styles.grid}>
                    {days.map((day, index) => {
                        const key = `${year}-${month}-${index}`;

                        if (isNaN(day.getTime())) {
                            return <View key={key} style={styles.day} />;
                        }

                        const dateKey = toDateKey(day);
                        const serviceDay = serviceDayMap[dateKey];
                        const hasService = !!serviceDay;

                        const selectable = hasService && canSelect(day);

                        return (
                            <Pressable
                                key={key}
                                disabled={!selectable}
                                onPress={() => onDayPress(day)}
                                style={[
                                    styles.day,
                                    {
                                        backgroundColor: hasService
                                            ? theme.colors.surface
                                            : "transparent",
                                        borderColor: hasService
                                            ? theme.colors.border
                                            : "transparent",
                                        opacity: selectable ? 1 : 0.4,
                                    },
                                ]}
                            >
                                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                                    {day.getDate()}
                                </Text>

                                {hasService && (
                                    <View style={styles.dots}>
                                        {serviceDay.services.map((s) => {
                                            const skey = `${dateKey}__${s.id}`;
                                            const status = statusMap[skey] ?? null;

                                            let color = theme.colors.textMuted;
                                            if (status === "available") color = theme.colors.success;
                                            if (status === "unavailable") color = theme.colors.danger;

                                            return (
                                                <View
                                                    key={skey}
                                                    style={[styles.dot, { backgroundColor: color }]}
                                                />
                                            );
                                        })}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* HELP */}
                <View style={[styles.helpCard, { borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                        Como marcar
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, marginTop: 6 }}>
                        Toque no dia → selecione o culto → alterne disponibilidade.
                    </Text>
                </View>

                {loading && (
                    <Text style={{ color: theme.colors.textMuted, marginTop: 10 }}>
                        ⏳ Carregando cultos do mês...
                    </Text>
                )}
            </View>

            {/* MODAL */}
            <TurnSelectModal
                visible={turnModalOpen}
                dateKey={selectedDateKey}
                serviceDay={selectedDateKey ? serviceDayMap[selectedDateKey] : null}
                statusMap={statusMap}
                busyKey={busyKey}
                onToggle={async (serviceId) => {
                    if (!selectedDateKey) return;
                    await onSelectTurn(selectedDateKey, serviceId);
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
   STYLES
========================= */

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        maxWidth: 420, // 🔑 igual AdminAvailability
        alignSelf: "center",
    },

    sub: {
        marginBottom: 16,
        fontSize: 13,
    },

    monthRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },

    navBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        minWidth: 48,
        alignItems: "center",
    },

    weekRow: {
        flexDirection: "row",
        marginBottom: 6,
    },

    weekDay: {
        width: "14.2857%",
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
    },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },

    day: {
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
        opacity: 0.9,
    },

    helpCard: {
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
    },
});