import {
  collection,
  doc,
  documentId,
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

export type MemberAvailabilityStatus = "available" | "unavailable" | "pending";

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

/* =========================
   FLAGS
========================= */

export type ScheduleFlag =
  | {
      type: "overload";
      personId: string;
      current: number;
      limit: number;
    }
  | {
      type: "same_day_multiple_services";
      personId: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "fixed_person_conflict";
      personId: string;
      conflictWith: string;
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
   🔥 FIXED NAME CONFLICTS (SOBERANO)
========================= */

const FIXED_NAME_CONFLICTS: [string, string][] = [["ruan", "fabiano"]];

function normalizeFirstName(name: string) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .split(/\s+/)[0];
}

/* =========================
   HELPERS
========================= */

function scheduleDocId(ministryId: string, dateKey: string, serviceId: string) {
  return `${ministryId}__${dateKey}__${serviceId}`;
}

function serviceKey(dateKey: string, serviceId: string) {
  return `${dateKey}__${serviceId}`;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

async function listUserNamesByUids(uids: string[]) {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  if (!unique.length) return {};

  const map: Record<string, string> = {};
  const parts = chunk(unique, 10);

  for (const part of parts) {
    const q = query(
      collection(db, "users"),
      where(documentId(), "in", part)
    );

    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      map[d.id] = String(d.data().name ?? "");
    });
  }

  return map;
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

  const [serviceDays, memberships, availability, existingSchedules] =
    await Promise.all([
      listServiceDaysByMonth(year, month),
      listMembershipsByMinistryIds(ministryIds),
      listMemberAvailabilityByMonth(year, month),
      listSchedulesByMonth(year, month),
    ]);

  /* =========================
     USER NAMES
  ========================= */

  const userNameMap = await listUserNamesByUids(
    memberships.map((m) => m.userId)
  );

  /* =========================
     AVAILABILITY MAP
  ========================= */

  const availabilityMap: Record<string, MemberAvailabilityStatus> = {};
  availability.forEach((a) => {
    availabilityMap[`${a.dateKey}__${a.serviceId}__${a.userId}`] = a.status;
  });

  /* =========================
     LOAD & EXISTING ASSIGNMENTS
  ========================= */

  const loadByPerson: Record<string, number> = {};
  const assignedByService: Record<string, string[]> = {};
  const assignedByDay: Record<string, string[]> = {};

  existingSchedules.forEach((s) => {
    s.assignments.forEach((a) => {
      loadByPerson[a.personId] = (loadByPerson[a.personId] ?? 0) + 1;

      const sKey = serviceKey(s.serviceDate, s.serviceId);
      assignedByService[sKey] ??= [];
      assignedByService[sKey].push(a.personId);

      assignedByDay[s.serviceDate] ??= [];
      assignedByDay[s.serviceDate].push(a.personId);
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

  const assignedThisRunByService: Record<string, string[]> = {};
  const assignedThisRunByDay: Record<string, string[]> = {};

  for (const ministryId of ministryIds) {
    const members = membershipsByMinistry[ministryId] ?? [];

    for (const day of serviceDays) {
      for (const service of day.services ?? []) {
        const docId = scheduleDocId(ministryId, day.dateKey, service.id);
        const existing = existingSchedules.find((s) => s.id === docId);

        if (existing?.status === "published") continue;
        if (existing?.status === "draft" && !overwriteDraft) continue;

        const sKey = serviceKey(day.dateKey, service.id);

        const candidates = members
          .map((m) => m.userId)
          .filter((userId) => {
            const myName = normalizeFirstName(userNameMap[userId] ?? "");
            if (!myName) return false;

            // 🔥 Regra soberana: Ruan x Fabiano
            const assignedNames =
              [...(assignedByService[sKey] ?? []), ...(assignedThisRunByService[sKey] ?? [])]
                .map((id) => normalizeFirstName(userNameMap[id] ?? ""));

            if (
              FIXED_NAME_CONFLICTS.some(
                ([a, b]) =>
                  (myName === a && assignedNames.includes(b)) ||
                  (myName === b && assignedNames.includes(a))
              )
            ) {
              allFlags.push({
                type: "fixed_person_conflict",
                personId: userId,
                conflictWith: myName === "ruan" ? "fabiano" : "ruan",
                dateKey: day.dateKey,
                serviceId: service.id,
              });
              return false;
            }

            // 🔒 Disponibilidade: SOMENTE available
            const status =
              availabilityMap[`${day.dateKey}__${service.id}__${userId}`];
            if (status !== "available") return false;

            return true;
          });

        if (!candidates.length) continue;

        const chosen = [...candidates].sort(
          (a, b) =>
            (loadByPerson[a] ?? 0) - (loadByPerson[b] ?? 0) ||
            a.localeCompare(b)
        )[0];

        const flags: ScheduleFlag[] = [];

        // ⚠️ Sobrecarga mensal
        const currentLoad = loadByPerson[chosen] ?? 0;
        if (currentLoad >= overloadLimit) {
          const f: ScheduleFlag = {
            type: "overload",
            personId: chosen,
            current: currentLoad,
            limit: overloadLimit,
          };
          flags.push(f);
          allFlags.push(f);
        }

        // ⚠️ Mesmo dia, outro culto
        const sameDay =
          assignedByDay[day.dateKey]?.includes(chosen) ||
          assignedThisRunByDay[day.dateKey]?.includes(chosen);

        if (sameDay) {
          const f: ScheduleFlag = {
            type: "same_day_multiple_services",
            personId: chosen,
            dateKey: day.dateKey,
            serviceId: service.id,
          };
          flags.push(f);
          allFlags.push(f);
        }

        loadByPerson[chosen] = currentLoad + 1;

        assignedThisRunByService[sKey] ??= [];
        assignedThisRunByService[sKey].push(chosen);

        assignedThisRunByDay[day.dateKey] ??= [];
        assignedThisRunByDay[day.dateKey].push(chosen);

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
              flags,
            },
          ],
          flags,
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
