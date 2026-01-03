import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

export type MembershipRole = "member" | "leader";

export type Membership = {
  id: string;
  userId: string;
  ministryId: string;
  role: MembershipRole;
  active: boolean;
};

export type ServiceTurn = {
  id: string;
  label: string;
  type: "regular" | "special";
};

export type ServiceDay = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  services: ServiceTurn[];
};

export type MemberAvailabilityStatus =
  | "available"
  | "unavailable"
  | "pending";

export type MemberAvailability = {
  id: string;
  userId: string;
  dateKey: string;
  serviceId: string;
  year: number;
  month: number;
  status: MemberAvailabilityStatus;
};

export type ScheduleStatus = "draft" | "published";

export type ScheduleFlag =
  | {
      type: "overload";
      personId: string;
      current: number;
      limit: number;
    }
  | {
      type: "conflict_ministry_priority";
      personId: string;
      blockedByMinistryId: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "fixed_person_conflict";
      personId: string;
      conflictWith: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "not_confirmed";
      personId: string;
      dateKey: string;
      serviceId: string;
    };

export type GeneratedAssignment = {
  personId: string;
  ministryId: string;
  source: "auto";
  flags: ScheduleFlag[];
};

export type ScheduleDoc = {
  id: string;
  ministryId: string;
  serviceDayId: string;
  serviceId: string;
  serviceDate: string;
  serviceLabel: string;

  year: number;
  month: number;

  status: ScheduleStatus;
  assignments: GeneratedAssignment[];
  flags: ScheduleFlag[];

  generatedAt: number;
  generatedBy: string;
};

export type GenerateSchedulesInput = {
  leaderUserId: string;
  ministryIds: string[];
  year: number;
  month: number;
  overloadLimit?: number;
  overwriteDraft?: boolean;
};

export type GenerateSchedulesResult = {
  schedules: ScheduleDoc[];
  flags: ScheduleFlag[];
};

/* =========================
   FIXED CONFLICTS
========================= */

const FIXED_CONFLICTS: [string, string][] = [
  ["ruan", "fabiano"], // troque por userIds reais se quiser
];

function violatesFixedConflicts(
  personId: string,
  assigned: string[]
) {
  return FIXED_CONFLICTS.some(
    ([a, b]) =>
      (personId === a && assigned.includes(b)) ||
      (personId === b && assigned.includes(a))
  );
}

/* =========================
   HELPERS
========================= */

function scheduleDocId(
  ministryId: string,
  dateKey: string,
  serviceId: string
) {
  return `${ministryId}__${dateKey}__${serviceId}`;
}

function serviceKey(dateKey: string, serviceId: string) {
  return `${dateKey}__${serviceId}`;
}

/* =========================
   FIRESTORE READS
========================= */

async function listServiceDaysByMonth(year: number, month: number) {
  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ServiceDay, "id">),
    }))
    .sort((a, b) => a.day - b.day);
}

async function listMembershipsByMinistryIds(ministryIds: string[]) {
  const q = query(
    collection(db, "memberships"),
    where("ministryId", "in", ministryIds),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

async function listMemberAvailabilityByMonth(year: number, month: number) {
  const q = query(
    collection(db, "memberAvailability"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MemberAvailability, "id">),
  }));
}

async function listSchedulesByMonth(year: number, month: number) {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ScheduleDoc, "id">),
  }));
}

/* =========================
   CORE GENERATION
========================= */

