import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { listSchedulesByMonth, Schedule } from "@/services/schedules";
import { listLeaderMinistryIds } from "@/services/memberships";
import { useRouter } from "expo-router";

export default function LeaderSchedules() {
    const { profile } = useAuth();
    const { theme } = useTheme();

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<Schedule[]>([]);

    useEffect(() => {
        if (!profile) return;

        const profileId = profile.uid;

        async function load() {
            setLoading(true);

            const ministryIds = await listLeaderMinistryIds(profileId);

            const data = await listSchedulesByMonth(
                ministryIds,
                year,
                month
            );

            setSchedules(data);
            setLoading(false);
        }

        load();
    }, [profile, year, month]);


    const monthLabel = useMemo(() => {
        return new Date(year, month).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
        });
    }, [year, month]);

    function changeMonth(delta: number) {
        const d = new Date(year, month + delta);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
    }

    function EmptyState() {
        const router = useRouter();
        const { theme } = useTheme();

        return (
            <View style={{ alignItems: "center", gap: 16, marginTop: 48 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>
                    📭 Nenhuma escala neste mês
                </Text>

                <Pressable
                    onPress={() => router.push("/(protected)/(leader)/generate")}
                    style={{
                        backgroundColor: theme.colors.primary,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 10,
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors.primaryContrast,
                            fontWeight: "600",
                        }}
                    >
                        ➕ Gerar escala
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <AppScreen>
            <AppHeader title="📅 Escalas" />

            <View style={styles.monthRow}>
                <Pressable
                    onPress={() => changeMonth(-1)}
                    style={[styles.monthBtn, { borderColor: theme.colors.border }]}
                >
                    <Text style={{ color: theme.colors.text }}>◀</Text>
                </Pressable>

                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                    {monthLabel}
                </Text>

                <Pressable
                    onPress={() => changeMonth(1)}
                    style={[styles.monthBtn, { borderColor: theme.colors.border }]}
                >
                    <Text style={{ color: theme.colors.text }}>▶</Text>
                </Pressable>
            </View>

            {loading && (
                <Text style={{ color: theme.colors.textMuted }}>
                    ⏳ Carregando escalas...
                </Text>
            )}

            {!loading && schedules.length === 0 && (
                <Text style={{ color: theme.colors.textMuted }}>
                    📭 Nenhuma escala neste mês
                </Text>
            )}

            {schedules.map((s) => (
                <View
                    key={s.id}
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                        {s.serviceLabel}
                    </Text>

                    <Text style={{ color: theme.colors.textMuted }}>
                        {new Date(s.serviceDate).toLocaleDateString("pt-BR")}
                    </Text>

                    <Text
                        style={{
                            color:
                                s.status === "published"
                                    ? theme.colors.success
                                    : theme.colors.warning,
                        }}
                    >
                        {s.status === "published" ? "Publicado" : "Rascunho"}
                    </Text>
                </View>
            ))}
        </AppScreen>
    );
}

const styles = StyleSheet.create({
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
    card: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
});
