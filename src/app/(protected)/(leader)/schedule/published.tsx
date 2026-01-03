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

function formatDateLabel(dateKey: string) {
  const date = new Date(dateKey + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
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

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] =
    useState<ConfirmTarget>(null);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubMemberships = listenMembershipsByUser(
      profile.uid,
      setMemberships
    );

    const unsubSchedules = listenSchedulesByMonth(
      year,
      month,
      setSchedules
    );

    const unsubUsers = listenUsers(setUsers);

    listMinistries().then(setMinistries);

    return () => {
      unsubMemberships();
      unsubSchedules();
      unsubUsers();
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
                fontWeight: "600",
              }}
            >
              🔄 Voltar mês inteiro para rascunho
            </Text>
          </Pressable>
        )}

        {Object.keys(grouped).length === 0 && (
          <Text
            style={{
              marginTop: 24,
              textAlign: "center",
              color: theme.colors.textMuted,
            }}
          >
            Nenhuma escala publicada neste mês
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
                  }}
                >
                  {ref.serviceLabel} •{" "}
                  {formatDateLabel(ref.serviceDate)}
                </Text>

                <Pressable
                  onPress={() => {
                    setConfirmTarget({
                      type: "single",
                      items,
                    });
                    setConfirmOpen(true);
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.danger,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Voltar
                  </Text>
                </Pressable>
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
                        •{" "}
                        {firstName(
                          userMap[a.personId]?.name
                        )}
                      </Text>
                    ))}
                  </View>
                ))}
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
});