export async function generateAndSaveDraftSchedules(
  input: GenerateSchedulesInput
): Promise<GenerateSchedulesResult> {
  const {
    leaderUserId,
    ministryIds,
    year,
    month,
    overloadLimit = 4,
    overwriteDraft = true,
  } = input;

  if (!ministryIds.length) {
    return { schedules: [], flags: [] };
  }

  const [
    serviceDays,
    memberships,
    availability,
    existingSchedules,
  ] = await Promise.all([
    listServiceDaysByMonth(year, month),
    listMembershipsByMinistryIds(ministryIds),
    listMemberAvailabilityByMonth(year, month),
    listSchedulesByMonth(year, month),
  ]);

  /* =========================
     INDEXES
  ========================= */

  const availabilityMap: Record<string, MemberAvailabilityStatus> = {};
  availability.forEach((a) => {
    availabilityMap[
      `${a.dateKey}__${a.serviceId}__${a.userId}`
    ] = a.status;
  });

  const publishedByService: Record<string, string[]> = {};
  const loadByPerson: Record<string, number> = {};

  existingSchedules.forEach((s) => {
    const k = serviceKey(s.serviceDate, s.serviceId);
    s.assignments.forEach((a) => {
      loadByPerson[a.personId] =
        (loadByPerson[a.personId] ?? 0) + 1;

      if (s.status === "published") {
        publishedByService[k] ??= [];
        publishedByService[k].push(a.personId);
      }
    });
  });

  const membershipsByMinistry: Record<string, Membership[]> = {};
  memberships.forEach((m) => {
    membershipsByMinistry[m.ministryId] ??= [];
    membershipsByMinistry[m.ministryId].push(m);
  });

  /* =========================
     GENERATION
  ========================= */

  const generated: ScheduleDoc[] = [];
  const allFlags: ScheduleFlag[] = [];

  const assignedThisRun: Record<string, string[]> = {};
  const blockedByMinistry: Record<string, string> = {};

  for (const ministryId of ministryIds) {
    const members = membershipsByMinistry[ministryId] ?? [];

    for (const day of serviceDays) {
      for (const service of day.services ?? []) {
        const docId = scheduleDocId(
          ministryId,
          day.dateKey,
          service.id
        );

        const existing = existingSchedules.find(
          (s) => s.id === docId
        );

        if (existing?.status === "published") continue;
        if (existing?.status === "draft" && !overwriteDraft)
          continue;

        const sKey = serviceKey(day.dateKey, service.id);

        const alreadyAssigned = [
          ...(publishedByService[sKey] ?? []),
          ...(assignedThisRun[sKey] ?? []),
        ];

        const candidates = members
          .map((m) => m.userId)
          .filter((userId) => {
            if (alreadyAssigned.includes(userId)) {
              allFlags.push({
                type: "conflict_ministry_priority",
                personId: userId,
                blockedByMinistryId:
                  blockedByMinistry[
                    `${sKey}__${userId}`
                  ] ?? "published",
                dateKey: day.dateKey,
                serviceId: service.id,
              });
              return false;
            }

            if (
              violatesFixedConflicts(userId, alreadyAssigned)
            ) {
              const pair = FIXED_CONFLICTS.find(
                ([a, b]) => a === userId || b === userId
              );

              allFlags.push({
                type: "fixed_person_conflict",
                personId: userId,
                conflictWith:
                  pair?.[0] === userId
                    ? pair[1]
                    : pair?.[0] ?? "unknown",
                dateKey: day.dateKey,
                serviceId: service.id,
              });
              return false;
            }

            const status =
              availabilityMap[
                `${day.dateKey}__${service.id}__${userId}`
              ] ?? "available";

            if (status === "unavailable") return false;

            if (status !== "available") {
              allFlags.push({
                type: "not_confirmed",
                personId: userId,
                dateKey: day.dateKey,
                serviceId: service.id,
              });
            }

            return true;
          });

        if (!candidates.length) continue;

        const chosen = [...candidates].sort(
          (a, b) =>
            (loadByPerson[a] ?? 0) -
              (loadByPerson[b] ?? 0) ||
            a.localeCompare(b)
        )[0];

        const assignmentFlags: ScheduleFlag[] = [];
        const currentLoad = loadByPerson[chosen] ?? 0;

        if (currentLoad >= overloadLimit) {
          const f: ScheduleFlag = {
            type: "overload",
            personId: chosen,
            current: currentLoad,
            limit: overloadLimit,
          };
          assignmentFlags.push(f);
          allFlags.push(f);
        }

        loadByPerson[chosen] = currentLoad + 1;

        assignedThisRun[sKey] ??= [];
        assignedThisRun[sKey].push(chosen);
        blockedByMinistry[
          `${sKey}__${chosen}`
        ] = ministryId;

        generated.push({
          id: docId,
          ministryId,
          serviceDayId: day.dateKey,
          serviceId: service.id,
          serviceDate: day.dateKey,
          serviceLabel: service.label,
          year,
          month,
          status: "draft",
          assignments: [
            {
              personId: chosen,
              ministryId,
              source: "auto",
              flags: assignmentFlags,
            },
          ],
          flags: assignmentFlags,
          generatedAt: Date.now(),
          generatedBy: leaderUserId,
        });
      }
    }
  }

  /* =========================
     SAVE
  ========================= */

  const batch = writeBatch(db);
  generated.forEach((s) => {
    batch.set(doc(db, "schedules", s.id), s);
  });

  await batch.commit();

  return { schedules: generated, flags: allFlags };
}
