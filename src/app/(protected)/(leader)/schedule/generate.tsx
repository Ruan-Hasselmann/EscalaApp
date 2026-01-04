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
  listenMembershipsByMinistry,
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
  MemberAvailability,
  MemberAvailabilityStatus,
} from "@/services/memberAvailability";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase";

import { EditScheduleModal } from "@/components/modals/EditScheduleModal";

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

function firstName(name: string) {
  return name.trim().split(" ")[0];
}

function getNextMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

async function fetchMemberAvailabilityForUsersByMonth(
  userIds: string[],
  year: number,
  month: number
): Promise<MemberAvailability[]> {
  if (userIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }

  const all: MemberAvailability[] = [];

  for (const chunk of chunks) {
    const q = query(
      collection(db, "memberAvailability"),
      where("userId", "in", chunk),
      where("year", "==", year),
      where("month", "==", month)
    );

    const snap = await getDocs(q);

    const items: MemberAvailability[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MemberAvailability, "id">),
    }));

    all.push(...items);
  }

  return all;
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
  const [ministryMemberships, setMinistryMemberships] =
    useState<Membership[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [availabilities, setAvailabilities] =
    useState<MemberAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<Schedule | null>(null);
  const [selectedPersonId, setSelectedPersonId] =
    useState<string | null>(null);

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

  /* =========================
     LOAD MEMBERS OF SELECTED MINISTRY
  ========================= */

  useEffect(() => {
    if (!selectedSchedule) return;

    return listenMembershipsByMinistry(
      selectedSchedule.ministryId,
      setMinistryMemberships
    );
  }, [selectedSchedule]);

  /* =========================
     LOAD AVAILABILITY (MODAL)
  ========================= */

  useEffect(() => {
    const shouldLoad =
      editOpen &&
      !!selectedSchedule &&
      ministryMemberships.length > 0;

    if (!shouldLoad) return;

    let cancelled = false;

    async function load() {
      try {
        setLoadingAvailability(true);

        const memberIds = ministryMemberships
          .filter((m) => m.active)
          .map((m) => m.userId);

        const items = await fetchMemberAvailabilityForUsersByMonth(
          memberIds,
          year,
          month
        );

        if (!cancelled) setAvailabilities(items);
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [editOpen, selectedSchedule, ministryMemberships, year, month]);

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
    return myMemberships
      .filter((m) => m.role === "leader" && m.active)
      .map((m) => m.ministryId);
  }, [myMemberships]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, MemberAvailabilityStatus>();
    for (const a of availabilities) {
      map.set(`${a.userId}__${a.dateKey}__${a.serviceId}`, a.status);
    }
    return map;
  }, [availabilities]);

  /* =========================
     DRAFT SCHEDULES
  ========================= */

  const draftSchedules = useMemo(() => {
    return schedules.filter(
      (s) =>
        s.status === "draft" &&
        leaderMinistryIds.includes(s.ministryId)
    );
  }, [schedules, leaderMinistryIds]);

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
     MEMBERS FOR MODAL
  ========================= */

  const membersDoMinisterio = useMemo(() => {
    if (!selectedSchedule) return [];

    return ministryMemberships
      .filter((m) => m.active)
      .filter((m) => {
        const alreadyAssigned = schedules.some(
          (s) =>
            s.serviceDate === selectedSchedule.serviceDate &&
            s.serviceId === selectedSchedule.serviceId &&
            s.assignments.some((a) => a.personId === m.userId)
        );

        if (alreadyAssigned) return false;

        const availabilityKey = `${m.userId}__${selectedSchedule.serviceDate}__${selectedSchedule.serviceId}`;
        if (availabilityMap.get(availabilityKey) === "unavailable")
          return false;

        return true;
      })
      .map((m) => {
        const user = userMap[m.userId];
        return {
          id: m.userId,
          name: user?.name ?? m.userId,
          status: "confirmed" as const,
        };
      });
  }, [
    selectedSchedule,
    ministryMemberships,
    schedules,
    availabilityMap,
    userMap,
  ]);

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

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="🗓️ Gerar & revisar escala" />

      <View style={styles.wrapper}>
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

        <Pressable
          onPress={() =>
            publishAllDraftSchedules(year, month, leaderMinistryIds)
          }
          disabled={draftSchedules.length === 0}
          style={[
            styles.publishAllBtn,
            { borderColor: theme.colors.border },
          ]}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
            }}
          >
            Publicar toda a escala
          </Text>
        </Pressable>

        {Object.entries(grouped).map(([key, items]) => {
          const ref = items[0];

          return (
            <View
              key={key}
              style={[
                styles.block,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.headerRow}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "600",
                    flex: 1,
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
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Publicar
                  </Text>
                </Pressable>
              </View>

              {items.map((s) => (
                <View key={s.id} style={styles.assignmentRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: 13,
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
                        {userMap[a.personId]
                          ? firstName(userMap[a.personId].name)
                          : a.personId}
                      </Text>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => {
                      setSelectedSchedule(s);
                      setSelectedPersonId(
                        s.assignments[0]?.personId ?? null
                      );
                      setEditOpen(true);
                    }}
                    style={[
                      styles.editBtn,
                      { borderColor: theme.colors.border },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Editar
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}
      </View>

      <EditScheduleModal
        visible={editOpen}
        ministryName={
          ministryMap[selectedSchedule?.ministryId ?? ""]?.name ?? ""
        }
        serviceLabel={selectedSchedule?.serviceLabel ?? ""}
        serviceDate={selectedSchedule?.serviceDate ?? ""}
        members={membersDoMinisterio}
        selectedPersonId={selectedPersonId}
        onSelect={setSelectedPersonId}
        onCancel={() => {
          setEditOpen(false);
          setSelectedSchedule(null);
          setAvailabilities([]);
        }}
        onSave={async () => {
          if (!selectedSchedule || !selectedPersonId) return;

          await updateScheduleAssignment(
            selectedSchedule.id,
            selectedPersonId
          );

          setEditOpen(false);
          setSelectedSchedule(null);
          setAvailabilities([]);
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
    gap: 12,
    marginTop: 6,
  },
  publishAllBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
