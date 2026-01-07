import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppScreen } from "@/components/layout/AppScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

import { listMinistries, Ministry } from "@/services/ministries";
import { listenUsers, AppUser } from "@/services/users";
import {
  listenMemberships,
  listenMembershipsByUser,
  Membership,
} from "@/services/memberships";

import { generateAndSaveDraftSchedules } from "@/services/schedule/scheduleGenerator";
import {
  listenSchedulesByMonth,
  Schedule,
  updateScheduleAssignment,
} from "@/services/schedule/schedules";

import {
  publishServiceSchedules,
  publishAllDraftSchedules,
} from "@/services/schedule/schedulePublish";

import {
  EditableMember,
  EditScheduleModal,
} from "@/components/modals/EditScheduleModal";

/* =========================
   HELPERS
========================= */

function formatServiceDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function firstName(name?: string) {
  return name?.trim().split(" ")[0] ?? "—";
}

function getNextMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
  };
}

/* =========================
   SCREEN
========================= */

export default function LeaderGenerateSchedule() {
  const { theme } = useTheme();
  const { profile } = useAuth();

  const { year, month } = getNextMonth();

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [myMemberships, setMyMemberships] = useState<Membership[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [generating, setGenerating] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<{
    schedule: Schedule;
  } | null>(null);

  const [allMemberships, setAllMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    const unsub = listenMemberships(setAllMemberships);
    return unsub;
  }, []);


  /* =========================
     LOAD BASE DATA
  ========================= */

  useEffect(() => {
    if (!profile?.uid) return;

    const u1 = listenMembershipsByUser(profile.uid, setMyMemberships);
    const u2 = listenSchedulesByMonth(year, month, setSchedules);
    const u3 = listenUsers(setUsers);

    listMinistries().then(setMinistries);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [profile?.uid, year, month]);

  useEffect(() => {
    if (!editTarget) {
      setSelectedPersonId(null);
      return;
    }

    setSelectedPersonId(
      editTarget.schedule.assignments[0]?.userId ?? null
    );
  }, [editTarget]);


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
      myMemberships
        .filter((m) => m.role === "leader" && m.active)
        .map((m) => m.ministryId),
    [myMemberships]
  );

  /* =========================
     DRAFT SCHEDULES
  ========================= */

  const draftSchedules = useMemo(
    () =>
      schedules.filter(
        (s) =>
          s.status === "draft" &&
          leaderMinistryIds.includes(s.ministryId)
      ),
    [schedules, leaderMinistryIds]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    draftSchedules.forEach((s) => {
      const key = `${s.serviceDate}__${s.serviceId}`;
      map[key] ??= [];
      map[key].push(s);
    });
    return map;
  }, [draftSchedules]);

  /* =========================
     ACTIONS
  ========================= */

  async function handleGenerate() {
    if (!profile || leaderMinistryIds.length === 0) return;

    setGenerating(true);
    try {
      await generateAndSaveDraftSchedules({
        leaderUserId: profile.uid,
        ministryIds: leaderMinistryIds,
        year,
        month,
        overwriteDraft: true,
      });
    } finally {
      setGenerating(false);
    }
  }

  function buildEditableMembers(schedule: Schedule): EditableMember[] {
    const ministryId = schedule.ministryId;

    const memberIds = allMemberships
      .filter(
        (m) =>
          m.ministryId === ministryId &&
          m.active
      )
      .map((m) => m.userId);

    return users
      .filter((u) => memberIds.includes(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        status: "confirmed",
      }));
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="🗓️ Gerar & revisar escala" back />

      <View style={styles.wrapper}>
        {/* GERAR */}
        <Pressable
          onPress={handleGenerate}
          disabled={generating}
          style={[
            styles.generateBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: generating ? 0.6 : 1,
            },
          ]}
        >
          {generating ? (
            <ActivityIndicator color={theme.colors.primaryContrast} />
          ) : (
            <Text
              style={{
                color: theme.colors.primaryContrast,
                fontWeight: "600",
              }}
            >
              Gerar escala automática
            </Text>
          )}
        </Pressable>

        {/* PUBLICAR TODA */}
        <Pressable
          disabled={draftSchedules.length === 0}
          onPress={() =>
            publishAllDraftSchedules(year, month, leaderMinistryIds)
          }
          style={[
            styles.publishAllBtn,
            { borderColor: theme.colors.border },
          ]}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
            Publicar toda a escala
          </Text>
        </Pressable>

        {/* LISTA */}
        {Object.entries(grouped).map(([key, items]) => {
          const ref = items[0];

          return (
            <View
              key={key}
              style={[
                styles.block,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.headerRow}>
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontWeight: "600",
                    textTransform: "capitalize"
                  }}
                >
                  {formatServiceDate(ref.serviceDate)} • {ref.serviceLabel}
                </Text>

                <Pressable
                  onPress={() =>
                    publishServiceSchedules(
                      ref.serviceDate,
                      ref.serviceId,
                      leaderMinistryIds
                    )
                  }
                  style={[
                    styles.editBtn,
                    { borderColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "600",
                    }}
                  >
                    Publicar
                  </Text>
                </Pressable>
              </View>

              {items.map((s) => (
                <View key={s.id} style={styles.assignmentRow}>
                  <View style={styles.rowHeader}>
                    <Text style={{ color: theme.colors.textMuted }}>
                      {ministryMap[s.ministryId]?.name}
                    </Text>

                    <Pressable
                      onPress={() => {
                        const currentAssigned = s.assignments[0]?.userId ?? null;

                        setEditTarget({
                          schedule: s,
                        });

                        setSelectedPersonId(currentAssigned);
                      }}
                      style={[
                        styles.editBtn,
                        { borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text }}>
                        Editar
                      </Text>
                    </Pressable>
                  </View>

                  {s.assignments.map((a) => (
                    <Text
                      key={a.userId}
                      style={{ color: theme.colors.text }}
                    >
                      • {firstName(userMap[a.userId]?.name)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        })}
      </View>

      {/* MODAL */}
      {editTarget && (
        <EditScheduleModal
          visible
          ministryName={
            ministryMap[editTarget.schedule.ministryId]?.name ?? "Ministério"
          }
          serviceDate={editTarget.schedule.serviceDate}
          serviceLabel={editTarget.schedule.serviceLabel}
          members={buildEditableMembers(editTarget.schedule)}
          selectedPersonId={selectedPersonId}
          onSelect={setSelectedPersonId}
          onCancel={() => {
            setEditTarget(null);
            setSelectedPersonId(null);
          }}
          onSave={async () => {
            if (!selectedPersonId) return;

            await updateScheduleAssignment(
              editTarget.schedule.id,
              selectedPersonId,
              editTarget.schedule.ministryId
            );

            setEditTarget(null);
            setSelectedPersonId(null);
          }}
        />
      )}
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
    gap: 12,
  },
  generateBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  publishAllBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  block: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  assignmentRow: {
    marginTop: 6,
    gap: 4,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
