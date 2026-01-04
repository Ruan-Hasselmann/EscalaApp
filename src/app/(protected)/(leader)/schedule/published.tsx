import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { ConfirmActionModal } from "@/components/modals/ConfirmActionModal";

import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

import { listMinistries, Ministry } from "@/services/ministries";
import {
  listenMembershipsByUser,
  Membership,
} from "@/services/memberships";

import {
  listenSchedulesByMonth,
  Schedule,
  revertScheduleToDraft,
} from "@/services/schedule/schedules";

import { listenUsers, AppUser } from "@/services/users";

/* =========================
   HELPERS
========================= */

function firstName(name?: string) {
  if (!name) return "";
  return name.split(" ")[0];
}

function formatDatePtBr(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function getNextMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

type ConfirmTarget =
  | { type: "single"; items: Schedule[] }
  | { type: "month"; items: Schedule[] }
  | null;

/* =========================
   SCREEN
========================= */

export default function LeaderPublishedSchedules() {
  const { theme } = useTheme();
  const { profile } = useAuth();

  const { year, month } = getNextMonth();

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] =
    useState<ConfirmTarget>(null);

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    if (!profile?.uid) return;

    const u1 = listenMembershipsByUser(profile.uid, setMemberships);
    const u2 = listenSchedulesByMonth(year, month, setSchedules);
    const u3 = listenUsers(setUsers);

    listMinistries().then(setMinistries);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [profile?.uid, year, month]);

  /* =========================
     MAPS
  ========================= */

  const userMap = useMemo(() => {
    const map: Record<string, AppUser> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  const ministryMap = useMemo(() => {
    const map: Record<string, Ministry> = {};
    ministries.forEach((m) => (map[m.id] = m));
    return map;
  }, [ministries]);

  const leaderMinistryIds = useMemo(() => {
    return memberships
      .filter((m) => m.role === "leader" && m.active)
      .map((m) => m.ministryId);
  }, [memberships]);

  /* =========================
     ONLY PUBLISHED
  ========================= */

  const published = useMemo(() => {
    return schedules.filter(
      (s) =>
        s.status === "published" &&
        leaderMinistryIds.includes(s.ministryId)
    );
  }, [schedules, leaderMinistryIds]);

  /* =========================
     GROUP BY SERVICE
  ========================= */

  const grouped = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    published.forEach((s) => {
      const key = `${s.serviceDate}__${s.serviceId}`;
      map[key] ??= [];
      map[key].push(s);
    });
    return map;
  }, [published]);

  /* =========================
     ACTION
  ========================= */

  async function handleConfirmRevert() {
    if (!confirmTarget) return;

    for (const s of confirmTarget.items) {
      await revertScheduleToDraft(s.id);
    }

    setConfirmOpen(false);
    setConfirmTarget(null);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="📅 Escalas publicadas" />

      <ScrollView style={styles.wrapper}>
        {published.length > 0 && (
          <Pressable
            style={[
              styles.monthBtn,
              { borderColor: theme.colors.danger },
            ]}
            onPress={() => {
              setConfirmTarget({
                type: "month",
                items: published,
              });
              setConfirmOpen(true);
            }}
          >
            <Text
              style={{
                color: theme.colors.danger,
                fontWeight: "700",
              }}
            >
              🔄 Voltar TODAS para rascunho
            </Text>
          </Pressable>
        )}

        {Object.keys(grouped).length === 0 && (
          <Text
            style={{
              marginTop: 32,
              textAlign: "center",
              color: theme.colors.textMuted,
              lineHeight: 20,
            }}
          >
            Nenhuma escala publicada para este mês.{"\n"}
            As escalas aparecerão aqui após a publicação.
          </Text>
        )}

        {Object.entries(grouped).map(([key, items]) => {
          const ref = items[0];

          return (
            <View
              key={key}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* HEADER */}
              <View style={styles.headerRow}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "700",
                    fontSize: 15,
                    textTransform: "capitalize",
                  }}
                >
                  {ref.serviceLabel} •{" "}
                  {formatDatePtBr(ref.serviceDate)}
                </Text>
              </View>

              {/* MINISTRIES */}
              {items
                .slice()
                .sort((a, b) =>
                  (ministryMap[a.ministryId]?.name ?? "").localeCompare(
                    ministryMap[b.ministryId]?.name ?? "",
                    "pt-BR"
                  )
                )
                .map((s) => (
                  <View key={s.id} style={styles.block}>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {ministryMap[s.ministryId]?.name}
                    </Text>

                    {s.assignments.map((a) => (
                      <Text
                        key={a.personId}
                        style={{
                          color: theme.colors.text,
                          fontSize: 14,
                        }}
                      >
                        • {firstName(userMap[a.personId]?.name)}
                      </Text>
                    ))}
                  </View>
                ))}
              <Pressable
                onPress={() => {
                  setConfirmTarget({
                    type: "single",
                    items,
                  });
                  setConfirmOpen(true);
                }}
                style={[
                  styles.editBtn,
                  {
                    borderColor: theme.colors.danger,
                    alignItems: "center"
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Voltar para rascunho
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* CONFIRM MODAL */}
      <ConfirmActionModal
        visible={confirmOpen}
        title="Voltar para rascunho"
        description={
          confirmTarget?.type === "month"
            ? "Todas as escalas publicadas deste mês voltarão para rascunho."
            : "A escala deste culto voltará para rascunho."
        }
        confirmLabel="Confirmar"
        danger
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={handleConfirmRevert}
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
    maxWidth: 520,
    alignSelf: "center",
    paddingTop: 12,
  },
  monthBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  block: {
    marginTop: 6,
    paddingLeft: 6,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
