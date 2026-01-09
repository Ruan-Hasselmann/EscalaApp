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
  listenMembershipsByUser,
  listenMemberships,
  Membership,
} from "@/services/memberships";

import { generateAndSaveDraftSchedules } from "@/services/schedule/scheduleGenerator";
import {
  listenSchedulesByMonth,
  Schedule,
  updateScheduleAssignment,
} from "@/services/schedule/schedules";
import { publishSchedulesByIds } from "@/services/schedule/schedulePublish";
import {
  EditScheduleModal,
  EditableMember,
} from "@/components/modals/EditScheduleModal";

import {
  evaluateMemberForSchedule,
} from "@/services/schedule/schedulesRules";

/* =========================
   TYPES
========================= */

type EditableMemberWithRules = EditableMember & {
  selectable: boolean;
  flags: { type: string; message: string }[];
};

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
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function getServicePublishStatus(items: Schedule[]) {
  const total = items.length;
  const published = items.filter(
    (s) => s.status === "published"
  ).length;

  if (published === 0) return "draft";
  if (published < total) return "partial";
  return "published";
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
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [myMemberships, setMyMemberships] = useState<Membership[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [generating, setGenerating] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedMinistryId, setSelectedMinistryId] =
    useState<string | "ALL">("ALL");

  /* =========================
     LOAD BASE DATA
  ========================= */

  useEffect(() => {
    if (!profile?.uid) return;

    const u1 = listenMembershipsByUser(profile.uid, setMyMemberships);
    const u2 = listenSchedulesByMonth(year, month, setSchedules);
    const u3 = listenUsers(setUsers);
    const u4 = listenMemberships(setMemberships);

    listMinistries().then(setMinistries);

    return () => {
      u1();
      u2();
      u3();
      u4();
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

  const leaderMinistryIds = useMemo(
    () =>
      myMemberships
        .filter((m) => m.role === "leader" && m.active)
        .map((m) => m.ministryId),
    [myMemberships]
  );

  const leaderMinistries = useMemo(
    () => ministries.filter((m) => leaderMinistryIds.includes(m.id)),
    [ministries, leaderMinistryIds]
  );

  /* =========================
     DRAFTS
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

  const publishedSchedules = useMemo(
    () =>
      schedules.filter(
        (s) =>
          s.status === "published" &&
          leaderMinistryIds.includes(s.ministryId)
      ),
    [schedules, leaderMinistryIds]
  );

  const hasPublishedForSelectedMinistry = useMemo(() => {
    if (selectedMinistryId === "ALL") {
      return publishedSchedules.length > 0;
    }

    return publishedSchedules.some(
      (s) => s.ministryId === selectedMinistryId
    );
  }, [publishedSchedules, selectedMinistryId]);

  const isDisabled = draftSchedules.length === 0;

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
     MODAL MEMBERS (COM REGRAS)
  ========================= */

  function buildMembersForModal(
    schedule: Schedule
  ): EditableMemberWithRules[] {
    if (!schedule || !memberships.length || !users.length) return [];

    const assignedUserIdsInService = schedules
      .filter(
        (s) =>
          s.serviceDate === schedule.serviceDate &&
          s.serviceId === schedule.serviceId
      )
      .flatMap((s) => s.assignments.map((a) => a.userId));

    const assignedUserIdsInDay = schedules
      .filter((s) => s.serviceDate === schedule.serviceDate)
      .flatMap((s) => s.assignments.map((a) => a.userId));

    return memberships
      .filter(
        (m) =>
          m.ministryId === schedule.ministryId &&
          m.active
      )
      .map((m) => {
        const user = userMap[m.userId];
        if (!user) return null;

        const flags = evaluateMemberForSchedule({
          candidateUserId: m.userId,
          assignedUserIdsInService,
          assignedUserIdsInDay,
          usersMap: userMap,
        });

        return {
          id: m.userId,
          name: user.name,
          status: "confirmed",
          selectable: flags.length === 0,
          flags,
        };
      })
      .filter(Boolean) as EditableMemberWithRules[];
  }

  /* =========================
     ACTIONS
  ========================= */

  async function handleGenerate() {
    if (!profile || leaderMinistryIds.length === 0) return;

    setGenerating(true);
    try {
      const ministryIdsToGenerate =
        selectedMinistryId === "ALL"
          ? leaderMinistryIds
          : [selectedMinistryId];

      await generateAndSaveDraftSchedules({
        leaderUserId: profile.uid,
        ministryIds: ministryIdsToGenerate,
        year,
        month,
      });
    } finally {
      setGenerating(false);
    }
  }

  function groupAssignmentsByMinistry(items: Schedule[]) {
    const map: Record<
      string,
      { ministryId: string; userIds: string[] }
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

    return Object.values(map).sort((a, b) => {
      const nameA =
        ministryMap[a.ministryId]?.name?.toLowerCase() ?? "";
      const nameB =
        ministryMap[b.ministryId]?.name?.toLowerCase() ?? "";

      return nameA.localeCompare(nameB, "pt-BR");
    });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="🗓️ Gerar & revisar escala" back />

      <View style={styles.wrapper}>

        {/* SELECT DE MINISTÉRIO */}
        {leaderMinistries.length > 1 && (
          <View style={styles.selectWrapper}>
            <Text style={styles.selectLabel}>Gerar escala para</Text>

            <View style={styles.selectBox}>
              <Pressable
                onPress={() => setSelectedMinistryId("ALL")}
                style={[
                  styles.selectOption,
                  selectedMinistryId === "ALL" &&
                  styles.selectOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.selectText,
                    selectedMinistryId === "ALL" &&
                    styles.selectTextActive,
                  ]}
                >
                  Todos os meus ministérios
                </Text>
              </Pressable>

              {leaderMinistries.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMinistryId(m.id)}
                  style={[
                    styles.selectOption,
                    selectedMinistryId === m.id &&
                    styles.selectOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.selectText,
                      selectedMinistryId === m.id &&
                      styles.selectTextActive,
                    ]}
                  >
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* GERAR */}
        <Pressable
          onPress={handleGenerate}
          disabled={generating || hasPublishedForSelectedMinistry}
          style={[
            styles.generateBtn,
            {
              backgroundColor: hasPublishedForSelectedMinistry
                ? theme.colors.border
                : theme.colors.primary,
              opacity: generating || hasPublishedForSelectedMinistry ? 0.6 : 1,
            },
          ]}
        >
          {generating ? (
            <ActivityIndicator color={theme.colors.primaryContrast} />
          ) : (
            <Text
              style={{
                color: hasPublishedForSelectedMinistry
                  ? theme.colors.textMuted
                  : theme.colors.primaryContrast,
                fontWeight: "600",
              }}
            >
              {hasPublishedForSelectedMinistry
                ? "Escala já publicada"
                : "Gerar escala automática"}
            </Text>
          )}
        </Pressable>

        {/* LISTAGEM */}
        {Object.entries(grouped).map(([key, items]) => {
          const ref = items[0];
          const status = getServicePublishStatus(items);

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
                disabled={status === "published"}
                  onPress={async () => {
                    // 🔹 schedules realmente visíveis nesse bloco
                    const scheduleIds = items.map((s) => s.id);

                    // 🔹 ministérios realmente presentes nesse culto
                    const ministryIds = Array.from(
                      new Set(items.map((s) => s.ministryId))
                    );

                    await publishSchedulesByIds({
                      scheduleIds,
                      ministryIds,
                      context: {
                        type: "service",
                        serviceDate: ref.serviceDate,
                        serviceId: ref.serviceId,
                        serviceLabel: ref.serviceLabel,
                        month,
                        year,
                      },
                    });
                  }}
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
                    {status === "published"
                      ? "Publicado"
                      : status === "partial"
                        ? "Publicar pendentes"
                        : "Publicar"}
                  </Text>
                </Pressable>
              </View>

              {groupAssignmentsByMinistry(items).map((group) => (
                <View key={group.ministryId} style={styles.assignmentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textMuted }}>
                      {ministryMap[group.ministryId]?.name}
                    </Text>

                    {group.userIds.map((userId) => {
                      const slotSchedule = items.find(
                        (s) =>
                          s.ministryId === group.ministryId &&
                          s.assignments.some((a) => a.userId === userId)
                      );

                      if (!slotSchedule) return null;

                      return (
                        <View
                          key={userId}
                          style={styles.assignmentRow}
                        >
                          <Text style={{ color: theme.colors.text }}>
                            • {firstName(userMap[userId]?.name)}
                          </Text>

                          <Pressable
                            onPress={() => {
                              setEditSchedule(slotSchedule);
                              setSelectedPersonId(userId);
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
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* PUBLICAR TUDO */}
        <Pressable
          disabled={isDisabled}
          onPress={async () => {
            // 🔹 todos os drafts visíveis para o líder
            const scheduleIds = draftSchedules.map((s) => s.id);

            // 🔹 ministérios realmente presentes nos drafts
            const ministryIds = Array.from(
              new Set(draftSchedules.map((s) => s.ministryId))
            );

            await publishSchedulesByIds({
              scheduleIds,
              ministryIds,
              context: {
                type: "month",
                month,
                year,
              },
            });
          }}
          style={[
            styles.publishAllBtn,
            {
              backgroundColor: isDisabled
                ? theme.colors.border
                : theme.colors.primary,
              opacity: isDisabled ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: isDisabled
                ? theme.colors.textMuted
                : theme.colors.primaryContrast,
              fontWeight: "600",
            }}
          >
            Publicar toda a escala
          </Text>
        </Pressable>
      </View>

      {/* MODAL */}
      <EditScheduleModal
        visible={!!editSchedule}
        ministryName={
          ministryMap[editSchedule?.ministryId ?? ""]?.name ?? ""
        }
        serviceLabel={editSchedule?.serviceLabel ?? ""}
        serviceDate={editSchedule?.serviceDate ?? ""}
        members={
          editSchedule
            ? buildMembersForModal(editSchedule)
            : []
        }
        selectedPersonId={selectedPersonId}
        onSelect={(id) => {
          const member = editSchedule
            ? buildMembersForModal(editSchedule).find(
              (m) => m.id === id
            )
            : null;

          if (!member || !member.selectable) return;
          setSelectedPersonId(id);
        }}
        onCancel={() => {
          setEditSchedule(null);
          setSelectedPersonId(null);
        }}
        onSave={async () => {
          if (!editSchedule || !selectedPersonId) return;

          await updateScheduleAssignment(
            editSchedule.id,
            selectedPersonId,
            editSchedule.ministryId
          );

          setEditSchedule(null);
          setSelectedPersonId(null);
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
    paddingVertical: 14,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 72,
    alignItems: "center",
  },
  selectWrapper: {
    gap: 6,
  },
  selectLabel: {
    fontSize: 13,
    color: "#999",
    fontWeight: "600",
  },
  selectBox: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    overflow: "hidden",
  },
  selectOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#0b1220",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  selectOptionActive: {
    backgroundColor: "#2563eb",
  },
  selectText: {
    color: "#cbd5e1",
    fontWeight: "600",
  },
  selectTextActive: {
    color: "#fff",
  },
});
