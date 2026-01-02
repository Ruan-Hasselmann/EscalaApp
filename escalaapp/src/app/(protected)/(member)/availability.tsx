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

/* =========================
   HELPERS
========================= */

function toDateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function sameDay(a: Date, b: Date) {
    return toDateKey(a) === toDateKey(b);
}

function isBetween(d: Date, start: Date, end: Date) {
    return d >= start && d <= end;
}

function getMonthDaysGrid(year: number, month: number) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Preenche "vazios" até alinhar com o dia da semana (Dom..Sáb)
    for (let i = 0; i < first.getDay(); i++) days.push(new Date(NaN));

    // Dias reais
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));

    // Completa a última semana até múltiplo de 7 (fica alinhado no web/mobile)
    while (days.length % 7 !== 0) days.push(new Date(NaN));

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
    const [statusMap, setStatusMap] = useState<Record<string, MemberAvailabilityStatus>>({});
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);


    /* =========================
       LOAD WINDOW (REALTIME)
    ========================= */

    useEffect(() => {
        return listenAvailabilityWindow((d) => setWindowData(d));
    }, []);

    const windowParsed = useMemo(() => {
        if (!windowData) return null;
        return {
            open: windowData.open,
            start: new Date(windowData.startDate),
            end: new Date(windowData.endDate),
        };
    }, [windowData]);

    /* =========================
       LOAD SERVICE DAYS (ADMIN)
    ========================= */

    useEffect(() => {
        let alive = true;

        async function loadServiceDays() {
            setLoading(true);
            try {
                const days = await listActiveServiceDaysByMonth(year, month);
                if (!alive) return;
                setServiceDays(days);
            } finally {
                if (alive) setLoading(false);
            }
        }

        loadServiceDays();

        return () => {
            alive = false;
        };
    }, [year, month]);

    const serviceDayMap = useMemo(() => {
        const map: Record<string, ServiceDay> = {};
        for (const d of serviceDays) map[d.dateKey] = d;
        return map;
    }, [serviceDays]);

    /* =========================
       LOAD MEMBER AVAILABILITY (REALTIME)
    ========================= */

    useEffect(() => {
        if (!user?.uid) return;

        return listenMemberAvailabilityByMonth(user.uid, year, month, (items) => {
            const next: Record<string, MemberAvailabilityStatus> = {};
            for (const it of items) next[it.dateKey] = it.status;
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

    function isServiceDay(day: Date) {
        const key = toDateKey(day);
        console.log("serviceDays:", serviceDays.map(d => d.dateKey));
        console.log("calendar:", toDateKey(day));

        return Boolean(serviceDayMap[key]);
    }

    function canSelect(day: Date) {
        if (!windowParsed?.open) return false;
        return isBetween(day, windowParsed.start, windowParsed.end);
    }

    /* =========================
       ACTION
    ========================= */

    async function onDayPress(day: Date) {
        if (!user?.uid) return;
        if (isNaN(day.getTime())) return;

        const dateKey = toDateKey(day);

        // só permite clicar em dia que tem culto
        if (!serviceDayMap[dateKey]) return;

        // só permite dentro da janela aberta
        if (!windowParsed || !windowParsed.open) return;
        if (!canSelect(day)) return;

        if (busyKey) return;

        try {
            setBusyKey(dateKey);
            const current = statusMap[dateKey] ?? null;
            await toggleMemberAvailability(user.uid, dateKey, year, month, current);
            // o listener atualiza statusMap automaticamente
        } finally {
            setBusyKey(null);
        }
    }

    /* =========================
       UI HELPERS
    ========================= */

    function legend() {
        const open = windowParsed?.open;
        if (!windowParsed) return "⚠️ Janela não configurada pelo admin.";
        if (!open) return "🔒 Janela fechada — não é possível marcar.";
        return `🪟 Janela aberta: ${windowData!.startDate} → ${windowData!.endDate}`;
    }

    function dayBadgeColor(status: MemberAvailabilityStatus | null) {
        if (status === "available") return theme.colors.success;
        if (status === "unavailable") return theme.colors.danger;
        return "transparent";
    }

    function dayTextColor(isSelectable: boolean, status: MemberAvailabilityStatus | null) {
        if (status) return theme.colors.primaryContrast;
        if (!isSelectable) return theme.colors.textMuted;
        return theme.colors.text;
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader title="🗓️ Minha disponibilidade" />

            <View style={styles.wrapper}>
                {/* TOP INFO */}
                <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
                    {legend()}
                </Text>

                {/* MONTH HEADER */}
                <View style={styles.monthRow}>
                    <Pressable
                        onPress={() => changeMonth(-1)}
                        style={[styles.navBtn, { borderColor: theme.colors.border }]}
                    >
                        <Text style={{ color: theme.colors.text }}>◀</Text>
                    </Pressable>

                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                        {monthLabel}
                    </Text>

                    <Pressable
                        onPress={() => changeMonth(1)}
                        style={[styles.navBtn, { borderColor: theme.colors.border }]}
                    >
                        <Text style={{ color: theme.colors.text }}>▶</Text>
                    </Pressable>
                </View>

                {/* WEEKDAYS */}
                <View style={styles.weekRow}>
                    {weekDays.map((w, idx) => (
                        <Text
                            key={`weekday-${idx}`}
                            style={[styles.weekDay, { color: theme.colors.textMuted }]}
                        >
                            {w}
                        </Text>
                    ))}
                </View>

                {/* CALENDAR GRID */}
                <View style={styles.grid}>
                    {days.map((day, index) => {
                        const key = `${year}-${month}-${index}`;

                        if (isNaN(day.getTime())) return <View key={key} style={styles.day} />;

                        const dateKey = toDateKey(day);
                        const hasService = isServiceDay(day);

                        const status = statusMap[dateKey] ?? null;

                        const selectable = hasService && !!windowParsed?.open && canSelect(day);
                        const disabled = !selectable;

                        const bg =
                            status
                                ? dayBadgeColor(status)
                                : hasService
                                    ? theme.colors.surface
                                    : "transparent";

                        const border =
                            hasService
                                ? theme.colors.border
                                : "transparent";

                        const opacity = hasService ? (disabled ? 0.5 : 1) : 0.25;

                        // quantidade de cultos no dia (bolinha/dot)
                        const serviceCount = serviceDayMap[dateKey]?.services?.length ?? 0;

                        return (
                            <Pressable
                                key={key}
                                onPress={() => onDayPress(day)}
                                disabled={!hasService}
                                style={[
                                    styles.day,
                                    {
                                        backgroundColor: bg,
                                        borderColor: border,
                                        opacity,
                                    },
                                    busyKey === dateKey && { opacity: 0.6 },
                                ]}
                            >
                                <Text style={{ color: dayTextColor(selectable, status), fontWeight: "600" }}>
                                    {day.getDate()}
                                </Text>

                                {hasService && (
                                    <View style={styles.dots}>
                                        {Array.from({ length: Math.min(serviceCount, 3) }).map((_, i) => (
                                            <View
                                                key={`${dateKey}-dot-${i}`}
                                                style={[
                                                    styles.dot,
                                                    {
                                                        backgroundColor: status
                                                            ? theme.colors.primaryContrast
                                                            : theme.colors.textMuted,
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* FOOTER HELP */}
                <View style={[styles.helpCard, { borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 6 }}>
                        Como marcar
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, lineHeight: 18 }}>
                        Toque em um dia com culto para alternar:{" "}
                        <Text style={{ color: theme.colors.success, fontWeight: "700" }}>Disponível</Text>{" "}
                        →{" "}
                        <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Indisponível</Text>{" "}
                        → limpar.
                    </Text>
                </View>

                {loading && (
                    <Text style={{ color: theme.colors.textMuted, marginTop: 10 }}>
                        ⏳ Carregando cultos do mês...
                    </Text>
                )}
            </View>
        </AppScreen>
    );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        maxWidth: 520, // web mais agradável
        alignSelf: "center",
    },
    sub: {
        marginBottom: 12,
        fontSize: 13,
    },
    monthRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    navBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 44,
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
        fontWeight: "700",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    day: {
        width: "14.2857%",
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
        paddingTop: 4,
    },
    dots: {
        flexDirection: "row",
        gap: 4,
        marginTop: 6,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 99,
        opacity: 0.9,
    },
    helpCard: {
        marginTop: 14,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
    },
});
