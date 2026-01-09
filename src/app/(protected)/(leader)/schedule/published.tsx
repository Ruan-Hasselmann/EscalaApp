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
import { listenGeneralScheduleByMonth } from "@/services/schedule/generalSchedules";

/* =========================
   HELPERS
========================= */

function firstName(name?: string) {
  return name?.split(" ")[0] ?? "—";
}

function formatDatePtBr(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function groupAssignmentsByMinistry(items: Schedule[]) {
  const map: Record<
    string,
    {
      ministryId: string;
      userIds: string[];
    }
  > = {};

  items.forEach((s) => {
    if (!map[s.ministryId]) {
      map[s.ministryId] = {
        ministryId: s.ministryId,
        userIds: [],
      };
    }

    s.assignments.forEach((a) => {
      map[s.ministryId].userIds.push(a.userId);
    });
  });

  return Object.values(map);
}

/**
 * 🔥 Domínio do app:
 * sempre trabalhar com o MÊS ALVO (mês seguinte)
 * e salvar month como 1–12
 */
function getTargetMonth() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    year: target.getFullYear(),
    month: target.getMonth() + 1, // ✅ 1–12
  };
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

  const { year, month } = getTargetMonth();

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [generalPublished, setGeneralPublished] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] =
    useState<ConfirmTarget>(null);

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

  useEffect(() => {
    if (!profile) return;

    return listenGeneralScheduleByMonth(
      year,
      month,
      (general) => {
        setGeneralPublished(!!general);
      }
    );
  }, [profile, year, month]);


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

  const leaderMinistryIds = useMemo(
    () =>
      memberships
        .filter((m) => m.role === "leader" && m.active)
        .map((m) => m.ministryId),
    [memberships]
  );

  /* =========================
     ONLY PUBLISHED (SAFE)
  ========================= */

  const published = useMemo(
    () =>
      schedules.filter(
        (s) =>
          s.status === "published" &&
          leaderMinistryIds.includes(s.ministryId)
      ),
    [schedules, leaderMinistryIds]
  );

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
     ACTIONS
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
      <AppHeader title="📅 Escalas publicadas" back />

      <ScrollView style={styles.wrapper}>
        {published.length > 0 && (
          <Pressable
            disabled={generalPublished}
            style={[
              styles.monthBtn,
              {
                borderColor: generalPublished
                  ? theme.colors.border
                  : theme.colors.danger,
                opacity: generalPublished ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (generalPublished) return;

              setConfirmTarget({
                type: "month",
                items: published,
              });
              setConfirmOpen(true);
            }}
          >
            <Text
              style={{
                color: generalPublished
                  ? theme.colors.textMuted
                  : theme.colors.danger,
                fontWeight: "700",
              }}
            >
              {generalPublished
                ? "🔒 Escala geral publicada"
                : "🔄 Voltar TODAS para rascunho"}
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
            Nenhuma escala publicada para este mês.
            {"\n"}
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

              {groupAssignmentsByMinistry(items)
                .sort((a, b) =>
                  (ministryMap[a.ministryId]?.name ?? "").localeCompare(
                    ministryMap[b.ministryId]?.name ?? "",
                    "pt-BR"
                  )
                )
                .map((group) => (
                  <View key={group.ministryId} style={styles.block}>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {ministryMap[group.ministryId]?.name}
                    </Text>

                    {group.userIds.map((userId) => (
                      <Text
                        key={userId}
                        style={{
                          color: theme.colors.text,
                          fontSize: 14,
                        }}
                      >
                        • {firstName(userMap[userId]?.name)}
                      </Text>
                    ))}
                  </View>
                ))}
              <Pressable
                disabled={generalPublished}
                onPress={() => {
                  if (generalPublished) return;

                  setConfirmTarget({
                    type: "single",
                    items,
                  });
                  setConfirmOpen(true);
                }}
                style={[
                  styles.editBtn,
                  {
                    borderColor: generalPublished
                      ? theme.colors.border
                      : theme.colors.danger,
                    opacity: generalPublished ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: generalPublished
                      ? theme.colors.textMuted
                      : theme.colors.danger,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {generalPublished
                    ? "🔒 Escala geral publicada"
                    : "Voltar para rascunho"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

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
  block: {
    marginTop: 6,
    paddingLeft: 6,
  },
  editBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
